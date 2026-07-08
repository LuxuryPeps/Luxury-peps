// ===========================================================================
// Luxury Peps — backend API (Cloudflare Pages Function + Cloudflare D1)
// Runs ENTIRELY on Cloudflare: no external database, no Node-only APIs.
// Prices are ALWAYS recomputed here from the catalog below — values sent by the
// browser are ignored, so a customer can't tamper with pricing.
//
// Cloudflare Pages → Settings → Functions:
//   • D1 database binding named  DB   (bound to your D1 database)
// Cloudflare Pages → Settings → Environment variables:
//   OWNER_PIN, APP_SECRET, RESEND_API_KEY, FROM_EMAIL, OWNER_EMAIL,
//   PAY_BANK, PAY_CASHAPP, PAY_ZELLE, PAY_CRYPTO, PREORDER, ANTHROPIC_API_KEY
// No compatibility flags or npm packages are required.
// ===========================================================================

// ── Catalog (variant id → price). Keep in sync with the storefront. ─────────
const VARIANTS = {"p03-A":{"name":"GLP-1 SM","cents":9000},"p04-A":{"name":"GLP-2 TZ","cents":6500},"p04-B":{"name":"GLP-2 TZ","cents":9000},"p21-A":{"name":"GLP-3 RT","cents":8000},"p21-B":{"name":"GLP-3 RT","cents":13000},"p01-A":{"name":"BPC-157","cents":4000},"p02-A":{"name":"TB-500","cents":4500},"p29-A":{"name":"BPC-157 + TB-500","cents":12000},"p34-A":{"name":"BPC-157 + GHK-Cu + TB-500","cents":14000},"p08-A":{"name":"GHK-Cu","cents":5000},"p07-A":{"name":"Melanotan II","cents":4500},"p28-A":{"name":"Glutathione","cents":7200},"p05-A":{"name":"Ipamorelin","cents":4000},"p05-B":{"name":"Ipamorelin","cents":5000},"p06-A":{"name":"CJC-1295 (No DAC)","cents":6600},"p33-A":{"name":"CJC-1295 + Ipamorelin","cents":6700},"p15-A":{"name":"Sermorelin","cents":6000},"p31-A":{"name":"Tesamorelin","cents":5500},"p31-B":{"name":"Tesamorelin","cents":7000},"p32-A":{"name":"IGF-1 LR3","cents":8500},"p09-A":{"name":"Epithalon","cents":6100},"p19-A":{"name":"MOTS-c","cents":4000},"p24-A":{"name":"SS-31","cents":8000},"p22-A":{"name":"NAD+","cents":6000},"p25-A":{"name":"VIP","cents":7000},"p11-A":{"name":"Selank","cents":3400},"p12-A":{"name":"Semax","cents":4000},"p23-A":{"name":"Oxytocin Acetate","cents":5400},"p26-A":{"name":"5-Amino-1MQ","cents":7000},"p30-A":{"name":"HCG","cents":9500},"p27-A":{"name":"Bacteriostatic Water","cents":1500}};

const QTY_BREAKS = [{ min: 5, pct: 0.15 }, { min: 3, pct: 0.10 }, { min: 2, pct: 0.05 }];
const qtyDiscountPct = (q) => { for (const b of QTY_BREAKS) if (q >= b.min) return b.pct; return 0; };
const FREE_SHIP = 15000, FLAT_SHIP = 1200;
const METHOD_LABEL = { bank: "Bank transfer", cashapp: "Cash App", zelle: "Zelle", crypto: "Crypto (USDC)" };
const DAY = 24 * 60 * 60 * 1000;

const upper = (s) => String(s || "").trim().toUpperCase();
const esc = (s) => String(s == null ? "" : s).replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]));
const J = (obj, status = 200) => new Response(JSON.stringify(obj), {
  status,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  },
});

function priceOrder(items, ambassadorPct) {
  let subtotal = 0;
  const lines = [];
  for (const it of items || []) {
    const v = VARIANTS[it.variantId];
    if (!v) continue;
    const qty = Math.max(1, Math.floor(Number(it.qty) || 1));
    const line = Math.round(v.cents * qty * (1 - qtyDiscountPct(qty)));
    subtotal += line;
    lines.push({ variantId: it.variantId, productId: String(it.variantId).split("-")[0], name: v.name, qty, unitCents: v.cents, lineCents: line });
  }
  const pct = ambassadorPct || 0;
  const discount = pct ? Math.round(subtotal * pct) : 0;
  const afterDiscount = subtotal - discount;
  const shipping = subtotal > 0 && afterDiscount < FREE_SHIP ? FLAT_SHIP : 0;
  return { lines, subtotal, discount, shipping, total: afterDiscount + shipping, commission: discount };
}

function newReference() {
  const a = Date.now().toString(36).toUpperCase();
  const b = Math.floor(Math.random() * 1296).toString(36).toUpperCase().padStart(2, "0");
  return "LP-" + a + b;
}

// ── Web Crypto (Cloudflare-native): password hashing + signed tokens ────────
const TE = new TextEncoder();
function b64(bytes) { let s = ""; for (const x of bytes) s += String.fromCharCode(x); return btoa(s); }
function b64dec(str) { const bin = atob(str); const b = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i); return b; }
const b64url = (bytes) => b64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
async function hmac(secret, msg) {
  const k = await crypto.subtle.importKey("raw", TE.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(new Uint8Array(await crypto.subtle.sign("HMAC", k, TE.encode(msg))));
}
const signToken = async (secret, email) => b64url(TE.encode(email)) + "." + (await hmac(secret, email));
async function pbkdf2(pw, saltBytes) {
  const k = await crypto.subtle.importKey("raw", TE.encode(pw), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: saltBytes, iterations: 100000, hash: "SHA-256" }, k, 256);
  return b64(new Uint8Array(bits));
}

function hexToBytes(hex) { const clean = String(hex || "").trim(); const b = new Uint8Array(Math.floor(clean.length / 2)); for (let i = 0; i < b.length; i++) b[i] = parseInt(clean.substr(i * 2, 2), 16); return b; }
function bytesToHex(bytes) { return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join(""); }

async function sendCardOrderEmails(env, db, order) {
  const items = await db.all("select name, qty, line_cents from order_items where order_ref=?", order.reference);
  let cust = {}; try { cust = JSON.parse(order.customer || "{}"); } catch (_) { cust = {}; }
  const totalStr = "$" + ((order.total_cents || 0) / 100).toFixed(2);
  const custName = cust.name || order.email || "Customer";
  const rowsHtml = items.map((l) => `<tr><td style="padding:4px 10px 4px 0">${esc(l.name)}</td><td style="padding:4px 10px;color:#888">×${l.qty}</td><td style="padding:4px 0;text-align:right">$${((l.line_cents || 0) / 100).toFixed(2)}</td></tr>`).join("");
  const table = `<table style="border-collapse:collapse;font-size:14px;margin:10px 0">${rowsHtml}<tr><td colspan="2" style="padding-top:8px;font-weight:bold">Total</td><td style="padding-top:8px;text-align:right;font-weight:bold">${totalStr}</td></tr></table>`;
  await sendEmail(env, { to: env.OWNER_EMAIL || "", subject: `New PAID card order ${order.reference} — ${totalStr}`, html: `<div style="font-family:Arial,sans-serif;max-width:560px"><h2 style="margin:0 0 6px">New paid order ${order.reference}</h2><p style="margin:0 0 4px"><b>Customer:</b> ${esc(custName)} &lt;${esc(order.email || "")}&gt;</p><p style="margin:0 0 4px"><b>Paid by card.</b>${order.code ? ` Ambassador: ${esc(order.code)}` : ""}</p>${table}<p style="color:#555">Ship to: ${esc(cust.address || "")}, ${esc(cust.city || "")}${cust.state ? ", " + esc(cust.state) : ""} ${esc(cust.zip || "")}, ${esc(cust.country || "")}</p></div>` });
  if (order.email) await sendEmail(env, { to: order.email, subject: `Your Luxury Peps order ${order.reference}`, html: `<div style="font-family:Arial,sans-serif;max-width:560px"><h2 style="margin:0 0 6px">Thank you for your order</h2><p>Your payment was received. Order <b>${order.reference}</b> — total <b>${totalStr}</b>.</p>${table}<p>Your order ships shortly. We'll be in touch with tracking.</p></div>` });
}

async function sendEmail(env, { to, subject, html }) {
  const key = env.RESEND_API_KEY;
  if (!key || !to) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + key },
      body: JSON.stringify({ from: env.FROM_EMAIL || "Luxury Peps <orders@luxurypeps.com>", to, subject, html }),
    });
  } catch (_) { /* never let email break the request */ }
}

// ── D1 helpers ───────────────────────────────────────────────────────────
function makeDB(env) {
  const D = env.DB;
  const stmt = (query, args) => (args && args.length ? D.prepare(query).bind(...args) : D.prepare(query));
  return {
    all: async (query, ...args) => ((await stmt(query, args).all()).results || []),
    first: async (query, ...args) => await stmt(query, args).first(),
    run: async (query, ...args) => await stmt(query, args).run(),
  };
}

// Build a 14-day series (newest-last) from [{day:'YYYY-MM-DD', cents}] rows.
function series14(rows, field) {
  const map = {};
  for (const r of rows) map[r.day] = r.cents || 0;
  const out = [];
  const today = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today.getTime() - i * DAY);
    const day = d.toISOString().slice(0, 10);
    out.push({ day, [field]: map[day] || 0 });
  }
  return out;
}

// ── Router ─────────────────────────────────────────────────────────────────
export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === "OPTIONS") return J({}, 204);
  if (!env.DB) return J({ error: "Database not bound. Add a D1 binding named DB." }, 500);

  const db = makeDB(env);
  const OWNER_PIN = env.OWNER_PIN || "";
  const APP_SECRET = env.APP_SECRET || "change-me";
  const PREORDER = (env.PREORDER || "true").toLowerCase() !== "false";
  const OWNER_EMAIL = env.OWNER_EMAIL || "";
  const PAY = { bank: env.PAY_BANK || "", cashapp: env.PAY_CASHAPP || "", zelle: env.PAY_ZELLE || "", crypto: env.PAY_CRYPTO || "" };
  const ownerOK = (pin) => OWNER_PIN && String(pin || "").trim() === OWNER_PIN;

  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "");
  const qs = url.searchParams;
  const method = request.method;
  const body = method === "POST" ? await request.json().catch(() => ({})) : {};

  try {
    // ---- OWNER: overview -------------------------------------------------
    if (path === "/api/owner/overview" && method === "GET") {
      if (!ownerOK(qs.get("pin"))) return J({ error: "unauthorized" }, 401);
      return J(await ownerOverview(db, PREORDER));
    }
    if (path === "/api/owner/mark-paid" && method === "POST") {
      if (!ownerOK(body.pin)) return J({ error: "unauthorized" }, 401);
      await db.run("update orders set status='paid', paid_at=coalesce(paid_at, datetime('now')) where reference=? and status<>'paid'", body.orderId);
      return J({ ok: true });
    }
    if (path === "/api/owner/mark-unpaid" && method === "POST") {
      if (!ownerOK(body.pin)) return J({ error: "unauthorized" }, 401);
      await db.run("update orders set status='awaiting_payment', paid_at=null where reference=?", body.orderId);
      return J({ ok: true });
    }
    if (path === "/api/owner/payout-requests/resolve" && method === "POST") {
      if (!ownerOK(body.pin)) return J({ error: "unauthorized" }, 401);
      const action = body.action === "paid" ? "paid" : "declined";
      const row = await db.first("select code, amount_cents from payout_requests where id=?", body.id);
      if (!row) return J({ error: "not found" }, 404);
      await db.run("update payout_requests set status=?, resolved_at=datetime('now') where id=?", action, body.id);
      if (action === "paid") await db.run("insert into payouts (code, amount_cents, note) values (?, ?, ?)", row.code, row.amount_cents, "Payout request #" + body.id);
      return J({ ok: true });
    }
    if (path === "/api/owner/mark-shipped" && method === "POST") {
      if (!ownerOK(body.pin)) return J({ error: "unauthorized" }, 401);
      await db.run("update orders set status='shipped' where reference=? and paid_at is not null", body.orderId);
      const order = await db.first("select reference, email from orders where reference=?", body.orderId);
      if (order && order.email) {
        const tracking = String(body.tracking || "").trim();
        await sendEmail(env, {
          to: order.email,
          subject: `Your Luxury Peps order ${order.reference} has shipped`,
          html: `<div style="font-family:Arial,sans-serif;max-width:520px"><h2 style="margin:0 0 6px">Your order is on the way</h2><p>Good news — order <b>${order.reference}</b> has shipped.</p>${tracking ? `<p style="background:#faf7f2;border:1px solid #e6ddcd;padding:10px 12px;border-radius:6px"><b>Tracking number:</b> ${esc(tracking)}</p>` : ""}<p>Thank you for your order.</p></div>`,
        });
      }
      return J({ ok: true });
    }
    if (path === "/api/owner/archive" && method === "POST") {
      if (!ownerOK(body.pin)) return J({ error: "unauthorized" }, 401);
      try { await db.run("alter table orders add column archived integer not null default 0"); } catch (_) { /* column already exists */ }
      await db.run("update orders set archived=? where reference=?", body.archived ? 1 : 0, body.orderId);
      return J({ ok: true });
    }
    if (path === "/api/owner/payout" && method === "POST") {
      if (!ownerOK(body.pin)) return J({ error: "unauthorized" }, 401);
      const amt = Math.max(0, Math.round(Number(body.amountCents) || 0));
      if (!body.code || amt <= 0) return J({ error: "bad request" }, 400);
      await db.run("insert into payouts (code, amount_cents, note) values (?, ?, ?)", upper(body.code), amt, body.note || "Manual payout");
      return J({ ok: true });
    }

    // ---- OWNER: ambassadors ---------------------------------------------
    if (path === "/api/owner/ambassadors" && method === "GET") {
      if (!ownerOK(qs.get("pin"))) return J({ error: "unauthorized" }, 401);
      const rows = await db.all("select code, creator, pct, portal_pin, builtin from ambassadors where active=1 order by builtin desc, code");
      return J({ ambassadors: rows.map((r) => ({ ...r, builtin: !!r.builtin })) });
    }
    if (path === "/api/owner/ambassadors" && method === "POST") {
      if (!ownerOK(body.pin)) return J({ error: "unauthorized" }, 401);
      const code = upper(body.code);
      const creator = String(body.creator || "").trim();
      const pct = Number(body.pct);
      const portalPin = String(body.portalPin || "").trim();
      if (!creator) return J({ error: "Name required." }, 400);
      if (!/^[A-Z0-9]{3,}$/.test(code)) return J({ error: "Code must be 3+ letters/numbers." }, 400);
      if (!Number.isFinite(pct) || pct < 0 || pct > 1) return J({ error: "pct must be 0–1 (e.g. 0.10)." }, 400);
      if (!/^[0-9]{4,}$/.test(portalPin)) return J({ error: "PIN must be 4+ digits." }, 400);
      if (await db.first("select 1 from ambassadors where code=?", code)) return J({ error: "That code already exists." }, 409);
      await db.run("insert into ambassadors (code, creator, pct, portal_pin, builtin) values (?, ?, ?, ?, 0)", code, creator, pct, portalPin);
      return J({ ok: true });
    }
    if (path.startsWith("/api/owner/ambassadors/") && method === "DELETE") {
      if (!ownerOK(qs.get("pin"))) return J({ error: "unauthorized" }, 401);
      const code = upper(decodeURIComponent(path.split("/").pop()));
      const row = await db.first("select builtin from ambassadors where code=?", code);
      if (!row) return J({ error: "not found" }, 404);
      if (row.builtin) return J({ error: "Built-in ambassadors can't be removed." }, 400);
      await db.run("delete from ambassadors where code=?", code);
      return J({ ok: true });
    }

    // ---- OWNER: inventory -----------------------------------------------
    if (path === "/api/owner/inventory" && method === "GET") {
      if (!ownerOK(qs.get("pin"))) return J({ error: "unauthorized" }, 401);
      return J({ inventory: await db.all("select product_id, count, threshold from inventory") });
    }
    if (path === "/api/owner/inventory" && method === "POST") {
      if (!ownerOK(body.pin)) return J({ error: "unauthorized" }, 401);
      const pid = String(body.productId || "").trim();
      if (!pid) return J({ error: "productId required" }, 400);
      const count = Math.max(0, Math.floor(Number(body.count) || 0));
      const threshold = Math.max(1, Math.floor(Number(body.threshold) || 5));
      await db.run("insert into inventory (product_id, count, threshold, updated_at) values (?, ?, ?, datetime('now')) on conflict(product_id) do update set count=excluded.count, threshold=excluded.threshold, updated_at=datetime('now')", pid, count, threshold);
      return J({ ok: true });
    }

    // ---- OWNER: inbox (contact messages + ambassador applications) ------
    if (path === "/api/owner/messages" && method === "GET") {
      if (!ownerOK(qs.get("pin"))) return J({ error: "unauthorized" }, 401);
      return J({ messages: await db.all("select name, email, subject, message, created_at from contact_messages order by created_at desc limit 50") });
    }
    if (path === "/api/owner/applications" && method === "GET") {
      if (!ownerOK(qs.get("pin"))) return J({ error: "unauthorized" }, 401);
      return J({ applications: await db.all("select name, email, platform, handle, followers, niche, why, created_at from ambassador_applications order by created_at desc limit 50") });
    }

    // ---- OWNER: export all orders as CSV (for bookkeeping/spreadsheets) --
    if (path === "/api/owner/orders.csv" && method === "GET") {
      if (!ownerOK(qs.get("pin"))) return J({ error: "unauthorized" }, 401);
      const orders = await db.all("select * from orders order by created_at desc");
      const itemRows = await db.all("select order_ref, name, qty from order_items");
      const byRef = {};
      for (const it of itemRows) { (byRef[it.order_ref] = byRef[it.order_ref] || []).push(it.name + " x" + it.qty); }
      const escCsv = (v) => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
      const money2 = (c) => ((c || 0) / 100).toFixed(2);
      const rows = [["Reference", "Date", "Status", "Method", "Code", "Subtotal", "Discount", "Shipping", "Total", "Commission", "Customer", "Email", "Address", "City", "State", "Zip", "Country", "Items"]];
      for (const o of orders) {
        let c = {}; try { c = JSON.parse(o.customer || "{}"); } catch (_) { c = {}; }
        rows.push([o.reference, String(o.created_at || "").slice(0, 10), o.status, o.method, o.code, money2(o.subtotal_cents), money2(o.discount_cents), money2(o.shipping_cents), money2(o.total_cents), money2(o.commission_cents), c.name, o.email, c.address, c.city, c.state, c.zip, c.country, (byRef[o.reference] || []).join("; ")]);
      }
      const csv = rows.map((r) => r.map(escCsv).join(",")).join("\n");
      return new Response(csv, { status: 200, headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=luxury-peps-orders.csv", "Access-Control-Allow-Origin": "*" } });
    }

    // ---- PUBLIC: validate an ambassador code (checkout box) -------------
    const codeMatch = path.match(/^\/api\/code\/([^/]+)$/);
    if (codeMatch && method === "GET") {
      const code = upper(decodeURIComponent(codeMatch[1]));
      const a = await db.first("select code, creator, pct from ambassadors where code=? and active=1", code);
      if (!a) return J({ valid: false });
      return J({ valid: true, code: a.code, creator: a.creator, pct: a.pct });
    }

    // ---- AMBASSADOR portal: stats (GET /api/creator/:code/stats?pin=) ----
    const creatorMatch = path.match(/^\/api\/creator\/([^/]+)\/stats$/);
    if (creatorMatch && method === "GET") {
      const code = upper(decodeURIComponent(creatorMatch[1]));
      const amb = await db.first("select code, creator, pct, portal_pin from ambassadors where code=? and active=1", code);
      if (!amb) return J({ error: "not found" }, 404);
      if (String(qs.get("pin") || "").trim() !== amb.portal_pin) return J({ error: "unauthorized" }, 401);
      return J(await creatorStats(db, amb));
    }

    // ---- AMBASSADOR: request a payout (goes to the owner portal) --------
    const reqMatch = path.match(/^\/api\/creator\/([^/]+)\/request-payout$/);
    if (reqMatch && method === "POST") {
      const code = upper(decodeURIComponent(reqMatch[1]));
      const amb = await db.first("select code, creator, portal_pin from ambassadors where code=? and active=1", code);
      if (!amb) return J({ error: "not found" }, 404);
      if (String(body.pin || "").trim() !== amb.portal_pin) return J({ error: "unauthorized" }, 401);
      const amt = Math.max(0, Math.round(Number(body.amountCents) || 0));
      if (amt <= 0) return J({ error: "Enter a valid amount." }, 400);
      await db.run("insert into payout_requests (code, creator, amount_cents, method, details, status) values (?, ?, ?, ?, ?, 'pending')", code, amb.creator, amt, body.method || null, body.details || null);
      await sendEmail(env, { to: OWNER_EMAIL, subject: `Payout request — ${amb.creator} (${code}) — $${(amt / 100).toFixed(2)}`, html: `<div style="font-family:Arial,sans-serif;max-width:520px"><p><b>${esc(amb.creator)}</b> (${esc(code)}) requested a payout.</p><p><b>Amount:</b> $${(amt / 100).toFixed(2)}<br><b>Pay via:</b> ${esc(body.method)}<br><b>Details:</b> ${esc(body.details)}</p><p>Review and mark it paid in your owner portal.</p></div>` });
      return J({ ok: true });
    }

    // ---- CARD: Authorize.Net Accept Hosted — request a form token -------
    if (path === "/api/anet/hosted-token" && method === "POST") {
      if (!env.ANET_API_LOGIN_ID || !env.ANET_TRANSACTION_KEY) return J({ error: "Card payment isn't configured yet." }, 501);
      const code = body.code ? upper(body.code) : null;
      let pct = 0;
      if (code) { const a = await db.first("select pct from ambassadors where code=? and active=1", code); pct = a ? a.pct : 0; }
      const p = priceOrder(body.items, pct);
      if (!p.lines.length) return J({ error: "No valid items." }, 400);
      const reference = newReference();
      await db.run("insert into orders (reference, email, method, code, status, subtotal_cents, discount_cents, shipping_cents, total_cents, commission_cents, customer, certified) values (?, ?, 'card', ?, 'awaiting_payment', ?, ?, ?, ?, ?, ?, ?)", reference, body.email || null, code, p.subtotal, p.discount, p.shipping, p.total, p.commission, JSON.stringify(body.customer || {}), body.certifiedResearchUse ? 1 : 0);
      for (const l of p.lines) {
        await db.run("insert into order_items (order_ref, variant_id, product_id, name, qty, unit_price_cents, line_cents) values (?, ?, ?, ?, ?, ?, ?)", reference, l.variantId, l.productId, l.name, l.qty, l.unitCents, l.lineCents);
      }
      const isProd = (env.ANET_ENV || "sandbox").toLowerCase() === "production";
      const apiUrl = isProd ? "https://api.authorize.net/xml/v1/request.api" : "https://apitest.authorize.net/xml/v1/request.api";
      const origin = new URL(request.url).origin;
      const tokenReq = {
        getHostedPaymentPageRequest: {
          merchantAuthentication: { name: env.ANET_API_LOGIN_ID, transactionKey: env.ANET_TRANSACTION_KEY },
          transactionRequest: {
            transactionType: "authCaptureTransaction",
            amount: (p.total / 100).toFixed(2),
            order: { invoiceNumber: reference, description: "Luxury Peps order" },
            customer: { email: body.email || "" },
          },
          hostedPaymentSettings: {
            setting: [
              { settingName: "hostedPaymentReturnOptions", settingValue: JSON.stringify({ showReceipt: false }) },
              { settingName: "hostedPaymentIFrameCommunicatorUrl", settingValue: JSON.stringify({ url: origin + "/AuthorizeNetIFrameCommunicator.html" }) },
              { settingName: "hostedPaymentButtonOptions", settingValue: JSON.stringify({ text: "Pay Now" }) },
              { settingName: "hostedPaymentOrderOptions", settingValue: JSON.stringify({ show: false }) },
              { settingName: "hostedPaymentPaymentOptions", settingValue: JSON.stringify({ cardCodeRequired: true, showCreditCard: true, showBankAccount: false }) },
              { settingName: "hostedPaymentStyleOptions", settingValue: JSON.stringify({ bgColor: "#0b0b0d" }) },
            ],
          },
        },
      };
      let token = null, errMsg = "Payment setup failed.";
      try {
        const r = await fetch(apiUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(tokenReq) });
        const text = await r.text();
        const data = JSON.parse(text.replace(/^\uFEFF/, "").trim());
        token = data && data.token;
        if (!token && data && data.messages && data.messages.message && data.messages.message[0]) errMsg = data.messages.message[0].text || errMsg;
      } catch (_) { /* fall through */ }
      if (!token) return J({ error: errMsg }, 502);
      return J({ token, reference, env: isProd ? "production" : "sandbox" });
    }

    // ---- CARD: Authorize.Net webhook — confirms payment server-side -----
    if (path === "/api/anet/webhook" && method === "POST") {
      const raw = await request.text();
      const sigHeader = request.headers.get("x-anet-signature") || "";
      if (env.ANET_SIGNATURE_KEY) {
        try {
          const key = await crypto.subtle.importKey("raw", hexToBytes(env.ANET_SIGNATURE_KEY), { name: "HMAC", hash: "SHA-512" }, false, ["sign"]);
          const mac = await crypto.subtle.sign("HMAC", key, TE.encode(raw));
          const computed = bytesToHex(new Uint8Array(mac)).toUpperCase();
          const provided = (sigHeader.split("=")[1] || "").toUpperCase();
          if (!provided || computed !== provided) return J({ error: "bad signature" }, 401);
        } catch (_) { return J({ error: "signature check failed" }, 401); }
      }
      let evt = null;
      try { evt = JSON.parse(raw); } catch (_) { return J({ ok: true }); }
      const type = (evt && evt.eventType) || "";
      const inv = evt && evt.payload && evt.payload.invoiceNumber;
      if (/authcapture|priorauthcapture|capture/i.test(type) && inv) {
        const order = await db.first("select * from orders where reference=?", inv);
        if (order && order.status !== "paid") {
          await db.run("update orders set status='paid', paid_at=datetime('now') where reference=?", inv);
          await sendCardOrderEmails(env, db, order);
        }
      }
      return J({ ok: true });
    }

    // ---- CHECKOUT: manual payment order ---------------------------------
    if (path === "/api/manual-order" && method === "POST") {
      const code = body.code ? upper(body.code) : null;
      let pct = 0;
      if (code) { const a = await db.first("select pct from ambassadors where code=? and active=1", code); pct = a ? a.pct : 0; }
      const p = priceOrder(body.items, pct);
      if (!p.lines.length) return J({ error: "No valid items." }, 400);
      const reference = newReference();
      await db.run(
        "insert into orders (reference, email, method, code, status, subtotal_cents, discount_cents, shipping_cents, total_cents, commission_cents, customer, certified) values (?, ?, ?, ?, 'awaiting_payment', ?, ?, ?, ?, ?, ?, ?)",
        reference, body.email || null, body.method || null, code, p.subtotal, p.discount, p.shipping, p.total, p.commission, JSON.stringify(body.customer || {}), body.certifiedResearchUse ? 1 : 0
      );
      for (const l of p.lines) {
        await db.run("insert into order_items (order_ref, variant_id, product_id, name, qty, unit_price_cents, line_cents) values (?, ?, ?, ?, ?, ?, ?)", reference, l.variantId, l.productId, l.name, l.qty, l.unitCents, l.lineCents);
      }

      // Emails (best-effort; never blocks the order)
      const totalStr = "$" + (p.total / 100).toFixed(2);
      const methodLabel = METHOD_LABEL[body.method] || body.method || "—";
      const cust = body.customer || {};
      const custName = (cust.name || [cust.firstName, cust.lastName].filter(Boolean).join(" ") || body.email || "Customer");
      const rowsHtml = p.lines.map((l) => `<tr><td style="padding:4px 10px 4px 0">${esc(l.name)}</td><td style="padding:4px 10px;color:#888">×${l.qty}</td><td style="padding:4px 0;text-align:right">$${(l.lineCents / 100).toFixed(2)}</td></tr>`).join("");
      const table = `<table style="border-collapse:collapse;font-size:14px;margin:10px 0">${rowsHtml}<tr><td colspan="2" style="padding-top:8px;font-weight:bold">Total</td><td style="padding-top:8px;text-align:right;font-weight:bold">${totalStr}</td></tr></table>`;
      await sendEmail(env, {
        to: OWNER_EMAIL,
        subject: `New order ${reference} — ${totalStr}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:560px"><h2 style="margin:0 0 6px">New order ${reference}</h2><p style="margin:0 0 4px"><b>Customer:</b> ${esc(custName)} &lt;${esc(body.email || "no email")}&gt;</p><p style="margin:0 0 4px"><b>Payment:</b> ${esc(methodLabel)}${code ? ` &nbsp; <b>Ambassador:</b> ${esc(code)}` : ""}</p>${table}<p style="color:#555">Send this customer their payment instructions to complete the order.</p></div>`,
      });
      if (body.email) {
        const pay = PAY[body.method];
        await sendEmail(env, {
          to: body.email,
          subject: `Your Luxury Peps order ${reference}`,
          html: `<div style="font-family:Arial,sans-serif;max-width:560px"><h2 style="margin:0 0 6px">Thank you for your order</h2><p style="margin:0 0 4px">Order <b>${reference}</b> — total <b>${totalStr}</b>.</p>${table}<h3 style="margin:16px 0 6px">Payment — ${esc(methodLabel)}</h3>${pay ? `<div style="background:#faf7f2;border:1px solid #e6ddcd;padding:12px 14px;border-radius:6px">${pay}</div>` : `<p>We'll follow up shortly with secure payment details.</p>`}<p style="margin-top:12px">Please include your order number <b>${reference}</b> with payment. Your order ships once payment clears.</p></div>`,
        });
      }
      return J({ reference, total_cents: p.total });
    }

    // ---- CHECKOUT: card session (Stripe) — future ----------------------
    if (path === "/api/create-checkout-session" && method === "POST") {
      if (!env.STRIPE_SECRET_KEY) return J({ error: "Card checkout isn't enabled yet." }, 501);
      return J({ error: "Card checkout not implemented." }, 501);
    }

    // ---- AUTH: register / login -----------------------------------------
    if (path === "/api/auth/register" && method === "POST") {
      const email = String(body.email || "").toLowerCase().trim();
      const pw = String(body.password || "");
      if (!/^\S+@\S+\.\S+$/.test(email)) return J({ error: "Enter a valid email." }, 400);
      if (pw.length < 6) return J({ error: "Password must be at least 6 characters." }, 400);
      if (await db.first("select 1 from users where email=?", email)) return J({ error: "An account with that email already exists." }, 409);
      const salt = crypto.getRandomValues(new Uint8Array(16));
      await db.run("insert into users (email, password_hash, salt) values (?, ?, ?)", email, await pbkdf2(pw, salt), b64(salt));
      return J({ email, token: await signToken(APP_SECRET, email) });
    }
    if (path === "/api/auth/login" && method === "POST") {
      const email = String(body.email || "").toLowerCase().trim();
      const pw = String(body.password || "");
      const row = await db.first("select password_hash, salt from users where email=?", email);
      if (!row || (await pbkdf2(pw, b64dec(row.salt))) !== row.password_hash) return J({ error: "Incorrect email or password." }, 401);
      return J({ email, token: await signToken(APP_SECRET, email) });
    }

    // ---- CONTACT / AMBASSADOR APPLICATION -------------------------------
    if (path === "/api/contact" && method === "POST") {
      await db.run("insert into contact_messages (name, email, subject, message) values (?, ?, ?, ?)", body.name || null, body.email || null, body.subject || null, body.message || null);
      await sendEmail(env, { to: OWNER_EMAIL, subject: `New contact message: ${body.subject || "(no subject)"}`, html: `<div style="font-family:Arial,sans-serif;max-width:560px"><p><b>From:</b> ${esc(body.name)} &lt;${esc(body.email)}&gt;</p><p><b>Subject:</b> ${esc(body.subject)}</p><p style="white-space:pre-wrap">${esc(body.message)}</p></div>` });
      return J({ ok: true });
    }
    if (path === "/api/ambassador" && method === "POST") {
      await db.run("insert into ambassador_applications (name, email, platform, handle, followers, niche, why) values (?, ?, ?, ?, ?, ?, ?)", body.name || null, body.email || null, body.platform || null, body.handle || null, body.followers || null, body.niche || null, body.why || null);
      await sendEmail(env, { to: OWNER_EMAIL, subject: `New ambassador application: ${body.name || ""}`, html: `<div style="font-family:Arial,sans-serif;max-width:560px"><p><b>${esc(body.name)}</b> &lt;${esc(body.email)}&gt;</p><p><b>Platform:</b> ${esc(body.platform)} — ${esc(body.handle)} (${esc(body.followers)} followers)</p><p><b>Niche:</b> ${esc(body.niche)}</p><p style="white-space:pre-wrap">${esc(body.why)}</p></div>` });
      return J({ ok: true });
    }

    // ---- CHAT assistant (proxies to Anthropic) --------------------------
    if (path === "/api/chat" && method === "POST") {
      if (!env.ANTHROPIC_API_KEY) return J({ error: "Assistant not configured." }, 501);
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: body.model || "claude-sonnet-4-6", max_tokens: body.max_tokens || 1024, system: body.system, messages: body.messages || [] }),
      });
      return J(await r.json().catch(() => ({})), r.status);
    }

    return J({ error: "Not found", path }, 404);
  } catch (e) {
    return J({ error: "Server error", detail: String((e && e.message) || e) }, 500);
  }
}

// ── Owner dashboard aggregation ─────────────────────────────────────────
async function ownerOverview(db, PREORDER) {
  const codes = await db.all("select code, creator, pct, builtin from ambassadors where active=1 order by builtin desc, code");
  try { await db.run("alter table orders add column archived integer not null default 0"); } catch (_) { /* column already exists */ }
  const t = (await db.first(`
    select
      count(case when paid_at is not null then 1 end) as paid_orders,
      coalesce(sum(case when paid_at is not null then total_cents else 0 end),0) as paid_sales,
      coalesce(sum(case when paid_at is not null and code is not null then commission_cents else 0 end),0) as commission_total,
      count(case when paid_at is null then 1 end) as pending_orders,
      coalesce(sum(case when paid_at is null then total_cents else 0 end),0) as pending_sales,
      count(*) as total_orders
    from orders where coalesce(archived,0)=0`)) || {};
  const byCreator = await db.all("select code as creator_code, count(*) as orders, sum(total_cents) as sales_cents, sum(commission_cents) as commission_cents from orders where paid_at is not null and code is not null and coalesce(archived,0)=0 group by code");
  const recentRows = await db.all("select o.reference as id, o.code as creator_code, o.status, o.total_cents, o.method, o.customer, o.created_at, coalesce(o.archived,0) as archived, coalesce((select json_group_array(json_object('name', oi.name, 'qty', oi.qty, 'line_cents', oi.line_cents)) from order_items oi where oi.order_ref = o.reference), '[]') as items_json from orders o order by o.created_at desc limit 50");
  const recent = recentRows.map((r) => {
    let customer = {}; try { customer = JSON.parse(r.customer || "{}"); } catch (_) { customer = {}; }
    let items = []; try { items = JSON.parse(r.items_json || "[]"); } catch (_) { items = []; }
    return { id: r.id, creator_code: r.creator_code, status: r.status, total_cents: r.total_cents, method: r.method, created_at: r.created_at, customer, items, archived: !!r.archived };
  });
  const dayRows = await db.all("select date(paid_at) as day, sum(total_cents) as cents from orders where paid_at is not null and coalesce(archived,0)=0 group by date(paid_at)");
  const bestSellers = await db.all("select oi.name as name, sum(oi.qty) as qty from order_items oi join orders o on o.reference = oi.order_ref where o.paid_at is not null and coalesce(o.archived,0)=0 group by oi.name order by qty desc limit 6");
  const payoutRows = await db.all("select code, sum(amount_cents) as cents from payouts group by code");
  const paidOutByCode = {};
  let paidOutTotal = 0;
  for (const r of payoutRows) { paidOutByCode[r.code] = r.cents; paidOutTotal += r.cents || 0; }
  const payoutRequests = await db.all("select id, code, creator, amount_cents, method, details, created_at from payout_requests where status='pending' order by created_at desc");
  return {
    preorder: PREORDER, commissionPct: 0.10, payoutRequests,
    codes: codes.map((c) => ({ code: c.code, creator: c.creator, pct: c.pct, builtin: !!c.builtin })),
    paidOrders: t.paid_orders || 0, paidSalesCents: t.paid_sales || 0,
    commissionOwedCents: Math.max(0, (t.commission_total || 0) - paidOutTotal),
    pendingOrders: t.pending_orders || 0, pendingSalesCents: t.pending_sales || 0,
    totalOrders: t.total_orders || 0, byCreator, recent,
    series: series14(dayRows, "sales_cents"), bestSellers, paidOutByCode,
  };
}

// ── Single-ambassador stats ─────────────────────────────────────────────
async function creatorStats(db, amb) {
  try { await db.run("alter table orders add column archived integer not null default 0"); } catch (_) { /* column already exists */ }
  const t = (await db.first(`
    select
      count(case when paid_at is not null then 1 end) as paid_orders,
      coalesce(sum(case when paid_at is not null then total_cents else 0 end),0) as paid_sales,
      coalesce(sum(case when paid_at is not null then commission_cents else 0 end),0) as paid_comm,
      count(case when paid_at is null then 1 end) as pend_orders,
      coalesce(sum(case when paid_at is null then total_cents else 0 end),0) as pend_sales,
      coalesce(sum(case when paid_at is null then commission_cents else 0 end),0) as pend_comm,
      count(*) as total_orders
    from orders where code=? and coalesce(archived,0)=0`, amb.code)) || {};
  const recent = await db.all("select reference as id, status, total_cents, commission_cents from orders where code=? and coalesce(archived,0)=0 order by created_at desc limit 12", amb.code);
  const dayRows = await db.all("select date(paid_at) as day, sum(commission_cents) as cents from orders where code=? and paid_at is not null and coalesce(archived,0)=0 group by date(paid_at)", amb.code);
  return {
    code: amb.code, creator: amb.creator, discountPct: amb.pct, commissionPct: 0.10,
    paid: { orders: t.paid_orders || 0, salesCents: t.paid_sales || 0, commissionCents: t.paid_comm || 0 },
    pending: { orders: t.pend_orders || 0, salesCents: t.pend_sales || 0, commissionCents: t.pend_comm || 0 },
    totalOrders: t.total_orders || 0, recent, series: series14(dayRows, "commission_cents"),
    requests: await db.all("select id, amount_cents, method, status, created_at from payout_requests where code=? order by created_at desc limit 10", amb.code),
  };
}
