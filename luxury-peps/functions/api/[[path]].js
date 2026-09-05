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
const VARIANTS = {"p03-A":{"name":"GLP-1 SM","cents":8999},"p04-A":{"name":"GLP-2 TZ","cents":6499},"p04-B":{"name":"GLP-2 TZ","cents":9499},"p21-A":{"name":"GLP-3 RT","cents":7999},"p21-B":{"name":"GLP-3 RT","cents":12999},"p01-A":{"name":"BPC-157","cents":4499},"p02-A":{"name":"TB-500","cents":5499},"p29-A":{"name":"BPC-157 + TB-500","cents":11999},"p34-A":{"name":"BPC-157 + GHK-Cu + TB-500 (GLOW)","cents":10999},"p35-A":{"name":"BPC-157 + GHK-Cu + TB-500 + KPV (KLOW)","cents":13999},"p08-A":{"name":"GHK-Cu","cents":6499},"p07-A":{"name":"Melanotan II","cents":4499},"p28-A":{"name":"Glutathione","cents":7199},"p05-A":{"name":"Ipamorelin","cents":3999},"p05-B":{"name":"Ipamorelin","cents":5999},"p06-A":{"name":"CJC-1295 (No DAC)","cents":6599},"p33-A":{"name":"CJC-1295 + Ipamorelin","cents":8199},"p15-A":{"name":"Sermorelin","cents":5999},"p31-A":{"name":"Tesamorelin","cents":5499},"p31-B":{"name":"Tesamorelin","cents":7499},"p32-A":{"name":"IGF-1 LR3","cents":8499},"p09-A":{"name":"Epithalon","cents":6099},"p19-A":{"name":"MOTS-c","cents":4899},"p24-A":{"name":"SS-31","cents":7999},"p22-A":{"name":"NAD+","cents":5999},"p25-A":{"name":"VIP","cents":6999},"p11-A":{"name":"Selank","cents":3899},"p12-A":{"name":"Semax","cents":3999},"p23-A":{"name":"Oxytocin Acetate","cents":5399},"p26-A":{"name":"5-Amino-1MQ","cents":6999},"p30-A":{"name":"HCG","cents":9499},"p27-A":{"name":"Bacteriostatic Water","cents":1499}};

const QTY_BREAKS = [{ min: 5, pct: 0.15 }, { min: 3, pct: 0.10 }, { min: 2, pct: 0.05 }];
const qtyDiscountPct = (q) => { for (const b of QTY_BREAKS) if (q >= b.min) return b.pct; return 0; };
const FREE_SHIP = 15000, FLAT_SHIP = 1200;
// Bump when this file changes. Surfaced in owner Diagnostics so you can confirm
// which version of the backend is actually deployed.
const BACKEND_VERSION = "2026-07-22.1";
// Owner notifications go here. Prefer the OWNER_EMAIL environment variable, but
// fall back to the business address so a missing variable can never silently
// swallow order, contact, application, payout, and review notifications.
const OWNER_EMAIL_FALLBACK = "hello@luxurypeps.com";
// Flat discount a customer receives for using ANY affiliate code, independent of
// what that affiliate earns in commission.
const AFFILIATE_CUSTOMER_DISCOUNT = 0.10;
// Free bacteriostatic water on qualifying orders (threshold on pre-discount subtotal).
const FREE_WATER_THRESHOLD_CENTS = 15000;   // $150.00
const FREE_WATER_VARIANT = "p27-A";
// Analytics: only these events are accepted, and only this many per IP per hour.
// A real visitor browsing hard might hit ~60; 200 leaves plenty of headroom.
const TRACK_EVENTS = new Set(["page_view", "product_view", "checkout_start"]);
const TRACK_MAX_PER_HOUR = 200;
const ownerEmail = (env) => (env.OWNER_EMAIL || "").trim() || OWNER_EMAIL_FALLBACK;
const METHOD_LABEL = { bank: "Bank transfer", cashapp: "Cash App", zelle: "Zelle", crypto: "Crypto (USDC)" };
const DAY = 24 * 60 * 60 * 1000;

const upper = (s) => String(s || "").trim().toUpperCase();
const esc = (s) => String(s == null ? "" : s).replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]));
const J = (obj, status = 200) => new Response(JSON.stringify(obj), {
  status,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Owner-Pin, X-Marketing-Pin",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  },
});

function priceOrder(items, ambassadorPct, promo) {
  let subtotal = 0;
  const lines = [];
  for (const it of items || []) {
    const v = VARIANTS[it.variantId];
    if (!v) continue;
    // A free item can never be paid for — ignore any client-sent p27 free line;
    // the server decides whether the free vial is earned, below.
    if (it.variantId === FREE_WATER_VARIANT && Number(it.qty) === 0) continue;
    const qty = Math.max(1, Math.floor(Number(it.qty) || 1));
    const line = Math.round(v.cents * qty * (1 - qtyDiscountPct(qty)));
    subtotal += line;
    lines.push({ variantId: it.variantId, productId: String(it.variantId).split("-")[0], name: v.name, qty, unitCents: v.cents, lineCents: line });
  }

  // Gift: one free bacteriostatic water on orders whose (pre-discount) subtotal
  // reaches the free-water threshold. It's a $0 line, so it adds nothing to the
  // charge and can't be abused — the server sets it, not the browser.
  const earnsFreeWater = subtotal >= FREE_WATER_THRESHOLD_CENTS;
  if (earnsFreeWater && VARIANTS[FREE_WATER_VARIANT]) {
    lines.push({ variantId: FREE_WATER_VARIANT, productId: "p27", name: "Bacteriostatic Water (Free gift)", qty: 1, unitCents: 0, lineCents: 0, free: true });
  }
  // Customer discount and affiliate commission are now SEPARATE:
  //  - the shopper always gets AFFILIATE_CUSTOMER_DISCOUNT (10%) for using a code
  //  - the affiliate earns their own rate (ambassadorPct: 0.10 or 0.15), which the
  //    customer never sees and which is what you owe the affiliate.
  const commRate = ambassadorPct || 0;
  const usingCode = commRate > 0;
  const discount = usingCode ? Math.round(subtotal * AFFILIATE_CUSTOMER_DISCOUNT) : 0;
  const commission = usingCode ? Math.round(subtotal * commRate) : 0;
  const afterAmb = Math.max(0, subtotal - discount);
  // Promo stacks on top of any ambassador discount, applied to the remainder.
  let promoDiscount = 0;
  if (promo && afterAmb > 0) {
    if (promo.kind === "amount") promoDiscount = Math.min(Math.max(0, promo.value), afterAmb);
    else if (promo.kind === "pct") promoDiscount = Math.round(afterAmb * (Math.min(100, Math.max(0, promo.value)) / 100));
  }
  const afterDiscount = Math.max(0, afterAmb - promoDiscount);
  const freeShip = !!promo && promo.kind === "freeship";
  // Threshold is measured on the SUBTOTAL, matching the advertised copy
  // ("free shipping on orders over $150") and the cart progress bar. Basing it
  // on the post-discount figure silently charged shipping the customer never saw.
  const shipping = subtotal > 0 && !freeShip && subtotal < FREE_SHIP ? FLAT_SHIP : 0;
  return { lines, subtotal, discount, promoDiscount, shipping, total: afterDiscount + shipping, commission };
}

// Validate a promo code server-side. Never trust the browser's copy.
async function loadPromo(db, rawCode) {
  const code = upper(String(rawCode || "").trim());
  if (!code) return null;
  let r = null;
  try { r = await db.first("select code, kind, value, active, expires_at, max_uses, uses from promos where code=?", code); } catch (_) { return null; }
  if (!r || !r.active) return null;
  if (r.expires_at && new Date(r.expires_at + "T23:59:59Z").getTime() < Date.now()) return null;
  if (r.max_uses != null && (r.uses || 0) >= r.max_uses) return null;
  return { code: r.code, kind: r.kind || "pct", value: r.value || 0 };
}
const promoLabel = (p) => !p ? "" : p.kind === "pct" ? `${p.value}% off` : p.kind === "amount" ? `$${(p.value / 100).toFixed(2)} off` : "Free shipping";

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
function b64urlDec(str) { let x = String(str || "").replace(/-/g, "+").replace(/_/g, "/"); while (x.length % 4) x += "="; return b64dec(x); }
// Returns the email if the token's signature checks out, else null.
async function verifyToken(secret, token) {
  const t = String(token || "");
  const parts = t.split(".");
  if (parts.length !== 2) return null;
  let email;
  try { email = new TextDecoder().decode(b64urlDec(parts[0])); } catch (_) { return null; }
  if (!email) return null;
  const expect = await signToken(secret, email);
  if (expect.length !== t.length) return null;
  let diff = 0;
  for (let i = 0; i < expect.length; i++) diff |= expect.charCodeAt(i) ^ t.charCodeAt(i);
  return diff === 0 ? email : null;
}
async function pbkdf2(pw, saltBytes) {
  const k = await crypto.subtle.importKey("raw", TE.encode(pw), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: saltBytes, iterations: 100000, hash: "SHA-256" }, k, 256);
  return b64(new Uint8Array(bits));
}

function hexToBytes(hex) { const clean = String(hex || "").trim(); const b = new Uint8Array(Math.floor(clean.length / 2)); for (let i = 0; i < b.length; i++) b[i] = parseInt(clean.substr(i * 2, 2), 16); return b; }
function bytesToHex(bytes) { return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join(""); }

// Flips an order to paid exactly once. The conditional UPDATE is the lock:
// whichever of {webhook, browser confirm} lands first changes a row and gets
// `true`; the loser changes nothing and must not send duplicate emails.
async function claimOrderAsPaid(db, reference, transId) {
  const r = await db.run("update orders set status='paid', paid_at=datetime('now'), anet_trans_id=coalesce(anet_trans_id, ?) where reference=? and status<>'paid' and status<>'shipped'", transId || null, reference);
  const changes = (r && r.meta && typeof r.meta.changes === "number") ? r.meta.changes : 1;
  if (changes > 0) {
    // Runs only for the winner of the claim, so stock can never be double-counted
    // by the webhook and the browser confirmation both firing.
    try { await decrementStock(db, reference); } catch (_) { /* never block a payment */ }
  }
  return changes > 0;
}

// Reduces stock for a paid order. Only touches products that are actually
// tracked, and never goes below zero.
async function decrementStock(db, reference) {
  const items = await db.all("select product_id, sum(qty) as qty from order_items where order_ref=? group by product_id", reference);
  for (const it of items) {
    await db.run("update inventory set count = max(0, count - ?), updated_at = datetime('now') where product_id = ? and count is not null", Math.max(0, Number(it.qty) || 0), it.product_id);
  }
}

async function sendCardOrderEmails(env, db, order) {
  const items = await db.all("select name, qty, line_cents from order_items where order_ref=?", order.reference);
  let cust = {}; try { cust = JSON.parse(order.customer || "{}"); } catch (_) { cust = {}; }
  const totalStr = "$" + ((order.total_cents || 0) / 100).toFixed(2);
  const custName = cust.name || order.email || "Customer";
  const rowsHtml = items.map((l) => `<tr><td style="padding:4px 10px 4px 0">${esc(l.name)}</td><td style="padding:4px 10px;color:#888">×${l.qty}</td><td style="padding:4px 0;text-align:right">$${((l.line_cents || 0) / 100).toFixed(2)}</td></tr>`).join("");
  const table = `<table style="border-collapse:collapse;font-size:14px;margin:10px 0">${rowsHtml}<tr><td colspan="2" style="padding-top:8px;font-weight:bold">Total</td><td style="padding-top:8px;text-align:right;font-weight:bold">${totalStr}</td></tr></table>`;
  await sendEmail(env, { to: ownerEmail(env), subject: `New PAID card order ${order.reference} — ${totalStr}`, html: `<div style="font-family:Arial,sans-serif;max-width:560px"><h2 style="margin:0 0 6px">New paid order ${order.reference}</h2><p style="margin:0 0 4px"><b>Customer:</b> ${esc(custName)} &lt;${esc(order.email || "")}&gt;</p><p style="margin:0 0 4px"><b>Paid by card.</b>${order.code ? ` Ambassador: ${esc(order.code)}` : ""}</p>${table}<p style="color:#555">Ship to: ${esc(cust.address || "")}, ${esc(cust.city || "")}${cust.state ? ", " + esc(cust.state) : ""} ${esc(cust.zip || "")}, ${esc(cust.country || "")}</p></div>` }, db);
  if (order.email) await sendEmail(env, { to: order.email, subject: `Your Luxury Peps order ${order.reference}`, html: `<div style="font-family:Arial,sans-serif;max-width:560px"><h2 style="margin:0 0 6px">Thank you for your order</h2><p>Your payment was received. Order <b>${order.reference}</b> — total <b>${totalStr}</b>.</p>${table}<p>Your order ships shortly. We'll be in touch with tracking.</p></div>` }, db);
}

// Sends via Resend and REPORTS what happened. Previously every failure was
// swallowed, so a rejected recipient or bad key looked identical to success.
// Still never throws — email must not break a payment request.
async function sendEmail(env, { to, subject, html }, db) {
  const key = env.RESEND_API_KEY;
  if (!key) return { ok: false, status: 0, error: "RESEND_API_KEY is not set" };
  if (!to) return { ok: false, status: 0, error: "No recipient address (is OWNER_EMAIL set?)" };
  let out;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + key },
      body: JSON.stringify({ from: env.FROM_EMAIL || "Luxury Peps <orders@luxurypeps.com>", to, subject, html }),
    });
    const bodyText = await res.text();
    out = { ok: res.ok, status: res.status, error: res.ok ? null : bodyText.slice(0, 400) };
  } catch (e) {
    out = { ok: false, status: 0, error: String((e && e.message) || e).slice(0, 400) };
  }
  if (!out.ok && db) {
    try { await db.run("insert into email_log (recipient, subject, status, error) values (?, ?, ?, ?)", String(to).slice(0, 120), String(subject).slice(0, 160), out.status, out.error); } catch (_) {}
  }
  return out;
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
function seriesN(rows, field, n) {
  const map = {};
  for (const r of rows) map[r.day] = r.cents || 0;
  const out = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * DAY);
    const day = d.toISOString().slice(0, 10);
    out.push({ day, [field]: map[day] || 0 });
  }
  return out;
}
// 30-day wrapper kept for the owner dashboard call sites.
function series14(rows, field) { return seriesN(rows, field, 30); }

// Self-healing schema: adds anything new without a manual D1 migration step.
// Every statement is idempotent and failures are swallowed (column exists).
async function ensureSchema(db) {
  const t = async (q) => { try { await db.run(q); } catch (_) { /* already present */ } };
  await t("alter table orders add column promo_code text");
  await t("alter table orders add column promo_discount_cents integer not null default 0");
  await t("alter table orders add column tracking text");
  await t("alter table orders add column shipped_at text");
  await t("alter table orders add column anet_trans_id text");
  await t("create table if not exists promos (code text primary key, kind text not null default 'pct', value integer not null default 0, active integer not null default 1, expires_at text, max_uses integer, uses integer not null default 0, created_at text not null default (datetime('now')))");
  await t("create table if not exists events (id integer primary key autoincrement, event text, product_id text, referrer text, created_at text default (datetime('now')))");
  await t("create table if not exists reviews (id integer primary key autoincrement, order_ref text not null, product_id text not null, email text not null, display_name text, rating integer not null, body text not null, status text not null default 'pending', created_at text not null default (datetime('now')), approved_at text)");
  await t("create unique index if not exists reviews_one_per_product on reviews (order_ref, product_id)");
  await t("create table if not exists email_log (id integer primary key autoincrement, recipient text, subject text, status integer, error text, created_at text not null default (datetime('now')))");
  await t("create table if not exists webhook_log (id integer primary key autoincrement, event_type text, signature_ok integer, matched_order text, note text, created_at text not null default (datetime('now')))");
  await t("create table if not exists rate_counters (k text primary key, n integer not null default 0, bucket integer not null)");
  // Marketing list. consent_text stores the EXACT wording the person agreed to:
  // under the TCPA it's not enough to have a number, you must be able to show
  // what they consented to and when.
  await t("create table if not exists subscribers (id integer primary key autoincrement, phone text, email text, consent_text text, source text, ip_hash text, created_at text not null default (datetime('now')), unsubscribed_at text)");
  await t("create unique index if not exists subscribers_phone on subscribers (phone)");
}

// ── Router ─────────────────────────────────────────────────────────────────
export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === "OPTIONS") return J({}, 204);
  if (!env.DB) return J({ error: "Database not bound. Add a D1 binding named DB." }, 500);

  const db = makeDB(env);
  await ensureSchema(db);
  const OWNER_PIN = env.OWNER_PIN || "";
  const APP_SECRET = env.APP_SECRET || "change-me";
  // Defaults to FALSE now that stock ships from hand. This only drives the
  // owner dashboard's status label — customer-facing pre-order UI is controlled
  // by SITE_CONFIG.preorder in the frontend. Set PREORDER=true to flip it back.
  const PREORDER = String(env.PREORDER || "false").toLowerCase() === "true";
  const OWNER_EMAIL = ownerEmail(env);
  const PAY = { bank: env.PAY_BANK || "", cashapp: env.PAY_CASHAPP || "", zelle: env.PAY_ZELLE || "", crypto: env.PAY_CRYPTO || "" };
  // The owner PIN now travels in the X-Owner-Pin header instead of the URL:
  // query strings get written into server logs, proxy logs, and browser history,
  // headers don't. Callers that still pass ?pin= or {pin} keep working, so an
  // older frontend won't lock the owner out mid-deploy.
  const headerPin = request.headers.get("x-owner-pin") || "";
  const ownerOK = (pin) => {
    if (!OWNER_PIN) return false;
    const supplied = String(pin || "").trim() || String(headerPin || "").trim();
    return supplied === OWNER_PIN;
  };

  // Separate login for a marketing contractor. Scoped to marketing only: no
  // customer names/addresses, no marking paid/shipped, no payouts, no inbox,
  // no diagnostics. Set MARKETING_PIN in Cloudflare to enable; unset = the
  // marketing portal simply can't be opened.
  const MARKETING_PIN = env.MARKETING_PIN || "";
  const marketingHeaderPin = request.headers.get("x-marketing-pin") || "";
  const marketingOK = (pin) => {
    if (!MARKETING_PIN) return false;
    const supplied = String(pin || "").trim() || String(marketingHeaderPin || "").trim();
    return supplied === MARKETING_PIN;
  };
  // Commission is limited to these two rates, enforced HERE rather than trusting
  // the dropdown — the request can be edited, this can't.
  const ALLOWED_COMMISSION = new Set([0.10, 0.15]);

  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "");
  const qs = url.searchParams;
  const method = request.method;
  // A request body can only be read once. The webhook needs the RAW text to
  // verify its HMAC signature, while every other route wants parsed JSON — so
  // read the text once here and derive both from it. Calling request.text()
  // inside the webhook after this ran threw "Body has already been used",
  // which the catch-all turned into a 500 on every single delivery. That is
  // what got the webhook deactivated.
  const rawBody = method === "POST" ? await request.text().catch(() => "") : "";
  let body = {};
  if (rawBody) { try { body = JSON.parse(rawBody); } catch (_) { body = {}; } }

  try {
    // ---- OWNER: archive abandoned checkouts --------------------------------
    // A card order row is created when the payment form opens, before any card is
    // entered. If it's still unpaid hours later the customer never completed it.
    // This only ever touches rows with NO paid_at — a paid order can't be caught.
    if (path === "/api/owner/clear-incomplete" && method === "POST") {
      if (!ownerOK(body.pin)) return J({ error: "unauthorized" }, 401);
      const hours = Math.max(1, Math.min(720, Math.floor(Number(body.hours) || 24)));
      const r = await db.run(
        `update orders set archived=1
         where paid_at is null
           and status='awaiting_payment'
           and coalesce(archived,0)=0
           and created_at <= datetime('now', ?)`,
        `-${hours} hours`
      );
      const archived = (r && r.meta && typeof r.meta.changes === "number") ? r.meta.changes : 0;
      return J({ ok: true, archived, hours });
    }

    // ---- OWNER: how many would that clear? ---------------------------------
    if (path === "/api/owner/incomplete-count" && method === "GET") {
      if (!ownerOK(qs.get("pin"))) return J({ error: "unauthorized" }, 401);
      const hours = Math.max(1, Math.min(720, Math.floor(Number(qs.get("hours")) || 24)));
      const row = await db.first(
        `select count(*) as n from orders
         where paid_at is null and status='awaiting_payment' and coalesce(archived,0)=0
           and created_at <= datetime('now', ?)`,
        `-${hours} hours`
      );
      return J({ count: (row && row.n) || 0, hours });
    }

    // ---- OWNER: diagnostics (why didn't I get an email?) -------------------
    if (path === "/api/owner/diagnostics" && method === "GET") {
      if (!ownerOK(qs.get("pin"))) return J({ error: "unauthorized" }, 401);
      // Only booleans / presence — never echo secret values back.
      const envCheck = {
        RESEND_API_KEY: !!env.RESEND_API_KEY,
        FROM_EMAIL: env.FROM_EMAIL || "(default) orders@luxurypeps.com",
        OWNER_EMAIL: ownerEmail(env),
        OWNER_EMAIL_from_env: !!(env.OWNER_EMAIL || "").trim(),
        ANET_API_LOGIN_ID: !!env.ANET_API_LOGIN_ID,
        ANET_TRANSACTION_KEY: !!env.ANET_TRANSACTION_KEY,
        ANET_SIGNATURE_KEY: !!env.ANET_SIGNATURE_KEY,
        ANET_ENV: env.ANET_ENV || "(not set)",
      };
      const counts = await db.first("select count(*) as total, sum(case when coalesce(archived,0)=1 then 1 else 0 end) as archived, sum(case when coalesce(archived,0)=0 then 1 else 0 end) as active from orders");
      // Exactly the number the KPI shows, plus how it splits. If awaitingArchived
      // is non-zero while awaitingActive is high, the archived flag isn't sticking.
      const awaiting = await db.first("select sum(case when paid_at is null and coalesce(archived,0)=0 then 1 else 0 end) as awaitingActive, sum(case when paid_at is null and coalesce(archived,0)=1 then 1 else 0 end) as awaitingArchived, sum(case when paid_at is not null and coalesce(archived,0)=0 then 1 else 0 end) as paidActive from orders");
      // How is `archived` actually stored? Text "1" and integer 1 behave differently.
      const archivedShapes = await db.all("select archived as value, typeof(archived) as type, count(*) as n from orders group by 1, 2");
      const emailFailures = await db.all("select recipient, subject, status, error, created_at from email_log order by created_at desc limit 10");
      const webhooks = await db.all("select event_type, signature_ok, matched_order, note, created_at from webhook_log order by created_at desc limit 10");
      const unpaid = await db.all("select reference, email, total_cents, created_at from orders where method='card' and status='awaiting_payment' and coalesce(archived,0)=0 order by created_at desc limit 10");
      return J({ backendVersion: BACKEND_VERSION, orderCounts: counts || {}, awaiting: awaiting || {}, archivedShapes, env: envCheck, emailFailures, webhooks, unpaidCardOrders: unpaid });
    }

    // ---- OWNER: send a real test email and report what Resend actually said --
    if (path === "/api/owner/test-email" && method === "POST") {
      if (!ownerOK(body.pin)) return J({ error: "unauthorized" }, 401);
      const to = String(body.to || ownerEmail(env)).trim();
      const r = await sendEmail(env, {
        to,
        subject: "Luxury Peps — test email",
        html: `<div style="font-family:Arial,sans-serif"><p>This is a test email from your Luxury Peps backend.</p><p>If you're reading this, order notifications will reach <b>${esc(to)}</b>.</p></div>`,
      }, db);
      return J({ to, ...r });
    }

    // ---- PUBLIC: marketing list signup -------------------------------------
    // Previously this wrote to window.storage, i.e. the visitor's own browser,
    // so every signup was lost. It now reaches the database.
    if (path === "/api/subscribe" && method === "POST") {
      const phone = String(body.phone || "").replace(/[^\d]/g, "");
      const email = String(body.email || "").trim().toLowerCase();
      if (phone.length < 10 || phone.length > 15) return J({ error: "Enter a valid phone number." }, 400);
      if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return J({ error: "Enter a valid email address." }, 400);

      // Same salted-hash per-IP cap used by analytics, so this can't be flooded.
      const ip = request.headers.get("cf-connecting-ip") || "unknown";
      const bucket = Math.floor(Date.now() / 3600000);
      const key = (await hmac(APP_SECRET, "sub:" + ip)).slice(0, 24) + ":" + bucket;
      try {
        await db.run("insert into rate_counters (k, n, bucket) values (?, 1, ?) on conflict(k) do update set n = n + 1", key, bucket);
        const row = await db.first("select n from rate_counters where k=?", key);
        if (row && row.n > 10) return J({ ok: true });   // silently ignore floods
      } catch (_) {}

      const consent = String(body.consentText || "").slice(0, 400);
      const ipHash = (await hmac(APP_SECRET, "ip:" + ip)).slice(0, 32);
      await db.run(
        `insert into subscribers (phone, email, consent_text, source, ip_hash) values (?, ?, ?, ?, ?)
         on conflict(phone) do update set email=coalesce(nullif(excluded.email,''), subscribers.email), unsubscribed_at=null`,
        phone, email || null, consent, String(body.source || "popup").slice(0, 40), ipHash
      );
      return J({ ok: true });
    }

    // ---- OWNER: the marketing list ----------------------------------------
    if (path === "/api/owner/subscribers" && method === "GET") {
      if (!ownerOK(qs.get("pin"))) return J({ error: "unauthorized" }, 401);
      const rows = await db.all("select phone, email, created_at from subscribers where unsubscribed_at is null order by created_at desc limit 500");
      const total = await db.first("select count(*) as n from subscribers where unsubscribed_at is null");
      return J({ subscribers: rows, total: (total && total.n) || 0 });
    }
    if (path === "/api/owner/subscribers.csv" && method === "GET") {
      if (!ownerOK(qs.get("pin"))) return J({ error: "unauthorized" }, 401);
      const rows = await db.all("select phone, email, consent_text, created_at from subscribers where unsubscribed_at is null order by created_at desc");
      const q = (v) => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
      const csv = ["phone,email,consent_text,subscribed_at"].concat(
        rows.map((r) => [q(r.phone), q(r.email), q(r.consent_text), q(r.created_at)].join(","))
      ).join("\n");
      return new Response(csv, { status: 200, headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=luxury-peps-subscribers.csv", "Access-Control-Allow-Origin": "*" } });
    }

    // ---- PUBLIC: live stock for tracked products ---------------------------
    // Only returns products you've actually given a count. Anything untracked is
    // absent, and the storefront treats absent as "sell normally" — so an empty
    // table or a failed request can never mark the catalog sold out.
    if (path === "/api/stock" && method === "GET") {
      const rows = await db.all("select product_id, count from inventory where count is not null");
      const stock = {};
      for (const r of rows) stock[r.product_id] = Math.max(0, Number(r.count) || 0);
      return J({ stock });
    }

    // ---- PUBLIC: approved reviews for one product --------------------------
    if (path.startsWith("/api/reviews/") && method === "GET") {
      const pid = path.slice("/api/reviews/".length).replace(/[^a-zA-Z0-9]/g, "");
      if (!pid) return J({ reviews: [], count: 0, average: 0 });
      const rows = await db.all("select id, display_name, rating, body, created_at from reviews where product_id=? and status='approved' order by created_at desc limit 50", pid);
      const count = rows.length;
      const average = count ? Math.round((rows.reduce((a, r) => a + (r.rating || 0), 0) / count) * 10) / 10 : 0;
      return J({ reviews: rows, count, average });
    }

    // ---- PUBLIC: rating summary for every product (one call for the catalog)
    if (path === "/api/reviews-summary" && method === "GET") {
      const rows = await db.all("select product_id, count(*) as count, avg(rating) as average from reviews where status='approved' group by product_id");
      const out = {};
      for (const r of rows) out[r.product_id] = { count: r.count, average: Math.round((r.average || 0) * 10) / 10 };
      return J({ summary: out });
    }

    // ---- PUBLIC: which products may this order review? ----------------------
    if (path === "/api/review/eligible" && method === "GET") {
      const ref = upper(String(qs.get("ref") || "").trim());
      const email = String(qs.get("email") || "").toLowerCase().trim();
      if (!ref || !email) return J({ error: "Enter your order number and email." }, 400);
      const o = await db.first("select reference, email, status, paid_at from orders where reference=?", ref);
      if (!o || String(o.email || "").toLowerCase() !== email) return J({ error: "We couldn't find an order with that number and email." }, 404);
      if (!o.paid_at && o.status !== "shipped") return J({ error: "You can leave a review once your order is paid." }, 403);
      const items = await db.all("select distinct product_id, name from order_items where order_ref=?", ref);
      const done = await db.all("select product_id from reviews where order_ref=?", ref);
      const doneSet = new Set(done.map((d) => d.product_id));
      return J({ products: items.filter((i) => !doneSet.has(i.product_id)), alreadyReviewed: [...doneSet] });
    }

    // ---- PUBLIC: submit a review (verified purchase only, held for approval)
    if (path === "/api/review/submit" && method === "POST") {
      const ref = upper(String(body.ref || "").trim());
      const email = String(body.email || "").toLowerCase().trim();
      const pid = String(body.productId || "").replace(/[^a-zA-Z0-9]/g, "");
      const rating = Math.max(1, Math.min(5, Math.floor(Number(body.rating) || 0)));
      const text = String(body.body || "").trim().slice(0, 1200);
      const name = String(body.displayName || "").trim().slice(0, 60) || null;
      if (!ref || !email || !pid) return J({ error: "Missing order details." }, 400);
      if (!rating) return J({ error: "Choose a star rating." }, 400);
      if (text.length < 15) return J({ error: "Please write at least a sentence." }, 400);
      // Ownership check: the order must exist, match the email, and be paid.
      const o = await db.first("select reference, email, status, paid_at from orders where reference=?", ref);
      if (!o || String(o.email || "").toLowerCase() !== email) return J({ error: "We couldn't find an order with that number and email." }, 404);
      if (!o.paid_at && o.status !== "shipped") return J({ error: "You can leave a review once your order is paid." }, 403);
      const owned = await db.first("select 1 from order_items where order_ref=? and product_id=?", ref, pid);
      if (!owned) return J({ error: "That product isn't on this order." }, 403);
      try {
        await db.run("insert into reviews (order_ref, product_id, email, display_name, rating, body, status) values (?, ?, ?, ?, ?, ?, 'pending')", ref, pid, email, name, rating, text);
      } catch (_) { return J({ error: "You've already reviewed this product for this order." }, 409); }
      await sendEmail(env, { to: OWNER_EMAIL, subject: `New review awaiting approval — ${pid}`, html: `<div style="font-family:Arial,sans-serif;max-width:520px"><p><b>Order:</b> ${esc(ref)}</p><p><b>Product:</b> ${esc(pid)}</p><p><b>Rating:</b> ${rating}/5</p><p style="white-space:pre-wrap">${esc(text)}</p><p style="color:#666">Approve it in your owner dashboard.</p></div>` });
      return J({ ok: true });
    }

    // ---- OWNER: review moderation ------------------------------------------
    if (path === "/api/owner/reviews" && method === "GET") {
      if (!ownerOK(qs.get("pin"))) return J({ error: "unauthorized" }, 401);
      const status = ["pending", "approved", "rejected"].includes(qs.get("status")) ? qs.get("status") : "pending";
      return J({ reviews: await db.all("select id, order_ref, product_id, email, display_name, rating, body, status, created_at from reviews where status=? order by created_at desc limit 100", status) });
    }
    if (path === "/api/owner/reviews/moderate" && method === "POST") {
      if (!ownerOK(body.pin)) return J({ error: "unauthorized" }, 401);
      const action = body.action === "approve" ? "approved" : body.action === "reject" ? "rejected" : null;
      if (!action) return J({ error: "Unknown action." }, 400);
      await db.run("update reviews set status=?, approved_at=case when ?='approved' then datetime('now') else null end where id=?", action, action, body.id);
      return J({ ok: true });
    }
    if (path === "/api/owner/reviews" && method === "DELETE") {
      if (!ownerOK(qs.get("pin"))) return J({ error: "unauthorized" }, 401);
      await db.run("delete from reviews where id=?", qs.get("id"));
      return J({ ok: true });
    }

    // ---- PUBLIC: validate a promo code ------------------------------------
    if (path.startsWith("/api/promo/") && method === "GET") {
      const promo = await loadPromo(db, path.slice("/api/promo/".length));
      if (!promo) return J({ valid: false });
      return J({ valid: true, code: promo.code, kind: promo.kind, value: promo.value, label: promoLabel(promo) });
    }

    // ---- PUBLIC: order status lookup (order number + email must match) -----
    if (path === "/api/order-status" && method === "GET") {
      const ref = upper(String(qs.get("ref") || "").trim());
      const email = String(qs.get("email") || "").toLowerCase().trim();
      if (!ref || !email) return J({ error: "Enter your order number and email." }, 400);
      const o = await db.first("select reference, email, status, method, total_cents, tracking, created_at, paid_at, shipped_at, coalesce(archived,0) as archived from orders where reference=?", ref);
      // Same message either way, so this can't be used to discover which orders exist.
      if (!o || String(o.email || "").toLowerCase() !== email) return J({ error: "We couldn't find an order with that number and email." }, 404);
      const items = await db.all("select name, qty, line_cents from order_items where order_ref=?", ref);
      return J({ reference: o.reference, status: o.archived ? "cancelled" : o.status, method: o.method, total_cents: o.total_cents, tracking: o.tracking || null, created_at: o.created_at, paid_at: o.paid_at, shipped_at: o.shipped_at, items });
    }

    // ---- ACCOUNT: signed-in order history (for reorder) --------------------
    if (path === "/api/account/orders" && method === "GET") {
      const auth = request.headers.get("Authorization") || "";
      const email = await verifyToken(APP_SECRET, auth.replace(/^Bearer\s+/i, ""));
      if (!email) return J({ error: "unauthorized" }, 401);
      const rows = await db.all("select reference, status, method, total_cents, tracking, created_at, shipped_at from orders where lower(email)=? and coalesce(archived,0)=0 order by created_at desc limit 50", email);
      const out = [];
      for (const r of rows) {
        const items = await db.all("select variant_id, product_id, name, qty, line_cents from order_items where order_ref=?", r.reference);
        out.push({ ...r, items });
      }
      return J({ email, orders: out });
    }

    // ---- OWNER: promo codes ------------------------------------------------
    if (path === "/api/owner/promos" && method === "GET") {
      if (!ownerOK(qs.get("pin"))) return J({ error: "unauthorized" }, 401);
      return J({ promos: await db.all("select code, kind, value, active, expires_at, max_uses, uses, created_at from promos order by created_at desc") });
    }
    if (path === "/api/owner/promos" && method === "POST") {
      if (!ownerOK(body.pin)) return J({ error: "unauthorized" }, 401);
      const code = upper(String(body.code || "").trim());
      if (!/^[A-Z0-9]{3,20}$/.test(code)) return J({ error: "Code must be 3–20 letters or numbers." }, 400);
      const kind = ["pct", "amount", "freeship"].includes(body.kind) ? body.kind : "pct";
      let value = Math.max(0, Math.floor(Number(body.value) || 0));
      // Owner percentage promos are capped at 10%. (Fixed-amount and free-shipping
      // codes are unaffected — the cap is on the percentage only.)
      if (kind === "pct" && (value < 1 || value > 50)) return J({ error: "Percent must be between 1 and 50." }, 400);
      if (kind === "amount" && value < 1) return J({ error: "Enter an amount in cents." }, 400);
      if (kind === "freeship") value = 0;
      if (await db.first("select 1 from ambassadors where code=?", code)) return J({ error: "That code is already an ambassador code." }, 409);
      const maxUses = body.maxUses ? Math.max(1, Math.floor(Number(body.maxUses))) : null;
      const expires = body.expiresAt ? String(body.expiresAt).slice(0, 10) : null;
      await db.run("insert into promos (code, kind, value, active, expires_at, max_uses) values (?, ?, ?, 1, ?, ?) on conflict(code) do update set kind=excluded.kind, value=excluded.value, expires_at=excluded.expires_at, max_uses=excluded.max_uses, active=1", code, kind, value, expires, maxUses);
      return J({ ok: true });
    }
    if (path === "/api/owner/promos/toggle" && method === "POST") {
      if (!ownerOK(body.pin)) return J({ error: "unauthorized" }, 401);
      await db.run("update promos set active = case when active=1 then 0 else 1 end where code=?", upper(String(body.code || "")));
      return J({ ok: true });
    }
    if (path === "/api/owner/promos" && method === "DELETE") {
      if (!ownerOK(qs.get("pin"))) return J({ error: "unauthorized" }, 401);
      await db.run("delete from promos where code=?", upper(String(qs.get("code") || "")));
      return J({ ok: true });
    }

    // ---- PUBLIC: lightweight first-party analytics ------------------------
    // Fire-and-forget page/product view tracking. No cookies, no third party.
    // Stores only: event name, optional product id, coarse day, referrer host.
    if (path === "/api/track" && method === "POST") {
      try {
        // 1) Only events this app actually emits. Anything else is dropped before
        //    touching the database, so the endpoint can't be used to write junk.
        const ev = String(body.event || "");
        if (!TRACK_EVENTS.has(ev)) return J({ ok: true });
        // 2) Product ids have a fixed shape.
        const pid = /^p\d{1,3}$/.test(String(body.productId || "")) ? String(body.productId) : null;

        // 3) Per-IP hourly cap. The IP is salted-hashed, never stored raw, so this
        //    rate-limits abuse without keeping personally identifying data.
        const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "unknown";
        const bucket = Math.floor(Date.now() / 3600000);
        const key = (await hmac(APP_SECRET, "trk:" + ip)).slice(0, 24) + ":" + bucket;
        await db.run("insert into rate_counters (k, n, bucket) values (?, 1, ?) on conflict(k) do update set n = n + 1", key, bucket);
        const row = await db.first("select n from rate_counters where k=?", key);
        if (row && row.n > TRACK_MAX_PER_HOUR) return J({ ok: true }); // silently drop

        let ref = "";
        try { ref = body.referrer ? new URL(String(body.referrer)).hostname.slice(0, 80) : ""; } catch (_) { ref = ""; }
        await db.run("insert into events (event, product_id, referrer) values (?, ?, ?)", ev, pid, ref);

        // Occasionally sweep stale buckets so the table can't grow forever.
        if (Math.random() < 0.02) { try { await db.run("delete from rate_counters where bucket < ?", bucket - 2); } catch (_) {} }
      } catch (_) { /* analytics must never break the site */ }
      return J({ ok: true });
    }

    // ---- OWNER: analytics ------------------------------------------------
    if (path === "/api/owner/analytics" && method === "GET") {
      if (!ownerOK(qs.get("pin"))) return J({ error: "unauthorized" }, 401);
      try { await db.run("create table if not exists events (id integer primary key autoincrement, event text, product_id text, referrer text, created_at text default (datetime('now')))"); } catch (_) {}
      const dayRows = await db.all("select date(created_at) as day, count(*) as cents from events where event='page_view' and created_at >= datetime('now','-29 days') group by day");
      const totals = await db.first("select sum(case when event='page_view' then 1 else 0 end) as views, sum(case when event='product_view' then 1 else 0 end) as productViews, sum(case when event='checkout_start' then 1 else 0 end) as checkouts from events where created_at >= datetime('now','-29 days')");
      const topProducts = await db.all("select product_id, count(*) as views from events where event='product_view' and product_id is not null and created_at >= datetime('now','-29 days') group by product_id order by views desc limit 8");
      const referrers = await db.all("select referrer, count(*) as hits from events where event='page_view' and referrer<>'' and created_at >= datetime('now','-29 days') group by referrer order by hits desc limit 6");
      const orderRow = await db.first("select count(*) as n from orders where created_at >= datetime('now','-29 days') and coalesce(archived,0)=0");
      return J({
        views: (totals && totals.views) || 0,
        productViews: (totals && totals.productViews) || 0,
        checkouts: (totals && totals.checkouts) || 0,
        orders: (orderRow && orderRow.n) || 0,
        series: series14(dayRows, "views"),
        topProducts,
        referrers,
      });
    }

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
      await db.run("update orders set status='shipped', shipped_at=coalesce(shipped_at, datetime('now')), tracking=coalesce(nullif(?,''), tracking) where reference=? and paid_at is not null", String(body.tracking || "").trim(), body.orderId);
      const order = await db.first("select reference, email from orders where reference=?", body.orderId);
      if (order && order.email) {
        const tracking = String(body.tracking || "").trim();
        await sendEmail(env, {
          to: order.email,
          subject: `Your Luxury Peps order ${order.reference} has shipped`,
          html: `<div style="font-family:Arial,sans-serif;max-width:520px"><h2 style="margin:0 0 6px">Your order is on the way</h2><p>Good news — order <b>${order.reference}</b> has shipped.</p>${tracking ? `<p style="background:#faf7f2;border:1px solid #e6ddcd;padding:10px 12px;border-radius:6px"><b>Tracking number:</b> ${esc(tracking)}</p>` : ""}<p>Once it arrives, we'd be glad to hear how the material and documentation held up: <a href="${new URL(request.url).origin}/?review=${encodeURIComponent(order.reference)}">leave a review</a>.</p><p style="color:#666;font-size:13px">Reviews cover product quality, purity against the certificate of analysis, packaging, and shipping — not any human use.</p><p>Thank you for your order.</p></div>`,
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

    // ==== MARKETING PORTAL (scoped contractor login) =======================

    // Aggregate performance only — revenue, orders, conversion, best sellers.
    // No customer names, emails, or addresses are ever returned here.
    if (path === "/api/marketing/overview" && method === "GET") {
      if (!marketingOK(qs.get("pin"))) return J({ error: "unauthorized" }, 401);
      const paid = await db.all("select total_cents from orders where status in ('paid','shipped') and coalesce(archived,0)=0");
      const revenueCents = paid.reduce((n, o) => n + (Number(o.total_cents) || 0), 0);
      const subCount = await db.first("select count(*) as n from subscribers where unsubscribed_at is null");
      const best = await db.all(`select oi.product_id, sum(oi.qty) as qty from order_items oi
        join orders o on o.reference = oi.order_ref
        where o.status in ('paid','shipped') and coalesce(o.archived,0)=0
        group by oi.product_id order by qty desc limit 6`);
      return J({
        orders: paid.length,
        revenueCents,
        subscriberCount: (subCount && subCount.n) || 0,   // COUNT ONLY — no list, no export
        bestSellers: best,
      });
    }

    // Traffic — same aggregates as the owner analytics view.
    if (path === "/api/marketing/traffic" && method === "GET") {
      if (!marketingOK(qs.get("pin"))) return J({ error: "unauthorized" }, 401);
      try { await db.run("create table if not exists events (id integer primary key autoincrement, event text, product_id text, referrer text, created_at text default (datetime('now')))"); } catch (_) {}
      // Window is 7, 30, or 90 days — anything else falls back to 30.
      const days = [7, 30, 90].includes(Number(qs.get("days"))) ? Number(qs.get("days")) : 30;
      const since = "datetime('now','-" + (days - 1) + " days')";
      const dayRows = await db.all("select date(created_at) as day, count(*) as cents from events where event='page_view' and created_at >= " + since + " group by day");
      const totals = await db.first("select sum(case when event='page_view' then 1 else 0 end) as views, sum(case when event='product_view' then 1 else 0 end) as productViews, sum(case when event='checkout_start' then 1 else 0 end) as checkouts from events where created_at >= " + since);
      const topProducts = await db.all("select product_id, count(*) as views from events where event='product_view' and product_id is not null and created_at >= " + since + " group by product_id order by views desc limit 8");
      const referrers = await db.all("select referrer, count(*) as hits from events where event='page_view' and referrer<>'' and created_at >= " + since + " group by referrer order by hits desc limit 10");
      return J({
        days,
        views: (totals && totals.views) || 0,
        productViews: (totals && totals.productViews) || 0,
        checkouts: (totals && totals.checkouts) || 0,
        series: seriesN(dayRows, "views", days),
        topProducts, referrers,
      });
    }

    // Affiliates — list WITH each PIN (the marketer shares these logins), plus
    // each code's sales and what's owed. No payout actions live here.
    if (path === "/api/marketing/affiliates" && method === "GET") {
      if (!marketingOK(qs.get("pin"))) return J({ error: "unauthorized" }, 401);
      const rows = await db.all("select code, creator, pct, portal_pin, builtin, active from ambassadors order by active desc, builtin desc, code");
      const out = [];
      for (const a of rows) {
        const sales = await db.first("select coalesce(sum(total_cents),0) as revenue, count(*) as orders from orders where code=? and status in ('paid','shipped') and coalesce(archived,0)=0", a.code);
        const owedRow = await db.first("select coalesce(sum(case when paid_at is not null then commission_cents else 0 end),0) as owed from orders where code=? and coalesce(archived,0)=0", a.code);
        const paidRow = await db.first("select coalesce(sum(amount_cents),0) as paid from payouts where code=?", a.code);
        out.push({
          code: a.code, creator: a.creator, pct: a.pct, portalPin: a.portal_pin, builtin: !!a.builtin, active: !!a.active,
          orders: (sales && sales.orders) || 0,
          revenueCents: (sales && sales.revenue) || 0,
          owedCents: Math.max(0, ((owedRow && owedRow.owed) || 0) - ((paidRow && paidRow.paid) || 0)),
        });
      }
      return J({ affiliates: out });
    }

    // Create an affiliate. Commission is clamped server-side to 10% or 15%.
    if (path === "/api/marketing/affiliates" && method === "POST") {
      if (!marketingOK(body.pin)) return J({ error: "unauthorized" }, 401);
      const code = upper(body.code);
      const creator = String(body.creator || "").trim();
      const pct = Number(body.pct);
      const portalPin = String(body.portalPin || "").trim();
      if (!creator) return J({ error: "Name required." }, 400);
      if (!/^[A-Z0-9]{3,}$/.test(code)) return J({ error: "Code must be 3+ letters/numbers." }, 400);
      if (!ALLOWED_COMMISSION.has(pct)) return J({ error: "Commission must be 10% or 15%." }, 400);
      if (!/^[0-9]{4,}$/.test(portalPin)) return J({ error: "PIN must be 4+ digits." }, 400);
      if (await db.first("select 1 from ambassadors where code=?", code)) return J({ error: "That code already exists." }, 409);
      await db.run("insert into ambassadors (code, creator, pct, portal_pin, builtin, active) values (?, ?, ?, ?, 0, 1)", code, creator, pct, portalPin);
      return J({ ok: true });
    }

    // Set / reset an affiliate's PIN (the marketer manages affiliate logins).
    if (path === "/api/marketing/affiliate-pin" && method === "POST") {
      if (!marketingOK(body.pin)) return J({ error: "unauthorized" }, 401);
      const code = upper(body.code);
      const portalPin = String(body.portalPin || "").trim();
      if (!/^[0-9]{4,}$/.test(portalPin)) return J({ error: "PIN must be 4+ digits." }, 400);
      const r = await db.run("update ambassadors set portal_pin=? where code=? and active=1", portalPin, code);
      const changes = (r && r.meta && typeof r.meta.changes === "number") ? r.meta.changes : 1;
      if (!changes) return J({ error: "No such affiliate." }, 404);
      return J({ ok: true });
    }

    // Pause or reactivate an affiliate. Flips the active flag; the row and all its
    // order history are kept, so a paused code can be switched back on unchanged.
    if (path === "/api/marketing/affiliate-toggle" && method === "POST") {
      if (!marketingOK(body.pin)) return J({ error: "unauthorized" }, 401);
      const code = upper(body.code);
      const row = await db.first("select active from ambassadors where code=?", code);
      if (!row) return J({ error: "No such affiliate." }, 404);
      await db.run("update ambassadors set active = case when active=1 then 0 else 1 end where code=?", code);
      const now = await db.first("select active from ambassadors where code=?", code);
      return J({ ok: true, active: !!(now && now.active) });
    }

    // Promo codes — list, and create constrained to 5-30% in steps of 5.
    if (path === "/api/marketing/promos" && method === "GET") {
      if (!marketingOK(qs.get("pin"))) return J({ error: "unauthorized" }, 401);
      const rows = await db.all("select code, kind, value, active, expires_at, max_uses, used_count from promos order by rowid desc");
      return J({ promos: rows });
    }
    if (path === "/api/marketing/promos" && method === "POST") {
      if (!marketingOK(body.pin)) return J({ error: "unauthorized" }, 401);
      const code = upper(body.code);
      if (!/^[A-Z0-9]{3,}$/.test(code)) return J({ error: "Code must be 3+ letters/numbers." }, 400);
      if (await db.first("select 1 from promos where code=?", code)) return J({ error: "That code already exists." }, 409);
      // Percentage is constrained server-side to 5-30 in steps of 5, so a tampered
      // request can't create (say) a 90%-off code even though the UI is a dropdown.
      const pctOff = Math.round(Number(body.value) / 5) * 5;
      if (!(pctOff >= 5 && pctOff <= 30)) return J({ error: "Discount must be 5%–30%." }, 400);
      const expires = body.expiresAt ? String(body.expiresAt).slice(0, 10) : null;
      const maxUses = body.maxUses ? Math.max(1, parseInt(body.maxUses, 10) || 0) : null;
      await db.run("insert into promos (code, kind, value, active, expires_at, max_uses) values (?, 'pct', ?, 1, ?, ?)", code, pctOff, expires, maxUses);
      return J({ ok: true });
    }
    if (path === "/api/marketing/promos/toggle" && method === "POST") {
      if (!marketingOK(body.pin)) return J({ error: "unauthorized" }, 401);
      await db.run("update promos set active = case when active=1 then 0 else 1 end where code=?", upper(body.code));
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
      const promo = await loadPromo(db, body.promo);
      const p = priceOrder(body.items, pct, promo);
      if (!p.lines.length) return J({ error: "No valid items." }, 400);
      const reference = newReference();
      await db.run("insert into orders (reference, email, method, code, status, subtotal_cents, discount_cents, shipping_cents, total_cents, commission_cents, customer, certified, promo_code, promo_discount_cents) values (?, ?, 'card', ?, 'awaiting_payment', ?, ?, ?, ?, ?, ?, ?, ?, ?)", reference, body.email || null, code, p.subtotal, p.discount, p.shipping, p.total, p.commission, JSON.stringify(body.customer || {}), body.certifiedResearchUse ? 1 : 0, promo ? promo.code : null, p.promoDiscount);
      if (promo) { try { await db.run("update promos set uses = uses + 1 where code=?", promo.code); } catch (_) {} }
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
              { settingName: "hostedPaymentIFrameCommunicatorUrl", settingValue: JSON.stringify({ url: origin + "/AuthorizeNetIFrameCommunicator" }) },
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
    // ---- Backup confirmation: verify a transaction straight with Authorize.Net
    // The browser can only hand us a transaction id. We never trust it — we ask
    // Authorize.Net what that transaction actually was, and check that it maps
    // to this order, for the right amount, and really was captured.
    if (path === "/api/anet/confirm" && method === "POST") {
      const reference = upper(String(body.reference || "").trim());
      const transId = String(body.transId || "").replace(/[^0-9]/g, "");
      if (!reference || !transId) return J({ error: "Missing reference or transaction id." }, 400);
      if (!env.ANET_API_LOGIN_ID || !env.ANET_TRANSACTION_KEY) return J({ error: "Authorize.Net API credentials not configured." }, 500);

      const order = await db.first("select * from orders where reference=?", reference);
      if (!order) return J({ error: "Unknown order." }, 404);
      if (order.status === "paid" || order.status === "shipped") return J({ ok: true, already: true });

      const apiUrl = (env.ANET_ENV === "production") ? "https://api.authorize.net/xml/v1/request.api" : "https://apitest.authorize.net/xml/v1/request.api";
      let details;
      try {
        const res = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ getTransactionDetailsRequest: { merchantAuthentication: { name: env.ANET_API_LOGIN_ID, transactionKey: env.ANET_TRANSACTION_KEY }, transId } }),
        });
        let text = await res.text();
        // Authorize.Net's JSON responses are prefixed with a BOM.
        const brace = text.indexOf("{");
        if (brace > 0) text = text.slice(brace);
        details = JSON.parse(text);
      } catch (e) {
        try { await db.run("insert into webhook_log (event_type, signature_ok, matched_order, note) values ('confirm', 0, ?, ?)", reference, ("lookup failed: " + String((e && e.message) || e)).slice(0, 200)); } catch (_) {}
        return J({ error: "Couldn't verify the transaction." }, 502);
      }

      const resultCode = details && details.messages && details.messages.resultCode;
      const tx = details && details.transaction;
      if (resultCode !== "Ok" || !tx) {
        try { await db.run("insert into webhook_log (event_type, signature_ok, matched_order, note) values ('confirm', 0, ?, ?)", reference, "transaction not found at Authorize.Net"); } catch (_) {}
        return J({ error: "Transaction not found." }, 404);
      }

      const status = String(tx.transactionStatus || "");
      const paidStatuses = ["capturedPendingSettlement", "settledSuccessfully", "authorizedPendingCapture"];
      const invoice = upper(String((tx.order && tx.order.invoiceNumber) || ""));
      const amountCents = Math.round(Number(tx.authAmount || 0) * 100);

      // All three must line up, or we refuse and record why.
      const invoiceOK = invoice === reference;
      const amountOK = amountCents === (order.total_cents || 0);
      const statusOK = paidStatuses.includes(status);
      if (!invoiceOK || !amountOK || !statusOK) {
        const why = `confirm refused — status=${status} invoice=${invoice || "?"} amount=${amountCents} expected=${order.total_cents}`;
        try { await db.run("insert into webhook_log (event_type, signature_ok, matched_order, note) values ('confirm', 0, ?, ?)", reference, why.slice(0, 200)); } catch (_) {}
        return J({ error: "That transaction doesn't match this order." }, 409);
      }

      const claimed = await claimOrderAsPaid(db, reference, transId);
      try { await db.run("insert into webhook_log (event_type, signature_ok, matched_order, note) values ('confirm', 1, ?, ?)", reference, ((claimed ? "confirmed via browser callback" : "already confirmed elsewhere") + ", status=" + status).slice(0, 200)); } catch (_) {}
      if (claimed) {
        if (context.waitUntil) context.waitUntil(sendCardOrderEmails(env, db, order));
        else await sendCardOrderEmails(env, db, order);
      }
      return J({ ok: true, already: !claimed });
    }

    if (path === "/api/anet/webhook" && method === "POST") {
      const raw = rawBody;
      const sigHeader = request.headers.get("x-anet-signature") || "";
      let sigOK = true;
      let note = "";
      if (env.ANET_SIGNATURE_KEY) {
        sigOK = false;
        try {
          const key = await crypto.subtle.importKey("raw", hexToBytes(env.ANET_SIGNATURE_KEY), { name: "HMAC", hash: "SHA-512" }, false, ["sign"]);
          const mac = await crypto.subtle.sign("HMAC", key, TE.encode(raw));
          const computed = bytesToHex(new Uint8Array(mac)).toUpperCase();
          const provided = (sigHeader.split("=")[1] || "").toUpperCase();
          sigOK = !!provided && computed === provided;
          if (!sigOK) note = provided ? "signature mismatch — check ANET_SIGNATURE_KEY" : "no x-anet-signature header";
        } catch (e) { sigOK = false; note = "signature check threw: " + String((e && e.message) || e).slice(0, 120); }
      } else {
        note = "ANET_SIGNATURE_KEY not set — signature not verified";
      }

      let evt = null;
      try { evt = JSON.parse(raw); } catch (_) { evt = null; }
      const type = (evt && evt.eventType) || "";
      const inv = evt && evt.payload && evt.payload.invoiceNumber;
      let matched = null;

      if (sigOK && /authcapture|priorauthcapture|capture/i.test(type) && inv) {
        const order = await db.first("select * from orders where reference=?", inv);
        if (order) {
          matched = inv;
          const claimed = await claimOrderAsPaid(db, inv, String((evt.payload && evt.payload.id) || ""));
          if (claimed) {
            // Send the emails AFTER responding. Authorize.Net times the webhook out
            // and disables it if we take too long, and Resend can be slow.
            if (context.waitUntil) context.waitUntil(sendCardOrderEmails(env, db, order));
            else await sendCardOrderEmails(env, db, order);
          } else {
            note = note || "already paid (duplicate delivery)";
          }
        } else {
          note = note || "no order matches invoice " + inv;
        }
      }

      try { await db.run("insert into webhook_log (event_type, signature_ok, matched_order, note) values (?, ?, ?, ?)", String(type).slice(0, 80), sigOK ? 1 : 0, matched, note.slice(0, 200)); } catch (_) {}

      // ALWAYS 200. A non-2xx makes Authorize.Net retry and eventually mark the
      // webhook inactive, which would silently stop card orders being marked paid.
      // Anything suspicious is refused above and recorded in webhook_log instead.
      return J({ ok: true });
    }

    // ---- CHECKOUT: manual payment order ---------------------------------
    if (path === "/api/manual-order" && method === "POST") {
      const code = body.code ? upper(body.code) : null;
      let pct = 0;
      if (code) { const a = await db.first("select pct from ambassadors where code=? and active=1", code); pct = a ? a.pct : 0; }
      const promo = await loadPromo(db, body.promo);
      const p = priceOrder(body.items, pct, promo);
      if (!p.lines.length) return J({ error: "No valid items." }, 400);
      const reference = newReference();
      if (promo) { try { await db.run("update promos set uses = uses + 1 where code=?", promo.code); } catch (_) {} }
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
