import React, { useState, useMemo, useEffect, useRef } from "react";
import { ShoppingBag, X, Menu, ChevronRight, ChevronLeft, Check, Minus, Plus, Beaker, ShieldCheck, Truck, Mail, FileText, AlertCircle, Loader2, Lock, LogOut, Eye, EyeOff, Phone, Sparkles, Star, Search, MessageCircle, Send, Copy, Share2, TrendingUp, Wallet, DollarSign, LayoutDashboard, Ruler } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────
// SITE CONFIG — edit these once and they propagate across the whole site
// (policy pages, footer, contact, emails). Fill in before launch.
// ─────────────────────────────────────────────────────────────────────────
const SITE_CONFIG = {
  brandName: "Luxury Peps",
  legalName: "Luxury Peps LLC",
  supportEmail: "support@luxurypeps.com",
  contactEmail: "hello@luxurypeps.com",       // primary/general business inbox
  ordersEmail: "orders@luxurypeps.com",       // order & payment questions
  socialEmail: "social@luxurypeps.com",       // ambassador / influencer outreach
  phone: "",                                 // optional, e.g. "+1 (555) 123-4567"
  addressLine: "1157 Harry King Rd, Glasgow, KY 42141",
  state: "Kentucky",                         // governing-law state
  timezone: "CT",
  hours: "Mon–Fri, 9am–5pm",
  // Pre-order: flip `preorder` to false the moment stock arrives.
  preorder: true,
  preorderShipEstimate: "4–8 days",
  effectiveDate: "June 27, 2026",
  freeShipThreshold: 150,
  flatShip: 12,
  // Backend API base URL. Empty = use browser stand-ins (preview mode).
  // Set to your deployed API (e.g. "https://api.luxurypeps.com") to go live.
  // TEMPORARY manual-payment bridge while the high-risk card account is in
  // underwriting. Flip enabled to false the moment card checkout goes live.
  manualPayments: {
    enabled: true,
    bank: false,          // removed — card only
    bankRecipient: "Luxury Peps LLC",  // account-holder name buyers send to (safe to display)
    bankName: "Chase",                 // bank name shown on the payment screen (safe to display)
    card: true,           // card checkout via Authorize.Net Accept Hosted (iframe)
    cashapp: false,       // removed
    cashtag: "$LuxuryPeps",
    zelle: false,         // removed
    zelleId: "luxurypeps",
    crypto: false,        // removed — card only
    cryptoAddresses: { "USDC (ERC-20)": "0x29fcf8290F2369bBCf25DdD8e0a3cf2f2E34c06d" },
  },
  apiBaseUrl: "",       // leave blank; backend is same-origin
  backendLive: true,    // true = use the live Cloudflare backend
};

// ── Creator / affiliate codes ──────────────────────────────────────────────
// Each code gives the customer 10% off and earns the creator a 10% commission
// (commission is tracked server-side per order). Keys must be UPPERCASE.
// Replace these examples with your real creators; keep them all at 0.10.
const CREATOR_CODES = {
  MORGAN11:  { creator: "Madden Morgan",  pct: 0.10 },
  MATTLIFTZ: { creator: "Matthew Daniel", pct: 0.10 },
};
// Per-code PIN required to open the ambassador portal. Real enforcement is
// server-side (routes/creator.js); this copy powers the preview build.
const CREATOR_PINS = {
  MORGAN11:  "1234",
  MATTLIFTZ: "1234",
};

// ── Owner-added ambassadors ────────────────────────────────────────────────
// Ambassadors added from the owner portal are stored per-device (via
// window.storage / localStorage) and merged with the built-ins above. This
// makes new codes work in the current browser immediately. For a code to work
// for every visitor site-wide, it ultimately needs to live server-side
// (routes/creator.js) — the owner portal is ready to connect to that.
let CUSTOM_CREATOR_CODES = {};
let CUSTOM_CREATOR_PINS = {};
function applyCustomAmbassadors(arr) {
  CUSTOM_CREATOR_CODES = {};
  CUSTOM_CREATOR_PINS = {};
  (arr || []).forEach((a) => {
    if (!a || !a.code) return;
    const code = String(a.code).toUpperCase();
    CUSTOM_CREATOR_CODES[code] = { creator: a.creator || code, pct: typeof a.pct === "number" ? a.pct : 0.10 };
    if (a.pin) CUSTOM_CREATOR_PINS[code] = String(a.pin);
  });
}
function allCreatorCodes() { return { ...CREATOR_CODES, ...CUSTOM_CREATOR_CODES }; }
function allCreatorPins() { return { ...CREATOR_PINS, ...CUSTOM_CREATOR_PINS }; }
// Best-effort synchronous seed so checkout validation works on first paint,
// before the async window.storage load in the app refines it.
try {
  if (typeof localStorage !== "undefined") {
    const raw = localStorage.getItem("owner:ambassadors");
    if (raw) { const arr = JSON.parse(raw); if (Array.isArray(arr)) applyCustomAmbassadors(arr); }
  }
} catch (_) { /* start with built-ins only */ }

const FONTS = (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400;1,9..144,500&family=Inter:wght@400;500;600&display=swap');

    html, body { margin: 0; padding: 0; }
    body { background: #0A0705; }
    #root { min-height: 100vh; }

    .lp-root {
      --bg: #0A0705;
      --panel: #140F0A;
      --panel-2: #1B140D;
      --brown-deep: #271B11;
      --brown-mid: #4A3621;
      --line: #34281B;
      --gold: #B08243;
      --gold-bright: #D8AE6E;
      --cream: #ECE3D4;
      --muted: #9A8975;
      font-family: 'Inter', sans-serif;
      background: var(--bg);
      color: var(--cream);
      min-height: 100vh;
    }
    .lp-root * { box-sizing: border-box; }
    .lp-serif { font-family: 'Fraunces', serif; }
    .lp-eyebrow {
      font-family: 'Inter', sans-serif;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      font-size: 11px;
      color: var(--gold);
      font-weight: 600;
    }
    .lp-hairline { height: 1px; background: var(--line); border: none; }
    .lp-btn {
      font-family: 'Inter', sans-serif;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      font-size: 12px;
      font-weight: 600;
      padding: 14px 26px;
      cursor: pointer;
      transition: all 0.25s ease;
      border: 1px solid var(--gold);
      background: transparent;
      color: var(--gold-bright);
    }
    .lp-btn:hover { background: var(--gold); color: var(--bg); }
    .lp-btn-solid {
      background: var(--gold);
      color: var(--bg);
      border: 1px solid var(--gold);
    }
    .lp-btn-solid:hover { background: var(--gold-bright); border-color: var(--gold-bright); }
    .lp-btn:focus-visible, button:focus-visible, a:focus-visible {
      outline: 2px solid var(--gold-bright);
      outline-offset: 2px;
    }
    .lp-card {
      background: var(--panel);
      border: 1px solid var(--line);
      transition: border-color 0.25s ease, transform 0.25s ease;
    }
    .lp-card:hover { border-color: var(--gold); transform: translateY(-3px); box-shadow: 0 14px 34px -14px rgba(0,0,0,0.72); }
    .lp-gallery { position: relative; touch-action: pan-y; }
    .lp-gal-arrow {
      position: absolute; top: 50%; transform: translateY(-50%);
      width: 42px; height: 42px; border-radius: 50%;
      background: rgba(10,7,5,0.72); border: 1px solid var(--line);
      color: var(--gold-bright); display: flex; align-items: center; justify-content: center;
      cursor: pointer; z-index: 3; transition: background 0.2s ease, border-color 0.2s ease;
    }
    .lp-gal-arrow:hover { background: var(--gold); color: var(--bg); border-color: var(--gold); }
    .lp-gal-arrow.prev { left: 8px; }
    .lp-gal-arrow.next { right: 8px; }
    .lp-gal-dots { display: flex; gap: 8px; justify-content: center; margin-top: 14px; }
    .lp-gal-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--line); border: none; cursor: pointer; padding: 0; transition: background 0.2s ease, transform 0.2s ease; }
    .lp-gal-dot.active { background: var(--gold-bright); transform: scale(1.3); }
    @media (max-width: 640px) { .lp-gal-arrow { display: none; } }
    .lp-apparel-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 56px; align-items: start; }
    @media (max-width: 820px) { .lp-apparel-grid { grid-template-columns: 1fr !important; gap: 30px; } }
    @media (max-width: 640px) {
      .lp-catpills { flex-wrap: nowrap !important; overflow-x: auto; -webkit-overflow-scrolling: touch; padding-bottom: 6px; scrollbar-width: none; }
      .lp-catpills::-webkit-scrollbar { display: none; }
      .lp-shop-grid { grid-template-columns: 1fr 1fr !important; gap: 12px !important; }
      .lp-shop-grid .lp-card-body { padding: 12px !important; }
      .lp-shop-grid .lp-card-title { font-size: 15px !important; line-height: 1.25; }
      .lp-shop-grid .lp-card-actions { flex-direction: column !important; gap: 6px !important; }
    }
    .lp-checkout-grid { display: grid; grid-template-columns: 1.3fr 1fr; gap: 50px; align-items: start; }
    .lp-checkout-grid > * { min-width: 0; }
    @media (max-width: 860px) {
      .lp-checkout-grid { grid-template-columns: 1fr; gap: 30px; }
    }
    @media (prefers-reduced-motion: reduce) {
      .lp-card, .lp-btn, * { transition: none !important; animation: none !important; }
    }
    .lp-vial {
      width: 100%;
      aspect-ratio: 3/4;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(160deg, var(--panel-2), var(--brown-deep));
      border-bottom: 1px solid var(--line);
    }
    .lp-nav-link {
      font-family: 'Inter', sans-serif;
      font-size: 13px;
      letter-spacing: 0.04em;
      color: var(--cream);
      text-transform: uppercase;
      cursor: pointer;
      background: none;
      border: none;
      padding: 0;
    }
    .lp-nav-link:hover { color: var(--gold-bright); }

    /* Responsive header: inline nav on desktop, hamburger menu on mobile */
    .lp-desktop-nav { display: flex; gap: 32px; align-items: center; }
    .lp-hamburger { display: none; background: none; border: none; color: var(--cream); cursor: pointer; padding: 6px; }
    .lp-mobile-menu { display: none; }
    @media (max-width: 760px) {
      .lp-desktop-nav { display: none; }
      .lp-hamburger { display: flex; }
      .lp-header-inner { padding: 16px 18px !important; }
      .lp-mobile-menu.open { display: block; }
      .lp-mobile-link {
        display: flex; align-items: center; justify-content: space-between;
        width: 100%; padding: 15px 20px; background: none; border: none;
        border-bottom: 1px solid var(--line); color: var(--cream); cursor: pointer;
        font-family: 'Inter', sans-serif; font-size: 15px; letter-spacing: 0.03em;
        text-transform: uppercase; text-align: left;
      }
      .lp-mobile-link:active { background: var(--panel-2); }
      .lp-footer-grid { grid-template-columns: 1fr !important; gap: 28px !important; }
      .lp-detail-grid { grid-template-columns: 1fr !important; }
    }
    input, select {
      background: var(--panel-2);
      border: 1px solid var(--line);
      color: var(--cream);
      padding: 12px 14px;
      font-family: 'Inter', sans-serif;
      font-size: 14px;
      width: 100%;
    }
    input::placeholder { color: var(--muted); }
    input:focus, select:focus { outline: 1px solid var(--gold); border-color: var(--gold); }
    .lp-fade { animation: lpFade 0.4s ease both; }
    @keyframes lpFade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    .lp-spin { animation: lpSpin 0.8s linear infinite; }
    @keyframes lpSpin { to { transform: rotate(360deg); } }
    .lp-vial-stage {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      background:
        radial-gradient(120% 90% at 50% 18%, rgba(74,54,33,0.55), transparent 62%),
        linear-gradient(180deg, var(--panel-2) 0%, var(--brown-deep) 45%, var(--bg) 100%);
      border: 1px solid var(--line);
    }
    .lp-reflection-clip {
      overflow: hidden;
      margin-top: -10px;
    }
    .lp-reflection {
      transform: scaleY(-1);
      opacity: 0.20;
      pointer-events: none;
      -webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,0.8), transparent 60%);
      mask-image: linear-gradient(to bottom, rgba(0,0,0,0.8), transparent 60%);
    }
  `}</style>
);

const BASE_PRODUCTS = [
  { id: "p03", no: "01", name: "GLP-1 SM", form: "Lyophilized Powder", purity: "99.3%", baseMg: 10, basePrice: 90, batchPrefix: "SMG-0741" },
  { id: "p04", no: "02", name: "GLP-2 TZ", form: "Lyophilized Powder", purity: "99.0%", baseMg: 10, basePrice: 65, batchPrefix: "TZP-0512", sizes: [{ mg: 10, price: 65 }, { mg: 20, price: 95 }] },
  { id: "p21", no: "03", name: "GLP-3 RT", form: "Lyophilized Powder", purity: "99.0%", baseMg: 10, basePrice: 80, batchPrefix: "RET-3318", sizes: [{ mg: 10, price: 80 }, { mg: 20, price: 130 }] },
  { id: "p01", no: "04", name: "BPC-157", form: "Lyophilized Powder", purity: "99.1%", baseMg: 10, basePrice: 45, batchPrefix: "BPC-2206" },
  { id: "p02", no: "05", name: "TB-500", form: "Lyophilized Powder", purity: "98.7%", baseMg: 10, basePrice: 55, batchPrefix: "TB4-1190" },
  { id: "p29", no: "06", name: "BPC-157 + TB-500", form: "Lyophilized Powder (Blend)", purity: "99.0%", baseMg: 10, basePrice: 120, batchPrefix: "BTB-2210" },
  { id: "p34", no: "07", name: "BPC-157 + GHK-Cu + TB-500", form: "Lyophilized Powder (Blend)", purity: "99.0%", baseMg: 70, basePrice: 140, batchPrefix: "TRI-7010" },
  { id: "p08", no: "08", name: "GHK-Cu", form: "Lyophilized Powder", purity: "99.2%", baseMg: 100, basePrice: 65, batchPrefix: "GHK-1075" },
  { id: "p07", no: "09", name: "Melanotan II", form: "Lyophilized Powder", purity: "99.0%", baseMg: 10, basePrice: 45, batchPrefix: "MT2-8814" },
  { id: "p28", no: "10", name: "Glutathione", form: "Lyophilized Powder", purity: "99.3%", baseMg: 1500, basePrice: 72, batchPrefix: "GLU-6004", soldOut: true },
  { id: "p05", no: "11", name: "Ipamorelin", form: "Lyophilized Powder", purity: "99.4%", baseMg: 5, basePrice: 40, batchPrefix: "IPM-3387", sizes: [{ mg: 5, price: 40 }, { mg: 10, price: 60 }] },
  { id: "p06", no: "12", name: "CJC-1295 (No DAC)", form: "Lyophilized Powder", purity: "98.9%", baseMg: 10, basePrice: 66, batchPrefix: "CJC-2049" },
  { id: "p33", no: "13", name: "CJC-1295 + Ipamorelin", form: "Lyophilized Powder (Blend)", purity: "99.0%", baseMg: 10, basePrice: 82, batchPrefix: "CJI-1205" },
  { id: "p15", no: "14", name: "Sermorelin", form: "Lyophilized Powder", purity: "99.3%", baseMg: 10, basePrice: 60, batchPrefix: "SER-1849" },
  { id: "p31", no: "15", name: "Tesamorelin", form: "Lyophilized Powder", purity: "99.0%", baseMg: 10, basePrice: 55, batchPrefix: "TES-0470", sizes: [{ mg: 5, price: 55 }, { mg: 10, price: 75 }] },
  { id: "p32", no: "16", name: "IGF-1 LR3", form: "Lyophilized Powder", purity: "98.8%", baseMg: 1, basePrice: 85, batchPrefix: "IGF-0190" },
  { id: "p09", no: "17", name: "Epithalon", form: "Lyophilized Powder", purity: "99.5%", baseMg: 10, basePrice: 61, batchPrefix: "EPI-6203" },
  { id: "p19", no: "18", name: "MOTS-c", form: "Lyophilized Powder", purity: "99.0%", baseMg: 10, basePrice: 49, batchPrefix: "MOT-2786" },
  { id: "p24", no: "19", name: "SS-31", form: "Lyophilized Powder", purity: "99.1%", baseMg: 10, basePrice: 80, batchPrefix: "SS3-1041" },
  { id: "p22", no: "20", name: "NAD+", form: "Lyophilized Powder", purity: "99.2%", baseMg: 100, basePrice: 60, batchPrefix: "NAD-5500" },
  { id: "p25", no: "21", name: "VIP", form: "Lyophilized Powder", purity: "98.8%", baseMg: 10, basePrice: 70, batchPrefix: "VIP-3360" },
  { id: "p11", no: "22", name: "Selank", form: "Lyophilized Powder", purity: "99.0%", baseMg: 5, basePrice: 39, batchPrefix: "SEL-7732" },
  { id: "p12", no: "23", name: "Semax", form: "Lyophilized Powder", purity: "99.2%", baseMg: 5, basePrice: 40, batchPrefix: "SMX-2298" },
  { id: "p23", no: "24", name: "Oxytocin Acetate", form: "Lyophilized Powder", purity: "98.9%", baseMg: 2, basePrice: 54, batchPrefix: "OXY-2208", soldOut: true },
  { id: "p26", no: "25", name: "5-Amino-1MQ", form: "Lyophilized Powder", purity: "99.0%", baseMg: 5, basePrice: 70, batchPrefix: "5AM-1099" },
  { id: "p30", no: "26", name: "HCG", form: "Lyophilized Powder", purity: "98.5%", baseMg: 10000, basePrice: 95, batchPrefix: "HCG-1000", unit: "IU", soldOut: true },
  { id: "p27", no: "27", name: "Bacteriostatic Water", form: "0.9% Benzyl Alcohol Solution", purity: "USP-Grade", baseMg: 10, basePrice: 15, batchPrefix: "BAC-3001", unit: "mL", container: "vial" },
];

// Each compound is offered in three vial sizes, generated from a base size/price
// so adding more compounds or adjusting pricing only needs one line above.
const VARIANT_STEPS = [
  { tag: "A", mgMult: 0.5, priceMult: 0.62 },
  { tag: "B", mgMult: 1, priceMult: 1 },
  { tag: "C", mgMult: 2, priceMult: 1.85 },
];

function formatMg(mg) {
  return mg < 1 ? mg.toFixed(1) : Math.round(mg).toString();
}

// Research category for each compound (used by catalog filters).
const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "metabolic", label: "Metabolic / GLP-1" },
  { id: "healing", label: "Healing & Recovery" },
  { id: "gh", label: "GH Secretagogues" },
  { id: "cosmetic", label: "Cosmetic & Skin" },
  { id: "longevity", label: "Longevity & Other" },
];
const PRODUCT_CATEGORY = {
  p01: "healing",   // BPC-157
  p02: "healing",   // TB-500
  p03: "metabolic", // Semaglutide
  p04: "metabolic", // Tirzepatide
  p05: "gh",        // Ipamorelin
  p06: "gh",        // CJC-1295
  p07: "cosmetic",  // Melanotan II
  p08: "cosmetic",  // GHK-Cu
  p09: "longevity", // Epithalon
  p10: "longevity", // PT-141
  p11: "longevity", // Selank
  p12: "longevity", // Semax
  p13: "metabolic", // AOD-9604
  p14: "gh",        // Hexarelin
  p15: "gh",        // Sermorelin
  p16: "longevity", // DSIP
  p17: "healing",   // Thymosin Alpha-1
  p18: "longevity", // Kisspeptin-10
  p19: "longevity", // MOTS-c
  p20: "gh",        // Follistatin-344
  p21: "metabolic", // Retatrutide
  p22: "longevity", // NAD+
  p23: "longevity", // Oxytocin
  p24: "longevity", // SS-31
  p25: "healing",   // VIP
  p26: "metabolic", // 5-Amino-1MQ
  p27: "longevity", // Bacteriostatic Water (supplies)
  p28: "cosmetic",  // Glutathione
  p29: "healing",   // BPC-157 + TB-500
  p30: "longevity", // HCG
  p31: "gh",        // Tesamorelin
  p32: "gh",        // IGF-1 LR3
  p33: "gh",        // CJC-1295 + Ipamorelin
  p34: "healing",   // BPC-157 + GHK-Cu + TB-500
};

// Curated merchandising badges shown on catalog cards.
const BESTSELLER_IDS = new Set(["p03", "p04", "p01", "p22"]);
const NEW_IDS = new Set(["p21", "p26"]);
function productBadges(p) {
  const out = [];
  if (BESTSELLER_IDS.has(p.id)) out.push("bestseller");
  if (NEW_IDS.has(p.id)) out.push("new");
  if ((p.form && p.form.toLowerCase().includes("blend")) || (p.name && p.name.includes("+"))) out.push("blend");
  return out;
}
const BADGE_STYLE = {
  bestseller: { bg: "var(--gold-bright)", fg: "var(--bg)", border: "var(--gold-bright)", label: "Bestseller" },
  new: { bg: "transparent", fg: "var(--gold-bright)", border: "var(--gold-bright)", label: "New" },
  blend: { bg: "transparent", fg: "var(--cream)", border: "var(--line)", label: "Blend" },
};

const PRODUCTS = BASE_PRODUCTS.map((b) => {
  const unit = b.unit || "mg";
  const container = b.container || "vial";
  // Use the product's explicit `sizes` (mg + price); default to a single base size.
  const sizes = b.sizes || [{ mg: b.baseMg, price: b.basePrice }];
  return {
    ...b,
    category: PRODUCT_CATEGORY[b.id] || "longevity",
    variants: sizes.map((sz, i) => {
      const tag = String.fromCharCode(65 + i); // A, B, C…
      return {
        id: `${b.id}-${tag}`,
        size: `${formatMg(sz.mg)}${unit} / ${container}`,
        price: sz.price,
        batch: `${b.batchPrefix}-${tag}`,
      };
    }),
  };
});

// Merchandising metadata: which compounds are best-sellers, and common research pairings.
const BESTSELLERS = ["p01", "p03", "p04", "p05", "p08"]; // BPC-157, Semaglutide, Tirzepatide, Ipamorelin, GHK-Cu
const PAIRINGS = {
  p01: ["p02", "p08"],        // BPC-157 → TB-500, GHK-Cu
  p02: ["p01", "p08"],        // TB-500 → BPC-157, GHK-Cu
  p03: ["p04", "p21"],        // Semaglutide → Tirzepatide, Retatrutide
  p04: ["p03", "p19"],        // Tirzepatide → Semaglutide, MOTS-c
  p05: ["p06", "p15"],        // Ipamorelin → CJC-1295, Sermorelin
  p06: ["p05", "p15"],        // CJC-1295 → Ipamorelin, Sermorelin
  p08: ["p01", "p02"],        // GHK-Cu → BPC-157, TB-500
};

// Quantity-break (volume) pricing: buy more of a single item, save a % on that line.
const QTY_BREAKS = [
  { min: 5, pct: 0.15 },
  { min: 3, pct: 0.10 },
  { min: 2, pct: 0.05 },
];
function qtyDiscountPct(qty) {
  for (const b of QTY_BREAKS) if (qty >= b.min) return b.pct;
  return 0;
}

// Free shipping threshold (USD).
const FREE_SHIP_THRESHOLD = 150;
const FLAT_SHIP = 12;

// Pre-built bundle / stack kits (priced below the sum of their standard vials).
const BUNDLES = [
  { id: "b1", name: "Recovery Stack", tagline: "Soft-tissue & healing research pairing.",
    items: ["p01", "p02"], discountPct: 0.15 },
  { id: "b2", name: "GH Secretagogue Stack", tagline: "Classic GHRH + GHRP research combination.",
    items: ["p05", "p06"], discountPct: 0.15 },
  { id: "b3", name: "Metabolic Research Kit", tagline: "Leading GLP-1 class compounds, together.",
    items: ["p03", "p04"], discountPct: 0.12 },
  { id: "b4", name: "Longevity Trio", tagline: "Epithalon, MOTS-c, and NAD+.",
    items: ["p09", "p19", "p22"], discountPct: 0.18 },
];
function bundlePricing(bundle) {
  const prods = bundle.items.map((id) => PRODUCTS.find((p) => p.id === id)).filter(Boolean);
  const full = prods.reduce((s, p) => s + p.variants[0].price, 0);
  const price = Math.round(full * (1 - bundle.discountPct));
  return { prods, full, price, saved: full - price };
}

// ── Apparel / merch ───────────────────────────────────────────────────────
const TEE_FRONT_SRC = "data:image/jpeg;base64,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";
const TEE_BACK_SRC = "data:image/jpeg;base64,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";
const TEE2_FRONT_SRC = "data:image/jpeg;base64,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";
const TEE2_BACK_SRC = "data:image/jpeg;base64,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";
const APPAREL_SIZES = ["S", "M", "L", "XL", "XXL"];
// Size-guide measurements (flat garment, inches). These are standard unisex
// heavyweight-tee figures — adjust to match your actual blanks before launch.
const APPAREL_SIZE_GUIDE = [
  { size: "S",   chest: 18, length: 28, sleeve: 8.1 },
  { size: "M",   chest: 20, length: 29, sleeve: 8.5 },
  { size: "L",   chest: 22, length: 30, sleeve: 8.9 },
  { size: "XL",  chest: 24, length: 31, sleeve: 9.3 },
  { size: "XXL", chest: 26, length: 32, sleeve: 9.7 },
];
const APPAREL_BASE = [
  { id: "a01", no: "A1", name: "Luxury Gym Tee", garment: "tee", color: "#15110d", accent: "#c9a05c", price: 40, blurb: "Premium heavyweight tee — subtle LP crest on the front, full Luxury Peps emblem on the back. Hover to flip.", flip: { front: TEE_FRONT_SRC, back: TEE_BACK_SRC } },
  { id: "a02", no: "A2", name: "LP Peptides Oversized Tee", garment: "tee", color: "#0e0c0a", accent: "#c9a05c", price: 40, blurb: "Oversized premium tee — LP Peptides crest on the front, full back graphic with vial, DNA helix, and the Research. Rebuild. Elevate. mark. Hover to flip.", flip: { front: TEE2_FRONT_SRC, back: TEE2_BACK_SRC } },
];
const APPAREL = APPAREL_BASE.map((a) => ({
  ...a,
  kind: "apparel",
  variants: (a.oneSize ? ["One Size"] : APPAREL_SIZES).map((s) => ({
    id: `${a.id}-${s.replace(/\s+/g, "")}`,
    size: s,
    price: a.price,
    batch: null,
  })),
}));

// Unified catalog lookup so the cart/checkout resolve both peptides and apparel.
const CATALOG = [...PRODUCTS];
function findItem(id) { return CATALOG.find((x) => x.id === id); }
// Everything (peptides + apparel) is on pre-order while inventory is inbound.
// Flip SITE_CONFIG.preorder to false the moment stock arrives.
function isPreorder(item) { if (item && item.inStock) return false; return SITE_CONFIG.preorder; }
function isSoldOut(item) { return !!item.soldOut; }

// Build an ordered, de-duplicated list of recommended products for the current cart.
function getRecommendations(cartProductIds, limit = 4) {
  const inCart = new Set(cartProductIds);
  const ranked = [];
  const seen = new Set();
  const push = (id) => {
    if (!seen.has(id) && !inCart.has(id)) { seen.add(id); ranked.push(id); }
  };
  // 1) Pairings for what's already in the cart.
  cartProductIds.forEach((id) => (PAIRINGS[id] || []).forEach(push));
  // 2) Fill remaining slots with best-sellers.
  BESTSELLERS.forEach(push);
  return ranked.slice(0, limit).map((id) => PRODUCTS.find((p) => p.id === id)).filter(Boolean);
}

// ---- Reviews -------------------------------------------------------------
// Reviews are real, verified-purchase reviews only: a review can only be
// submitted against an order that exists, is paid, matches the buyer's email,
// and actually contained that product. Every review is held for owner approval
// before it appears. Reviews cover product and service quality (purity vs COA,
// documentation, packaging, shipping) — never human-use effects, consistent
// with research-use-only positioning.
//
// There is deliberately no seeded/generated review data here. Fabricated
// reviews presented as real buyers violate the FTC's rule on fake reviews and
// put payment processing at risk.

// Fetches approved reviews for one product.
async function fetchProductReviews(productId) {
  if (!BACKEND_LIVE) return { reviews: [], count: 0, average: 0 };
  try {
    const r = await fetch(API_BASE + "/api/reviews/" + encodeURIComponent(productId));
    if (!r.ok) return { reviews: [], count: 0, average: 0 };
    return await r.json();
  } catch (_) { return { reviews: [], count: 0, average: 0 }; }
}

// Ratings for the whole catalog in a single request (used by shop cards).
async function fetchReviewSummary() {
  if (!BACKEND_LIVE) return {};
  try {
    const r = await fetch(API_BASE + "/api/reviews-summary");
    if (!r.ok) return {};
    const d = await r.json();
    return d.summary || {};
  } catch (_) { return {}; }
}

const COA_DATA = {
  p01: { testDate: "2026-04-02", certNo: "COA-BPC-2206", analyst: "J. Renner", tests: [
    { name: "Identity (Mass Spec)", result: "Confirmed" },
    { name: "Purity (HPLC)", result: "99.1%" },
    { name: "Endotoxin (LAL)", result: "< 0.10 EU/mg" },
    { name: "Moisture Content", result: "3.2%" },
  ]},
  p02: { testDate: "2026-03-18", certNo: "COA-TB4-1190", analyst: "M. Acosta", tests: [
    { name: "Identity (Mass Spec)", result: "Confirmed" },
    { name: "Purity (HPLC)", result: "98.7%" },
    { name: "Endotoxin (LAL)", result: "< 0.12 EU/mg" },
    { name: "Moisture Content", result: "2.9%" },
  ]},
  p03: { testDate: "2026-04-29", certNo: "COA-SMG-0741", analyst: "J. Renner", tests: [
    { name: "Identity (Mass Spec)", result: "Confirmed" },
    { name: "Purity (HPLC)", result: "99.3%" },
    { name: "Endotoxin (LAL)", result: "< 0.08 EU/mg" },
    { name: "Moisture Content", result: "2.5%" },
  ]},
  p04: { testDate: "2026-05-06", certNo: "COA-TZP-0512", analyst: "M. Acosta", tests: [
    { name: "Identity (Mass Spec)", result: "Confirmed" },
    { name: "Purity (HPLC)", result: "99.0%" },
    { name: "Endotoxin (LAL)", result: "< 0.10 EU/mg" },
    { name: "Moisture Content", result: "3.0%" },
  ]},
  p05: { testDate: "2026-02-21", certNo: "COA-IPM-3387", analyst: "J. Renner", tests: [
    { name: "Identity (Mass Spec)", result: "Confirmed" },
    { name: "Purity (HPLC)", result: "99.4%" },
    { name: "Endotoxin (LAL)", result: "< 0.09 EU/mg" },
    { name: "Moisture Content", result: "2.7%" },
  ]},
  p06: { testDate: "2026-03-04", certNo: "COA-CJC-2049", analyst: "M. Acosta", tests: [
    { name: "Identity (Mass Spec)", result: "Confirmed" },
    { name: "Purity (HPLC)", result: "98.9%" },
    { name: "Endotoxin (LAL)", result: "< 0.11 EU/mg" },
    { name: "Moisture Content", result: "3.1%" },
  ]},
  p07: { testDate: "2026-01-30", certNo: "COA-MT2-8814", analyst: "J. Renner", tests: [
    { name: "Identity (Mass Spec)", result: "Confirmed" },
    { name: "Purity (HPLC)", result: "99.0%" },
    { name: "Endotoxin (LAL)", result: "< 0.10 EU/mg" },
    { name: "Moisture Content", result: "2.8%" },
  ]},
  p08: { testDate: "2026-05-12", certNo: "COA-GHK-1075", analyst: "M. Acosta", tests: [
    { name: "Identity (Mass Spec)", result: "Confirmed" },
    { name: "Purity (HPLC)", result: "99.2%" },
    { name: "Endotoxin (LAL)", result: "< 0.09 EU/mg" },
    { name: "Moisture Content", result: "2.6%" },
  ]},
  p09: { testDate: "2026-04-15", certNo: "COA-EPI-6203", analyst: "J. Renner", tests: [
    { name: "Identity (Mass Spec)", result: "Confirmed" },
    { name: "Purity (HPLC)", result: "99.5%" },
    { name: "Endotoxin (LAL)", result: "< 0.07 EU/mg" },
    { name: "Moisture Content", result: "2.4%" },
  ]},
  p10: { testDate: "2026-02-09", certNo: "COA-PT1-4456", analyst: "M. Acosta", tests: [
    { name: "Identity (Mass Spec)", result: "Confirmed" },
    { name: "Purity (HPLC)", result: "98.8%" },
    { name: "Endotoxin (LAL)", result: "< 0.11 EU/mg" },
    { name: "Moisture Content", result: "3.0%" },
  ]},
  p11: { testDate: "2026-03-22", certNo: "COA-SEL-7732", analyst: "J. Renner", tests: [
    { name: "Identity (Mass Spec)", result: "Confirmed" },
    { name: "Purity (HPLC)", result: "99.0%" },
    { name: "Endotoxin (LAL)", result: "< 0.09 EU/mg" },
    { name: "Moisture Content", result: "2.8%" },
  ]},
  p12: { testDate: "2026-04-11", certNo: "COA-SMX-2298", analyst: "M. Acosta", tests: [
    { name: "Identity (Mass Spec)", result: "Confirmed" },
    { name: "Purity (HPLC)", result: "99.2%" },
    { name: "Endotoxin (LAL)", result: "< 0.08 EU/mg" },
    { name: "Moisture Content", result: "2.6%" },
  ]},
  p13: { testDate: "2026-01-26", certNo: "COA-AOD-5510", analyst: "J. Renner", tests: [
    { name: "Identity (Mass Spec)", result: "Confirmed" },
    { name: "Purity (HPLC)", result: "98.9%" },
    { name: "Endotoxin (LAL)", result: "< 0.12 EU/mg" },
    { name: "Moisture Content", result: "3.1%" },
  ]},
  p14: { testDate: "2026-05-19", certNo: "COA-HEX-3367", analyst: "M. Acosta", tests: [
    { name: "Identity (Mass Spec)", result: "Confirmed" },
    { name: "Purity (HPLC)", result: "99.1%" },
    { name: "Endotoxin (LAL)", result: "< 0.10 EU/mg" },
    { name: "Moisture Content", result: "2.9%" },
  ]},
  p15: { testDate: "2026-02-14", certNo: "COA-SER-1849", analyst: "J. Renner", tests: [
    { name: "Identity (Mass Spec)", result: "Confirmed" },
    { name: "Purity (HPLC)", result: "99.3%" },
    { name: "Endotoxin (LAL)", result: "< 0.07 EU/mg" },
    { name: "Moisture Content", result: "2.5%" },
  ]},
  p16: { testDate: "2026-03-30", certNo: "COA-DSI-6024", analyst: "M. Acosta", tests: [
    { name: "Identity (Mass Spec)", result: "Confirmed" },
    { name: "Purity (HPLC)", result: "98.7%" },
    { name: "Endotoxin (LAL)", result: "< 0.13 EU/mg" },
    { name: "Moisture Content", result: "3.2%" },
  ]},
  p17: { testDate: "2026-04-23", certNo: "COA-TA1-9183", analyst: "J. Renner", tests: [
    { name: "Identity (Mass Spec)", result: "Confirmed" },
    { name: "Purity (HPLC)", result: "99.4%" },
    { name: "Endotoxin (LAL)", result: "< 0.06 EU/mg" },
    { name: "Moisture Content", result: "2.3%" },
  ]},
  p18: { testDate: "2026-01-15", certNo: "COA-KIS-4471", analyst: "M. Acosta", tests: [
    { name: "Identity (Mass Spec)", result: "Confirmed" },
    { name: "Purity (HPLC)", result: "98.8%" },
    { name: "Endotoxin (LAL)", result: "< 0.11 EU/mg" },
    { name: "Moisture Content", result: "3.0%" },
  ]},
  p19: { testDate: "2026-05-02", certNo: "COA-MOT-2786", analyst: "J. Renner", tests: [
    { name: "Identity (Mass Spec)", result: "Confirmed" },
    { name: "Purity (HPLC)", result: "99.0%" },
    { name: "Endotoxin (LAL)", result: "< 0.09 EU/mg" },
    { name: "Moisture Content", result: "2.7%" },
  ]},
  p20: { testDate: "2026-03-08", certNo: "COA-FOL-0639", analyst: "M. Acosta", tests: [
    { name: "Identity (Mass Spec)", result: "Confirmed" },
    { name: "Purity (HPLC)", result: "99.1%" },
    { name: "Endotoxin (LAL)", result: "< 0.08 EU/mg" },
    { name: "Moisture Content", result: "2.6%" },
  ]},
  p21: { testDate: "2026-05-27", certNo: "COA-RET-3318", analyst: "J. Renner", tests: [
    { name: "Identity (Mass Spec)", result: "Confirmed" },
    { name: "Purity (HPLC)", result: "99.0%" },
    { name: "Endotoxin (LAL)", result: "< 0.09 EU/mg" },
    { name: "Moisture Content", result: "2.7%" },
  ]},
};

// Backend endpoint your server should expose to create a Stripe Checkout Session.
// See server-example.js for a ready-to-deploy reference implementation.
// Same-origin backend: relative /api/* works on any domain the site is served from.
const API_BASE = SITE_CONFIG.apiBaseUrl || "";
const BACKEND_LIVE = !!SITE_CONFIG.apiBaseUrl || !!SITE_CONFIG.backendLive;

// First-party analytics. Fire-and-forget: never awaited, never blocks the UI,
// and silently does nothing when the backend is off (offline preview builds).
// No cookies and no third-party scripts, so no consent banner is required.
// Reads the signed session token saved at sign-in (used for account endpoints).
async function getAuthToken() {
  try {
    const s = await window.storage.get("session", false);
    return s && s.value ? (JSON.parse(s.value).token || null) : null;
  } catch (_) { return null; }
}

function track(event, productId) {
  if (!BACKEND_LIVE || typeof window === "undefined") return;
  try {
    fetch(API_BASE + "/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({ event, productId: productId || null, referrer: document.referrer || "" }),
    }).catch(() => {});
  } catch (_) { /* analytics must never break the site */ }
}
const CHECKOUT_SESSION_ENDPOINT = API_BASE + "/api/create-checkout-session";

const LOGO_SRC = "data:image/png;base64,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";

// Product photos live as real files in public/images/products/<id>.jpg and are
// loaded on demand by the browser. This map stays empty on purpose: images were
// previously inlined here as base64, which forced every visitor to download
// ~2.3MB of image data before the page could render. The tiered loaders below
// fall back to the drawn vial if a file is ever missing.
const PRODUCT_IMAGES = {};

function StarRating({ value = 5, size = 13, gap = 2 }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap }} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} fill={n <= value ? "#C9A05C" : "none"} color={n <= value ? "#C9A05C" : "var(--line)"} strokeWidth={1.5} />
      ))}
    </span>
  );
}

// Brand emblem: thin bronze ring, peptide-bond motif, LP monogram.
function LogoMark({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" role="img" aria-label="Luxury Peps emblem">
      <circle cx="100" cy="100" r="88" fill="none" stroke="var(--gold)" strokeWidth="2" />
      <circle cx="100" cy="100" r="80" fill="none" stroke="var(--gold)" strokeWidth="1" opacity="0.5" />
      <g stroke="var(--gold)" strokeWidth="1.6" fill="var(--gold)">
        <line x1="58" y1="44" x2="78" y2="36" />
        <line x1="78" y1="36" x2="100" y2="42" />
        <line x1="100" y1="42" x2="122" y2="36" />
        <line x1="122" y1="36" x2="142" y2="44" />
        <circle cx="58" cy="44" r="3" />
        <circle cx="78" cy="36" r="3" />
        <circle cx="100" cy="42" r="3.4" />
        <circle cx="122" cy="36" r="3" />
        <circle cx="142" cy="44" r="3" />
      </g>
      <text x="100" y="134" textAnchor="middle" fontFamily="Fraunces, serif" fontSize="84" fontWeight="700" letterSpacing="-4" fill="var(--cream)">LP</text>
      <text x="100" y="160" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="9" letterSpacing="3" fill="var(--gold)">PEPTIDES</text>
    </svg>
  );
}

// Small unlabeled vial — used where space is tight (e.g. cart line items).
function VialIcon({ size = 64 }) {
  return (
    <svg width={size} height={size * 1.4} viewBox="0 0 40 56" fill="none">
      <rect x="13" y="2" width="14" height="8" rx="1" fill="#C9A05C" />
      <path d="M11 10 H29 V44 C29 49 25 53 20 53 C15 53 11 49 11 44 V10 Z" stroke="#C9A05C" strokeWidth="1.2" fill="none" />
      <rect x="12" y="28" width="16" height="16" fill="#4A3424" opacity="0.5" />
      <line x1="11" y1="28" x2="29" y2="28" stroke="#C9A05C" strokeWidth="0.8" />
    </svg>
  );
}

// Faint molecular-science backdrop (nodes, bonds, hex rings) for vial stages.
function MolecularBackdrop() {
  return (
    <svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.5, pointerEvents: "none" }}>
      <g stroke="var(--gold)" strokeWidth="1" fill="none" opacity="0.18">
        <polygon points="60,70 84,56 108,70 108,98 84,112 60,98" />
        <polygon points="320,300 344,286 368,300 368,328 344,342 320,328" />
        <polygon points="300,60 318,50 336,60 336,80 318,90 300,80" />
        <line x1="40" y1="180" x2="90" y2="210" />
        <line x1="90" y1="210" x2="70" y2="270" />
        <line x1="90" y1="210" x2="150" y2="200" />
        <line x1="300" y1="150" x2="350" y2="180" />
        <line x1="300" y1="150" x2="320" y2="100" />
        <line x1="250" y1="340" x2="300" y2="320" />
      </g>
      <g fill="var(--gold)" opacity="0.28">
        {[[40,180],[90,210],[70,270],[150,200],[300,150],[350,180],[320,100],[250,340],[300,320],[84,84],[344,314],[318,70]].map((p,i)=>(
          <circle key={i} cx={p[0]} cy={p[1]} r="2.4" />
        ))}
      </g>
    </svg>
  );
}

// Vial "stage": molecular backdrop + warm glow + glossy mirror reflection.
// --- Product photos (self-serve) --------------------------------------------
// You can manage product photos as image files instead of editing code. Drop a
// file named by the product's ID into  public/images/products/  in your site
// package — e.g.  p05.jpg  for Ipamorelin — then rebuild. The site loads that
// file automatically. If no file is present it falls back to the built-in image,
// then to a drawn vial. To swap a photo, just replace the file and rebuild.


const PRODUCT_IMAGE_BASE = "/images/products";
function productImageSrc(id) { return `${PRODUCT_IMAGE_BASE}/${id}.jpg`; }

// Certificate-of-Analysis images. Drop a file named  <id>-coa.jpg  into
// public/images/products/  and list the id here — it then shows up as a second
// slide in that product's gallery (arrows on desktop, swipe on mobile).
const PRODUCT_COA = { p01: true, p02: true, p03: true, p04: true, p05: true, p06: true, p07: true, p08: true, p09: true, p11: true, p12: true, p15: true, p19: true, p21: true, p22: true, p24: true, p25: true, p26: true, p29: true, p31: true, p32: true, p33: true, p34: true };
function productCoaSrc(id) { return `${PRODUCT_IMAGE_BASE}/${id}-coa.jpg`; }

// Renders a product photo with graceful fallback: folder file → built-in image
// → the supplied `fallback` node. Used where a plain <img> was before.
function ProductImg({ id, alt = "", style = {}, className = "", fallback = null }) {
  const embedded = PRODUCT_IMAGES[id];
  // 0 = try folder file, 1 = try built-in image, 2 = give up (show fallback node)
  const [tier, setTier] = useState(0);
  useEffect(() => { setTier(0); }, [id]);
  if (tier >= 2 || (tier === 1 && !embedded)) return fallback;
  const src = tier === 0 ? productImageSrc(id) : embedded;
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      onError={() => setTier((t) => (t === 0 && embedded ? 1 : 2))}
    />
  );
}

function VialStage({ name, purity, width = 240, molecular = true, reflection = true, imageSrc = null, imageId = null, className = "", style = {} }) {
  const refH = Math.round(width * 1.5 * 0.34); // short reflection slice
  // Prefer a folder file (public/images/products/<id>.jpg), then the built-in
  // image, then the drawn vial.
  const [tier, setTier] = useState(imageId ? 0 : (imageSrc ? 1 : 2));
  useEffect(() => { setTier(imageId ? 0 : (imageSrc ? 1 : 2)); }, [imageId, imageSrc]);
  const resolvedSrc = tier === 0 ? productImageSrc(imageId) : (tier === 1 ? imageSrc : null);
  const showImg = tier < 2 && resolvedSrc;
  return (
    <div className={`lp-vial-stage ${className}`} style={style}>
      {molecular && <MolecularBackdrop />}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 40%, rgba(201,160,92,0.14), transparent 60%)", pointerEvents: "none" }} />
      {showImg ? (
        <img
          src={resolvedSrc}
          alt={`${name} vial`}
          onError={() => setTier((t) => (t === 0 && imageSrc ? 1 : 2))}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", display: "block", zIndex: 1, padding: "6%" }}
        />
      ) : (
        <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <LabeledVial name={name} purity={purity} width={width} />
          {reflection && (
            <div className="lp-reflection-clip" style={{ height: refH, width }}>
              <div className="lp-reflection">
                <LabeledVial name={name} purity={purity} width={width} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Branded apparel mockup (tee / hoodie / long sleeve / cap) with the LP emblem.
function ApparelGarment({ garment = "tee", color = "#15110d", accent = "#c9a05c", width = 150 }) {
  const uid = `${garment}-${color}`.replace(/[^a-zA-Z0-9]/g, "");
  const stroke = "#3a2d20";
  const Emblem = ({ cx, cy, r }) => (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={accent} strokeWidth="1.4" />
      <circle cx={cx} cy={cy} r={r - 3} fill="none" stroke={accent} strokeWidth="0.6" opacity="0.6" />
      <text x={cx} y={cy + r * 0.28} textAnchor="middle" fontFamily="Fraunces, serif" fontSize={r * 0.95} fontWeight="700" fill={accent} letterSpacing="-1">LP</text>
    </g>
  );
  return (
    <svg width={width} height={width} viewBox="0 0 200 200" fill="none" role="img" aria-label={`${garment} apparel`}>
      <defs>
        <linearGradient id={`fab-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="1" />
          <stop offset="1" stopColor={color} stopOpacity="0.82" />
        </linearGradient>
      </defs>
      {garment === "tee" && (
        <>
          <path d="M64 44 L40 58 L30 86 L46 96 L56 80 L56 168 L144 168 L144 80 L154 96 L170 86 L160 58 L136 44 L120 52 Q100 64 80 52 Z" fill={`url(#fab-${uid})`} stroke={stroke} strokeWidth="1.5" />
          <path d="M80 52 Q100 64 120 52" fill="none" stroke={stroke} strokeWidth="1.5" />
          <Emblem cx={100} cy={104} r={16} />
        </>
      )}
      {garment === "longsleeve" && (
        <>
          <path d="M64 44 L34 60 L18 120 L34 128 L52 84 L56 168 L144 168 L148 84 L166 128 L182 120 L166 60 L136 44 L120 52 Q100 64 80 52 Z" fill={`url(#fab-${uid})`} stroke={stroke} strokeWidth="1.5" />
          <path d="M80 52 Q100 64 120 52" fill="none" stroke={stroke} strokeWidth="1.5" />
          <Emblem cx={100} cy={104} r={16} />
        </>
      )}
      {garment === "hoodie" && (
        <>
          <path d="M64 50 L38 64 L28 92 L44 102 L56 84 L56 172 L144 172 L144 84 L156 102 L172 92 L162 64 L136 50 Z" fill={`url(#fab-${uid})`} stroke={stroke} strokeWidth="1.5" />
          {/* hood */}
          <path d="M64 50 Q100 28 136 50 Q120 70 100 70 Q80 70 64 50 Z" fill={`url(#fab-${uid})`} stroke={stroke} strokeWidth="1.5" />
          <path d="M78 60 Q100 74 122 60" fill="none" stroke={stroke} strokeWidth="1.2" opacity="0.7" />
          {/* pocket */}
          <path d="M70 132 H130 V158 H70 Z" fill="none" stroke={stroke} strokeWidth="1.2" opacity="0.7" />
          {/* drawstrings */}
          <line x1="92" y1="66" x2="92" y2="104" stroke={accent} strokeWidth="2" />
          <line x1="108" y1="66" x2="108" y2="104" stroke={accent} strokeWidth="2" />
          <Emblem cx={100} cy={112} r={14} />
        </>
      )}
      {garment === "cap" && (
        <>
          <path d="M40 120 Q44 70 100 68 Q156 70 160 120 Q100 110 40 120 Z" fill={`url(#fab-${uid})`} stroke={stroke} strokeWidth="1.5" />
          <path d="M40 120 Q24 126 22 140 Q70 138 70 126 Z" fill={`url(#fab-${uid})`} stroke={stroke} strokeWidth="1.5" />
          <path d="M100 68 Q100 92 100 110" stroke={stroke} strokeWidth="1" opacity="0.5" />
          <Emblem cx={100} cy={96} r={14} />
        </>
      )}
    </svg>
  );
}


// clear glass, black label with the LP roundel, gold double-border, and clean text.
function LabeledVial({ name, purity, width = 150 }) {
  const height = width * 1.5;
  const uid = (name || "x").replace(/[^a-zA-Z0-9]/g, "");
  const nameLen = (name || "").length;
  const nameSize = nameLen > 15 ? 8.4 : nameLen > 11 ? 9.6 : nameLen > 8 ? 11 : 12.5;
  // Pull the standard size + lot from the catalog so the label is accurate.
  const prod = (typeof PRODUCTS !== "undefined") ? PRODUCTS.find((p) => p.name === name) : null;
  const size = prod ? prod.variants[0].size.replace(" / vial", "") : "5mg";
  const lot = prod ? prod.batchPrefix : "LP-0000";

  return (
    <svg width={width} height={height} viewBox="0 0 200 300" fill="none" role="img" aria-label={`${name} vial, ${purity} purity`}>
      <defs>
        {/* clear glass cylinder */}
        <linearGradient id={`glass-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#c9d2da" stopOpacity="0.16" />
          <stop offset="0.2" stopColor="#eef3f7" stopOpacity="0.30" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.40" />
          <stop offset="0.8" stopColor="#dfe6ec" stopOpacity="0.26" />
          <stop offset="1" stopColor="#aab4bd" stopOpacity="0.14" />
        </linearGradient>
        {/* white liquid / powder fill */}
        <linearGradient id={`fill-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f3f6f8" stopOpacity="0.9" />
          <stop offset="1" stopColor="#cfd6dc" stopOpacity="0.85" />
        </linearGradient>
        {/* silver crimp cap */}
        <linearGradient id={`cap-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#6f7479" />
          <stop offset="0.25" stopColor="#c2c7cc" />
          <stop offset="0.5" stopColor="#eef1f4" />
          <stop offset="0.72" stopColor="#b9bec3" />
          <stop offset="1" stopColor="#65696e" />
        </linearGradient>
        <radialGradient id={`shadow-${uid}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#000000" stopOpacity="0.5" />
          <stop offset="1" stopColor="#000000" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`labelcurve-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#000000" stopOpacity="0.5" />
          <stop offset="0.16" stopColor="#000000" stopOpacity="0" />
          <stop offset="0.84" stopColor="#000000" stopOpacity="0" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.5" />
        </linearGradient>
      </defs>

      {/* ground shadow */}
      <ellipse cx="100" cy="288" rx="60" ry="8" fill={`url(#shadow-${uid})`} />

      {/* ---- silver cap ---- */}
      <ellipse cx="100" cy="20" rx="30" ry="5.5" fill="#d6dade" />
      <rect x="70" y="20" width="60" height="10" fill="#8b9095" />
      <rect x="73" y="28" width="54" height="26" rx="2" fill={`url(#cap-${uid})`} />
      {[78, 86, 94, 102, 110, 118].map((x) => (
        <line key={x} x1={x} y1="30" x2={x} y2="52" stroke="#5c6166" strokeWidth="0.6" opacity="0.45" />
      ))}
      <rect x="80" y="52" width="40" height="8" fill="#3a3f44" />

      {/* ---- glass body ---- */}
      <path d="M64 58 H136 V250 C136 268 122 280 100 280 C78 280 64 268 64 250 V58 Z"
            fill={`url(#glass-${uid})`} stroke="#aeb6bd" strokeWidth="1" strokeOpacity="0.5" />
      {/* liquid fill in lower body */}
      <path d="M64 150 H136 V250 C136 268 122 280 100 280 C78 280 64 268 64 250 Z"
            fill={`url(#fill-${uid})`} />
      <ellipse cx="100" cy="150" rx="36" ry="3.4" fill="#ffffff" opacity="0.5" />
      {/* glass highlight */}
      <rect x="73" y="64" width="5" height="150" rx="2.5" fill="#ffffff" opacity="0.30" />

      {/* ---- black label with gold double-border ---- */}
      <rect x="58" y="116" width="84" height="104" fill="#0b0a09" />
      <rect x="61" y="119" width="78" height="98" fill="none" stroke="#c9a05c" strokeWidth="1" />
      <rect x="63.5" y="121.5" width="73" height="93" fill="none" stroke="#c9a05c" strokeWidth="0.4" opacity="0.6" />

      {/* LP roundel (logo), small, top area */}
      <g>
        <circle cx="76" cy="136" r="9.5" fill="none" stroke="#c9a05c" strokeWidth="0.9" />
        <circle cx="76" cy="136" r="7.6" fill="none" stroke="#c9a05c" strokeWidth="0.35" opacity="0.6" />
        <path d="M70 132 l2.4 -1.4 l2.4 1.4 l1.8 -1 l2.4 1 l1.6 -0.8 l1.6 1.1" stroke="#c9a05c" strokeWidth="0.55" fill="none" />
        <text x="76" y="139" textAnchor="middle" fill="#efe6d8" fontSize="8" fontFamily="Fraunces, serif" fontWeight="700" letterSpacing="-0.4">LP</text>
      </g>
      <text x="92" y="134" fill="#9c8a76" fontSize="4.2" fontFamily="Inter, sans-serif" letterSpacing="0.6" style={{ textTransform: "uppercase" }}>Luxury Peps</text>
      <text x="92" y="140" fill="#c9a05c" fontSize="2.8" fontFamily="Inter, sans-serif" letterSpacing="1.2">PEPTIDES</text>

      {/* compound name centered, full width */}
      <text x="100" y="162" textAnchor="middle" fill="#efe6d8" fontSize={nameSize} fontFamily="Fraunces, serif" fontWeight="600">{name}</text>
      {/* size + purity centered */}
      <text x="100" y="175" textAnchor="middle" fill="#cdbfa8" fontSize="6" fontFamily="Inter, sans-serif">{size} / vial</text>
      <text x="100" y="185" textAnchor="middle" fill="#e8c788" fontSize="6.4" fontFamily="Inter, sans-serif" fontWeight="600">{purity}{/%/.test(purity) ? " HPLC" : ""}</text>

      {/* lot + storage row */}
      <line x1="66" y1="194" x2="134" y2="194" stroke="#c9a05c" strokeWidth="0.4" opacity="0.55" />
      <text x="67" y="202" fill="#9c8a76" fontSize="4.2" fontFamily="Inter, sans-serif" letterSpacing="0.3">LOT {lot}</text>
      <text x="133" y="202" textAnchor="end" fill="#9c8a76" fontSize="4.2" fontFamily="Inter, sans-serif" letterSpacing="0.3">STORE −20C</text>

      {/* research-use band */}
      <line x1="66" y1="207" x2="134" y2="207" stroke="#c9a05c" strokeWidth="0.4" opacity="0.55" />
      <text x="100" y="214" textAnchor="middle" fill="#c9a05c" fontSize="3.6" fontFamily="Inter, sans-serif" fontWeight="600" letterSpacing="0.2" style={{ textTransform: "uppercase" }}>For Research Use Only · Not For Human Use</text>

      {/* curvature shading to imply the cylinder */}
      <rect x="58" y="116" width="84" height="104" fill={`url(#labelcurve-${uid})`} />
    </svg>
  );
}

function Header({ page, setPage, cartCount, userEmail, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const go = (p) => { setPage(p); setMenuOpen(false); };
  // Lock background page scroll while the mobile menu is open.
  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [menuOpen]);
  const navItems = [
    ["shop", "Catalog"],
    ["about", "Standards"],
    ["calculator", "Calculator"],
    ["faq", "FAQ"],
    ["batch", "Batch Lookup"],
    ["contact", "Contact"],
  ];
  return (
    <header style={{ position: "sticky", top: 0, zIndex: 20 }}>
      {SITE_CONFIG.preorder && (
        <div style={{ background: "var(--gold)", color: "var(--bg)", textAlign: "center", fontSize: 12, letterSpacing: "0.04em", padding: "7px 16px", fontWeight: 600 }}>
          Now accepting pre-orders — new stock ships in {SITE_CONFIG.preorderShipEstimate}.
        </div>
      )}
      <div style={{ borderBottom: "1px solid var(--line)", background: "rgba(11,9,8,0.92)", backdropFilter: "blur(6px)" }}>
        <div className="lp-header-inner" style={{ maxWidth: 1600, margin: "0 auto", padding: "22px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button onClick={() => go("home")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}>
            <img src={LOGO_SRC} alt="Luxury Peps" style={{ height: 44, width: "auto", display: "block" }} />
          </button>

          {/* Desktop nav */}
          <nav className="lp-desktop-nav">
            {navItems.slice(0, 5).map(([p, label]) => (
              <button key={p} className="lp-nav-link" onClick={() => go(p)}>{label}</button>
            ))}
            <button className="lp-nav-link" onClick={() => go("cart")} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <ShoppingBag size={16} />
              {cartCount > 0 && <span style={{ color: "var(--gold-bright)" }}>{cartCount}</span>}
            </button>
            {userEmail && (
              <button className="lp-nav-link" onClick={onLogout} title={userEmail === "guest" ? "Exit preview" : `Signed in as ${userEmail}`} style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--muted)" }}>
                {userEmail === "guest" && <span style={{ fontSize: 11 }}>Preview</span>}
                <LogOut size={14} />
              </button>
            )}
          </nav>

          {/* Mobile: cart + hamburger */}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button className="lp-hamburger" onClick={() => go("cart")} aria-label="Cart" style={{ position: "relative" }}>
              <ShoppingBag size={22} />
              {cartCount > 0 && <span style={{ position: "absolute", top: 0, right: 0, background: "var(--gold)", color: "var(--bg)", fontSize: 10, fontWeight: 700, borderRadius: "50%", width: 15, height: 15, display: "flex", alignItems: "center", justifyContent: "center" }}>{cartCount}</span>}
            </button>
            <button className="lp-hamburger" onClick={() => setMenuOpen((o) => !o)} aria-label="Menu">
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        <div className={`lp-mobile-menu${menuOpen ? " open" : ""}`} style={{ background: "var(--bg)", borderBottom: "1px solid var(--line)" }}>
          {navItems.map(([p, label]) => (
            <button key={p} className="lp-mobile-link" onClick={() => go(p)}>
              {label} <ChevronRight size={16} style={{ color: "var(--gold)" }} />
            </button>
          ))}
          {userEmail && (
            <button className="lp-mobile-link" onClick={() => { onLogout(); setMenuOpen(false); }} style={{ color: "var(--muted)" }}>
              {userEmail === "guest" ? "Exit preview" : "Sign out"} <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

function Footer({ setPage }) {
  return (
    <footer style={{ borderTop: "1px solid var(--line)", marginTop: 80 }}>
      <div style={{ maxWidth: 1600, margin: "0 auto", padding: "48px 28px 28px" }}>
        <div className="lp-footer-grid" style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 32, marginBottom: 32 }}>
          <div>
            <div style={{ marginBottom: 12 }}>
              <img src={LOGO_SRC} alt="Luxury Peps" style={{ height: 52, width: "auto", display: "block" }} />
            </div>
            <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.7, maxWidth: 320 }}>
              Reference-grade peptide compounds, batch-tested and catalogued for the laboratory.
            </p>
          </div>
          <div>
            <div className="lp-eyebrow" style={{ marginBottom: 14 }}>Shop</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button className="lp-nav-link" onClick={() => setPage("shop")} style={{ textAlign: "left" }}>Full Catalog</button>
              <button className="lp-nav-link" onClick={() => setPage("about")} style={{ textAlign: "left" }}>Lab Standards</button>
              <button className="lp-nav-link" onClick={() => setPage("calculator")} style={{ textAlign: "left" }}>Concentration Calculator</button>
            </div>
          </div>
          <div>
            <div className="lp-eyebrow" style={{ marginBottom: 14 }}>Policies</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button className="lp-nav-link" onClick={() => setPage("terms")} style={{ textAlign: "left" }}>Terms of Service</button>
              <button className="lp-nav-link" onClick={() => setPage("privacy")} style={{ textAlign: "left" }}>Privacy Policy</button>
              <button className="lp-nav-link" onClick={() => setPage("shipping")} style={{ textAlign: "left" }}>Shipping &amp; Refunds</button>
              <button className="lp-nav-link" onClick={() => setPage("guide")} style={{ textAlign: "left" }}>Research Guide</button>
              <button className="lp-nav-link" onClick={() => setPage("status")} style={{ textAlign: "left" }}>Track Order</button>
              <button className="lp-nav-link" onClick={() => setPage("review")} style={{ textAlign: "left" }}>Write a Review</button>
              <button className="lp-nav-link" onClick={() => setPage("account")} style={{ textAlign: "left" }}>My Account</button>
              <button className="lp-nav-link" onClick={() => setPage("faq")} style={{ textAlign: "left" }}>FAQ</button>
              <button className="lp-nav-link" onClick={() => setPage("orders")} style={{ textAlign: "left" }}>My Orders</button>
              <button className="lp-nav-link" onClick={() => setPage("batch")} style={{ textAlign: "left" }}>Batch Lookup</button>
            </div>
          </div>
          <div>
            <div className="lp-eyebrow" style={{ marginBottom: 14 }}>Contact</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button className="lp-nav-link" onClick={() => setPage("contact")} style={{ textAlign: "left" }}>Contact Us</button>
              <button className="lp-nav-link" onClick={() => setPage("ambassador")} style={{ textAlign: "left" }}>Ambassador Program</button>
              <button className="lp-nav-link" onClick={() => setPage("portal")} style={{ textAlign: "left" }}>Ambassador Portal</button>
              <button className="lp-nav-link" onClick={() => setPage("owner")} style={{ textAlign: "left", opacity: 0.6 }}>Owner</button>
              <p style={{ fontSize: 13, color: "var(--muted)" }}>{SITE_CONFIG.contactEmail}</p>
            </div>
          </div>
        </div>
        <hr className="lp-hairline" />
        <p style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.8, marginTop: 24, maxWidth: 760 }}>
          All products sold by Luxury Peps are intended strictly for in-vitro laboratory research use by qualified
          professionals. They are not drugs, dietary supplements, or cosmetics, and are not intended for human or
          animal consumption, diagnostic use, or therapeutic use of any kind. Not evaluated by the FDA. By placing
          an order you certify you are purchasing for legitimate research purposes and are legally permitted to do so.
        </p>
      </div>
    </footer>
  );
}

function Home({ setPage, addToCart }) {
  const [addedBundle, setAddedBundle] = useState(null);
  const addBundle = (bundle) => {
    bundle.items.forEach((id) => {
      const prod = PRODUCTS.find((p) => p.id === id);
      if (prod) addToCart(prod.id, prod.variants[0].id, 1);
    });
    setAddedBundle(bundle.id);
    setTimeout(() => setAddedBundle((c) => (c === bundle.id ? null : c)), 1800);
  };

  return (
    <div className="lp-fade">
      <section style={{ maxWidth: 1600, margin: "0 auto", padding: "100px 28px 80px", textAlign: "center" }}>
        <div className="lp-eyebrow" style={{ marginBottom: 18 }}>Reference-Grade · Batch-Tested · Catalogued</div>
        <h1 className="lp-serif" style={{ fontSize: "clamp(40px, 7vw, 84px)", lineHeight: 1.02, fontWeight: 400, marginBottom: 24 }}>
          Purity, <span style={{ fontStyle: "italic", color: "var(--gold)" }}>refined</span>.
        </h1>
        <p style={{ color: "var(--muted)", maxWidth: 540, margin: "0 auto 36px", fontSize: 16, lineHeight: 1.7 }}>
          A curated house of laboratory peptide compounds, each batch verified for purity
          and presented with the precision the research deserves.
        </p>
        <button className="lp-btn lp-btn-solid" onClick={() => setPage("shop")}>
          Enter the Catalog
        </button>
      </section>

      <section style={{ maxWidth: 1600, margin: "0 auto", padding: "0 28px 100px" }}>
        <hr className="lp-hairline" style={{ marginBottom: 60 }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 40 }}>
          {[
            { icon: <Beaker size={20} />, t: "Verified Purity", d: "Every batch independently tested and documented before listing." },
            { icon: <ShieldCheck size={20} />, t: "Research Use Only", d: "Compounds are supplied exclusively for qualified laboratory research." },
            { icon: <Truck size={20} />, t: "Discreet Fulfilment", d: "Cold-chain handling and unmarked packaging on every order." },
          ].map((f, i) => (
            <div key={i}>
              <div style={{ color: "var(--gold)", marginBottom: 14 }}>{f.icon}</div>
              <div className="lp-serif" style={{ fontSize: 19, marginBottom: 8 }}>{f.t}</div>
              <p style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.7 }}>{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ maxWidth: 1600, margin: "0 auto", padding: "0 28px 110px" }}>
        <hr className="lp-hairline" style={{ marginBottom: 50 }} />
        <div className="lp-eyebrow" style={{ marginBottom: 10 }}>Curated Stacks</div>
        <h2 className="lp-serif" style={{ fontSize: 34, fontWeight: 400, marginBottom: 8 }}>Bundle kits, priced to save</h2>
        <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 36, maxWidth: 560 }}>
          Pre-built research stacks that pair commonly studied compounds together — each priced below the
          sum of its individual vials.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))", gap: 22 }}>
          {BUNDLES.map((b) => {
            const { prods, full, price, saved } = bundlePricing(b);
            const added = addedBundle === b.id;
            return (
              <div key={b.id} className="lp-card" style={{ padding: 22, display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "flex-start" }}>
                  {prods.map((p) => (
                    <div key={p.id} style={{ width: 52, height: 78, background: "var(--panel-2)", border: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                      <ProductImg id={p.id} alt={p.name} style={{ width: "100%", height: "auto" }} fallback={<VialIcon size={26} />} />
                    </div>
                  ))}
                  <span style={{ marginLeft: "auto", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--bg)", background: "var(--gold)", padding: "3px 8px", fontWeight: 600, alignSelf: "flex-start" }}>
                    Save ${saved}
                  </span>
                </div>
                <div className="lp-serif" style={{ fontSize: 21, marginBottom: 6 }}>{b.name}</div>
                <p style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6, marginBottom: 14 }}>{b.tagline}</p>
                <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 16 }}>
                  Includes: {prods.map((p) => p.name).join(" · ")}
                </div>
                <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <span style={{ color: "var(--gold-bright)", fontSize: 18 }}>${price}</span>
                    <span style={{ fontSize: 13, color: "var(--muted)", textDecoration: "line-through", marginLeft: 8 }}>${full}</span>
                  </div>
                  <button className="lp-btn" style={{ padding: "9px 14px", fontSize: 11, display: "flex", alignItems: "center", gap: 5 }} onClick={() => addBundle(b)}>
                    {added ? <><Check size={12} /> Added</> : <><Plus size={12} /> Add Kit</>}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function RecentlyViewed({ ids, openProduct, exclude }) {
  const list = ids.filter((id) => id !== exclude).map((id) => PRODUCTS.find((p) => p.id === id)).filter(Boolean).slice(0, 5);
  if (list.length === 0) return null;
  return (
    <div style={{ marginTop: 64 }}>
      <div className="lp-eyebrow" style={{ marginBottom: 18 }}>Recently Viewed</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 16 }}>
        {list.map((p) => (
          <div key={p.id} className="lp-card" style={{ cursor: "pointer" }} onClick={() => openProduct(p.id)}>
            <VialStage name={p.name} purity={p.purity} width={110} molecular={false} imageId={p.id} imageSrc={PRODUCT_IMAGES[p.id]} style={{ aspectRatio: "3 / 4" }} />
            <div style={{ padding: 14 }}>
              <div className="lp-serif" style={{ fontSize: 15, marginBottom: 3 }}>{p.name}</div>
              <div style={{ fontSize: 12, color: "var(--gold-bright)" }}>From ${Math.min(...p.variants.map((v) => v.price))}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ApparelFlip({ front, back }) {
  const [show, setShow] = useState(false);
  return (
    <div
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onClick={() => setShow((s) => !s)}
      style={{ perspective: 1100, width: "100%", aspectRatio: "1 / 1", cursor: "pointer" }}
    >
      <div style={{ position: "relative", width: "100%", height: "100%", transition: "transform 0.7s cubic-bezier(.2,.7,.2,1)", transformStyle: "preserve-3d", transform: show ? "rotateY(180deg)" : "rotateY(0deg)" }}>
        <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <img src={front} alt="Front view" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </div>
        <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <img src={back} alt="Back view" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </div>
      </div>
      <div style={{ position: "absolute", bottom: 10, left: 0, right: 0, textAlign: "center", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", pointerEvents: "none" }}>
        {show ? "Back" : "Front · hover to flip"}
      </div>
    </div>
  );
}

function ApparelCard({ item, addToCart }) {
  const [size, setSize] = useState(item.variants[0].size);
  const [added, setAdded] = useState(false);
  const variant = item.variants.find((v) => v.size === size) || item.variants[0];
  const pre = isPreorder(item);
  const add = () => { addToCart(item.id, variant.id, 1); setAdded(true); setTimeout(() => setAdded(false), 1500); };
  return (
    <div className="lp-card" style={{ display: "flex", flexDirection: "column" }}>
      <div className="lp-vial-stage" style={{ aspectRatio: "1 / 1", position: "relative" }}>
        {pre && (
          <span style={{ position: "absolute", top: 12, left: 12, zIndex: 2, fontSize: 9.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--bg)", background: "var(--gold)", padding: "3px 8px", fontWeight: 600 }}>
            Pre-order
          </span>
        )}
        {item.flip
          ? <ApparelFlip front={item.flip.front} back={item.flip.back} />
          : <ApparelGarment garment={item.garment} color={item.color} accent={item.accent} width={170} />}
      </div>
      <div style={{ padding: 18, display: "flex", flexDirection: "column", flex: 1 }}>
        <div className="lp-serif" style={{ fontSize: 18, marginBottom: 4 }}>{item.name}</div>
        <p style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6, marginBottom: 14 }}>{item.blurb}</p>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
          {item.variants.map((v) => {
            const on = size === v.size;
            return (
              <button key={v.id} onClick={() => setSize(v.size)} style={{ fontSize: 11, padding: "5px 11px", cursor: "pointer", border: `1px solid ${on ? "var(--gold)" : "var(--line)"}`, background: on ? "var(--brown-deep)" : "transparent", color: on ? "var(--gold-bright)" : "var(--muted)" }}>{v.size}</button>
            );
          })}
        </div>
        <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ color: "var(--gold-bright)", fontSize: 16 }}>${item.price}</span>
          <button className="lp-btn lp-btn-solid" onClick={add} style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}>
            {added ? <><Check size={12} /> Added</> : (pre ? <><Plus size={12} /> Pre-order</> : <><Plus size={12} /> Add</>)}
          </button>
        </div>
        {pre && (
          <div style={{ marginTop: 12, fontSize: 11, color: "var(--muted)", display: "flex", alignItems: "center", gap: 6 }}>
            <Truck size={12} /> Ships in {SITE_CONFIG.preorderShipEstimate}.
          </div>
        )}
      </div>
    </div>
  );
}

// Large front/back product viewer with explicit Front/Back toggle (works on
// desktop and mobile) plus the 3D flip animation.
function ApparelViewer({ item }) {
  const [side, setSide] = useState("front");
  const hasFlip = !!item.flip;
  return (
    <div>
      <div className="lp-vial-stage" style={{ aspectRatio: "1 / 1", position: "relative", perspective: 1200 }} onClick={() => hasFlip && setSide((s) => (s === "front" ? "back" : "front"))}>
        {isPreorder(item) && (
          <span style={{ position: "absolute", top: 14, left: 14, zIndex: 3, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--bg)", background: "var(--gold)", padding: "4px 10px", fontWeight: 600 }}>Pre-order</span>
        )}
        {hasFlip ? (
          <div style={{ position: "relative", width: "100%", height: "100%", transition: "transform 0.7s cubic-bezier(.2,.7,.2,1)", transformStyle: "preserve-3d", transform: side === "back" ? "rotateY(180deg)" : "rotateY(0deg)", cursor: "pointer" }}>
            <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", display: "flex", alignItems: "center", justifyContent: "center", padding: "6%" }}>
              <img src={item.flip.front} alt={item.name + " front"} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            </div>
            <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg)", display: "flex", alignItems: "center", justifyContent: "center", padding: "6%" }}>
              <img src={item.flip.back} alt={item.name + " back"} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
            <ApparelGarment garment={item.garment} color={item.color} accent={item.accent} width={280} />
          </div>
        )}
      </div>
      {hasFlip && (
        <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "center" }}>
          {["front", "back"].map((s) => (
            <button key={s} onClick={() => setSide(s)} style={{ fontSize: 11.5, letterSpacing: "0.08em", textTransform: "uppercase", padding: "8px 22px", cursor: "pointer", border: `1px solid ${side === s ? "var(--gold)" : "var(--line)"}`, background: side === s ? "var(--brown-deep)" : "transparent", color: side === s ? "var(--gold-bright)" : "var(--muted)" }}>{s}</button>
          ))}
        </div>
      )}
    </div>
  );
}

// Expandable size guide with an inches/cm toggle.
function SizeGuide() {
  const [open, setOpen] = useState(false);
  const [unit, setUnit] = useState("in");
  const conv = (v) => (unit === "in" ? v : Math.round(v * 2.54));
  const u = unit === "in" ? "\"" : "cm";
  const cell = { padding: "6px 8px", borderBottom: "1px solid var(--line)" };
  return (
    <div style={{ marginTop: 18 }}>
      <button onClick={() => setOpen((o) => !o)} className="lp-nav-link" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5 }}>
        <Ruler size={14} /> {open ? "Hide size guide" : "Size guide"}
      </button>
      {open && (
        <div style={{ marginTop: 14, border: "1px solid var(--line)", padding: "16px 18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
            <span className="lp-eyebrow">Measurements</span>
            <div style={{ display: "flex", border: "1px solid var(--line)" }}>
              {["in", "cm"].map((x) => (
                <button key={x} onClick={() => setUnit(x)} style={{ fontSize: 11, padding: "4px 12px", cursor: "pointer", border: "none", background: unit === x ? "var(--gold)" : "transparent", color: unit === x ? "var(--bg)" : "var(--muted)" }}>{x}</button>
              ))}
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 320 }}>
              <thead>
                <tr style={{ color: "var(--muted)", textAlign: "left" }}>
                  <th style={cell}>Size</th><th style={cell}>Chest (flat)</th><th style={cell}>Length</th><th style={cell}>Sleeve</th>
                </tr>
              </thead>
              <tbody>
                {APPAREL_SIZE_GUIDE.map((r) => (
                  <tr key={r.size} style={{ color: "var(--cream)" }}>
                    <td style={{ ...cell, color: "var(--gold-bright)" }}>{r.size}</td>
                    <td style={cell}>{conv(r.chest)}{u}</td>
                    <td style={cell}>{conv(r.length)}{u}</td>
                    <td style={cell}>{conv(r.sleeve)}{u}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 10, lineHeight: 1.5 }}>Flat garment measurements; allow ±1&quot; variance. Chest is measured across the front — double it for full circumference.</p>
        </div>
      )}
    </div>
  );
}

// Rich per-item apparel layout: big viewer + details + size guide.
function ApparelDetail({ item, addToCart }) {
  const [size, setSize] = useState(item.variants[0].size);
  const [added, setAdded] = useState(false);
  const variant = item.variants.find((v) => v.size === size) || item.variants[0];
  const pre = isPreorder(item);
  const add = () => { addToCart(item.id, variant.id, 1); setAdded(true); setTimeout(() => setAdded(false), 1500); };
  return (
    <div className="lp-apparel-grid">
      <ApparelViewer item={item} />
      <div>
        <div className="lp-eyebrow" style={{ marginBottom: 10 }}>{item.garment === "tee" ? "Heavyweight Tee" : "Apparel"}</div>
        <h3 className="lp-serif" style={{ fontSize: 30, marginBottom: 14 }}>{item.name}</h3>
        <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.7, marginBottom: 22, maxWidth: 460 }}>{item.blurb}</p>
        <div className="lp-serif" style={{ color: "var(--gold-bright)", fontSize: 24, marginBottom: 24 }}>${item.price}</div>
        <div className="lp-eyebrow" style={{ marginBottom: 10 }}>Size</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {item.variants.map((v) => {
            const on = size === v.size;
            return (
              <button key={v.id} onClick={() => setSize(v.size)} style={{ fontSize: 12.5, minWidth: 48, padding: "10px 14px", cursor: "pointer", border: `1px solid ${on ? "var(--gold)" : "var(--line)"}`, background: on ? "var(--brown-deep)" : "transparent", color: on ? "var(--gold-bright)" : "var(--muted)" }}>{v.size}</button>
            );
          })}
        </div>
        <SizeGuide />
        <button className="lp-btn lp-btn-solid" onClick={add} style={{ marginTop: 24, fontSize: 13.5, display: "inline-flex", alignItems: "center", gap: 7, padding: "13px 26px" }}>
          {added ? <><Check size={15} /> Added to cart</> : (pre ? <><Plus size={15} /> Pre-order — ${item.price}</> : <><Plus size={15} /> Add to cart — ${item.price}</>)}
        </button>
        {pre && (
          <div style={{ marginTop: 16, fontSize: 12, color: "var(--muted)", display: "flex", alignItems: "center", gap: 7 }}>
            <Truck size={13} /> Ships in {SITE_CONFIG.preorderShipEstimate} when stock arrives.
          </div>
        )}
      </div>
    </div>
  );
}

function ApparelPage({ setPage, addToCart }) {
  return (
    <div className="lp-fade" style={{ maxWidth: 1080, margin: "0 auto", padding: "60px 28px 100px" }}>
      <div className="lp-eyebrow" style={{ marginBottom: 10 }}>Merch</div>
      <h2 className="lp-serif" style={{ fontSize: 38, fontWeight: 400, marginBottom: 10 }}>Apparel</h2>
      <p style={{ color: "var(--muted)", fontSize: 14.5, marginBottom: 48, maxWidth: 560 }}>
        Wear the brand. Premium pieces cut in the Luxury Peps black-and-gold aesthetic.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 72 }}>
        {APPAREL.map((item) => <ApparelDetail key={item.id} item={item} addToCart={addToCart} />)}
      </div>
    </div>
  );
}

function ShopCard({ p, openProduct, addToCart, rating }) {
  const [added, setAdded] = useState(false);
  const minPrice = Math.min(...p.variants.map((v) => v.price));
  const pre = isPreorder(p);
  const sold = isSoldOut(p);
  const multi = p.variants.length > 1;
  const badges = productBadges(p);
  const order = (e) => {
    e.stopPropagation();
    if (sold) return;
    if (multi) { openProduct(p.id); return; }
    addToCart(p.id, p.variants[0].id, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };
  const learn = (e) => { e.stopPropagation(); openProduct(p.id); };
  return (
    <div className="lp-card" style={{ position: "relative", display: "flex", flexDirection: "column" }}>
      {sold ? (
        <span style={{ position: "absolute", top: 12, left: 12, zIndex: 2, fontSize: 9.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--cream)", background: "#3a2a2a", border: "1px solid #7a4a4a", padding: "3px 8px", fontWeight: 600 }}>
          Sold Out
        </span>
      ) : pre && (
        <span style={{ position: "absolute", top: 12, left: 12, zIndex: 2, fontSize: 9.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--bg)", background: "var(--gold)", padding: "3px 8px", fontWeight: 600 }}>
          Pre-order
        </span>
      )}
      {badges.length > 0 && (
        <div style={{ position: "absolute", top: 12, right: 12, zIndex: 2, display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
          {badges.map((b) => (
            <span key={b} style={{ fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600, padding: "3px 8px", background: BADGE_STYLE[b].bg, color: BADGE_STYLE[b].fg, border: `1px solid ${BADGE_STYLE[b].border}` }}>
              {BADGE_STYLE[b].label}
            </span>
          ))}
        </div>
      )}
      <div style={{ cursor: "pointer" }} onClick={learn}>
        <VialStage name={p.name} purity={p.purity} width={150} molecular={false} imageId={p.id} imageSrc={PRODUCT_IMAGES[p.id]} style={{ aspectRatio: "3 / 4" }} />
      </div>
      <div className="lp-card-body" style={{ padding: 18, display: "flex", flexDirection: "column", flex: 1 }}>
        <div className="lp-eyebrow" style={{ marginBottom: 6 }}>No. {p.no}</div>
        <div className="lp-serif lp-card-title" style={{ fontSize: 19, marginBottom: 4, cursor: "pointer" }} onClick={learn}>{p.name}</div>
        {rating && rating.count > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
          <StarRating value={Math.round(rating.average)} size={11} />
          <span style={{ fontSize: 11, color: "var(--muted)" }}>{rating.average.toFixed(1)} ({rating.count})</span>
        </div>
        )}
        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>{p.variants.length > 1 ? `${p.variants.length} sizes` : p.variants[0].size.replace(/ \/ (vial|bottle)/, "")} · {p.purity}</div>
        <div style={{ marginBottom: 14 }}>
          <span style={{ color: "var(--gold-bright)", fontSize: 15 }}>From ${minPrice}</span>
        </div>
        <div className="lp-card-actions" style={{ display: "flex", gap: 8, marginTop: "auto" }}>
          <button className="lp-btn lp-btn-solid" onClick={order} disabled={sold} style={{ flex: 1, fontSize: 12, padding: "10px 8px", ...(sold ? { opacity: 0.5, cursor: "not-allowed" } : {}) }}>
            {sold
              ? "Sold Out"
              : (added
                ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Check size={13} /> Added</span>
                : (multi ? "Choose size" : (pre ? "Pre-order" : "Order")))}
          </button>
          <button className="lp-btn" onClick={learn} style={{ flex: 1, fontSize: 12, padding: "10px 8px" }}>Learn more</button>
        </div>
      </div>
    </div>
  );
}

function Shop({ setPage, openProduct, addToCart, recentlyViewed = [] }) {
  const [ratings, setRatings] = useState({});
  useEffect(() => { let alive = true; (async () => { const s = await fetchReviewSummary(); if (alive) setRatings(s); })(); return () => { alive = false; }; }, []);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("featured");

  const minPriceOf = (p) => Math.min(...p.variants.map((v) => v.price));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = PRODUCTS.filter((p) => {
      const matchesCat = category === "all" || p.category === category;
      const matchesQuery = !q || p.name.toLowerCase().includes(q) || p.no.includes(q);
      return matchesCat && matchesQuery;
    });
    if (sort === "price-low") list = [...list].sort((a, b) => minPriceOf(a) - minPriceOf(b));
    else if (sort === "price-high") list = [...list].sort((a, b) => minPriceOf(b) - minPriceOf(a));
    else if (sort === "name") list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [query, category, sort]);

  return (
    <div className="lp-fade" style={{ maxWidth: 1600, margin: "0 auto", padding: "60px 28px 100px" }}>
      <div className="lp-eyebrow" style={{ marginBottom: 10 }}>The Catalog</div>
      <h2 className="lp-serif" style={{ fontSize: 38, fontWeight: 400, marginBottom: 28 }}>Every compound, catalogued</h2>

      {/* search + sort row */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", marginBottom: 18 }}>
        <div style={{ position: "relative", flex: "1 1 280px" }}>
          <Search size={15} color="var(--muted)" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
          <input
            type="text"
            placeholder="Search compounds…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ paddingLeft: 38 }}
          />
          {query && (
            <button onClick={() => setQuery("")} aria-label="Clear search" style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: 0 }}>
              <X size={15} />
            </button>
          )}
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value)} style={{ width: "auto", minWidth: 180 }}>
          <option value="featured">Sort: Featured</option>
          <option value="price-low">Price: Low to High</option>
          <option value="price-high">Price: High to Low</option>
          <option value="name">Name: A–Z</option>
        </select>
        <button className="lp-btn" onClick={() => setPage("compare")} style={{ fontSize: 12, whiteSpace: "nowrap" }}>Compare</button>
      </div>

      {/* category filter pills */}
      <div className="lp-catpills" style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 28 }}>
        {CATEGORIES.map((c) => {
          const active = category === c.id;
          return (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              style={{
                fontSize: 12, letterSpacing: "0.04em", textTransform: "uppercase",
                padding: "8px 16px", cursor: "pointer", whiteSpace: "nowrap",
                border: `1px solid ${active ? "var(--gold)" : "var(--line)"}`,
                background: active ? "var(--brown-deep)" : "transparent",
                color: active ? "var(--gold-bright)" : "var(--muted)",
              }}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 22 }}>
        {filtered.length} {filtered.length === 1 ? "result" : "results"}
        {category !== "all" && <span> · {CATEGORIES.find((c) => c.id === category)?.label}</span>}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "70px 20px", border: "1px solid var(--line)" }}>
          <div className="lp-serif" style={{ fontSize: 22, marginBottom: 10 }}>No compounds found</div>
          <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 22 }}>Try a different search term or category.</p>
          <button className="lp-btn" onClick={() => { setQuery(""); setCategory("all"); }}>Reset filters</button>
        </div>
      ) : (
        <div className="lp-shop-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 24 }}>
          {filtered.map((p) => (
            <ShopCard key={p.id} p={p} openProduct={openProduct} addToCart={addToCart} rating={ratings[p.id]} />
          ))}
        </div>
      )}

      <RecentlyViewed ids={recentlyViewed} openProduct={openProduct} />
    </div>
  );
}

// Product image carousel: photo first, then any COA image. Desktop shows
// left/right arrows; mobile is swipe-driven. Falls back to a single image
// (no arrows/dots) for products without a COA.
function ProductGallery({ p }) {
  const slides = useMemo(() => {
    const arr = [{ type: "product", label: "Product" }];
    if (PRODUCT_COA[p.id]) arr.push({ type: "coa", label: "Certificate of Analysis", src: productCoaSrc(p.id) });
    return arr;
  }, [p.id]);
  const n = slides.length;
  const [idx, setIdx] = useState(0);
  useEffect(() => { setIdx(0); }, [p.id]);
  const go = (d) => setIdx((i) => (i + d + n) % n);
  const touchX = useRef(null);
  const onStart = (e) => { touchX.current = e.touches[0].clientX; };
  const onEnd = (e) => {
    if (touchX.current == null || n < 2) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
    touchX.current = null;
  };
  const cur = slides[idx];
  return (
    <div>
      <div className="lp-gallery" style={{ minHeight: 420 }} onTouchStart={onStart} onTouchEnd={onEnd}>
        {cur.type === "product" ? (
          <VialStage name={p.name} purity={p.purity} width={230} imageId={p.id} imageSrc={PRODUCT_IMAGES[p.id]} style={{ minHeight: 420 }} />
        ) : (
          <div style={{ minHeight: 420, height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--panel)", border: "1px solid var(--line)" }}>
            <img src={cur.src} alt={`${p.name} Certificate of Analysis`} style={{ width: "100%", maxHeight: 560, objectFit: "contain", padding: "4%" }} />
          </div>
        )}
        {n > 1 && (
          <>
            <button className="lp-gal-arrow prev" onClick={() => go(-1)} aria-label="Previous image"><ChevronLeft size={20} /></button>
            <button className="lp-gal-arrow next" onClick={() => go(1)} aria-label="Next image"><ChevronRight size={20} /></button>
            <span style={{ position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)", fontSize: 9.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", background: "rgba(10,7,5,0.72)", padding: "3px 10px", border: "1px solid var(--line)", whiteSpace: "nowrap" }}>{cur.label}</span>
          </>
        )}
      </div>
      {n > 1 && (
        <div className="lp-gal-dots">
          {slides.map((s, i) => (
            <button key={i} className={`lp-gal-dot${i === idx ? " active" : ""}`} onClick={() => setIdx(i)} aria-label={`Go to image ${i + 1}`} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProductDetail({ productId, setPage, addToCart, openProduct, recentlyViewed = [] }) {
  const p = PRODUCTS.find((x) => x.id === productId);
  const [variantId, setVariantId] = useState(p ? p.variants[0].id : null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [reviewData, setReviewData] = useState({ reviews: [], count: 0, average: 0 });
  useEffect(() => {
    let alive = true;
    (async () => { const d = await fetchProductReviews(productId); if (alive) setReviewData(d); })();
    return () => { alive = false; };
  }, [productId]);
  if (!p) return null;
  const variant = p.variants.find((v) => v.id === variantId) || p.variants[0];

  return (
    <div className="lp-fade" style={{ maxWidth: 1400, margin: "0 auto", padding: "50px 28px 100px" }}>
      <button className="lp-nav-link" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 36 }} onClick={() => setPage("shop")}>
        <ChevronLeft size={14} /> Back to Catalog
      </button>
      <div className="lp-detail-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60 }}>
        <ProductGallery p={p} />
        <div>
          <div className="lp-eyebrow" style={{ marginBottom: 10 }}>No. {p.no} · Batch {variant.batch}</div>
          <h2 className="lp-serif" style={{ fontSize: 44, fontWeight: 400, marginBottom: 12 }}>{p.name}</h2>
          {reviewData.count > 0 && (
          <button
            onClick={() => { const el = document.getElementById("lp-reviews"); if (el) el.scrollIntoView({ behavior: "smooth" }); }}
            style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", padding: 0, cursor: "pointer", marginBottom: 18 }}
          >
            <StarRating value={Math.round(reviewData.average)} size={14} />
            <span style={{ fontSize: 13, color: "var(--muted)" }}>{reviewData.average.toFixed(1)} · {reviewData.count} review{reviewData.count === 1 ? "" : "s"}</span>
          </button>
          )}
          <p style={{ color: "var(--gold-bright)", fontSize: 22, marginBottom: 24, display: "flex", alignItems: "baseline", gap: 10 }}>
            ${Math.round(variant.price * (1 - qtyDiscountPct(qty)))}
            {qtyDiscountPct(qty) > 0 && (
              <>
                <span style={{ fontSize: 15, color: "var(--muted)", textDecoration: "line-through" }}>${variant.price}</span>
                <span style={{ fontSize: 12, color: "var(--gold)" }}>−{Math.round(qtyDiscountPct(qty) * 100)}% volume</span>
              </>
            )}
          </p>

          <div style={{ marginBottom: 24 }}>
            <div className="lp-eyebrow" style={{ marginBottom: 10 }}>Vial Size</div>
            <div style={{ display: "flex", gap: 10 }}>
              {p.variants.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setVariantId(v.id)}
                  style={{
                    padding: "10px 16px",
                    fontSize: 13,
                    cursor: "pointer",
                    border: `1px solid ${v.id === variant.id ? "var(--gold)" : "var(--line)"}`,
                    background: v.id === variant.id ? "var(--brown-deep)" : "transparent",
                    color: v.id === variant.id ? "var(--gold-bright)" : "var(--muted)",
                  }}
                >
                  {v.size.replace(" / vial", "")}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <div className="lp-eyebrow" style={{ marginBottom: 10 }}>Volume Pricing</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[{ min: 1, pct: 0 }, ...QTY_BREAKS].sort((a, b) => a.min - b.min).map((b, i, arr) => {
                const active = qty >= b.min && (i === arr.length - 1 || qty < arr[i + 1].min);
                const unit = Math.round(variant.price * (1 - b.pct));
                return (
                  <div key={b.min} style={{
                    flex: "1 1 80px", textAlign: "center", padding: "10px 8px",
                    border: `1px solid ${active ? "var(--gold)" : "var(--line)"}`,
                    background: active ? "var(--brown-deep)" : "transparent",
                  }}>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 3 }}>{b.min}+ {b.min === 1 ? "vial" : "vials"}</div>
                    <div style={{ fontSize: 14, color: active ? "var(--gold-bright)" : "var(--cream)" }}>${unit}</div>
                    {b.pct > 0 && <div style={{ fontSize: 10, color: "var(--gold)" }}>save {Math.round(b.pct * 100)}%</div>}
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)", padding: "18px 0", marginBottom: 28, display: "flex", flexDirection: "column", gap: 10 }}>
            <Row label="Form" value={p.form} />
            <Row label="Vial Size" value={variant.size} />
            <Row label="Purity (HPLC)" value={p.purity} />
            <Row label="Storage" value="−20°C, lyophilized, protect from light" />
          </div>


          <p style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.8, marginBottom: 32 }}>
            Supplied as a lyophilized powder for laboratory research use only. Not for human or animal use,
            diagnostic procedures, or any in-vivo application outside an accredited research setting.
          </p>

          <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", border: "1px solid var(--line)" }}>
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} style={{ background: "none", border: "none", color: "var(--cream)", padding: "10px 14px", cursor: "pointer" }}><Minus size={14} /></button>
              <span style={{ padding: "0 16px", minWidth: 24, textAlign: "center" }}>{qty}</span>
              <button onClick={() => setQty((q) => q + 1)} style={{ background: "none", border: "none", color: "var(--cream)", padding: "10px 14px", cursor: "pointer" }}><Plus size={14} /></button>
            </div>
            <button
              className="lp-btn lp-btn-solid"
              style={{ flex: 1, ...(isSoldOut(p) ? { opacity: 0.5, cursor: "not-allowed" } : {}) }}
              disabled={isSoldOut(p)}
              onClick={() => { if (isSoldOut(p)) return; addToCart(p.id, variant.id, qty); setAdded(true); setTimeout(() => setAdded(false), 1800); }}
            >
              {isSoldOut(p) ? "Out of Stock" : (added ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><Check size={14} /> Added</span> : (isPreorder(p) ? "Pre-order" : "Add to Cart"))}
            </button>
          </div>

          {isSoldOut(p) ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "#e0a0a0", marginTop: 2, marginBottom: 2 }}>
              <AlertCircle size={14} /> Currently out of stock — check back soon.
            </div>
          ) : isPreorder(p) && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--gold-bright)", marginTop: 2, marginBottom: 2 }}>
              <Truck size={14} /> Pre-order — ships in {SITE_CONFIG.preorderShipEstimate} when stock arrives.
            </div>
          )}
        </div>
      </div>

      <div id="lp-reviews" style={{ marginTop: 72, scrollMarginTop: 90 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 6, flexWrap: "wrap" }}>
          <h3 className="lp-serif" style={{ fontSize: 28 }}>Reviews</h3>
          {reviewData.count > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <StarRating value={Math.round(reviewData.average)} size={14} />
              <span style={{ fontSize: 13, color: "var(--muted)" }}>{reviewData.average.toFixed(1)} out of 5 · {reviewData.count} review{reviewData.count === 1 ? "" : "s"}</span>
            </div>
          )}
        </div>
        <p style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 24, lineHeight: 1.7 }}>
          Reviews come only from verified purchases of this compound, and cover product quality,
          purity against the certificate of analysis, documentation, packaging, and shipping.
        </p>

        {reviewData.count === 0 ? (
          <div style={{ border: "1px solid var(--line)", padding: "28px 22px", textAlign: "center" }}>
            <p style={{ color: "var(--muted)", fontSize: 13.5, marginBottom: 16 }}>No reviews yet for this compound.</p>
            <button className="lp-btn" onClick={() => setPage("review")}>Reviewed an order? Write one</button>
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 18 }}>
              {reviewData.reviews.map((r) => (
                <div key={r.id} style={{ border: "1px solid var(--line)", padding: "20px 22px", background: "var(--panel)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <StarRating value={r.rating} size={13} />
                    <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{String(r.created_at || "").slice(0, 10)}</span>
                  </div>
                  <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--cream)", marginBottom: 16 }}>{r.body}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, color: "var(--cream)" }}>{r.display_name || "Verified buyer"}</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10.5, letterSpacing: "0.04em", color: "var(--gold-bright)" }}>
                      <ShieldCheck size={11} /> Verified Buyer
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <button className="lp-btn" onClick={() => setPage("review")} style={{ marginTop: 20 }}>Write a review</button>
          </>
        )}
      </div>

      <RecentlyViewed ids={recentlyViewed} openProduct={openProduct} exclude={p.id} />
    </div>
  );
}

function ComparePage({ setPage, openProduct }) {
  const [selected, setSelected] = useState([]);
  const toggle = (id) => {
    setSelected((cur) => cur.includes(id) ? cur.filter((x) => x !== id) : (cur.length < 3 ? [...cur, id] : cur));
  };
  const chosen = selected.map((id) => PRODUCTS.find((p) => p.id === id)).filter(Boolean);
  const minPrice = (p) => Math.min(...p.variants.map((v) => v.price));

  const rows = [
    { label: "Category", get: (p) => (CATEGORIES.find((c) => c.id === p.category) || {}).label || "—" },
    { label: "Form", get: (p) => p.form },
    { label: "Purity (HPLC)", get: (p) => p.purity },
    { label: "Sizes", get: (p) => p.variants.map((v) => v.size.replace(/ \/ (vial|bottle)/, "")).join(", ") },
    { label: "From", get: (p) => `$${minPrice(p)}` },

  ];

  return (
    <div className="lp-fade" style={{ maxWidth: 1400, margin: "0 auto", padding: "64px 28px 100px" }}>
      <button className="lp-nav-link" onClick={() => setPage("shop")} style={{ marginBottom: 24, display: "inline-flex", alignItems: "center", gap: 6 }}>
        <ChevronLeft size={14} /> Catalog
      </button>
      <div className="lp-eyebrow" style={{ marginBottom: 10 }}>Compare</div>
      <h1 className="lp-serif" style={{ fontSize: 34, fontWeight: 400, marginBottom: 14 }}>Compare compounds</h1>
      <p style={{ color: "var(--muted)", fontSize: 14.5, lineHeight: 1.8, marginBottom: 28 }}>
        Select up to three compounds to compare side by side. {selected.length}/3 selected.
      </p>

      {/* selector */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 40 }}>
        {PRODUCTS.map((p) => {
          const on = selected.includes(p.id);
          const disabled = !on && selected.length >= 3;
          return (
            <button key={p.id} onClick={() => toggle(p.id)} disabled={disabled}
              style={{
                fontSize: 12.5, padding: "7px 13px", cursor: disabled ? "not-allowed" : "pointer",
                border: `1px solid ${on ? "var(--gold)" : "var(--line)"}`,
                background: on ? "var(--brown-deep)" : "transparent",
                color: on ? "var(--gold-bright)" : (disabled ? "var(--line)" : "var(--muted)"),
              }}>
              {on ? "✓ " : ""}{p.name}
            </button>
          );
        })}
      </div>

      {chosen.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", border: "1px solid var(--line)" }}>
          <p style={{ color: "var(--muted)", fontSize: 14 }}>Pick a couple of compounds above to start comparing.</p>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: `160px repeat(${chosen.length}, minmax(180px, 1fr))`, border: "1px solid var(--line)", minWidth: 480 }}>
            {/* header row: vials */}
            <div style={{ borderBottom: "1px solid var(--line)", borderRight: "1px solid var(--line)", background: "var(--panel)" }} />
            {chosen.map((p) => (
              <div key={p.id} style={{ padding: 18, borderBottom: "1px solid var(--line)", borderRight: "1px solid var(--line)", textAlign: "center" }}>
                <div style={{ width: 70, margin: "0 auto 12px" }}>
                  <ProductImg id={p.id} alt={p.name} style={{ width: "100%", height: "auto" }} fallback={<LabeledVial name={p.name} purity={p.purity} width={70} />} />
                </div>
                <div className="lp-serif" style={{ fontSize: 16 }}>{p.name}</div>
              </div>
            ))}
            {/* spec rows */}
            {rows.map((row, ri) => (
              <React.Fragment key={ri}>
                <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--line)", borderRight: "1px solid var(--line)", background: "var(--panel)", fontSize: 12, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--muted)" }}>{row.label}</div>
                {chosen.map((p) => (
                  <div key={p.id} style={{ padding: "14px 16px", borderBottom: "1px solid var(--line)", borderRight: "1px solid var(--line)", fontSize: 13.5, color: "var(--cream)" }}>{row.get(p)}</div>
                ))}
              </React.Fragment>
            ))}
            {/* action row */}
            <div style={{ padding: "14px 16px", borderRight: "1px solid var(--line)", background: "var(--panel)" }} />
            {chosen.map((p) => (
              <div key={p.id} style={{ padding: 16, borderRight: "1px solid var(--line)", textAlign: "center" }}>
                <button className="lp-btn" onClick={() => openProduct(p.id)} style={{ fontSize: 12 }}>View</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BatchLookup({ setPage, openProduct }) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null);
  const [searched, setSearched] = useState(false);

  const lookup = () => {
    const q = query.trim().toUpperCase().replace(/\s+/g, "");
    setSearched(true);
    if (!q) { setResult(null); return; }
    // Match against each product's variant batch numbers (PREFIX-TAG) or the prefix.
    let found = null;
    for (const p of PRODUCTS) {
      const variant = p.variants.find((v) => v.batch.toUpperCase() === q);
      if (variant) { found = { product: p, variant }; break; }
      if (p.batchPrefix.toUpperCase() === q || q.startsWith(p.batchPrefix.toUpperCase())) {
        found = { product: p, variant: p.variants[0] }; break;
      }
    }
    setResult(found);
  };

  return (
    <div className="lp-fade" style={{ maxWidth: 720, margin: "0 auto", padding: "64px 28px 100px" }}>
      <button className="lp-nav-link" onClick={() => setPage("home")} style={{ marginBottom: 24, display: "inline-flex", alignItems: "center", gap: 6 }}>
        <ChevronLeft size={14} /> Home
      </button>
      <div className="lp-eyebrow" style={{ marginBottom: 10 }}>Verify</div>
      <h1 className="lp-serif" style={{ fontSize: 34, fontWeight: 400, marginBottom: 14 }}>Batch lookup</h1>
      <p style={{ color: "var(--muted)", fontSize: 14.5, lineHeight: 1.8, marginBottom: 32 }}>
        Enter the lot number printed on your vial label (e.g. <span style={{ color: "var(--cream)" }}>SMG-0741-B</span>)
        to find the product and view its certificate of analysis.
      </p>

      <div style={{ display: "flex", gap: 10, marginBottom: 28, flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Enter lot number…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") lookup(); }}
          style={{ flex: "1 1 240px" }}
        />
        <button className="lp-btn lp-btn-solid" onClick={lookup} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Search size={15} /> Look Up
        </button>
      </div>

      {searched && (
        result ? (
          <div style={{ border: "1px solid var(--gold)", padding: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18, color: "var(--gold-bright)" }}>
              <Check size={18} /> <span style={{ fontSize: 14, letterSpacing: "0.04em", textTransform: "uppercase" }}>Batch Verified</span>
            </div>
            <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ width: 90, flexShrink: 0 }}>
                <ProductImg id={result.product.id} alt={result.product.name} style={{ width: "100%", height: "auto" }} fallback={<LabeledVial name={result.product.name} purity={result.product.purity} width={90} />} />
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div className="lp-serif" style={{ fontSize: 22, marginBottom: 6 }}>{result.product.name}</div>
                <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Lot: <span style={{ color: "var(--cream)" }}>{result.variant.batch}</span></div>
                <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Size: <span style={{ color: "var(--cream)" }}>{result.variant.size}</span></div>
                <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>Purity: <span style={{ color: "var(--cream)" }}>{result.product.purity} HPLC</span></div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button className="lp-btn" onClick={() => openProduct(result.product.id)}>View Product</button>
                  <button className="lp-btn lp-btn-solid" onClick={() => { openProduct(result.product.id); setPage("coa"); }}>View COA</button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ border: "1px solid var(--line)", padding: 28, textAlign: "center" }}>
            <AlertCircle size={22} color="var(--muted)" style={{ marginBottom: 10 }} />
            <div className="lp-serif" style={{ fontSize: 18, marginBottom: 8 }}>No matching batch found</div>
            <p style={{ color: "var(--muted)", fontSize: 13.5, lineHeight: 1.7 }}>
              Double-check the lot number on your label. If it still doesn't match, contact us and we'll verify it for you.
            </p>
            <button className="lp-btn" onClick={() => setPage("contact")} style={{ marginTop: 16 }}>Contact Support</button>
          </div>
        )
      )}
    </div>
  );
}


function CertificateOfAnalysis({ productId, setPage }) {
  const p = PRODUCTS.find((x) => x.id === productId) || PRODUCTS[0];
  const coa = COA_DATA[p.id] || {
    testDate: "2026-05-01",
    certNo: `COA-${p.batchPrefix}`,
    analyst: "J. Renner",
    tests: [
      { name: "Identity (Mass Spec)", result: "Confirmed" },
      { name: "Purity (HPLC)", result: p.purity },
      { name: "Endotoxin (LAL)", result: "< 0.10 EU/mg" },
      { name: "Moisture Content", result: "2.8%" },
    ],
  };

  return (
    <div className="lp-fade" style={{ maxWidth: 760, margin: "0 auto", padding: "60px 28px 100px" }}>
      <button className="lp-nav-link" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 36 }} onClick={() => setPage("product")}>
        <ChevronLeft size={14} /> Back to {p.name}
      </button>

      <div style={{ border: "1px solid var(--line)", padding: "40px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
          <div>
            <div className="lp-eyebrow" style={{ marginBottom: 8 }}>Certificate of Analysis</div>
            <h2 className="lp-serif" style={{ fontSize: 30 }}>{p.name}</h2>
          </div>
          <FileText size={26} color="var(--gold)" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 30 }}>
          <Row label="Certificate No." value={coa.certNo} />
          <Row label="Lot No." value={p.batchPrefix} />
          <Row label="Test Date" value={coa.testDate} />
          <Row label="Analyst" value={coa.analyst} />
          <Row label="Available Sizes" value={p.variants.map((v) => v.size.replace(" / vial", "")).join(" · ")} />
          <Row label="Form" value={p.form} />
        </div>

        <hr className="lp-hairline" style={{ marginBottom: 26 }} />

        <div className="lp-eyebrow" style={{ marginBottom: 16 }}>Test Results</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 30 }}>
          {coa.tests.map((t, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, paddingBottom: 10, borderBottom: i < coa.tests.length - 1 ? "1px solid var(--line)" : "none" }}>
              <span style={{ color: "var(--muted)" }}>{t.name}</span>
              <span style={{ color: "var(--gold-bright)" }}>{t.result}</span>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.7 }}>
          This certificate confirms in-house and third-party analytical testing for the source lot listed above.
          All vial sizes for this compound are aliquoted from this lot. For laboratory research use only —
          not for human or animal use.
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
      <span style={{ color: "var(--muted)" }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function CrossSellStrip({ cart, addToCart, heading, subheading }) {
  const cartProductIds = useMemo(() => [...new Set(cart.map((c) => c.id))], [cart]);
  const recs = useMemo(() => getRecommendations(cartProductIds, 4), [cartProductIds]);
  const [addedId, setAddedId] = useState(null);

  if (recs.length === 0) return null;

  const quickAdd = (product) => {
    // Add the middle (standard) vial size by default.
    const variant = product.variants[0];
    addToCart(product.id, variant.id, 1);
    setAddedId(product.id);
    setTimeout(() => setAddedId((cur) => (cur === product.id ? null : cur)), 1600);
  };

  return (
    <div style={{ marginTop: 56 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 }}>
        <h3 className="lp-serif" style={{ fontSize: 24 }}>{heading}</h3>
      </div>
      <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 24 }}>{subheading}</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 18 }}>
        {recs.map((p) => {
          const price = p.variants[0].price;
          const isBestseller = BESTSELLERS.includes(p.id);
          const added = addedId === p.id;
          return (
            <div key={p.id} className="lp-card" style={{ display: "flex", flexDirection: "column" }}>
              <div className="lp-vial" style={{ position: "relative" }}>
                {isBestseller && (
                  <span style={{ position: "absolute", top: 12, left: 12, zIndex: 2, fontSize: 9.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--bg)", background: "var(--gold)", padding: "3px 8px", fontWeight: 600 }}>
                    Best Seller
                  </span>
                )}
                <ProductImg id={p.id} alt={`${p.name} vial`} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} fallback={<LabeledVial name={p.name} purity={p.purity} width={120} />} />
              </div>
              <div style={{ padding: 16, display: "flex", flexDirection: "column", flex: 1 }}>
                <div className="lp-serif" style={{ fontSize: 16, marginBottom: 3 }}>{p.name}</div>
                <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 14 }}>{p.variants[0].size.replace(" / vial", "")} · {p.purity}</div>
                <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ color: "var(--gold-bright)", fontSize: 14 }}>${price}</span>
                  <button
                    onClick={() => quickAdd(p)}
                    disabled={isSoldOut(p)}
                    className="lp-btn"
                    style={{ padding: "8px 12px", fontSize: 11, display: "flex", alignItems: "center", gap: 5, ...(isSoldOut(p) ? { opacity: 0.5, cursor: "not-allowed" } : {}) }}
                  >
                    {isSoldOut(p) ? "Sold Out" : (added ? <><Check size={12} /> Added</> : <><Plus size={12} /> Add</>)}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Cart({ cart, setPage, updateQty, removeItem, addToCart }) {
  const items = useMemo(
    () => cart
      .map((c) => {
        const product = findItem(c.id);
        const variant = product && product.variants.find((v) => v.id === c.variantId);
        return { ...c, product, variant };
      })
      .filter((c) => c.product && c.variant),
    [cart]
  );
  const lineOf = (i) => {
    const pct = qtyDiscountPct(i.qty);
    const full = i.variant.price * i.qty;
    return { pct, full, total: Math.round(full * (1 - pct)) };
  };
  const subtotal = items.reduce((sum, i) => sum + lineOf(i).total, 0);
  const fullSubtotal = items.reduce((sum, i) => sum + i.variant.price * i.qty, 0);
  const volumeSaved = fullSubtotal - subtotal;
  const remaining = Math.max(0, FREE_SHIP_THRESHOLD - subtotal);
  const shipProgress = Math.min(100, (subtotal / FREE_SHIP_THRESHOLD) * 100);

  if (items.length === 0) {
    return (
      <div className="lp-fade" style={{ maxWidth: 700, margin: "0 auto", padding: "100px 28px", textAlign: "center" }}>
        <ShoppingBag size={28} color="var(--muted)" style={{ marginBottom: 18 }} />
        <h2 className="lp-serif" style={{ fontSize: 28, marginBottom: 12 }}>Your cart is empty</h2>
        <p style={{ color: "var(--muted)", marginBottom: 28, fontSize: 14 }}>Browse the catalog to add compounds for your research order.</p>
        <button className="lp-btn lp-btn-solid" onClick={() => setPage("shop")}>Browse Catalog</button>
      </div>
    );
  }

  return (
    <div className="lp-fade" style={{ maxWidth: 900, margin: "0 auto", padding: "60px 28px 100px" }}>
      <h2 className="lp-serif" style={{ fontSize: 34, marginBottom: 36 }}>Your Cart</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {items.map((i) => (
          <div key={`${i.id}_${i.variantId}`} style={{ display: "flex", alignItems: "center", gap: 16, padding: "20px 0", borderBottom: "1px solid var(--line)" }}>
            <div style={{ width: 96, height: 120, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {i.product.kind === "apparel"
                ? (i.product.flip
                    ? <img src={i.product.flip.front} alt={i.product.name} style={{ maxWidth: 92, maxHeight: 120, objectFit: "contain" }} />
                    : <ApparelGarment garment={i.product.garment} color={i.product.color} accent={i.product.accent} width={92} />)
                : <ProductImg id={i.id} alt={i.product.name} style={{ maxWidth: 92, maxHeight: 120, height: "auto" }} fallback={<VialIcon size={64} />} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="lp-serif" style={{ fontSize: 17 }}>{i.product.name}</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>{i.variant.size}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", border: "1px solid var(--line)" }}>
              <button onClick={() => updateQty(i.id, i.variantId, Math.max(1, i.qty - 1))} style={{ background: "none", border: "none", color: "var(--cream)", padding: "8px 12px", cursor: "pointer" }}><Minus size={12} /></button>
              <span style={{ padding: "0 12px" }}>{i.qty}</span>
              <button onClick={() => updateQty(i.id, i.variantId, i.qty + 1)} style={{ background: "none", border: "none", color: "var(--cream)", padding: "8px 12px", cursor: "pointer" }}><Plus size={12} /></button>
            </div>
            <div style={{ width: 80, textAlign: "right" }}>
              <div style={{ color: "var(--gold-bright)" }}>${lineOf(i).total}</div>
              {lineOf(i).pct > 0 && (
                <div style={{ fontSize: 10, color: "var(--gold)" }}>−{Math.round(lineOf(i).pct * 100)}%</div>
              )}
            </div>
            <button onClick={() => removeItem(i.id, i.variantId)} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer" }}><X size={16} /></button>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 28, padding: "16px 18px", border: "1px solid var(--line)", background: "var(--panel)" }}>
        {remaining > 0 ? (
          <div style={{ fontSize: 13, color: "var(--cream)", marginBottom: 10 }}>
            Add <span style={{ color: "var(--gold-bright)" }}>${remaining}</span> more to unlock free shipping.
          </div>
        ) : (
          <div style={{ fontSize: 13, color: "var(--gold-bright)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
            <Check size={14} /> You've unlocked free shipping.
          </div>
        )}
        <div style={{ height: 6, background: "var(--panel-2)", border: "1px solid var(--line)" }}>
          <div style={{ height: "100%", width: `${shipProgress}%`, background: "var(--gold)", transition: "width 0.4s ease" }} />
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
        <div style={{ width: 280 }}>
          {volumeSaved > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 14 }}>
              <span style={{ color: "var(--gold)" }}>Volume savings</span><span style={{ color: "var(--gold)" }}>−${volumeSaved}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 14 }}>
            <span style={{ color: "var(--muted)" }}>Subtotal</span><span>${subtotal}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20, fontSize: 14 }}>
            <span style={{ color: "var(--muted)" }}>Shipping</span>
            <span>{remaining > 0 ? `$${FLAT_SHIP}` : "Free"}</span>
          </div>
          <button className="lp-btn lp-btn-solid" style={{ width: "100%" }} onClick={() => setPage("checkout")}>
            Proceed to Checkout
          </button>
        </div>
      </div>

      <CrossSellStrip
        cart={cart}
        addToCart={addToCart}
        heading="Pairs well with"
        subheading="Researchers who ordered these compounds often add the following to the same order."
      />
    </div>
  );
}

// Labeled input with clean inline validation state (green when valid, red when
// touched-and-invalid). Keeps error styling minimal — just a border + icon.
function Field({ label, value, onChange, onBlur, valid, touched, placeholder, type = "text", autoComplete }) {
  const showOk = touched && valid;
  const showErr = touched && !valid;
  return (
    <div>
      <label style={{ display: "block", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 6 }}>{label}</label>
      <div style={{ position: "relative" }}>
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          autoComplete={autoComplete}
          style={{ paddingRight: 36, borderColor: showErr ? "#9c5b5b" : showOk ? "rgba(176,130,67,0.55)" : undefined }}
        />
        {showOk && <Check size={14} color="var(--gold-bright)" style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />}
        {showErr && <AlertCircle size={14} color="#b87a7a" style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />}
      </div>
    </div>
  );
}

function TrustRow() {
  const items = [
    { icon: ShieldCheck, label: "Secure checkout" },
    { icon: Beaker, label: "Research use only" },
    { icon: FileText, label: "Third-party tested" },
    { icon: Truck, label: "Tracked shipping" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 16 }}>
      {items.map((it, i) => {
        const Icon = it.icon;
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, color: "var(--muted)" }}>
            <Icon size={14} color="var(--gold)" style={{ flexShrink: 0 }} />
            <span>{it.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function Checkout({ cart, setPage, addToCart }) {
  const items = useMemo(
    () => cart
      .map((c) => {
        const product = findItem(c.id);
        const variant = product && product.variants.find((v) => v.id === c.variantId);
        return { ...c, product, variant };
      })
      .filter((c) => c.product && c.variant),
    [cart]
  );
  const subtotal = items.reduce((sum, i) => sum + Math.round(i.variant.price * i.qty * (1 - qtyDiscountPct(i.qty))), 0);
  const shipping = subtotal === 0 ? 0 : (subtotal >= FREE_SHIP_THRESHOLD ? 0 : FLAT_SHIP);
  const [form, setForm] = useState({ name: "", email: "", address: "", city: "", state: "", zip: "", country: "" });
  const [certified, setCertified] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | loading | error
  const [errorMsg, setErrorMsg] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [appliedCode, setAppliedCode] = useState(null);
  const [appliedPromo, setAppliedPromo] = useState(null); // store promo, separate from ambassador code
  const [codeError, setCodeError] = useState("");
  const manualCfg = SITE_CONFIG.manualPayments || {};
  const cardOn = !!manualCfg.card && BACKEND_LIVE; // Authorize.Net card checkout needs the live backend
  const manualOn = !!manualCfg.enabled && (manualCfg.bank || manualCfg.cashapp || manualCfg.zelle || manualCfg.crypto);
  const [payMethod, setPayMethod] = useState(cardOn ? "card" : (manualCfg.bank ? "bank" : manualCfg.crypto ? "crypto" : "card"));
  const [anet, setAnet] = useState(null); // { token, reference, env } while the card modal is open
  const [step, setStep] = useState("shipping"); // shipping | payment
  const [touched, setTouched] = useState({});
  const [remember, setRemember] = useState(true);
  const touch = (k) => () => setTouched((t) => ({ ...t, [k]: true }));
  const fieldValid = {
    name: form.name.trim().length >= 2,
    email: /\S+@\S+\.\S+/.test(form.email),
    address: form.address.trim().length >= 3,
    city: form.city.trim().length >= 2,
    zip: form.zip.trim().length >= 2,
    country: form.country.trim().length >= 2,
  };
  const saveInfo = async () => {
    try { if (remember) await window.storage.set("checkoutInfo", JSON.stringify(form), false); } catch (_) { /* no-op */ }
  };
  // Prefill saved shipping info on return visits.
  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get("checkoutInfo", false);
        if (r && r.value) { const saved = JSON.parse(r.value); setForm((f) => ({ ...f, ...saved })); }
      } catch (_) { /* no-op */ }
    })();
  }, []);

  // One field, two kinds of code: ambassador codes give the creator a commission,
  // promo codes are store-run. Try ambassador first, then promo.
  const applyCode = async () => {
    const key = codeInput.trim().toUpperCase();
    if (!key) return;
    if (appliedCode && appliedCode.code === key) { setCodeError("That code is already applied."); return; }
    if (appliedPromo && appliedPromo.code === key) { setCodeError("That code is already applied."); return; }
    if (BACKEND_LIVE) {
      try {
        const res = await fetch(API_BASE + "/api/code/" + encodeURIComponent(key));
        const d = await res.json().catch(() => ({}));
        if (d && d.valid) { setAppliedCode({ code: d.code, creator: d.creator, pct: d.pct }); setCodeError(""); setCodeInput(""); return; }
      } catch (_) { setCodeError("Couldn't check that code. Try again."); return; }
      try {
        const res2 = await fetch(API_BASE + "/api/promo/" + encodeURIComponent(key));
        const d2 = await res2.json().catch(() => ({}));
        if (d2 && d2.valid) { setAppliedPromo({ code: d2.code, kind: d2.kind, value: d2.value, label: d2.label }); setCodeError(""); setCodeInput(""); return; }
      } catch (_) { setCodeError("Couldn't check that code. Try again."); return; }
      setCodeError("That code isn't valid.");
      return;
    }
    const found = allCreatorCodes()[key];
    if (found) { setAppliedCode({ code: key, ...found }); setCodeError(""); setCodeInput(""); }
    else { setAppliedCode(null); setCodeError("That code isn't valid."); }
  };
  const removeCode = () => { setAppliedCode(null); setCodeInput(""); setCodeError(""); };
  const removePromo = () => { setAppliedPromo(null); setCodeError(""); };
  // Auto-apply an ambassador code shared via ?ref=CODE link.
  useEffect(() => {
    (async () => {
      try {
        const ref = new URLSearchParams(window.location.search).get("ref");
        if (!ref) return;
        const key = ref.trim().toUpperCase();
        if (BACKEND_LIVE) {
          const res = await fetch(API_BASE + "/api/code/" + encodeURIComponent(key));
          const d = await res.json().catch(() => ({}));
          if (d && d.valid) { setCodeInput(key); setAppliedCode({ code: d.code, creator: d.creator, pct: d.pct }); }
        } else {
          const codes = allCreatorCodes();
          if (codes[key]) { setCodeInput(key); setAppliedCode({ code: key, ...codes[key] }); }
        }
      } catch (_) { /* no-op */ }
    })();
  }, []);
  // Money is computed in CENTS here, exactly as priceOrder() does on the server.
  // Rounding in whole dollars diverged from the server and could show the
  // customer a total different from the one actually charged.
  const subtotalCents = Math.round(subtotal * 100);
  const creatorDiscountCents = appliedCode ? Math.round(subtotalCents * appliedCode.pct) : 0;
  const afterAmbCents = Math.max(0, subtotalCents - creatorDiscountCents);
  const promoDiscountCents = !appliedPromo ? 0
    : appliedPromo.kind === "amount" ? Math.min(Math.max(0, appliedPromo.value), afterAmbCents)
    : appliedPromo.kind === "pct" ? Math.round(afterAmbCents * (Math.min(100, Math.max(0, appliedPromo.value)) / 100))
    : 0;
  const freeShipPromo = !!appliedPromo && appliedPromo.kind === "freeship";
  const shippingDue = freeShipPromo ? 0 : shipping;
  const totalCents = Math.max(0, afterAmbCents - promoDiscountCents) + Math.round(shippingDue * 100);
  const usd = (cents) => (cents / 100).toFixed(2);
  const creatorDiscount = creatorDiscountCents / 100;
  const promoDiscount = promoDiscountCents / 100;
  const total = Number((totalCents / 100).toFixed(2));

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const shippingValid = fieldValid.name && fieldValid.email && fieldValid.address && fieldValid.city && fieldValid.zip && fieldValid.country;
  const canSubmit = items.length > 0 && certified && form.name && form.email && form.address;

  const payWithCard = async () => {
    if (!canSubmit) return;
    setStatus("loading"); setErrorMsg(""); saveInfo();
    try {
      const res = await fetch(API_BASE + "/api/anet/hosted-token", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promo: appliedPromo ? appliedPromo.code : null, items: items.map((i) => ({ variantId: i.variantId, qty: i.qty })), email: form.email, code: appliedCode ? appliedCode.code : null, customer: form, certifiedResearchUse: certified }),
      });
      const d = await res.json();
      if (!res.ok || !d.token) throw new Error(d.error || "Couldn't start card payment. Please try again.");
      setStatus("idle");
      setAnet({ token: d.token, reference: d.reference, env: d.env });
    } catch (err) {
      setStatus("error"); setErrorMsg(err.message || "Couldn't start card payment.");
    }
  };

  const handleCardApproved = async (resp) => {
    const ref = anet ? anet.reference : null;
    setAnet(null);
    if (!resp || String(resp.responseCode) !== "1") {
      setStatus("error");
      setErrorMsg((resp && (resp.errorMessage || (resp.messages && resp.messages.message && resp.messages.message[0] && resp.messages.message[0].description))) || "Your card was not approved. Please try another card.");
      return;
    }
    const summary = {
      items: items.map((i) => ({ name: i.product.name, size: i.variant.size, qty: i.qty, line: Math.round(i.variant.price * i.qty * (1 - qtyDiscountPct(i.qty))) })),
      subtotal, creatorDiscount, promoDiscount, shipping: shippingDue, total: usd(totalCents),
      code: appliedCode ? appliedCode.code : null,
      promo: appliedPromo ? appliedPromo.code : null,
      method: "card", customer: form,
      preorder: items.some((i) => isPreorder(i.product)),
      placedAt: new Date().toISOString(),
    };
    const placedOrder = { reference: ref || ("LP-" + Date.now().toString(36).toUpperCase()), status: "Paid", ...summary };

    // Backup confirmation. Authorize.Net's webhook normally marks the order paid,
    // but if it's slow, retrying, or disabled, this tells our server to verify the
    // transaction directly with Authorize.Net. The server re-checks the amount and
    // invoice against Authorize.Net itself — nothing here is taken on trust. If it
    // fails, the customer has still paid, so never block the success screen.
    if (BACKEND_LIVE && ref && resp.transId) {
      try {
        await fetch(API_BASE + "/api/anet/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reference: ref, transId: String(resp.transId) }),
        });
      } catch (_) { /* webhook remains the backstop */ }
    }

    try { await window.storage.set("lastOrder", JSON.stringify(placedOrder), false); } catch (_) {}
    await saveOrderToHistory(placedOrder);
    setPage("success");
  };

  const placeManualOrder = async () => {
    setStatus("loading");
    setErrorMsg("");
    saveInfo();
    const summary = {
      items: items.map((i) => ({ name: i.product.name, size: i.variant.size, qty: i.qty, line: Math.round(i.variant.price * i.qty * (1 - qtyDiscountPct(i.qty))) })),
      subtotal, creatorDiscount, promoDiscount, shipping: shippingDue, total: usd(totalCents),
      code: appliedCode ? appliedCode.code : null,
      promo: appliedPromo ? appliedPromo.code : null,
      method: payMethod,
      customer: form,
      preorder: items.some((i) => isPreorder(i.product)),
      placedAt: new Date().toISOString(),
    };
    let reference = null;
    if (BACKEND_LIVE) {
      try {
        const res = await fetch(API_BASE + "/api/manual-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: items.map((i) => ({ variantId: i.variantId, qty: i.qty })),
            email: form.email,
            code: appliedCode ? appliedCode.code : null,
            promo: appliedPromo ? appliedPromo.code : null,
            method: payMethod,
            customer: form,
            certifiedResearchUse: certified,
          }),
        });
        if (res.ok) { const d = await res.json(); reference = d.reference || null; }
      } catch { /* fall through to local reference */ }
    }
    if (!reference) reference = "LP-" + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 1296).toString(36).toUpperCase().padStart(2, "0");
    const placedOrder = { reference, status: "Awaiting payment", ...summary };
    try { await window.storage.set("lastOrder", JSON.stringify(placedOrder), false); } catch {}
    await saveOrderToHistory(placedOrder);
    setStatus("idle");
    setPage("success");
  };

  const handlePlaceOrder = async () => {
    // Safety net: while the manual-payment bridge is active, every order goes
    // through it (real order number + payment instructions) — we never dead-end
    // on the card/backend path that isn't connected yet.
    if (manualOn) { return placeManualOrder(); }
    setStatus("loading");
    setErrorMsg("");
    saveInfo();
    try {
      // Send only variantId + qty; the backend recomputes every price server-side.
      const session = await window.storage.get("session", false).catch(() => null);
      const token = session ? (JSON.parse(session.value).token || null) : null;
      const res = await fetch(CHECKOUT_SESSION_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          items: items.map((i) => ({ variantId: i.variantId, qty: i.qty })),
          email: form.email,
          customer: form,
          code: appliedCode ? appliedCode.code : null,
          certifiedResearchUse: certified,
        }),
      });
      if (!res.ok) throw new Error("Backend did not return a valid session.");
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url; // redirect to the payment-hosted checkout
      } else {
        throw new Error("No checkout URL returned.");
      }
    } catch (err) {
      setStatus("error");
      setErrorMsg(
        BACKEND_LIVE
          ? "We couldn't start checkout right now. Please try again, or contact " + SITE_CONFIG.supportEmail + "."
          : "Live payment isn't connected in this preview. Deploy the backend and set SITE_CONFIG.apiBaseUrl to enable real checkout."
      );
    }
  };

  return (
    <div className="lp-fade" style={{ maxWidth: 1300, margin: "0 auto", padding: "60px 28px 100px" }}>
      {anet && <AnetHostedModal token={anet.token} env={anet.env} onApproved={handleCardApproved} onCancel={() => setAnet(null)} />}
      <h2 className="lp-serif" style={{ fontSize: 34, marginBottom: 8 }}>Checkout</h2>
      <p style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 36 }}>
        {cardOn
          ? "Pay securely by credit or debit card. Your payment is processed by Authorize.Net — card details never touch our site."
          : "Card checkout runs on the live site. This preview can't process real payments."}
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 30, fontSize: 12.5 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8, color: step === "shipping" ? "var(--gold-bright)" : "var(--muted)" }}>
          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: "50%", border: "1px solid " + (step === "shipping" ? "var(--gold)" : "var(--line)"), fontSize: 11 }}>{step === "payment" ? <Check size={12} /> : "1"}</span>
          <span className="lp-eyebrow">Shipping</span>
        </span>
        <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
        <span style={{ display: "flex", alignItems: "center", gap: 8, color: step === "payment" ? "var(--gold-bright)" : "var(--muted)" }}>
          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: "50%", border: "1px solid " + (step === "payment" ? "var(--gold)" : "var(--line)"), fontSize: 11 }}>2</span>
          <span className="lp-eyebrow">Payment</span>
        </span>
      </div>
      <div className="lp-checkout-grid">
        <div>
          {step === "shipping" && (
          <>
          <div style={{ border: "1px solid var(--line)", padding: "22px 24px", marginBottom: 18 }}>
          <div className="lp-eyebrow" style={{ marginBottom: 16 }}>Shipping &amp; Billing</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Field label="Full name" placeholder="Jane Doe" autoComplete="name" value={form.name} onChange={update("name")} onBlur={touch("name")} valid={fieldValid.name} touched={touched.name} />
            <Field label="Email" type="email" placeholder="you@email.com" autoComplete="email" value={form.email} onChange={update("email")} onBlur={touch("email")} valid={fieldValid.email} touched={touched.email} />
            <Field label="Street address" placeholder="123 Main St" autoComplete="street-address" value={form.address} onChange={update("address")} onBlur={touch("address")} valid={fieldValid.address} touched={touched.address} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Field label="City" placeholder="City" autoComplete="address-level2" value={form.city} onChange={update("city")} onBlur={touch("city")} valid={fieldValid.city} touched={touched.city} />
              <Field label="ZIP / Postal" placeholder="ZIP" autoComplete="postal-code" value={form.zip} onChange={update("zip")} onBlur={touch("zip")} valid={fieldValid.zip} touched={touched.zip} />
            </div>
            <Field label="State / Province (optional)" placeholder="State / Province" autoComplete="address-level1" value={form.state} onChange={update("state")} valid={true} touched={false} />
            <Field label="Country" placeholder="Country" autoComplete="country-name" value={form.country} onChange={update("country")} onBlur={touch("country")} valid={fieldValid.country} touched={touched.country} />
            <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.5, color: "var(--muted)", cursor: "pointer", marginTop: 2 }}>
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} style={{ width: "auto", accentColor: "#C9A05C" }} />
              Save my info for next time
            </label>
          </div>
          </div>
          </>
          )}

          {step === "payment" && (
          <>
          <button onClick={() => setStep("shipping")} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 12.5, cursor: "pointer", padding: 0, marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}><ChevronLeft size={14} /> Back to shipping</button>
          <div style={{ border: "1px solid var(--line)", padding: "16px 20px", marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span className="lp-eyebrow">Shipping To</span>
              <button onClick={() => setStep("shipping")} style={{ background: "none", border: "none", color: "var(--gold-bright)", fontSize: 11.5, cursor: "pointer", padding: 0, textDecoration: "underline" }}>Edit</button>
            </div>
            <div style={{ fontSize: 13.5, color: "var(--cream)", lineHeight: 1.55 }}>{form.name}</div>
            <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.55 }}>{form.address}, {form.city}{form.state ? ", " + form.state : ""} {form.zip}</div>
            <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.55 }}>{form.country}</div>
            <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.55 }}>{form.email}</div>
          </div>
          <div style={{ border: "1px solid var(--line)", padding: "22px 24px", marginBottom: 18 }}>
          <div className="lp-eyebrow" style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}><Lock size={13} color="var(--gold)" /> Payment</div>
          {(manualOn || cardOn) ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {cardOn && (
                <label style={{ display: "flex", gap: 12, alignItems: "flex-start", border: payMethod === "card" ? "1px solid var(--gold)" : "1px solid var(--line)", padding: "14px 16px", cursor: "pointer" }}>
                  <input type="radio" name="paymethod" checked={payMethod === "card"} onChange={() => setPayMethod("card")} style={{ width: "auto", marginTop: 3, accentColor: "#C9A05C" }} />
                  <span style={{ fontSize: 13, lineHeight: 1.6 }}>
                    <strong style={{ color: "var(--cream)" }}>Credit / Debit Card</strong>
                    <br />
                    <span style={{ color: "var(--muted)" }}>Pay securely by card. Processed by Authorize.Net — your card details never touch our site.</span>
                  </span>
                </label>
              )}
              {manualCfg.bank && (
                <label style={{ display: "flex", gap: 12, alignItems: "flex-start", border: payMethod === "bank" ? "1px solid var(--gold)" : "1px solid var(--line)", padding: "14px 16px", cursor: "pointer" }}>
                  <input type="radio" name="paymethod" checked={payMethod === "bank"} onChange={() => setPayMethod("bank")} style={{ width: "auto", marginTop: 3, accentColor: "#C9A05C" }} />
                  <span style={{ fontSize: 13, lineHeight: 1.6 }}>
                    <strong style={{ color: "var(--cream)" }}>Bank transfer</strong>
                    <br />
                    <span style={{ color: "var(--muted)" }}>Place your order, then we email you secure transfer details. Ships once payment clears.</span>
                  </span>
                </label>
              )}
              {manualCfg.cashapp && (
                <label style={{ display: "flex", gap: 12, alignItems: "flex-start", border: payMethod === "cashapp" ? "1px solid var(--gold)" : "1px solid var(--line)", padding: "14px 16px", cursor: "pointer" }}>
                  <input type="radio" name="paymethod" checked={payMethod === "cashapp"} onChange={() => setPayMethod("cashapp")} style={{ width: "auto", marginTop: 3, accentColor: "#C9A05C" }} />
                  <span style={{ fontSize: 13, lineHeight: 1.6 }}>
                    <strong style={{ color: "var(--cream)" }}>Cash App</strong>
                    <br />
                    <span style={{ color: "var(--muted)" }}>Send to {manualCfg.cashtag} after checkout — your order reference goes in the payment note.</span>
                  </span>
                </label>
              )}
              {manualCfg.zelle && (
                <label style={{ display: "flex", gap: 12, alignItems: "flex-start", border: payMethod === "zelle" ? "1px solid var(--gold)" : "1px solid var(--line)", padding: "14px 16px", cursor: "pointer" }}>
                  <input type="radio" name="paymethod" checked={payMethod === "zelle"} onChange={() => setPayMethod("zelle")} style={{ width: "auto", marginTop: 3, accentColor: "#C9A05C" }} />
                  <span style={{ fontSize: 13, lineHeight: 1.6 }}>
                    <strong style={{ color: "var(--cream)" }}>Zelle</strong>
                    <br />
                    <span style={{ color: "var(--muted)" }}>Send to {manualCfg.zelleId} after checkout — your order reference goes in the payment memo.</span>
                  </span>
                </label>
              )}
              {manualCfg.crypto && (
                <label style={{ display: "flex", gap: 12, alignItems: "flex-start", border: payMethod === "crypto" ? "1px solid var(--gold)" : "1px solid var(--line)", padding: "14px 16px", cursor: "pointer" }}>
                  <input type="radio" name="paymethod" checked={payMethod === "crypto"} onChange={() => setPayMethod("crypto")} style={{ width: "auto", marginTop: 3, accentColor: "#C9A05C" }} />
                  <span style={{ fontSize: 13, lineHeight: 1.6 }}>
                    <strong style={{ color: "var(--cream)" }}>Crypto</strong>
                    <br />
                    <span style={{ color: "var(--muted)" }}>USDC on Ethereum (ERC-20) — the payment address is shown after you place the order.</span>
                  </span>
                </label>
              )}
            </div>
          ) : (
            <div style={{ border: "1px dashed var(--line)", padding: 20, fontSize: 13, color: "var(--muted)" }}>
              Card checkout (Authorize.Net) is active on the live site. It can't run in this local preview,
              since it needs the backend to create a secure payment session.
            </div>
          )}
          </div>

          <div style={{ border: "1px solid var(--line)", padding: "22px 24px", marginBottom: 18 }}>
          <div className="lp-eyebrow" style={{ marginBottom: 16 }}>Buyer Certification</div>
          <label style={{ display: "flex", gap: 12, alignItems: "flex-start", fontSize: 13, color: "var(--muted)", lineHeight: 1.6, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={certified}
              onChange={(e) => setCertified(e.target.checked)}
              style={{ width: "auto", marginTop: 2, accentColor: "#C9A05C" }}
            />
            <span>
              I certify that I am at least 18 years old, am purchasing these compounds solely for laboratory
              research purposes, and will not use, sell, or represent them for human or animal consumption,
              diagnostic use, or therapeutic use of any kind.
            </span>
          </label>
          </div>
          </>
          )}
        </div>

        <div style={{ position: "sticky", top: 24, alignSelf: "start" }}>
          <div className="lp-eyebrow" style={{ marginBottom: 16 }}>Order Summary</div>
          <div style={{ border: "1px solid var(--line)", padding: 20 }}>
            {items.map((i) => {
              const pct = qtyDiscountPct(i.qty);
              const lineTotal = Math.round(i.variant.price * i.qty * (1 - pct));
              return (
                <div key={`${i.id}_${i.variantId}`} style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, marginBottom: 10 }}>
                  <span>{i.product.name} ({i.variant.size.replace(" / vial", "")}) × {i.qty}{pct > 0 ? ` · −${Math.round(pct * 100)}%` : ""}</span>
                  <span>${lineTotal}</span>
                </div>
              );
            })}
            <hr className="lp-hairline" style={{ margin: "14px 0" }} />

            {/* Creator code and/or store promo code — one field, both kinds */}
            {appliedCode && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 12.5, color: "var(--gold-bright)" }}>Code {appliedCode.code} applied (−{Math.round(appliedCode.pct * 100)}%)</span>
                <button onClick={removeCode} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 12, cursor: "pointer", textDecoration: "underline" }}>Remove</button>
              </div>
            )}
            {appliedPromo && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 12.5, color: "var(--gold-bright)" }}>Promo {appliedPromo.code} applied ({appliedPromo.label})</span>
                <button onClick={removePromo} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 12, cursor: "pointer", textDecoration: "underline" }}>Remove</button>
              </div>
            )}
            {(!appliedCode || !appliedPromo) && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="text"
                    placeholder={appliedCode ? "Promo code" : "Creator or promo code"}
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") applyCode(); }}
                    style={{ flex: 1, fontSize: 13 }}
                  />
                  <button className="lp-btn" onClick={applyCode} style={{ fontSize: 12, whiteSpace: "nowrap" }}>Apply</button>
                </div>
                {codeError && <p style={{ fontSize: 11.5, color: "#c98a6c", marginTop: 6 }}>{codeError}</p>}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, marginBottom: 8 }}>
              <span style={{ color: "var(--muted)" }}>Subtotal</span><span>${subtotal}</span>
            </div>
            {promoDiscount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, color: "var(--gold-bright)" }}>
                <span>Promo {appliedPromo ? appliedPromo.code : ""}</span><span>−${usd(promoDiscountCents)}</span>
              </div>
            )}
            {creatorDiscount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, marginBottom: 8, color: "var(--gold-bright)" }}>
                <span>Creator discount</span><span>−${usd(creatorDiscountCents)}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, marginBottom: 14 }}>
              <span style={{ color: "var(--muted)" }}>Shipping</span><span>{shippingDue === 0 ? "Free" : `$${shippingDue}`}</span>
            </div>
            <hr className="lp-hairline" style={{ margin: "14px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, color: "var(--gold-bright)" }}>
              <span>Total</span><span>${usd(totalCents)}</span>
            </div>
          </div>
          {items.some((i) => isPreorder(i.product)) && (
            <div style={{ border: "1px solid var(--gold)", background: "var(--brown-deep)", padding: "12px 14px", marginTop: 16, fontSize: 12.5, color: "var(--cream)", lineHeight: 1.6 }}>
              <strong style={{ color: "var(--gold-bright)" }}>This is a pre-order.</strong> Peptide items ship in {SITE_CONFIG.preorderShipEstimate} once new stock arrives. By placing this pre-order you acknowledge the estimated ship window.
            </div>
          )}
          <button
            className="lp-btn lp-btn-solid"
            style={{ width: "100%", marginTop: 18, opacity: (step === "shipping" ? shippingValid : canSubmit) ? 1 : 0.5, cursor: (step === "shipping" ? shippingValid : canSubmit) ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            disabled={step === "shipping" ? !shippingValid : (!canSubmit || status === "loading")}
            onClick={step === "shipping"
              ? () => { if (shippingValid) { saveInfo(); setStep("payment"); try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch (_) {} } else { setTouched({ name: true, email: true, address: true, city: true, zip: true, country: true }); } }
              : (payMethod === "card" ? payWithCard : placeManualOrder)}
          >
            {step === "shipping"
              ? <>Continue to Payment <ChevronRight size={15} /></>
              : (status === "loading" ? <><Loader2 size={14} className="lp-spin" /> Processing…</> : (items.some((i) => isPreorder(i.product)) ? "Place Pre-order" : "Place Order"))}
          </button>
          {step === "shipping" && !shippingValid && items.length > 0 && (
            <p style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 10 }}>Fill in your shipping address to continue.</p>
          )}
          {step === "payment" && !certified && items.length > 0 && (
            <p style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 10 }}>Check the certification box to enable checkout.</p>
          )}
          <TrustRow />
          {status === "error" && (
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginTop: 14, fontSize: 12, color: "#D9A06B" }}>
              <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>
      </div>

      <CrossSellStrip
        cart={cart}
        addToCart={addToCart}
        heading="Add before you check out"
        subheading="Top-selling and complementary compounds — add one with a single tap and it joins this order."
      />
    </div>
  );
}

// A labeled value with a one-tap Copy button — used on the payment screen so
// customers never have to hand-type a cashtag, Zelle ID, or wallet address.
function CopyField({ label, value, mono = false }) {
  const [done, setDone] = useState(false);
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, border: "1px solid var(--line)", background: "var(--panel)", padding: "10px 12px", marginTop: 8 }}>
      <div style={{ minWidth: 0 }}>
        {label && <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 3 }}>{label}</div>}
        <div style={{ color: "var(--gold-bright)", fontSize: mono ? 12.5 : 15, fontFamily: mono ? "monospace" : "inherit", wordBreak: "break-all", lineHeight: 1.4 }}>{value}</div>
      </div>
      <button onClick={() => { if (copyText(value)) { setDone(true); setTimeout(() => setDone(false), 1500); } }} className="lp-btn" style={{ fontSize: 11, padding: "6px 11px", flexShrink: 0, display: "flex", alignItems: "center", gap: 5 }}>
        {done ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
      </button>
    </div>
  );
}

// Persist each placed order to this device so customers can look them up later.
async function saveOrderToHistory(order) {
  try {
    const r = await window.storage.get("orderHistory", false);
    let list = [];
    if (r && r.value) { try { list = JSON.parse(r.value) || []; } catch { list = []; } }
    list = [order, ...list.filter((o) => o && o.reference !== order.reference)].slice(0, 50);
    await window.storage.set("orderHistory", JSON.stringify(list), false);
  } catch { /* ignore — history is best-effort */ }
}

// Customer-facing order history (saved on this device). Lets a customer see
// their order numbers and re-open any order for its payment instructions.
function Orders({ setPage }) {
  const [orders, setOrders] = useState(null);
  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get("orderHistory", false);
        setOrders(r && r.value ? (JSON.parse(r.value) || []) : []);
      } catch { setOrders([]); }
    })();
  }, []);

  const methodLabel = (m) => m === "crypto" ? "USDC (crypto)" : m === "cashapp" ? "Cash App" : m === "zelle" ? "Zelle" : m === "card" ? "Card" : "Bank transfer";
  const openOrder = async (o) => {
    try { await window.storage.set("lastOrder", JSON.stringify(o), false); } catch { /* ignore */ }
    setPage("success");
  };

  return (
    <div className="lp-fade" style={{ maxWidth: 760, margin: "0 auto", padding: "70px 28px 110px" }}>
      <div className="lp-eyebrow" style={{ marginBottom: 10 }}>Your Account</div>
      <h2 className="lp-serif" style={{ fontSize: 34, marginBottom: 10 }}>My Orders</h2>
      <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.7, marginBottom: 30 }}>
        Your orders are saved to this device so you can look up your order number and payment instructions anytime. Hold on to your order number for any questions about an order.
      </p>

      {orders === null ? (
        <p style={{ color: "var(--muted)", fontSize: 13.5 }}>Loading…</p>
      ) : orders.length === 0 ? (
        <div style={{ border: "1px solid var(--line)", padding: "50px 24px", textAlign: "center" }}>
          <div className="lp-serif" style={{ fontSize: 20, marginBottom: 10 }}>No orders yet</div>
          <p style={{ color: "var(--muted)", fontSize: 13.5, marginBottom: 22, lineHeight: 1.7 }}>Orders you place will show up here on this device.</p>
          <button className="lp-btn lp-btn-solid" onClick={() => setPage("shop")}>Browse the Catalog</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {orders.map((o) => (
            <div key={o.reference} style={{ border: "1px solid var(--line)", padding: "18px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div className="lp-eyebrow" style={{ marginBottom: 4 }}>Order Number</div>
                  <div className="lp-serif" style={{ fontSize: 20, color: "var(--gold-bright)", letterSpacing: "0.04em" }}>{o.reference}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                    {o.placedAt ? new Date(o.placedAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : ""}
                    {o.method ? " · " + methodLabel(o.method) : ""}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: "var(--gold-bright)", fontSize: 17 }}>${o.total}</div>
                  <div style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--gold)", marginTop: 5, border: "1px solid var(--line)", padding: "2px 7px", display: "inline-block" }}>
                    {o.status || "Awaiting payment"}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 12, lineHeight: 1.6 }}>
                {o.items.map((i) => i.name + " (" + String(i.size).replace(" / vial", "") + ") ×" + i.qty).join(", ")}
              </div>
              <button className="lp-btn" onClick={() => openOrder(o)} style={{ marginTop: 14, fontSize: 12 }}>View details &amp; how to pay</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Authorize.Net Accept Hosted — loads the hosted card form inside an iframe.
// The token form is POSTed to Authorize.Net; the same-origin communicator page
// relays resize/cancel/transactResponse messages back here.
function AnetHostedModal({ token, env, onApproved, onCancel }) {
  const formRef = useRef(null);
  const [size, setSize] = useState({ w: 480, h: 640 });
  const payUrl = env === "production" ? "https://accept.authorize.net/payment/payment" : "https://test.authorize.net/payment/payment";
  useEffect(() => {
    window.AuthorizeNetIFrame = window.AuthorizeNetIFrame || {};
    window.AuthorizeNetIFrame.onReceiveCommunication = (qstr) => {
      const params = {};
      String(qstr || "").split("&").forEach((kv) => { const idx = kv.indexOf("="); if (idx > 0) params[kv.slice(0, idx)] = decodeURIComponent(kv.slice(idx + 1) || ""); });
      if (params.action === "resizeWindow") { const w = parseInt(params.width, 10), h = parseInt(params.height, 10); if (w && h) setSize({ w: Math.min(w, 700), h: h + 20 }); }
      else if (params.action === "cancel") { onCancel(); }
      else if (params.action === "transactResponse") { let resp = {}; try { resp = JSON.parse(params.response || "{}"); } catch (_) { resp = {}; } onApproved(resp); }
    };
    const t = setTimeout(() => { try { if (formRef.current) formRef.current.submit(); } catch (_) {} }, 60);
    return () => { clearTimeout(t); };
  }, []);
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
  const vw = typeof window !== "undefined" ? window.innerWidth : 900;
  const dispW = isMobile ? Math.min(size.w, vw - 20) : Math.max(size.w, 640);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 2000, display: "flex", alignItems: isMobile ? "flex-start" : "center", justifyContent: "center", padding: isMobile ? "80px 12px 24px" : 16, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
      <div style={{ background: "#0b0b0d", border: "1px solid var(--gold)", borderRadius: 4, padding: 12, maxWidth: "100%", maxHeight: "100%", overflow: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 12 }}>
          <span style={{ fontSize: 12, color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: 6 }}><Lock size={12} color="var(--gold)" /> Secure card payment</span>
          <button onClick={onCancel} aria-label="Close" style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 20, lineHeight: 1 }}>×</button>
        </div>
        <form ref={formRef} action={payUrl} method="post" target="anetIframe">
          <input type="hidden" name="token" value={token} />
        </form>
        <iframe name="anetIframe" title="Card payment" width={dispW} height={size.h} frameBorder="0" scrolling="no" style={{ border: "none", width: dispW, height: size.h, background: "#fff", borderRadius: 2 }} />
      </div>
    </div>
  );
}

function Success({ setPage, clearCart }) {
  const [order, setOrder] = useState(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get("lastOrder", false);
        if (r && r.value) setOrder(JSON.parse(r.value));
      } catch { /* no stored order — show the generic confirmation */ }
    })();
  }, []);
  useEffect(() => { if (order) clearCart(); }, [order]);

  const cfg = SITE_CONFIG.manualPayments || {};
  const addrs = order && order.method === "crypto" ? Object.entries(cfg.cryptoAddresses || {}).filter(([, v]) => v) : [];
  const methodName = order ? (order.method === "crypto" ? "Crypto" : order.method === "cashapp" ? "Cash App" : order.method === "zelle" ? "Zelle" : "Bank transfer") : "";
  const orderText = order
    ? ("Order number: " + order.reference + "\n" +
       "Total: $" + order.total + "\n" +
       "Payment method: " + methodName + "\n\n" +
       "Items:\n" + order.items.map((i) => "- " + i.name + " (" + String(i.size).replace(" / vial", "") + ") x " + i.qty + " — $" + i.line).join("\n") + "\n\n" +
       "Ship to:\n" + order.customer.name + "\n" + order.customer.address + "\n" + order.customer.city + " " + order.customer.zip + "\n" + order.customer.country + "\n")
    : "";
  const mailHref = order
    ? "mailto:" + SITE_CONFIG.ordersEmail + "?subject=" + encodeURIComponent("Order " + order.reference + " — " + methodName + " payment") + "&body=" + encodeURIComponent(orderText)
    : "#";
  const copyOrder = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(orderText);
      } else {
        const ta = document.createElement("textarea");
        ta.value = orderText; ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.focus(); ta.select();
        document.execCommand("copy"); document.body.removeChild(ta);
      }
      setCopied(true); setTimeout(() => setCopied(false), 2200);
    } catch (_) { /* clipboard unavailable */ }
  };

  if (!order) {
    return (
      <div className="lp-fade" style={{ maxWidth: 600, margin: "0 auto", padding: "120px 28px", textAlign: "center" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", border: "1px solid var(--gold)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
          <Check size={22} color="var(--gold-bright)" />
        </div>
        <h2 className="lp-serif" style={{ fontSize: 32, marginBottom: 14 }}>Order received</h2>
        <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.7, marginBottom: 32 }}>
          This is a preview confirmation — no live payment was processed. Once a payment processor
          is connected, this screen becomes your real order confirmation.
        </p>
        <button className="lp-btn lp-btn-solid" onClick={() => { clearCart(); setPage("home"); }}>
          Return Home
        </button>
      </div>
    );
  }

  if (order.method === "card") {
    return (
      <div className="lp-fade" style={{ maxWidth: 640, margin: "0 auto", padding: "90px 28px 120px", textAlign: "center" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", border: "1px solid var(--gold)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
          <Check size={22} color="var(--gold-bright)" />
        </div>
        <h2 className="lp-serif" style={{ fontSize: 32, marginBottom: 10 }}>Order received</h2>
        <p style={{ color: "var(--muted)", fontSize: 13.5, lineHeight: 1.7, marginBottom: 28 }}>
          Payment received — thank you. Your order is confirmed.
        </p>
        <div style={{ border: "1px solid var(--gold)", padding: "22px 20px", marginBottom: 24 }}>
          <div className="lp-eyebrow" style={{ marginBottom: 8 }}>Order Number</div>
          <div className="lp-serif" style={{ fontSize: 30, letterSpacing: "0.06em", color: "var(--gold-bright)", marginBottom: 10 }}>{order.reference}</div>
          <div style={{ fontSize: 14 }}>Paid: <span style={{ color: "var(--gold-bright)" }}>${order.total}</span></div>
        </div>
        <p style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.7 }}>
          We've emailed your confirmation. Your order will be packed and shipped shortly{order.preorder ? " (pre-orders ship on the pre-order timeline)" : ""}. Questions? {SITE_CONFIG.ordersEmail}
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 22 }}>
          <button className="lp-btn" onClick={() => setPage("orders")}>View My Orders</button>
          <button className="lp-btn lp-btn-solid" onClick={() => setPage("home")}>Return Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="lp-fade" style={{ maxWidth: 640, margin: "0 auto", padding: "90px 28px 120px", textAlign: "center" }}>
      <div style={{ width: 56, height: 56, borderRadius: "50%", border: "1px solid var(--gold)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
        <Check size={22} color="var(--gold-bright)" />
      </div>
      <h2 className="lp-serif" style={{ fontSize: 32, marginBottom: 10 }}>Order received</h2>
      <p style={{ color: "var(--muted)", fontSize: 13.5, lineHeight: 1.7, marginBottom: 28 }}>
        Your order is reserved and awaiting payment.
      </p>

      <div style={{ border: "1px solid var(--gold)", padding: "22px 20px", marginBottom: 20 }}>
        <div className="lp-eyebrow" style={{ marginBottom: 8 }}>Order Number</div>
        <div className="lp-serif" style={{ fontSize: 30, letterSpacing: "0.06em", color: "var(--gold-bright)", marginBottom: 10 }}>{order.reference}</div>
        <div style={{ fontSize: 14 }}>Total due: <span style={{ color: "var(--gold-bright)" }}>${order.total}</span></div>
      </div>

      <div style={{ border: "1px solid var(--gold)", background: "linear-gradient(135deg, rgba(176,130,67,0.12), transparent 72%)", padding: "16px 18px", marginBottom: 24, textAlign: "left" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <AlertCircle size={16} color="var(--gold-bright)" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 13.5, color: "var(--cream)", lineHeight: 1.6 }}>
            <strong>Add your order number to your payment.</strong>{" "}
            {order.method === "crypto"
              ? <>Include <strong style={{ color: "var(--gold-bright)" }}>{order.reference}</strong> when you email us your transaction hash so we can match your payment to your order.</>
              : <>Put <strong style={{ color: "var(--gold-bright)" }}>{order.reference}</strong> in the payment note/comment field when you send it, so we can match your payment to your order.</>}
            {" "}Payments we can't match may be delayed.
          </div>
        </div>
      </div>

      <div style={{ border: "1px solid var(--line)", padding: "20px 22px", textAlign: "left", fontSize: 13.5, color: "var(--muted)", lineHeight: 1.8, marginBottom: 24 }}>
        {order.method === "zelle" ? (
          <>
            <strong style={{ color: "var(--cream)" }}>How to pay with Zelle</strong>
            <ol style={{ margin: "10px 0 0 18px", padding: 0 }}>
              <li>Open your bank's app and choose <strong>Send with Zelle</strong>.</li>
              <li>Send <strong style={{ color: "var(--gold-bright)" }}>${order.total}</strong> to the Zelle recipient below.</li>
              <li>Put your order number in the memo/note field.</li>
              <li>Tap <strong>Copy My Order Details</strong> below so we can match your payment.</li>
              <li>Your order ships once payment is received{order.preorder ? " (pre-orders ship on the pre-order timeline)" : ""}.</li>
            </ol>
            <CopyField label="Zelle recipient" value={cfg.zelleId} />
            <CopyField label="Amount to send" value={"$" + order.total} />
            <CopyField label="Order number (put in memo)" value={order.reference} />
          </>
        ) : order.method === "cashapp" ? (
          <>
            <strong style={{ color: "var(--cream)" }}>How to pay with Cash App</strong>
            <ol style={{ margin: "10px 0 0 18px", padding: 0 }}>
              <li>Open <strong>Cash App</strong> and tap the <strong>$</strong> (Pay) tab.</li>
              <li>Enter <strong style={{ color: "var(--gold-bright)" }}>${order.total}</strong> and send it to our $Cashtag below.</li>
              <li>Put your order number in the <strong>For</strong> note.</li>
              <li>Tap <strong>Copy My Order Details</strong> below so we can match your payment.</li>
              <li>Your order ships once payment is received{order.preorder ? " (pre-orders ship on the pre-order timeline)" : ""}.</li>
            </ol>
            <CopyField label="Cash App $Cashtag" value={cfg.cashtag} />
            <CopyField label="Amount to send" value={"$" + order.total} />
            <CopyField label="Order number (put in note)" value={order.reference} />
          </>
        ) : order.method === "crypto" ? (
          <>
            <strong style={{ color: "var(--cream)" }}>How to pay with USDC (crypto)</strong>
            <ol style={{ margin: "10px 0 0 18px", padding: 0 }}>
              <li>In your wallet or exchange, send <strong style={{ color: "var(--gold-bright)" }}>${order.total}</strong> worth of <strong>USDC</strong> on the <strong>Ethereum (ERC-20)</strong> network.</li>
              <li>Send it to the wallet address below (tap Copy — never hand-type it).</li>
              <li>Tap <strong>Copy My Order Details</strong> below and include your transaction hash (TxID).</li>
              <li>Your order ships once the payment confirms on-chain{order.preorder ? " (pre-orders ship on the pre-order timeline)" : ""}.</li>
            </ol>
            {addrs.length > 0 ? (
              <>
                {addrs.map(([sym, addr]) => (
                  <CopyField key={sym} label={sym + " — wallet address"} value={addr} mono />
                ))}
                <CopyField label="Amount (USD value in USDC)" value={"$" + order.total} />
                <CopyField label="Order number (include in your email)" value={order.reference} />
                <p style={{ marginTop: 12, fontSize: 12.5, color: "#d8b48a" }}>
                  <strong style={{ color: "var(--gold-bright)" }}>Ethereum network (ERC-20) only.</strong>{" "}
                  Funds sent on any other network (Tron/TRC-20, BSC, Solana, etc.) cannot be recovered.
                </p>
              </>
            ) : (
              <p style={{ marginTop: 12 }}>Payment addresses are sent by email — tap the button below and we'll reply with them right away.</p>
            )}
          </>
        ) : (
          <>
            <strong style={{ color: "var(--cream)" }}>How to pay by bank transfer</strong>
            <ol style={{ margin: "10px 0 0 18px", padding: 0 }}>
              <li>Send <strong style={{ color: "var(--gold-bright)" }}>${order.total}</strong> to the account holder below{cfg.bankName ? " at " + cfg.bankName : ""}.</li>
              <li>Tap <strong>Copy My Order Details</strong> below — we reply with the account &amp; routing numbers (we never post those publicly).</li>
              <li>Put your order number in the transfer description/memo.</li>
              <li>Your order ships once payment clears{order.preorder ? " (pre-orders ship on the pre-order timeline)" : ""}.</li>
            </ol>
            {cfg.bankRecipient && <CopyField label="Account holder" value={cfg.bankRecipient} />}
            {cfg.bankName && <CopyField label="Bank" value={cfg.bankName} />}
            <CopyField label="Amount to send" value={"$" + order.total} />
            <CopyField label="Order number (put in transfer note)" value={order.reference} />
          </>
        )}
      </div>

      <button className="lp-btn lp-btn-solid" onClick={copyOrder} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        {copied ? <><Check size={15} /> Copied — now paste it to us</> : "Copy My Order Details"}
      </button>
      <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 14, lineHeight: 1.7 }}>
        We've emailed your confirmation and payment details. To reach us, copy your order above and send it to{" "}
        <a href={"mailto:" + SITE_CONFIG.ordersEmail} style={{ color: "var(--gold-bright)", textDecoration: "none" }}>{SITE_CONFIG.ordersEmail}</a>
        , or <a href={mailHref} style={{ color: "var(--gold-bright)", textDecoration: "none" }}>open it in your email app</a>.
      </p>
      <p style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 8, lineHeight: 1.7 }}>
        Orders are held for 72 hours pending payment confirmation. Questions? {SITE_CONFIG.ordersEmail}
      </p>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 10 }}>
        <button className="lp-btn" onClick={() => setPage("orders")}>View My Orders</button>
        <button className="lp-btn" onClick={() => setPage("home")}>Return Home</button>
      </div>
    </div>
  );
}

function About({ setPage }) {
  return (
    <div className="lp-fade" style={{ maxWidth: 800, margin: "0 auto", padding: "70px 28px 100px" }}>
      <div className="lp-eyebrow" style={{ marginBottom: 10 }}>Standards</div>
      <h2 className="lp-serif" style={{ fontSize: 36, marginBottom: 26 }}>How every batch is verified</h2>
      <p style={{ color: "var(--muted)", lineHeight: 1.85, fontSize: 15, marginBottom: 20 }}>
        Each compound listed in the catalog is tested by third-party HPLC analysis prior to listing, with
        a certificate of analysis available on request for every batch number. Vials are lyophilized,
        sealed, and shipped cold-chain to preserve integrity in transit.
      </p>
      <p style={{ color: "var(--muted)", lineHeight: 1.85, fontSize: 15, marginBottom: 40 }}>
        All compounds are sold strictly for laboratory research use by qualified buyers. Luxury Peps does
        not provide dosing guidance, administration instructions, or any information intended for human
        or animal use.
      </p>
      <button className="lp-btn" onClick={() => setPage("shop")}>View Catalog</button>
    </div>
  );
}

function Calculator({ setPage }) {
  const [mass, setMass] = useState("5");      // mg of compound in the vial
  const [volume, setVolume] = useState("2");  // mL of diluent added

  const m = parseFloat(mass);
  const v = parseFloat(volume);
  const valid = m > 0 && v > 0;
  const mgPerMl = valid ? m / v : 0;
  const mcgPerMl = mgPerMl * 1000;
  const fmt = (n) => (n >= 100 ? n.toFixed(0) : n >= 10 ? n.toFixed(1) : n.toFixed(2));

  return (
    <div className="lp-fade" style={{ maxWidth: 720, margin: "0 auto", padding: "70px 28px 100px" }}>
      <div className="lp-eyebrow" style={{ marginBottom: 10 }}>Lab Tools</div>
      <h2 className="lp-serif" style={{ fontSize: 36, marginBottom: 14 }}>Stock Solution Concentration</h2>
      <p style={{ color: "var(--muted)", lineHeight: 1.8, fontSize: 14.5, marginBottom: 36 }}>
        Calculate the concentration of a reconstituted stock solution for laboratory preparation —
        enter the mass of compound in the vial and the volume of diluent (e.g. bacteriostatic water)
        added to it.
      </p>

      <div style={{ border: "1px solid var(--line)", padding: 28, marginBottom: 24 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 28 }}>
          <div>
            <label className="lp-eyebrow" style={{ display: "block", marginBottom: 10 }}>Compound in Vial (mg)</label>
            <input type="number" min="0" step="0.5" value={mass} onChange={(e) => setMass(e.target.value)} />
            <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
              {[2, 5, 10].map((preset) => (
                <button key={preset} onClick={() => setMass(String(preset))} style={{ fontSize: 11, padding: "5px 10px", border: "1px solid var(--line)", background: "transparent", color: "var(--muted)", cursor: "pointer" }}>{preset}mg</button>
              ))}
            </div>
          </div>
          <div>
            <label className="lp-eyebrow" style={{ display: "block", marginBottom: 10 }}>Diluent Added (mL)</label>
            <input type="number" min="0" step="0.5" value={volume} onChange={(e) => setVolume(e.target.value)} />
            <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
              {[1, 2, 3].map((preset) => (
                <button key={preset} onClick={() => setVolume(String(preset))} style={{ fontSize: 11, padding: "5px 10px", border: "1px solid var(--line)", background: "transparent", color: "var(--muted)", cursor: "pointer" }}>{preset}mL</button>
              ))}
            </div>
          </div>
        </div>

        <hr className="lp-hairline" style={{ marginBottom: 24 }} />

        <div className="lp-eyebrow" style={{ marginBottom: 16 }}>Resulting Concentration</div>
        {valid ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ background: "var(--panel-2)", border: "1px solid var(--line)", padding: "20px 22px" }}>
              <div style={{ color: "var(--gold-bright)", fontSize: 28, fontFamily: "Fraunces, serif" }}>{fmt(mgPerMl)}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>mg per mL</div>
            </div>
            <div style={{ background: "var(--panel-2)", border: "1px solid var(--line)", padding: "20px 22px" }}>
              <div style={{ color: "var(--gold-bright)", fontSize: 28, fontFamily: "Fraunces, serif" }}>{fmt(mcgPerMl)}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>mcg per mL</div>
            </div>
          </div>
        ) : (
          <p style={{ fontSize: 13.5, color: "var(--muted)" }}>Enter a mass and volume greater than zero to see the concentration.</p>
        )}
      </div>

      <p style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.7 }}>
        This tool reports solution concentration only, for laboratory handling and stock preparation. It is
        not dosing, administration, or medical guidance, and these compounds are supplied for research use
        only — not for human or animal use.
      </p>
    </div>
  );
}

function AuthGate({ onAuthenticated }) {
  const [mode, setMode] = useState("signup"); // signup | login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!isValidEmail(email)) return setError("Enter a valid email address.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (mode === "signup" && password !== confirm) return setError("Passwords don't match.");

    const accountKey = `account:${email.toLowerCase()}`;
    setLoading(true);
    try {
      // ── Live backend mode ──────────────────────────────────────────────
      if (BACKEND_LIVE) {
        const path = mode === "signup" ? "/api/auth/register" : "/api/auth/login";
        const res = await fetch(API_BASE + path, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.toLowerCase(), password }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error || "Something went wrong. Please try again.");
          setLoading(false);
          return;
        }
        // Always keep the token (needed for order history / reorder). The
        // `remember` flag alone decides whether we auto-sign-in next visit.
        if (data.token) {
          await window.storage.set("session", JSON.stringify({ email: data.email, token: data.token, remember: !!rememberMe }), false);
        }
        onAuthenticated(data.email || email.toLowerCase());
        setLoading(false);
        return;
      }

      // ── Preview mode (no backend): browser stand-in ────────────────────
      if (mode === "signup") {
        let existing = null;
        try {
          existing = await window.storage.get(accountKey, false);
        } catch (_) { /* key not found is expected here */ }
        if (existing) {
          setError("An account with that email already exists. Try logging in instead.");
          setLoading(false);
          return;
        }
        await window.storage.set(accountKey, JSON.stringify({ password, createdAt: Date.now() }), false);
      } else {
        let existing = null;
        try {
          existing = await window.storage.get(accountKey, false);
        } catch (_) { /* not found */ }
        if (!existing) {
          setError("No account found for that email. Try registering instead.");
          setLoading(false);
          return;
        }
        const data = JSON.parse(existing.value);
        if (data.password !== password) {
          setError("Incorrect password.");
          setLoading(false);
          return;
        }
      }
      if (rememberMe) {
        await window.storage.set("session", JSON.stringify({ email: email.toLowerCase() }), false);
      }
      onAuthenticated(email.toLowerCase());
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lp-root" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div className="lp-fade" style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
            <img src={LOGO_SRC} alt="Luxury Peps" style={{ width: "82%", maxWidth: 340, height: "auto" }} />
          </div>
          <div className="lp-eyebrow">Members-Only Catalog</div>
        </div>

        <div style={{ display: "flex", border: "1px solid var(--line)", marginBottom: 28 }}>
          <button
            onClick={() => { setMode("signup"); setError(""); }}
            style={{ flex: 1, padding: "12px", fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer", border: "none", background: mode === "signup" ? "var(--brown-deep)" : "transparent", color: mode === "signup" ? "var(--gold-bright)" : "var(--muted)" }}
          >
            Register
          </button>
          <button
            onClick={() => { setMode("login"); setError(""); }}
            style={{ flex: 1, padding: "12px", fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer", border: "none", background: mode === "login" ? "var(--brown-deep)" : "transparent", color: mode === "login" ? "var(--gold-bright)" : "var(--muted)" }}
          >
            Log In
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <div style={{ position: "relative" }}>
            <input
              type={showPw ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              style={{ paddingRight: 44 }}
            />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: 0 }}
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {mode === "signup" && (
            <input
              type={showPw ? "text" : "password"}
              placeholder="Confirm password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          )}

          <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--muted)", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              style={{ width: "auto", accentColor: "#C9A05C" }}
            />
            Remember me on this device
          </label>

          {error && (
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12.5, color: "#D9A06B" }}>
              <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{error}</span>
            </div>
          )}

          <button type="submit" className="lp-btn lp-btn-solid" style={{ marginTop: 6, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }} disabled={loading}>
            {loading ? <><Loader2 size={14} className="lp-spin" /> {mode === "signup" ? "Creating account…" : "Signing in…"}</> : (
              <><Lock size={13} /> {mode === "signup" ? "Create Account" : "Log In"}</>
            )}
          </button>
        </form>

        <button
          onClick={() => onAuthenticated("guest")}
          className="lp-nav-link"
          style={{ display: "block", width: "100%", textAlign: "center", marginTop: 18, color: "var(--muted)" }}
        >
          Skip for now (preview only)
        </button>

        <p style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.7, marginTop: 24, textAlign: "center" }}>
          By registering you confirm you are at least 18 years old and intend to purchase research compounds
          for laboratory use only.
        </p>
      </div>
    </div>
  );
}

function AgeGate({ onConfirm, declined, onDecline }) {
  return (
    <div className="lp-root" style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(6,4,3,0.97)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div className="lp-fade" style={{ maxWidth: 440, textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <img src={LOGO_SRC} alt="Luxury Peps" style={{ width: "70%", maxWidth: 280, height: "auto" }} />
        </div>
        {declined ? (
          <>
            <h2 className="lp-serif" style={{ fontSize: 24, marginBottom: 14 }}>Access Restricted</h2>
            <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.8, marginBottom: 24 }}>
              You must be at least 18 years old and a qualified researcher to access this site. You may
              close this window.
            </p>
            <button className="lp-btn" onClick={() => onDecline && onDecline()} style={{ opacity: 0.6 }}>Go Back</button>
          </>
        ) : (
          <>
            <h2 className="lp-serif" style={{ fontSize: 26, marginBottom: 14 }}>Age Verification</h2>
            <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.8, marginBottom: 12 }}>
              All products are sold strictly for laboratory and research use only — <strong style={{ color: "var(--cream)" }}>not for human or animal consumption</strong>.
            </p>
            <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.8, marginBottom: 28 }}>
              By entering, you confirm that you are at least <strong style={{ color: "var(--cream)" }}>18 years of age</strong>, that you are a qualified buyer, and that you agree to our Terms of Service.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button className="lp-btn lp-btn-solid" onClick={onConfirm}>I am 18 or older — Enter</button>
              <button className="lp-btn" onClick={() => onDecline && onDecline()} style={{ opacity: 0.7 }}>Exit</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Shared layout for legal / policy pages.
function PolicyPage({ title, updated, children, setPage }) {
  return (
    <div className="lp-fade" style={{ maxWidth: 820, margin: "0 auto", padding: "64px 28px 100px" }}>
      <button className="lp-nav-link" onClick={() => setPage("home")} style={{ marginBottom: 24, display: "inline-flex", alignItems: "center", gap: 6 }}>
        <ChevronLeft size={14} /> Home
      </button>
      <div className="lp-eyebrow" style={{ marginBottom: 10 }}>Policies</div>
      <h1 className="lp-serif" style={{ fontSize: 34, fontWeight: 400, marginBottom: 8 }}>{title}</h1>
      <p style={{ color: "var(--muted)", fontSize: 12.5, marginBottom: 36 }}>Last updated: {updated}</p>
      <div className="lp-policy" style={{ color: "var(--muted)", fontSize: 14.5, lineHeight: 1.85 }}>
        {children}
      </div>
    </div>
  );
}

function PolicySection({ heading, children }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2 className="lp-serif" style={{ fontSize: 19, color: "var(--cream)", marginBottom: 10 }}>{heading}</h2>
      {children}
    </section>
  );
}

function TermsPage({ setPage }) {
  return (
    <PolicyPage title="Terms of Service" updated={SITE_CONFIG.effectiveDate} setPage={setPage}>
      <p style={{ marginBottom: 24 }}>
        These Terms of Service ("Terms") govern your access to and use of the website operated by
        {SITE_CONFIG.legalName} ("Luxury Peps", "we", "us"). By accessing the site or placing an order, you
        agree to these Terms.
      </p>
      <PolicySection heading="1. Research Use Only">
        <p>All products offered are sold strictly for in-vitro laboratory research and analytical purposes.
        They are <strong style={{ color: "var(--cream)" }}>not</strong> drugs, food, cosmetics, or supplements, and are
        <strong style={{ color: "var(--cream)" }}> not intended for human or animal consumption</strong>, diagnostic use,
        or any therapeutic application. You assume full responsibility for the safe handling, use, storage,
        and disposal of all products in compliance with applicable laws.</p>
      </PolicySection>
      <PolicySection heading="2. Eligibility">
        <p>You must be at least 18 years old (or the age of majority in your jurisdiction) and a qualified
        purchaser to use this site. By purchasing, you represent that you have the training and facilities
        to handle research compounds safely and lawfully.</p>
      </PolicySection>
      <PolicySection heading="3. No Medical or Professional Advice">
        <p>Nothing on this site constitutes medical, legal, or professional advice. We do not provide
        dosing, administration, or usage guidance of any kind.</p>
      </PolicySection>
      <PolicySection heading="4. Product Information">
        <p>We make reasonable efforts to describe products accurately, including purity figures derived from
        third-party analysis. We make no warranty that descriptions are error-free and reserve the right to
        correct errors and update information at any time.</p>
      </PolicySection>
      <PolicySection heading="5. Orders, Pricing & Payment">
        <p>All prices are listed in USD and may change without notice. We reserve the right to refuse or
        cancel any order, including where we suspect the product may be misused or the order violates these
        Terms or applicable law. Payment is processed by third-party providers; you agree to their terms.</p>
      </PolicySection>
      <PolicySection heading="6. Shipping & Risk of Loss">
        <p>Shipping timelines and methods are described in our Shipping & Refund Policy. Title and risk of
        loss pass to you upon our delivery of the products to the carrier.</p>
      </PolicySection>
      <PolicySection heading="7. Prohibited Uses">
        <p>You may not purchase products for resale as drugs, for human or animal use, or for any unlawful
        purpose. You may not misrepresent your eligibility or the intended use of products.</p>
      </PolicySection>
      <PolicySection heading="8. Limitation of Liability">
        <p>To the fullest extent permitted by law, {SITE_CONFIG.legalName} shall not be liable for any indirect,
        incidental, or consequential damages, or for any misuse of products. Our total liability shall not
        exceed the amount you paid for the product giving rise to the claim.</p>
      </PolicySection>
      <PolicySection heading="9. Indemnification">
        <p>You agree to indemnify and hold harmless {SITE_CONFIG.legalName} from any claims arising out of your
        use, handling, or disposal of products, or your breach of these Terms.</p>
      </PolicySection>
      <PolicySection heading="10. Governing Law">
        <p>These Terms are governed by the laws of the State of {SITE_CONFIG.state}, without regard to conflict-of-law
        principles.</p>
      </PolicySection>
      <PolicySection heading="11. Changes & Contact">
        <p>We may update these Terms at any time; continued use constitutes acceptance. Questions:
        {SITE_CONFIG.supportEmail}.</p>
      </PolicySection>
    </PolicyPage>
  );
}

function PrivacyPage({ setPage }) {
  return (
    <PolicyPage title="Privacy Policy" updated={SITE_CONFIG.effectiveDate} setPage={setPage}>
      <p style={{ marginBottom: 24 }}>
        This Privacy Policy explains how {SITE_CONFIG.legalName} collects, uses, and protects your information
        when you use our website.
      </p>
      <PolicySection heading="Information We Collect">
        <p>We collect information you provide directly — name, email, phone, shipping and billing address —
        as well as order history, and limited technical data (IP address, browser type, usage analytics).
        Payment card details are collected and processed by our payment processor, not stored by us.</p>
      </PolicySection>
      <PolicySection heading="How We Use Information">
        <p>To process and ship orders, provide customer support, send order and account communications, and —
        with your consent — marketing messages. We use technical data to operate and improve the site.</p>
      </PolicySection>
      <PolicySection heading="How We Share Information">
        <p>We share information with service providers who help us operate (payment processors, shipping
        carriers, email/SMS providers, analytics), and where required by law. We do not sell your personal
        information.</p>
      </PolicySection>
      <PolicySection heading="Cookies">
        <p>We use cookies and similar technologies for essential site function and analytics. You can control
        cookies through your browser settings.</p>
      </PolicySection>
      <PolicySection heading="Marketing & SMS Consent">
        <p>If you opt in to email or SMS marketing, you may withdraw consent at any time by using the
        unsubscribe link or replying STOP to text messages. Message and data rates may apply.</p>
      </PolicySection>
      <PolicySection heading="Your Rights">
        <p>Depending on your location (e.g., under GDPR or CCPA), you may have rights to access, correct,
        delete, or port your data, and to opt out of certain processing. Contact us to exercise these rights.</p>
      </PolicySection>
      <PolicySection heading="Data Security & Retention">
        <p>We use reasonable safeguards to protect your information and retain it only as long as needed for
        the purposes described or as required by law.</p>
      </PolicySection>
      <PolicySection heading="Children">
        <p>This site is not directed to anyone under 18, and we do not knowingly collect information from
        minors.</p>
      </PolicySection>
      <PolicySection heading="Contact">
        <p>Privacy questions: {SITE_CONFIG.supportEmail}.</p>
      </PolicySection>
    </PolicyPage>
  );
}

function ShippingRefundPage({ setPage }) {
  return (
    <PolicyPage title="Shipping & Refund Policy" updated={SITE_CONFIG.effectiveDate} setPage={setPage}>
      <PolicySection heading="Order Processing">
        <p>Orders are typically processed within [1–2] business days. You will receive a confirmation email,
        and tracking information once your order ships.</p>
      </PolicySection>
      <PolicySection heading="Shipping Methods & Handling">
        <p>Products are shipped with appropriate handling to preserve integrity. Standard delivery is
        estimated at [3–7] business days within [COUNTRY/REGION]. Free shipping applies to orders over
        $150; otherwise a flat rate of $12 applies.</p>
      </PolicySection>
      <PolicySection heading="Shipping Restrictions">
        <p>We ship only to jurisdictions where the sale and receipt of research compounds is lawful. You are
        responsible for ensuring it is legal to receive these products at your location. We may be unable to
        ship certain products to certain regions.</p>
      </PolicySection>
      <PolicySection heading="Risk of Loss">
        <p>Title and risk of loss pass to you when we hand the products to the carrier. Lost or delayed
        shipments should be reported to us promptly so we can assist with a carrier claim.</p>
      </PolicySection>
      <PolicySection heading="Returns">
        <p>Because these are sensitive research materials, we generally <strong style={{ color: "var(--cream)" }}>cannot
        accept returns</strong> once an order has shipped, for quality-control and safety reasons. Please order
        carefully.</p>
      </PolicySection>
      <PolicySection heading="Damaged or Incorrect Orders">
        <p>If your order arrives damaged, or you received the wrong item, contact us within [7] days of
        delivery with your order number and photos. We will arrange a replacement or refund for verified
        cases.</p>
      </PolicySection>
      <PolicySection heading="Refund Processing">
        <p>Approved refunds are issued to your original payment method within [5–10] business days of
        approval. Original shipping charges may be non-refundable.</p>
      </PolicySection>
      <PolicySection heading="Cancellations">
        <p>Orders may be cancelled before they ship. Once shipped, an order cannot be cancelled.</p>
      </PolicySection>
      <PolicySection heading="Contact">
        <p>Shipping or refund questions: {SITE_CONFIG.supportEmail}.</p>
      </PolicySection>
    </PolicyPage>
  );
}

const FAQ_ITEMS = [
  { q: "Are these products for human use?", a: "No. Every product is sold strictly for laboratory and research use only. They are not drugs, supplements, or foods, and are not intended for human or animal consumption. We do not provide dosing or administration guidance of any kind." },
  { q: "Do you provide a Certificate of Analysis (COA)?", a: "Yes. Every batch is tested by third-party HPLC analysis, and a lot-specific Certificate of Analysis is available for each product. You can view it from any product page or via the batch-lookup on the COA page." },
  { q: "How should compounds be stored?", a: "Lyophilized powder should be stored at −20°C, protected from light. Once reconstituted, follow standard laboratory cold-storage handling. Storage details are listed on each product page and label." },
  { q: "How fast do orders ship?", a: "Orders are typically processed within 1–2 business days, with tracking provided once shipped. Standard delivery is estimated at 3–7 business days. See our Shipping & Refund Policy for full details." },
  { q: "Is shipping discreet?", a: "Yes. Orders are shipped in unmarked packaging with appropriate handling to preserve product integrity in transit." },
  { q: "What payment methods do you accept?", a: "Accepted payment methods are shown at checkout. If a method you'd like isn't available, contact us and we'll let you know the current options." },
  { q: "Can I return an order?", a: "Because these are sensitive research materials, we generally cannot accept returns once an order has shipped, for quality-control and safety reasons. If your order arrives damaged or incorrect, contact us within 7 days for a replacement or refund." },
  { q: "Do you offer volume discounts?", a: "Yes — buying multiple vials of a compound unlocks tiered savings (2+ saves 5%, 3+ saves 10%, 5+ saves 15%), shown right on each product page. We also offer pre-built bundle kits priced below the sum of their vials." },
  { q: "What does 'research use only' actually mean?", a: "Every compound we supply is intended solely for in-vitro laboratory research and analytical work by qualified professionals. Nothing we sell is a drug, supplement, or food, and none of it is approved for human or veterinary use, diagnosis, or treatment. Purchasing requires certifying that intended use at checkout." },
  { q: "What is HPLC purity, and why does it matter?", a: "High-Performance Liquid Chromatography separates a sample into its components so each can be measured. A 99% HPLC result means that, by peak area, 99% of the material is the target compound. It matters because impurities and truncated sequences change how a compound behaves in an assay, and inconsistent purity makes results impossible to reproduce." },
  { q: "How do I read a Certificate of Analysis?", a: "A COA identifies the batch, states the analytical method used (typically HPLC and mass spectrometry), and reports the measured purity and molecular weight. Check that the batch number on the COA matches the number printed on your vial, and that the reported mass matches the compound's expected molecular weight." },
  { q: "Why does molecular weight matter?", a: "Molecular weight is what lets a researcher convert between mass and moles, so it underpins every concentration calculation made from a lyophilized powder. If the stated molecular weight is wrong, every downstream molarity figure derived from it is wrong too — which is why we verify it against public chemical databases before publishing a spec sheet." },
  { q: "What is lyophilized powder?", a: "Lyophilization, or freeze-drying, removes water from a compound under vacuum at low temperature. The resulting powder is far more stable in transit and storage than a solution, which is why peptides are shipped in this form. It appears as a small white cake or film at the bottom of the vial — a barely visible amount is normal and does not indicate a short fill." },
  { q: "Is bacteriostatic water the same as sterile water?", a: "No. Bacteriostatic water contains roughly 0.9% benzyl alcohol, which inhibits bacterial growth and allows a container to be used across a longer working period. Sterile water contains no preservative. They are not interchangeable, and both are supplied strictly as laboratory reagents." },
  { q: "How long do compounds remain stable?", a: "Stability depends on the compound, the temperature, and whether it has been reconstituted. As a general laboratory practice, lyophilized powder stored at -20°C and protected from light is the most stable form, and reconstituted material is markedly less stable. Consult the specific compound's literature for its documented stability window." },
  { q: "Do you ship internationally?", a: "Shipping availability varies by destination and by the regulations that apply to research chemicals in each country. Contact us before ordering from outside the United States so we can confirm whether we can ship to you." },
  { q: "What if my order arrives damaged?", a: "Photograph the package and the vial before handling anything further, then email us the photos along with your order number. Damaged or incorrect shipments are replaced." },
];

function FAQPage({ setPage }) {
  const [open, setOpen] = useState(0);
  return (
    <div className="lp-fade" style={{ maxWidth: 820, margin: "0 auto", padding: "64px 28px 100px" }}>
      <button className="lp-nav-link" onClick={() => setPage("home")} style={{ marginBottom: 24, display: "inline-flex", alignItems: "center", gap: 6 }}>
        <ChevronLeft size={14} /> Home
      </button>
      <div className="lp-eyebrow" style={{ marginBottom: 10 }}>Support</div>
      <h1 className="lp-serif" style={{ fontSize: 34, fontWeight: 400, marginBottom: 12 }}>Frequently asked questions</h1>
      <p style={{ color: "var(--muted)", fontSize: 13.5, lineHeight: 1.7, marginBottom: 28 }}>
        Purity, certificates of analysis, storage, and handling — answered. For the underlying concepts, see our{" "}
        <button className="lp-nav-link" onClick={() => setPage("guide")} style={{ color: "var(--gold-bright)", background: "none", border: "none", padding: 0, cursor: "pointer", textDecoration: "underline" }}>research guide</button>.
      </p>
      <div style={{ borderTop: "1px solid var(--line)" }}>
        {FAQ_ITEMS.map((item, i) => {
          const isOpen = open === i;
          return (
            <div key={i} style={{ borderBottom: "1px solid var(--line)" }}>
              <button
                onClick={() => setOpen(isOpen ? -1 : i)}
                style={{ width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: "20px 0", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, color: "var(--cream)" }}
              >
                <span className="lp-serif" style={{ fontSize: 17 }}>{item.q}</span>
                <Plus size={16} color="var(--gold)" style={{ flexShrink: 0, transform: isOpen ? "rotate(45deg)" : "none", transition: "transform 0.2s" }} />
              </button>
              {isOpen && (
                <p style={{ color: "var(--muted)", fontSize: 14.5, lineHeight: 1.8, padding: "0 0 22px" }}>{item.a}</p>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 40, padding: 24, border: "1px solid var(--line)", textAlign: "center" }}>
        <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 16 }}>Still have a question?</p>
        <button className="lp-btn lp-btn-solid" onClick={() => setPage("contact")}>Contact Us</button>
      </div>
    </div>
  );
}

function ContactPage({ setPage }) {
  const [form, setForm] = useState({ name: "", email: "", subject: "Order question", message: "" });
  const [sent, setSent] = useState(false);
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const valid = form.name.trim() && /\S+@\S+\.\S+/.test(form.email) && form.message.trim();

  const submit = async () => {
    if (!valid) return;
    // Live backend: POST to /api/contact. Preview: open the email client.
    if (BACKEND_LIVE) {
      try {
        await fetch(API_BASE + "/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      } catch (_) { /* show success regardless; message is non-critical */ }
      setSent(true);
      return;
    }
    const body = encodeURIComponent(`Name: ${form.name}\nEmail: ${form.email}\n\n${form.message}`);
    window.location.href = `mailto:${SITE_CONFIG.contactEmail}?subject=${encodeURIComponent("[" + form.subject + "] " + form.name)}&body=${body}`;
    setSent(true);
  };

  return (
    <div className="lp-fade" style={{ maxWidth: 720, margin: "0 auto", padding: "64px 28px 100px" }}>
      <button className="lp-nav-link" onClick={() => setPage("home")} style={{ marginBottom: 24, display: "inline-flex", alignItems: "center", gap: 6 }}>
        <ChevronLeft size={14} /> Home
      </button>
      <div className="lp-eyebrow" style={{ marginBottom: 10 }}>Support</div>
      <h1 className="lp-serif" style={{ fontSize: 34, fontWeight: 400, marginBottom: 14 }}>Get in touch</h1>
      <p style={{ color: "var(--muted)", fontSize: 14.5, lineHeight: 1.8, marginBottom: 36 }}>
        Questions about an order, a certificate of analysis, or our catalog? Send us a message and our team
        will respond within 1 business day.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28, marginBottom: 40 }}>
        <div>
          <div className="lp-eyebrow" style={{ marginBottom: 8 }}>Email</div>
          <p style={{ fontSize: 14, color: "var(--cream)" }}>{SITE_CONFIG.contactEmail}</p>
        </div>
        <div>
          <div className="lp-eyebrow" style={{ marginBottom: 8 }}>Hours</div>
          <p style={{ fontSize: 14, color: "var(--cream)" }}>Mon–Fri, 9am–5pm {SITE_CONFIG.timezone}</p>
        </div>
      </div>

      {sent ? (
        <div style={{ border: "1px solid var(--gold)", padding: 28, textAlign: "center" }}>
          <Check size={26} color="var(--gold-bright)" style={{ marginBottom: 10 }} />
          <div className="lp-serif" style={{ fontSize: 20, marginBottom: 8 }}>Thanks for reaching out</div>
          <p style={{ color: "var(--muted)", fontSize: 14 }}>Your email draft is ready to send. We'll reply within 1 business day.</p>
        </div>
      ) : (
        <div style={{ border: "1px solid var(--line)", padding: 28 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label className="lp-eyebrow" style={{ display: "block", marginBottom: 8 }}>Name</label>
              <input type="text" value={form.name} onChange={(e) => update("name", e.target.value)} />
            </div>
            <div>
              <label className="lp-eyebrow" style={{ display: "block", marginBottom: 8 }}>Email</label>
              <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label className="lp-eyebrow" style={{ display: "block", marginBottom: 8 }}>Subject</label>
            <select value={form.subject} onChange={(e) => update("subject", e.target.value)}>
              <option>Order question</option>
              <option>Certificate of Analysis</option>
              <option>Shipping</option>
              <option>Product question</option>
              <option>Other</option>
            </select>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label className="lp-eyebrow" style={{ display: "block", marginBottom: 8 }}>Message</label>
            <textarea rows={5} value={form.message} onChange={(e) => update("message", e.target.value)} style={{ width: "100%", resize: "vertical" }} />
          </div>
          <button className="lp-btn lp-btn-solid" onClick={submit} disabled={!valid} style={{ opacity: valid ? 1 : 0.5, width: "100%" }}>
            Send Message
          </button>
        </div>
      )}
    </div>
  );
}


// Lightweight inline-SVG bar chart — no external chart lib, bundles cleanly.
function SparkBars({ data = [], labels = [], height = 90, format = (v) => v, accent = "var(--gold)" }) {
  const vals = data.length ? data : [0];
  const max = Math.max(...vals, 1);
  const w = 100 / vals.length;
  return (
    <div>
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" style={{ width: "100%", height, display: "block" }}>
        {vals.map((v, i) => {
          const h = (v / max) * (height - 14);
          return (
            <g key={i}>
              <rect x={i * w + w * 0.18} y={height - h - 12} width={w * 0.64} height={Math.max(h, 0.5)} rx="1"
                fill={v > 0 ? accent : "var(--line)"} opacity={v > 0 ? 0.9 : 0.5} />
            </g>
          );
        })}
      </svg>
      {labels.length > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, color: "var(--muted)", marginTop: 4 }}>
          <span>{labels[0]}</span>
          {labels.length > 2 && <span>{labels[Math.floor(labels.length / 2)]}</span>}
          <span>{labels[labels.length - 1]}</span>
        </div>
      )}
    </div>
  );
}

function copyText(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
      return true;
    }
  } catch (_) { /* fall through */ }
  try {
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select(); document.execCommand("copy");
    document.body.removeChild(ta);
    return true;
  } catch (_) { return false; }
}

// Small copy-to-clipboard chip with brief confirmation.
function CopyChip({ text, label = "Copy", copiedLabel = "Copied", style = {} }) {
  const [done, setDone] = useState(false);
  return (
    <button
      className="lp-btn"
      onClick={() => { if (copyText(text)) { setDone(true); setTimeout(() => setDone(false), 1500); } }}
      style={{ fontSize: 11, padding: "6px 10px", display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", ...style }}
    >
      {done ? <><Check size={12} /> {copiedLabel}</> : <><Copy size={12} /> {label}</>}
    </button>
  );
}

// Sample dataset used only in preview mode when the owner turns "sample data"
// on, so a populated dashboard can be evaluated before real orders exist.
function buildSampleData() {
  const today = new Date();
  const dailyUSD = [45, 0, 120, 85, 60, 150, 95, 110, 0, 180, 140, 120, 210, 240];
  const series = dailyUSD.map((usd, i) => {
    const d = new Date(today); d.setDate(d.getDate() - (13 - i));
    return { day: d.toISOString().slice(0, 10), sales_cents: usd * 100 };
  });
  const paidSalesCents = series.reduce((a, b) => a + b.sales_cents, 0);
  const paidOrders = 23;
  return {
    preview: true, sample: true, preorder: true, commissionPct: 0.10,
    codes: Object.entries(CREATOR_CODES).map(([code, info]) => ({ code, creator: info.creator, pct: info.pct })),
    paidOrders, paidSalesCents,
    commissionOwedCents: 10300, pendingOrders: 3, pendingSalesCents: 26500,
    totalOrders: paidOrders + 3, series,
    bestSellers: [
      { name: "GLP-1 SM", qty: 12 }, { name: "BPC-157", qty: 10 },
      { name: "Ipamorelin", qty: 8 }, { name: "TB-500", qty: 6 }, { name: "GHK-Cu", qty: 5 },
    ],
    byCreator: [
      { creator_code: "MORGAN11", orders: 6, sales_cents: 62000, commission_cents: 6200 },
      { creator_code: "MATTLIFTZ", orders: 4, sales_cents: 41000, commission_cents: 4100 },
    ],
    paidOutByCode: {},
    recent: [
      { id: "LP-10427", creator_code: "MORGAN11", status: "paid", total_cents: 12000 },
      { id: "LP-10426", status: "paid", total_cents: 9000 },
      { id: "LP-10425", creator_code: "MATTLIFTZ", status: "awaiting_payment", total_cents: 13500 },
      { id: "LP-10424", status: "paid", total_cents: 4500 },
      { id: "LP-10423", status: "paid", total_cents: 8000 },
    ],
  };
}

// Builds the owner-dashboard data shape from orders saved on this device
// (browser mode), so test orders are visible before the backend is live.
function buildDataFromOrders(orders) {
  const list = (Array.isArray(orders) ? orders.slice() : []).reverse(); // newest first
  const cents = (v) => Math.round((Number(v) || 0) * 100);
  let pendingSales = 0, paidSales = 0, paidCount = 0, pendCount = 0;
  const byCode = {}, itemQty = {}, dayTotals = {};
  for (const o of list) {
    if (o.archived) continue; // archived orders don't count toward any totals
    const total = Number(o.total) || 0;
    const paid = /(paid|shipped)/i.test(o.status || "") && !/await/i.test(o.status || "");
    if (paid) { paidSales += total; paidCount++; } else { pendingSales += total; pendCount++; }
    if (o.code) {
      const k = String(o.code).toUpperCase();
      byCode[k] = byCode[k] || { creator_code: k, orders: 0, sales_cents: 0, commission_cents: 0 };
      byCode[k].orders++; byCode[k].sales_cents += cents(total); byCode[k].commission_cents += cents(o.creatorDiscount || 0);
    }
    for (const it of (o.items || [])) itemQty[it.name] = (itemQty[it.name] || 0) + (Number(it.qty) || 0);
    // Revenue series (feeds the chart + "This Week") counts PAID orders only.
    const day = String(o.placedAt || "").slice(0, 10);
    if (day && paid) dayTotals[day] = (dayTotals[day] || 0) + cents(total);
  }
  const series = [];
  const today = new Date();
  for (let i = 13; i >= 0; i--) { const d = new Date(today); d.setDate(d.getDate() - i); const key = d.toISOString().slice(0, 10); series.push({ day: key, sales_cents: dayTotals[key] || 0 }); }
  const bestSellers = Object.entries(itemQty).map(([name, qty]) => ({ name, qty })).sort((a, b) => b.qty - a.qty).slice(0, 6);
  const recent = list.slice(0, 20).map((o) => ({
    id: o.reference, creator_code: o.code || null, status: o.status || "awaiting_payment",
    total_cents: cents(o.total), method: o.method || null, created_at: o.placedAt || null,
    customer: o.customer || {},
    items: (o.items || []).map((it) => ({ name: it.name, size: it.size, qty: it.qty, line_cents: cents(it.line) })),
    archived: !!o.archived,
  }));
  return {
    preview: true, local: true, preorder: true, commissionPct: 0.10, codes: [],
    paidOrders: paidCount, paidSalesCents: cents(paidSales), commissionOwedCents: 0,
    pendingOrders: pendCount, pendingSalesCents: cents(pendingSales), totalOrders: list.filter((o) => !o.archived).length,
    byCreator: Object.values(byCode), recent, series, bestSellers, paidOutByCode: {},
  };
}

// Builds one ambassador's dashboard from orders saved on this device (browser
// mode) so a test order placed with their code shows up before the backend is live.
function buildCreatorFromOrders(orders, code, info) {
  const cents = (v) => Math.round((Number(v) || 0) * 100);
  const mine = (Array.isArray(orders) ? orders : []).filter((o) => String(o.code || "").toUpperCase() === code && !o.archived);
  let paidO = 0, paidS = 0, paidC = 0, pendO = 0, pendS = 0, pendC = 0;
  const recent = [];
  for (const o of mine.slice().reverse()) {
    const total = Number(o.total) || 0;
    const comm = Number(o.creatorDiscount != null ? o.creatorDiscount : total * 0.10) || 0;
    const paid = /(paid|shipped)/i.test(o.status || "") && !/await/i.test(o.status || "");
    if (paid) { paidO++; paidS += total; paidC += comm; } else { pendO++; pendS += total; pendC += comm; }
    if (recent.length < 12) recent.push({ id: o.reference, status: o.status || "awaiting_payment", totalCents: cents(total), commissionCents: cents(comm) });
  }
  return {
    code, creator: info.creator, discountPct: info.pct, commissionPct: 0.10, preview: true,
    paid: { orders: paidO, salesCents: cents(paidS), commissionCents: cents(paidC) },
    pending: { orders: pendO, salesCents: cents(pendS), commissionCents: cents(pendC) },
    totalOrders: mine.length, recent,
  };
}

// Expandable order row: tap to reveal items, shipping address, and payment;
// includes a Mark-as-Paid action (works live via API or locally in browser mode).
function OrderRow({ o, first, onMarkPaid, onMarkUnpaid, onMarkShipped, onArchive, canMarkPaid }) {
  const [open, setOpen] = useState(false);
  const paid = /(paid|shipped)/i.test(o.status || "") && !/await/i.test(o.status || "");
  const shipped = /shipped/i.test(o.status || "");
  const cust = o.customer || {};
  const fmt = (c) => "$" + ((Number(c) || 0) / 100).toFixed(2);
  const methodLabel = { bank: "Bank transfer", cashapp: "Cash App", zelle: "Zelle", crypto: "Crypto (USDC)", card: "Card" }[o.method] || o.method || "—";
  const date = o.created_at ? new Date(o.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "";
  const cityZip = [[cust.city, cust.state].filter(Boolean).join(", "), cust.zip].filter(Boolean).join(" ");
  const addressText = [cust.name, cust.address, cityZip, cust.country].filter(Boolean).join("\n");
  return (
    <div style={{ borderTop: first ? "none" : "1px solid var(--line)", padding: "10px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => setOpen((v) => !v)}>
        <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ color: "var(--cream)" }}>{o.id}</span>
          {o.creator_code && <span style={{ color: "var(--gold-bright)", fontSize: 11 }}>{o.creator_code}</span>}
          <span style={{ fontSize: 9.5, padding: "2px 7px", borderRadius: 3, textTransform: "uppercase", letterSpacing: "0.05em", background: shipped ? "rgba(110,150,200,0.18)" : paid ? "rgba(120,180,120,0.16)" : "rgba(200,160,80,0.16)", color: shipped ? "#9ec3ee" : paid ? "#8fca8f" : "var(--gold-bright)" }}>{shipped ? "Shipped" : paid ? "Paid" : "Awaiting"}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {date && <span style={{ color: "var(--muted)", fontSize: 11 }}>{date}</span>}
          <span style={{ color: "var(--cream)" }}>{fmt(o.total_cents)}</span>
          <ChevronRight size={14} style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform 0.2s", color: "var(--muted)", flexShrink: 0 }} />
        </div>
      </div>
      {open && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px dashed var(--line)", display: "grid", gap: 16 }}>
          {o.items && o.items.length > 0 && (
            <div>
              <div className="lp-eyebrow" style={{ marginBottom: 7 }}>Items</div>
              {o.items.map((it, k) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "var(--cream)", padding: "3px 0" }}>
                  <span>{it.name}{it.size ? " (" + String(it.size).replace(" / vial", "") + ")" : ""} × {it.qty}</span>
                  <span>{fmt(it.line_cents)}</span>
                </div>
              ))}
            </div>
          )}
          <div>
            <div className="lp-eyebrow" style={{ marginBottom: 7 }}>Ship to</div>
            {(cust.name || cust.address) ? (
              <div style={{ fontSize: 12.5, color: "var(--cream)", lineHeight: 1.75 }}>
                {cust.name && <div>{cust.name}</div>}
                {cust.email && <div style={{ color: "var(--muted)" }}>{cust.email}</div>}
                {cust.address && <div>{cust.address}</div>}
                {cityZip && <div>{cityZip}</div>}
                {cust.country && <div>{cust.country}</div>}
              </div>
            ) : <div style={{ fontSize: 12.5, color: "var(--muted)" }}>No address on file.</div>}
            {addressText && <div style={{ marginTop: 9 }}><CopyChip text={addressText} label="Copy address" copiedLabel="Address copied" /></div>}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ fontSize: 12.5, color: "var(--muted)" }}>Payment: <span style={{ color: "var(--cream)" }}>{methodLabel}</span></div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {!paid && canMarkPaid && <button className="lp-btn lp-btn-solid" onClick={(e) => { e.stopPropagation(); onMarkPaid(o.id); }} style={{ fontSize: 11.5, padding: "8px 16px" }}>Mark as Paid</button>}
              {paid && !shipped && (
                <>
                  <span style={{ fontSize: 11.5, color: "#8fca8f", display: "inline-flex", alignItems: "center", gap: 5 }}><Check size={13} /> Paid</span>
                  {canMarkPaid && <button className="lp-btn lp-btn-solid" onClick={(e) => { e.stopPropagation(); onMarkShipped(o.id); }} style={{ fontSize: 11, padding: "6px 13px" }}>Mark shipped</button>}
                  {canMarkPaid && <button className="lp-btn" onClick={(e) => { e.stopPropagation(); onMarkUnpaid(o.id); }} style={{ fontSize: 10.5, padding: "5px 10px" }}>Mark unpaid</button>}
                </>
              )}
              {shipped && (
                <>
                  <span style={{ fontSize: 11.5, color: "#9ec3ee", display: "inline-flex", alignItems: "center", gap: 5 }}><Truck size={13} /> Shipped</span>
                  {canMarkPaid && <button className="lp-btn" onClick={(e) => { e.stopPropagation(); onMarkPaid(o.id); }} style={{ fontSize: 10.5, padding: "5px 10px" }}>Back to paid</button>}
                </>
              )}
              {canMarkPaid && <button className="lp-btn" onClick={(e) => { e.stopPropagation(); onArchive(o.id, !o.archived); }} style={{ fontSize: 10, padding: "5px 9px", opacity: 0.75 }}>{o.archived ? "Unarchive" : "Archive"}</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Collapsible, editable inventory tracker persisted per-device via window.storage.
function InventoryPanel({ inventory, setInventory, threshold, setThreshold }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const tracked = PRODUCTS.filter((p) => inventory[p.id] != null);
  const low = tracked.filter((p) => inventory[p.id] > 0 && inventory[p.id] <= threshold);
  const out = tracked.filter((p) => inventory[p.id] === 0);
  const setCount = (id, val) => {
    const n = Math.max(0, Math.floor(Number(val)));
    setInventory((prev) => ({ ...prev, [id]: Number.isFinite(n) ? n : 0 }));
  };
  const clear = (id) => setInventory((prev) => { const next = { ...prev }; delete next[id]; return next; });
  const shown = PRODUCTS.filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div style={{ border: "1px solid var(--line)", marginBottom: 18 }}>
      <button onClick={() => setOpen((o) => !o)} style={{ width: "100%", background: "none", border: "none", color: "var(--cream)", cursor: "pointer", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}><Beaker size={14} color="var(--gold-bright)" /><span className="lp-eyebrow">Inventory</span></span>
        <span style={{ fontSize: 12, color: "var(--muted)", display: "flex", alignItems: "center", gap: 10 }}>
          {out.length > 0 && <span style={{ color: "#e0a0a0" }}>{out.length} out</span>}
          {low.length > 0 && <span style={{ color: "var(--gold-bright)" }}>{low.length} low</span>}
          {tracked.length === 0 && <span>not set up</span>}
          <span style={{ display: "inline-block", transform: open ? "rotate(90deg)" : "none", transition: "transform 0.2s ease" }}><ChevronRight size={14} /></span>
        </span>
      </button>
      {open && (
        <div style={{ borderTop: "1px solid var(--line)", padding: "14px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
            <div style={{ position: "relative", flex: 1, minWidth: 160 }}>
              <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find product" style={{ width: "100%", padding: "9px 10px 9px 30px", background: "var(--panel)", border: "1px solid var(--line)", color: "var(--cream)", fontSize: 13, boxSizing: "border-box" }} />
            </div>
            <label style={{ fontSize: 11.5, color: "var(--muted)", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
              Low at ≤
              <input type="number" min="1" value={threshold} onChange={(e) => setThreshold(Math.max(1, Math.floor(Number(e.target.value) || 1)))} style={{ width: 52, padding: "6px 8px", background: "var(--panel)", border: "1px solid var(--line)", color: "var(--cream)", fontSize: 13, boxSizing: "border-box" }} />
            </label>
          </div>
          <p style={{ fontSize: 11.5, color: "var(--muted)", margin: "0 0 10px", lineHeight: 1.6 }}>
            Set a unit count per product to track stock on this device. Products left blank aren't tracked.
          </p>
          <div style={{ maxHeight: 300, overflowY: "auto" }}>
            {shown.map((p, i) => {
              const val = inventory[p.id];
              const isOut = val === 0;
              const isLow = val > 0 && val <= threshold;
              const color = isOut ? "#e0a0a0" : isLow ? "var(--gold-bright)" : "var(--cream)";
              return (
                <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "8px 0", borderTop: i === 0 ? "none" : "1px solid var(--line)" }}>
                  <span style={{ fontSize: 12.5, color, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    <button onClick={() => setCount(p.id, (val || 0) - 1)} style={{ width: 30, height: 30, background: "var(--panel)", border: "1px solid var(--line)", color: "var(--cream)", cursor: "pointer" }}>−</button>
                    <input type="number" min="0" value={val == null ? "" : val} placeholder="—" onChange={(e) => e.target.value === "" ? clear(p.id) : setCount(p.id, e.target.value)} style={{ width: 54, textAlign: "center", padding: "7px 4px", background: "var(--panel)", border: `1px solid ${isOut || isLow ? "var(--gold)" : "var(--line)"}`, color, fontSize: 13, boxSizing: "border-box" }} />
                    <button onClick={() => setCount(p.id, (val || 0) + 1)} style={{ width: 30, height: 30, background: "var(--panel)", border: "1px solid var(--line)", color: "var(--cream)", cursor: "pointer" }}>+</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function OwnerPortal({ setPage }) {
  const [pin, setPin] = useState("");
  const [authed, setAuthed] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sampleMode, setSampleMode] = useState(false);
  const [inventory, setInventory] = useState({});
  const [invThreshold, setInvThreshold] = useState(5);
  const [invLoaded, setInvLoaded] = useState(false);
  const [customAmb, setCustomAmb] = useState([]); // [{ code, creator, pct, pin }]
  const [ambLoaded, setAmbLoaded] = useState(false);
  const [newAmb, setNewAmb] = useState({ creator: "", code: "", pct: "10", pin: "" });
  const [ambError, setAmbError] = useState("");
  const [localOrders, setLocalOrders] = useState([]); // orders saved on this device (browser mode)
  const [inboxMsgs, setInboxMsgs] = useState([]);
  const [inboxApps, setInboxApps] = useState([]);
  const [localReqs, setLocalReqs] = useState([]);
  const loadLocalReqs = async () => { try { const r = await window.storage.get("payoutRequests", false); const list = r && r.value ? JSON.parse(r.value) : []; setLocalReqs(list.filter((x) => x.status === "pending")); } catch (_) { /* none */ } };
  useEffect(() => { if (!live) loadLocalReqs(); }, [authed]);
  const resolveRequest = async (id, action) => {
    if (live) {
      try { const res = await fetch(API_BASE + "/api/owner/payout-requests/resolve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin, id, action }) }); if (res.ok) refresh(); } catch (_) { /* ignore */ }
      return;
    }
    try {
      const r = await window.storage.get("payoutRequests", false);
      const list = r && r.value ? JSON.parse(r.value) : [];
      const updated = list.map((x) => (x.id === id ? { ...x, status: action } : x));
      await window.storage.set("payoutRequests", JSON.stringify(updated), false);
      setLocalReqs(updated.filter((x) => x.status === "pending"));
    } catch (_) { /* ignore */ }
  };
  const [orderQuery, setOrderQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all | awaiting | paid | shipped
  const [stats, setStats] = useState(null); // first-party analytics (live only)
  const [promos, setPromos] = useState([]);
  const [promoForm, setPromoForm] = useState({ code: "", kind: "pct", value: "", expiresAt: "", maxUses: "" });
  const [promoMsg, setPromoMsg] = useState("");
  const [pendingReviews, setPendingReviews] = useState([]);
  const [diag, setDiag] = useState(null);
  const [testEmailResult, setTestEmailResult] = useState("");
  const [clearMsg, setClearMsg] = useState("");
  const money = (c) => "$" + ((c || 0) / 100).toFixed(2);
  const live = BACKEND_LIVE;

  // Load inventory + threshold once (persisted per-device via window.storage).
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (window.storage) {
          const inv = await window.storage.get("owner:inventory");
          const thr = await window.storage.get("owner:invThreshold");
          if (alive && inv && inv.value) setInventory(JSON.parse(inv.value));
          if (alive && thr && thr.value) setInvThreshold(Math.max(1, parseInt(thr.value, 10) || 5));
        }
      } catch (_) { /* start empty */ }
      if (alive) setInvLoaded(true);
    })();
    return () => { alive = false; };
  }, []);

  // Persist inventory + threshold after the initial load.
  useEffect(() => {
    if (!invLoaded) return;
    try { window.storage && window.storage.set("owner:inventory", JSON.stringify(inventory)); } catch (_) { /* no-op */ }
  }, [inventory, invLoaded]);
  useEffect(() => {
    if (!invLoaded) return;
    try { window.storage && window.storage.set("owner:invThreshold", String(invThreshold)); } catch (_) { /* no-op */ }
  }, [invThreshold, invLoaded]);

  // Load owner-added ambassadors once, then persist + apply on every change so
  // checkout and the ambassador portal immediately recognize new codes.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (window.storage) {
          const r = await window.storage.get("owner:ambassadors");
          if (alive && r && r.value) {
            const arr = JSON.parse(r.value);
            if (Array.isArray(arr)) { setCustomAmb(arr); applyCustomAmbassadors(arr); }
          }
        }
      } catch (_) { /* start with built-ins */ }
      if (alive) setAmbLoaded(true);
    })();
    return () => { alive = false; };
  }, []);
  useEffect(() => {
    if (!ambLoaded) return;
    try { window.storage && window.storage.set("owner:ambassadors", JSON.stringify(customAmb)); } catch (_) { /* no-op */ }
    applyCustomAmbassadors(customAmb);
  }, [customAmb, ambLoaded]);

  const addAmbassador = async () => {
    const code = newAmb.code.trim().toUpperCase();
    const creator = newAmb.creator.trim();
    const pct = parseFloat(newAmb.pct);
    const portalPin = newAmb.pin.trim();
    if (!creator) { setAmbError("Enter the ambassador's name."); return; }
    if (!/^[A-Z0-9]{3,}$/.test(code)) { setAmbError("Code must be 3+ letters/numbers, no spaces."); return; }
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) { setAmbError("Commission must be between 0 and 100%."); return; }
    if (!/^[0-9]{4,}$/.test(portalPin)) { setAmbError("PIN must be at least 4 digits."); return; }
    if (live) {
      try {
        const res = await fetch(API_BASE + "/api/owner/ambassadors", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin, code, creator, pct: pct / 100, portalPin }),
        });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) { setAmbError(d.error || "Couldn't add ambassador."); return; }
        setNewAmb({ creator: "", code: "", pct: "10", pin: "" }); setAmbError(""); refresh();
      } catch (_) { setAmbError("Couldn't reach the server. Try again."); }
      return;
    }
    if (Object.keys(CREATOR_CODES).includes(code) || customAmb.some((a) => String(a.code).toUpperCase() === code)) { setAmbError("That code already exists."); return; }
    setCustomAmb((prev) => [...prev, { code, creator, pct: pct / 100, pin: portalPin }]);
    setNewAmb({ creator: "", code: "", pct: "10", pin: "" });
    setAmbError("");
  };
  const removeAmbassador = async (code) => {
    if (live) {
      try {
        const res = await fetch(API_BASE + "/api/owner/ambassadors/" + encodeURIComponent(code) + "?pin=" + encodeURIComponent(pin), { method: "DELETE" });
        if (res.ok) refresh();
      } catch (_) { /* no-op */ }
      return;
    }
    setCustomAmb((prev) => prev.filter((a) => String(a.code).toUpperCase() !== String(code).toUpperCase()));
  };

  // Browser mode: load orders saved on this device so they show in the portal.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (window.storage) {
          const r = await window.storage.get("orderHistory", false);
          if (alive && r && r.value) { const arr = JSON.parse(r.value); if (Array.isArray(arr)) setLocalOrders(arr); }
        }
      } catch (_) { /* none saved */ }
    })();
    return () => { alive = false; };
  }, [authed]);

  // Stay signed in: resume a saved owner session (up to 7 days) on load.
  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get("owner:auth", false);
        if (r && r.value) {
          const s = JSON.parse(r.value);
          if (s && s.pin && s.ts && (Date.now() - s.ts) < 7 * 24 * 60 * 60 * 1000) login(s.pin);
        }
      } catch (_) { /* no saved session */ }
    })();
  }, []);

  const persistOwner = async (p) => { try { await window.storage.set("owner:auth", JSON.stringify({ pin: p, ts: Date.now() }), false); } catch (_) { /* ignore */ } };

  const login = async (pinArg) => {
    const p = (typeof pinArg === "string" ? pinArg : pin).trim();
    if (!p) { setError("Enter your PIN."); return; }
    setError("");
    setLoading(true);
    try {
      if (live) {
        const res = await fetch(API_BASE + "/api/owner/overview?pin=" + encodeURIComponent(p));
        if (res.status === 401) { setError("Incorrect PIN."); setLoading(false); return; }
        if (!res.ok) { setError("Couldn't load the dashboard. Try again shortly."); setLoading(false); return; }
        setData(await res.json());
        setPin(p);
        setAuthed(true);
        persistOwner(p);
      } else {
        // Preview: gate on the same default PIN, show the live-ready layout with
        // the known codes and zeroed figures (no real customer data exists yet).
        if (p !== "luxurypeps2026$") { setError("Incorrect PIN."); setLoading(false); return; }
        setData({
          preview: true, preorder: true, commissionPct: 0.10,
          codes: Object.entries(CREATOR_CODES).map(([code, info]) => ({ code, creator: info.creator, pct: info.pct })),
          paidOrders: 0, paidSalesCents: 0, commissionOwedCents: 0,
          pendingOrders: 0, pendingSalesCents: 0, totalOrders: 0,
          byCreator: [], recent: [],
        });
        setPin(p);
        setAuthed(true);
        persistOwner(p);
      }
    } catch (_) {
      setError("Couldn't reach the server. Check your connection and try again.");
    }
    setLoading(false);
  };

  const signOut = () => { setAuthed(false); setPin(""); setData(null); setError(""); setSampleMode(false); try { window.storage.delete("owner:auth", false); } catch (_) { /* ignore */ } };

  // Archives abandoned checkouts (card form opened, never paid). Only ever
  // touches rows with no paid_at, so a real order can't be swept up.
  const clearIncomplete = async () => {
    if (!live) return;
    let n = 0;
    try {
      const c = await fetch(API_BASE + "/api/owner/incomplete-count?hours=24&pin=" + encodeURIComponent(pin));
      if (c.ok) n = (await c.json()).count || 0;
    } catch (_) { /* fall through to confirm anyway */ }
    if (n === 0) { setClearMsg("No incomplete checkouts older than 24 hours."); return; }
    if (!window.confirm(`Archive ${n} incomplete checkout${n === 1 ? "" : "s"} older than 24 hours?\n\nThese were never paid. Paid orders are never touched.`)) return;
    try {
      const r = await fetch(API_BASE + "/api/owner/clear-incomplete", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, hours: 24 }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setClearMsg(d.error || "Couldn't clear them."); return; }
      setClearMsg(`Archived ${d.archived} incomplete checkout${d.archived === 1 ? "" : "s"}.`);
      refresh();
    } catch (_) { setClearMsg("Couldn't reach the server."); }
  };

  const loadDiagnostics = async () => {
    if (!live) return;
    setDiag("loading");
    try {
      const r = await fetch(API_BASE + "/api/owner/diagnostics?pin=" + encodeURIComponent(pin));
      setDiag(r.ok ? await r.json() : null);
    } catch (_) { setDiag(null); }
  };
  const sendTestEmail = async () => {
    setTestEmailResult("Sending…");
    try {
      const r = await fetch(API_BASE + "/api/owner/test-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin }) });
      const d = await r.json().catch(() => ({}));
      setTestEmailResult(d.ok ? `Accepted by Resend for ${d.to} — check that inbox (and spam).` : `FAILED (${d.status || "?"}): ${d.error || "unknown error"}`);
    } catch (_) { setTestEmailResult("Couldn't reach the server."); }
  };
  const loadReviews = async (p) => {
    if (!live) return;
    try { const r = await fetch(API_BASE + "/api/owner/reviews?status=pending&pin=" + encodeURIComponent(p)); if (r.ok) { const d = await r.json(); setPendingReviews(d.reviews || []); } } catch (_) { /* ignore */ }
  };
  const moderateReview = async (id, action) => {
    try {
      await fetch(API_BASE + "/api/owner/reviews/moderate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin, id, action }) });
      loadReviews(pin);
    } catch (_) { /* ignore */ }
  };
  const loadPromos = async (p) => {
    if (!live) return;
    try { const r = await fetch(API_BASE + "/api/owner/promos?pin=" + encodeURIComponent(p)); if (r.ok) { const d = await r.json(); setPromos(d.promos || []); } } catch (_) { /* ignore */ }
  };
  const savePromo = async () => {
    setPromoMsg("");
    const value = promoForm.kind === "amount" ? Math.round(Number(promoForm.value) * 100) : Number(promoForm.value);
    try {
      const r = await fetch(API_BASE + "/api/owner/promos", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, code: promoForm.code, kind: promoForm.kind, value, expiresAt: promoForm.expiresAt || null, maxUses: promoForm.maxUses || null }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setPromoMsg(d.error || "Couldn't save that code."); return; }
      setPromoForm({ code: "", kind: "pct", value: "", expiresAt: "", maxUses: "" });
      setPromoMsg("Saved.");
      loadPromos(pin);
    } catch (_) { setPromoMsg("Couldn't reach the server."); }
  };
  const togglePromo = async (code) => {
    try { await fetch(API_BASE + "/api/owner/promos/toggle", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin, code }) }); loadPromos(pin); } catch (_) { /* ignore */ }
  };
  const deletePromo = async (code) => {
    if (!window.confirm(`Delete promo code ${code}? Orders that already used it are unaffected.`)) return;
    try { await fetch(API_BASE + "/api/owner/promos?pin=" + encodeURIComponent(pin) + "&code=" + encodeURIComponent(code), { method: "DELETE" }); loadPromos(pin); } catch (_) { /* ignore */ }
  };
  const loadStats = async (p) => {
    if (!live) return;
    try { const r = await fetch(API_BASE + "/api/owner/analytics?pin=" + encodeURIComponent(p)); if (r.ok) setStats(await r.json()); } catch (_) { /* ignore */ }
  };
  const loadInbox = async (p) => {
    if (!live) return;
    try { const r = await fetch(API_BASE + "/api/owner/messages?pin=" + encodeURIComponent(p)); if (r.ok) { const d = await r.json(); setInboxMsgs(d.messages || []); } } catch (_) { /* ignore */ }
    try { const r = await fetch(API_BASE + "/api/owner/applications?pin=" + encodeURIComponent(p)); if (r.ok) { const d = await r.json(); setInboxApps(d.applications || []); } } catch (_) { /* ignore */ }
  };
  const refresh = async () => {
    if (!live) return;
    try {
      const res = await fetch(API_BASE + "/api/owner/overview?pin=" + encodeURIComponent(pin));
      if (res.ok) setData(await res.json());
    } catch (_) { /* keep current */ }
    loadInbox(pin);
    loadStats(pin);
    loadPromos(pin);
    loadReviews(pin);
  };
  useEffect(() => { if (authed && live && pin) { loadInbox(pin); loadStats(pin); loadPromos(pin); loadReviews(pin); } }, [authed]);

  const markPaid = async (orderId) => {
    if (live) {
      try {
        const res = await fetch(API_BASE + "/api/owner/mark-paid", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin, orderId }),
        });
        if (res.ok) refresh();
      } catch (_) { /* no-op */ }
      return;
    }
    // Browser mode: mark the locally-saved order paid and persist it.
    try {
      const updated = localOrders.map((o) => (o.reference === orderId ? { ...o, status: "Paid" } : o));
      setLocalOrders(updated);
      await window.storage.set("orderHistory", JSON.stringify(updated), false);
    } catch (_) { /* ignore */ }
  };
  const markUnpaid = async (orderId) => {
    if (live) {
      try {
        const res = await fetch(API_BASE + "/api/owner/mark-unpaid", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin, orderId }),
        });
        if (res.ok) refresh();
      } catch (_) { /* no-op */ }
      return;
    }
    try {
      const updated = localOrders.map((o) => (o.reference === orderId ? { ...o, status: "Awaiting payment" } : o));
      setLocalOrders(updated);
      await window.storage.set("orderHistory", JSON.stringify(updated), false);
    } catch (_) { /* ignore */ }
  };
  const exportOrdersCsv = () => {
    if (live) { window.open(API_BASE + "/api/owner/orders.csv?pin=" + encodeURIComponent(pin), "_blank"); return; }
    // Browser mode: build the CSV from orders saved on this device.
    const escCsv = (v) => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
    const rows = [["Reference", "Date", "Status", "Method", "Code", "Total", "Customer", "Email", "Address", "City", "State", "Zip", "Country", "Items"]];
    for (const o of localOrders) {
      const c = o.customer || {};
      const items = (o.items || []).map((it) => it.name + " x" + it.qty).join("; ");
      rows.push([o.reference, String(o.placedAt || "").slice(0, 10), o.status || "", o.method || "", o.code || "", "$" + o.total, c.name || "", c.email || "", c.address || "", c.city || "", c.state || "", c.zip || "", c.country || "", items]);
    }
    const csv = rows.map((r) => r.map(escCsv).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "luxury-peps-orders.csv"; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  const markShipped = async (orderId) => {
    const tracking = window.prompt("Tracking number (optional — leave blank and press OK to skip). The customer gets a shipping email either way:", "");
    if (tracking === null) return; // cancelled
    if (live) {
      try {
        const res = await fetch(API_BASE + "/api/owner/mark-shipped", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin, orderId, tracking: tracking.trim() }),
        });
        if (res.ok) refresh();
      } catch (_) { /* no-op */ }
      return;
    }
    try {
      const updated = localOrders.map((o) => (o.reference === orderId ? { ...o, status: "Shipped", tracking: tracking.trim() } : o));
      setLocalOrders(updated);
      await window.storage.set("orderHistory", JSON.stringify(updated), false);
    } catch (_) { /* ignore */ }
  };
  const archiveOrder = async (orderId, archived) => {
    if (live) {
      try {
        const res = await fetch(API_BASE + "/api/owner/archive", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin, orderId, archived }),
        });
        if (res.ok) refresh();
      } catch (_) { /* no-op */ }
      return;
    }
    try {
      const updated = localOrders.map((o) => (o.reference === orderId ? { ...o, archived } : o));
      setLocalOrders(updated);
      await window.storage.set("orderHistory", JSON.stringify(updated), false);
    } catch (_) { /* ignore */ }
  };

  const recordPayout = async (code) => {
    if (!live) return;
    const input = window.prompt("Payout amount for " + code + " (in dollars):", "");
    if (input == null) return;
    const dollars = parseFloat(input);
    if (!Number.isFinite(dollars) || dollars <= 0) return;
    try {
      const res = await fetch(API_BASE + "/api/owner/payout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, code, amountCents: Math.round(dollars * 100), note: "Manual payout" }),
      });
      if (res.ok) refresh();
    } catch (_) { /* no-op */ }
  };

  if (!authed) {
    return (
      <div className="lp-fade" style={{ maxWidth: 400, margin: "0 auto", padding: "90px 28px 120px" }}>
        <div className="lp-eyebrow" style={{ marginBottom: 10 }}>Private</div>
        <h1 className="lp-serif" style={{ fontSize: 32, marginBottom: 12 }}>Owner Login</h1>
        <p style={{ color: "var(--muted)", fontSize: 13.5, lineHeight: 1.7, marginBottom: 26 }}>
          Enter your PIN to view sales, commission owed, inventory, and launch status.
        </p>
        <input
          type="password"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && login()}
          placeholder="PIN"
          style={{ width: "100%", padding: "12px 14px", background: "var(--panel)", border: "1px solid var(--line)", color: "var(--cream)", fontSize: 16, letterSpacing: "0.2em", marginBottom: 18, boxSizing: "border-box" }}
        />
        {error && <div style={{ color: "#e0a0a0", fontSize: 13, marginBottom: 16 }}>{error}</div>}
        <button className="lp-btn lp-btn-solid" onClick={login} disabled={loading} style={{ width: "100%" }}>
          {loading ? "Checking…" : "Sign In"}
        </button>
      </div>
    );
  }

  // ---- Derived view + metrics ----
  const view = (data && data.preview && sampleMode)
    ? buildSampleData()
    : ((data && data.preview && !sampleMode && localOrders.length) ? buildDataFromOrders(localOrders) : data);
  const series = (view && view.series) || [];
  const seriesUSD = series.map((d) => (d.sales_cents || 0) / 100);
  const seriesLabels = series.map((d) => String(d.day || "").slice(5));
  const last7 = series.slice(-7).reduce((a, b) => a + (b.sales_cents || 0), 0);
  const prev7 = series.slice(-14, -7).reduce((a, b) => a + (b.sales_cents || 0), 0);
  const trendPct = prev7 > 0 ? Math.round(((last7 - prev7) / prev7) * 100) : (last7 > 0 ? 100 : 0);
  const trendUp = last7 >= prev7;
  const aovCents = view.paidOrders > 0 ? Math.round(view.paidSalesCents / view.paidOrders) : 0;
  const priceByName = (name) => { const p = PRODUCTS.find((x) => x.name === name); return p ? p.basePrice : 0; };
  const topByRevenue = ((view.bestSellers) || [])
    .map((b) => ({ ...b, estCents: (b.qty || 0) * priceByName(b.name) * 100 }))
    .sort((a, b) => b.estCents - a.estCents)
    .slice(0, 5);
  const trackedLow = PRODUCTS.filter((p) => inventory[p.id] != null && inventory[p.id] > 0 && inventory[p.id] <= invThreshold);
  const trackedOut = PRODUCTS.filter((p) => inventory[p.id] === 0);
  const ambassadors = live
    ? ((view.codes) || []).map((c) => ({ code: c.code, creator: c.creator, pct: c.pct, builtin: !!c.builtin }))
    : [
        ...Object.entries(CREATOR_CODES).map(([code, info]) => ({ code, creator: info.creator, pct: info.pct, builtin: true })),
        ...customAmb.map((a) => ({ code: String(a.code).toUpperCase(), creator: a.creator, pct: a.pct, builtin: false })),
      ];

  const card = { border: "1px solid var(--line)", padding: "16px", background: "linear-gradient(160deg, rgba(255,255,255,0.02), transparent 70%)" };
  const cardGold = { border: "1px solid var(--gold)", padding: "16px", background: "linear-gradient(160deg, rgba(176,130,67,0.12), transparent 72%)" };
  const ambInput = { width: "100%", padding: "10px 12px", background: "var(--panel)", border: "1px solid var(--line)", color: "var(--cream)", fontSize: 13.5, boxSizing: "border-box" };

  return (
    <div className="lp-fade" style={{ maxWidth: 820, margin: "0 auto", padding: "56px 24px 120px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="lp-eyebrow" style={{ marginBottom: 8 }}>Owner Dashboard</div>
          <h1 className="lp-serif" style={{ fontSize: 30 }}>Luxury Peps</h1>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {live && <button className="lp-btn" onClick={refresh} style={{ fontSize: 12 }}>Refresh</button>}
          <button className="lp-btn" onClick={signOut} style={{ fontSize: 12 }}>Sign out</button>
        </div>
      </div>
      <p style={{ color: "var(--muted)", fontSize: 12.5, marginBottom: 20 }}>
        {view.preorder ? "Pre-order mode active" : "Live — shipping in stock"} · {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
      </p>

      {/* Browser-mode notice (hidden once the live backend is connected) */}
      {data.preview && (
        <div style={{ border: "1px solid var(--line)", padding: "10px 14px", marginBottom: 20, fontSize: 12, color: "var(--muted)", lineHeight: 1.55 }}>
          {localOrders.length
            ? `Showing ${localOrders.length} order${localOrders.length === 1 ? "" : "s"} saved on this device. Once your backend is connected, every customer's orders appear here automatically.`
            : "Not connected to the live backend yet — once it is, all customer orders show up here automatically."}
        </div>
      )}

      {/* Quick actions */}
      <div style={{ display: "flex", gap: 8, marginBottom: 22, flexWrap: "wrap" }}>
        <CopyChip text={"https://luxurypeps.com"} label="Copy store link" copiedLabel="Link copied" />
        <CopyChip text={SITE_CONFIG.supportEmail} label="Copy support email" copiedLabel="Copied" />
      </div>

      {/* KPI grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 22 }}>
        <div style={cardGold}>
          <div className="lp-eyebrow" style={{ marginBottom: 8 }}>Paid Sales</div>
          <div className="lp-serif" style={{ fontSize: 26, color: "var(--gold-bright)" }}>{money(view.paidSalesCents)}</div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{view.paidOrders} paid order{view.paidOrders === 1 ? "" : "s"}</div>
        </div>
        <div style={card}>
          <div className="lp-eyebrow" style={{ marginBottom: 8 }}>Avg Order Value</div>
          <div className="lp-serif" style={{ fontSize: 26 }}>{money(aovCents)}</div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>per paid order</div>
        </div>
        <div style={card}>
          <div className="lp-eyebrow" style={{ marginBottom: 8 }}>This Week</div>
          <div className="lp-serif" style={{ fontSize: 26 }}>{money(last7)}</div>
          <div style={{ fontSize: 11, marginTop: 4, color: trendUp ? "var(--gold-bright)" : "#e0a0a0" }}>
            {trendUp ? "▲" : "▼"} {Math.abs(trendPct)}% vs last week · paid only
          </div>
        </div>
        <div style={card}>
          <div className="lp-eyebrow" style={{ marginBottom: 8 }}>Commission Owed</div>
          <div className="lp-serif" style={{ fontSize: 26 }}>{money(view.commissionOwedCents)}</div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>to ambassadors</div>
        </div>
        <div style={card}>
          <div className="lp-eyebrow" style={{ marginBottom: 8 }}>Incomplete Checkouts</div>
          <div className="lp-serif" style={{ fontSize: 26 }}>{view.pendingOrders}</div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{money(view.pendingSalesCents)} never paid</div>
        </div>
        <div style={card}>
          <div className="lp-eyebrow" style={{ marginBottom: 8 }}>Total Orders <span style={{ textTransform: "none", letterSpacing: 0, opacity: 0.6 }}>(excl. archived)</span></div>
          <div className="lp-serif" style={{ fontSize: 26 }}>{view.totalOrders}</div>
        </div>
      </div>

      {/* Needs attention */}
      {(() => {
        const alerts = [];
        if (view.pendingOrders > 0) alerts.push(view.pendingOrders + " incomplete checkout" + (view.pendingOrders === 1 ? "" : "s") + " (card form opened, never paid) confirmation");
        const owed = (view.commissionOwedCents || 0) - Object.values(view.paidOutByCode || {}).reduce((a, b) => a + b, 0);
        if (owed > 0) alerts.push(money(owed) + " in commission owed to ambassadors");
        if (trackedOut.length > 0) alerts.push(trackedOut.length + " product" + (trackedOut.length === 1 ? "" : "s") + " out of stock");
        if (trackedLow.length > 0) alerts.push(trackedLow.length + " product" + (trackedLow.length === 1 ? "" : "s") + " low on stock");
        if (alerts.length === 0) return null;
        return (
          <div style={{ border: "1px solid var(--gold)", padding: "16px 20px", marginBottom: 22, background: "linear-gradient(135deg, rgba(176,130,67,0.10), transparent 70%)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}><AlertCircle size={14} color="var(--gold-bright)" /><div className="lp-eyebrow">Needs Attention</div></div>
            {alerts.map((a, i) => (<div key={i} style={{ fontSize: 12.5, color: "var(--cream)", padding: "5px 0", lineHeight: 1.5 }}>· {a}</div>))}
          </div>
        );
      })()}

      {/* Revenue chart */}
      <div style={{ border: "1px solid var(--line)", padding: "18px 20px", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}><TrendingUp size={14} color="var(--gold-bright)" /><div className="lp-eyebrow">Revenue — Last 14 Days</div></div>
          {seriesUSD.some((v) => v > 0) && <div style={{ fontSize: 11.5, color: trendUp ? "var(--gold-bright)" : "#e0a0a0" }}>{trendUp ? "▲" : "▼"} {Math.abs(trendPct)}% wk/wk</div>}
        </div>
        {seriesUSD.some((v) => v > 0)
          ? <SparkBars data={seriesUSD} labels={seriesLabels} format={(v) => "$" + v} accent="var(--gold)" />
          : <p style={{ color: "var(--muted)", fontSize: 13, margin: 0, lineHeight: 1.7 }}>No sales in this window yet. Daily revenue will chart here as paid orders come in.</p>}
      </div>

      {/* Top items by revenue */}
      <div style={{ border: "1px solid var(--line)", padding: "18px 20px", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 14 }}><DollarSign size={14} color="var(--gold-bright)" /><div className="lp-eyebrow">Top Products by Revenue</div></div>
        {topByRevenue.length === 0 || topByRevenue.every((b) => b.estCents === 0) ? (
          <p style={{ color: "var(--muted)", fontSize: 13, margin: 0, lineHeight: 1.7 }}>No sales yet — your top earners will rank here.</p>
        ) : (
          <div style={{ fontSize: 13 }}>
            {topByRevenue.map((b, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderTop: i === 0 ? "none" : "1px solid var(--line)" }}>
                <span style={{ color: "var(--cream)" }}>{i + 1}. {b.name}</span>
                <span style={{ color: "var(--gold-bright)" }}>~{money(b.estCents)} <span style={{ color: "var(--muted)", fontSize: 11 }}>· {b.qty} units</span></span>
              </div>
            ))}
            <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 10, lineHeight: 1.5 }}>Revenue estimated from list price × units sold.</div>
          </div>
        )}
      </div>

      {/* Inventory */}
      {/* Traffic — first-party analytics */}
      {stats && (stats.views > 0 || stats.productViews > 0) && (() => {
        const nameOf = (id) => { const p = PRODUCTS.find((x) => x.id === id); return p ? p.name : id; };
        const series = (stats.series || []).map((r) => r.views || 0);
        const labels = (stats.series || []).map((r) => String(r.day).slice(5));
        const conv = stats.checkouts > 0 ? Math.round((stats.orders / stats.checkouts) * 100) : null;
        return (
          <div style={{ border: "1px solid var(--line)", padding: "18px 20px", marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
              <TrendingUp size={14} color="var(--gold-bright)" />
              <div className="lp-eyebrow">Traffic · last 14 days</div>
            </div>
            <div style={{ display: "flex", gap: 18, fontSize: 11.5, color: "var(--muted)", marginBottom: 14, flexWrap: "wrap" }}>
              <span>Visits <b style={{ color: "var(--cream)" }}>{stats.views}</b></span>
              <span>Product views <b style={{ color: "var(--cream)" }}>{stats.productViews}</b></span>
              <span>Reached checkout <b style={{ color: "var(--cream)" }}>{stats.checkouts}</b></span>
              {conv !== null && <span>Completed <b style={{ color: "var(--gold-bright)" }}>{conv}%</b></span>}
            </div>
            {series.some((v) => v > 0) && <SparkBars data={series} labels={labels} format={(v) => String(v)} accent="var(--gold)" />}
            {(stats.topProducts || []).length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div className="lp-eyebrow" style={{ marginBottom: 8 }}>Most viewed</div>
                {stats.topProducts.map((r, i) => (
                  <div key={r.product_id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: i === 0 ? "none" : "1px solid var(--line)", fontSize: 13, gap: 10 }}>
                    <span style={{ color: "var(--cream)" }}>{i + 1}. {nameOf(r.product_id)}</span>
                    <span style={{ color: "var(--muted)" }}>{r.views} view{r.views === 1 ? "" : "s"}</span>
                  </div>
                ))}
              </div>
            )}
            {(stats.referrers || []).length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div className="lp-eyebrow" style={{ marginBottom: 8 }}>Where visitors came from</div>
                {stats.referrers.map((r, i) => (
                  <div key={r.referrer} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: i === 0 ? "none" : "1px solid var(--line)", fontSize: 13, gap: 10 }}>
                    <span style={{ color: "var(--cream)" }}>{r.referrer}</span>
                    <span style={{ color: "var(--muted)" }}>{r.hits}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* Diagnostics */}
      {live && (
        <div style={{ border: "1px solid var(--line)", padding: "18px 20px", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
            <AlertCircle size={14} color="var(--gold-bright)" />
            <div className="lp-eyebrow">Diagnostics</div>
          </div>
          <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>Check email delivery and Authorize.Net webhook health.</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            <button className="lp-btn" onClick={loadDiagnostics} style={{ fontSize: 11.5 }}>Run check</button>
            <button className="lp-btn lp-btn-solid" onClick={sendTestEmail} style={{ fontSize: 11.5 }}>Send test email</button>
          </div>
          {testEmailResult && <p style={{ fontSize: 12, color: testEmailResult.startsWith("FAILED") ? "#c98a6c" : "var(--gold-bright)", marginBottom: 12, lineHeight: 1.6 }}>{testEmailResult}</p>}

          {diag === "loading" && <p style={{ fontSize: 12.5, color: "var(--muted)" }}>Checking…</p>}
          {diag && diag !== "loading" && (
            <div style={{ fontSize: 12.5, lineHeight: 1.9 }}>
              <div className="lp-eyebrow" style={{ marginBottom: 6 }}>Backend</div>
              <div style={{ color: "var(--muted)", marginBottom: 12 }}>
                Version: <span style={{ color: diag.backendVersion ? "var(--cream)" : "#c98a6c" }}>{diag.backendVersion || "OLD — backend file not uploaded"}</span><br />
                {diag.orderCounts && (
                  <>Orders in database: <span style={{ color: "var(--cream)" }}>{diag.orderCounts.total}</span> total · <span style={{ color: "var(--cream)" }}>{diag.orderCounts.active}</span> active · <span style={{ color: "var(--cream)" }}>{diag.orderCounts.archived}</span> archived<br /></>
                )}
                {diag.awaiting && (
                  <>Awaiting payment: <span style={{ color: "var(--cream)" }}>{diag.awaiting.awaitingActive}</span> active · <span style={{ color: "var(--cream)" }}>{diag.awaiting.awaitingArchived}</span> archived<br /></>
                )}
                {(diag.archivedShapes || []).length > 0 && (
                  <>archived column: {diag.archivedShapes.map((r, i) => (
                    <span key={i} style={{ color: "var(--cream)" }}>{String(r.value)} ({r.type}) ×{r.n}{i < diag.archivedShapes.length - 1 ? ", " : ""}</span>
                  ))}</>
                )}
              </div>

              <div className="lp-eyebrow" style={{ marginBottom: 6 }}>Settings</div>
              <div style={{ color: "var(--muted)" }}>
                Owner email: <span style={{ color: "var(--cream)" }}>{diag.env.OWNER_EMAIL}</span>{" "}
                <span style={{ color: diag.env.OWNER_EMAIL_from_env ? "var(--gold-bright)" : "#c98a6c", fontSize: 11 }}>
                  {diag.env.OWNER_EMAIL_from_env ? "(from OWNER_EMAIL)" : "(fallback — OWNER_EMAIL not set in Cloudflare)"}
                </span><br />
                From address: <span style={{ color: "var(--cream)" }}>{diag.env.FROM_EMAIL}</span><br />
                Resend key: <span style={{ color: diag.env.RESEND_API_KEY ? "var(--cream)" : "#c98a6c" }}>{diag.env.RESEND_API_KEY ? "set" : "MISSING"}</span> · Signature key: <span style={{ color: diag.env.ANET_SIGNATURE_KEY ? "var(--cream)" : "#c98a6c" }}>{diag.env.ANET_SIGNATURE_KEY ? "set" : "MISSING"}</span>
              </div>

              <div className="lp-eyebrow" style={{ margin: "14px 0 6px" }}>Recent webhook deliveries</div>
              {(diag.webhooks || []).length === 0 ? <p style={{ color: "var(--muted)" }}>None received yet.</p> : diag.webhooks.map((w, i) => (
                <div key={i} style={{ color: "var(--muted)" }}>
                  <span style={{ color: w.signature_ok ? "var(--gold-bright)" : "#c98a6c" }}>{w.signature_ok ? "✓" : "✗"}</span>{" "}
                  {w.event_type || "(no type)"} {w.matched_order ? `· ${w.matched_order}` : ""} {w.note ? `· ${w.note}` : ""} <span style={{ fontSize: 11 }}>{String(w.created_at).slice(5, 16)}</span>
                </div>
              ))}

              <div className="lp-eyebrow" style={{ margin: "14px 0 6px" }}>Failed emails</div>
              {(diag.emailFailures || []).length === 0 ? <p style={{ color: "var(--muted)" }}>None. </p> : diag.emailFailures.map((e, i) => (
                <div key={i} style={{ color: "#c98a6c" }}>{e.recipient} · {e.status} · {e.error}</div>
              ))}

              {(diag.unpaidCardOrders || []).length > 0 && (
                <>
                  <div className="lp-eyebrow" style={{ margin: "14px 0 6px" }}>Card orders never confirmed paid</div>
                  {diag.unpaidCardOrders.map((o) => (
                    <div key={o.reference} style={{ color: "#c98a6c" }}>{o.reference} · {money(o.total_cents)} · {String(o.created_at).slice(0, 10)}</div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Reviews awaiting approval */}
      {live && pendingReviews.length > 0 && (
        <div style={{ border: "1px solid var(--gold)", padding: "18px 20px", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
            <Star size={14} color="var(--gold-bright)" />
            <div className="lp-eyebrow">Reviews awaiting approval ({pendingReviews.length})</div>
          </div>
          <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>
            Nothing publishes until you approve it. Reject anything describing human use.
          </p>
          {pendingReviews.map((r, i) => {
            const prod = PRODUCTS.find((x) => x.id === r.product_id);
            return (
              <div key={r.id} style={{ padding: "12px 0", borderTop: i === 0 ? "none" : "1px solid var(--line)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: "var(--cream)" }}>{prod ? prod.name : r.product_id} <span style={{ color: "var(--muted)", fontSize: 11 }}>· {r.order_ref}</span></span>
                  <StarRating value={r.rating} size={12} />
                </div>
                <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.65, marginBottom: 10 }}>{r.body}</p>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{r.display_name || "(no name)"} · {r.email}</span>
                  <span style={{ flex: 1 }} />
                  <button className="lp-btn lp-btn-solid" onClick={() => moderateReview(r.id, "approve")} style={{ fontSize: 11, padding: "5px 12px" }}>Approve</button>
                  <button className="lp-btn" onClick={() => moderateReview(r.id, "reject")} style={{ fontSize: 11, padding: "5px 12px" }}>Reject</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Promo codes */}
      {live && (
        <div style={{ border: "1px solid var(--line)", padding: "18px 20px", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
            <DollarSign size={14} color="var(--gold-bright)" />
            <div className="lp-eyebrow">Promo codes</div>
          </div>
          <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>Store-run discounts. Separate from ambassador codes — these pay no commission.</p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8, marginBottom: 10 }}>
            <input type="text" placeholder="CODE" value={promoForm.code} onChange={(e) => setPromoForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} style={{ fontSize: 12.5 }} />
            <select value={promoForm.kind} onChange={(e) => setPromoForm((f) => ({ ...f, kind: e.target.value }))} style={{ background: "var(--panel)", border: "1px solid var(--line)", color: "var(--cream)", padding: "8px", fontSize: 12.5 }}>
              <option value="pct">% off</option>
              <option value="amount">$ off</option>
              <option value="freeship">Free shipping</option>
            </select>
            {promoForm.kind !== "freeship" && (
              <input type="number" placeholder={promoForm.kind === "pct" ? "10 (%)" : "5.00 ($)"} value={promoForm.value} onChange={(e) => setPromoForm((f) => ({ ...f, value: e.target.value }))} style={{ fontSize: 12.5 }} />
            )}
            <input type="date" title="Expires (optional)" value={promoForm.expiresAt} onChange={(e) => setPromoForm((f) => ({ ...f, expiresAt: e.target.value }))} style={{ fontSize: 12.5 }} />
            <input type="number" placeholder="Max uses" value={promoForm.maxUses} onChange={(e) => setPromoForm((f) => ({ ...f, maxUses: e.target.value }))} style={{ fontSize: 12.5 }} />
            <button className="lp-btn lp-btn-solid" onClick={savePromo} style={{ fontSize: 12 }}>Save code</button>
          </div>
          {promoMsg && <p style={{ fontSize: 11.5, color: promoMsg === "Saved." ? "var(--gold-bright)" : "#c98a6c", marginBottom: 10 }}>{promoMsg}</p>}

          {promos.length === 0 ? (
            <p style={{ fontSize: 12.5, color: "var(--muted)" }}>No promo codes yet.</p>
          ) : promos.map((pr, i) => {
            const label = pr.kind === "pct" ? `${pr.value}% off` : pr.kind === "amount" ? `$${(pr.value / 100).toFixed(2)} off` : "Free shipping";
            const used = pr.max_uses ? `${pr.uses}/${pr.max_uses} used` : `${pr.uses} used`;
            return (
              <div key={pr.code} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "8px 0", borderTop: i === 0 ? "none" : "1px solid var(--line)", fontSize: 13 }}>
                <span style={{ color: pr.active ? "var(--cream)" : "var(--muted)" }}>
                  {pr.code} <span style={{ color: "var(--muted)", fontSize: 11.5 }}>· {label} · {used}{pr.expires_at ? ` · ends ${pr.expires_at}` : ""}{pr.active ? "" : " · paused"}</span>
                </span>
                <span style={{ display: "flex", gap: 8 }}>
                  <button className="lp-btn" onClick={() => togglePromo(pr.code)} style={{ fontSize: 11, padding: "5px 10px" }}>{pr.active ? "Pause" : "Resume"}</button>
                  <button className="lp-btn" onClick={() => deletePromo(pr.code)} style={{ fontSize: 11, padding: "5px 10px" }}>Delete</button>
                </span>
              </div>
            );
          })}
        </div>
      )}

      <InventoryPanel inventory={inventory} setInventory={setInventory} threshold={invThreshold} setThreshold={setInvThreshold} />

      {/* Ambassadors */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, gap: 10, flexWrap: "wrap" }}>
        <div className="lp-eyebrow">Ambassadors</div>
        <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{ambassadors.length} active</div>
      </div>
      <div style={{ border: "1px solid var(--line)", padding: "18px 20px", marginBottom: 14, fontSize: 13 }}>
        {ambassadors.map((c, idx) => {
          const row = (view.byCreator || []).find((b) => (b.creator_code || "").toUpperCase() === c.code);
          return (
            <div key={c.code} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderTop: idx === 0 ? "none" : "1px solid var(--line)", gap: 12, flexWrap: "wrap" }}>
              <div style={{ minWidth: 150 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ color: "var(--cream)" }}>{c.creator}</span>
                  <span style={{ color: "var(--gold-bright)", letterSpacing: "0.06em", fontSize: 12 }}>{c.code}</span>
                  <span style={{ fontSize: 10.5, color: "var(--muted)" }}>{Math.round(c.pct * 100)}%</span>
                  {!c.builtin && <span style={{ fontSize: 9.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--gold-bright)", border: "1px solid var(--line)", padding: "1px 6px" }}>Added</span>}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 3 }}>
                  {row ? <>{row.orders} paid · {money(row.sales_cents)} · owe <span style={{ color: "var(--gold-bright)" }}>{money((row.commission_cents || 0) - ((view.paidOutByCode || {})[c.code] || 0))}</span></> : "no paid orders yet"}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <CopyChip text={c.code} label="Code" copiedLabel="Copied" />
                <CopyChip text={"https://luxurypeps.com/?ref=" + c.code} label="Link" copiedLabel="Copied" />
                {live && <button className="lp-btn" onClick={() => recordPayout(c.code)} style={{ fontSize: 11, padding: "6px 10px" }}>Pay</button>}
                {!c.builtin && <button className="lp-btn" onClick={() => removeAmbassador(c.code)} aria-label={"Remove " + c.code} style={{ fontSize: 11, padding: "6px 9px", borderColor: "#7a4a4a", color: "#e0a0a0" }}><X size={12} /></button>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add ambassador */}
      <div style={{ border: "1px solid var(--line)", padding: "18px 20px", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 14 }}><Plus size={14} color="var(--gold-bright)" /><div className="lp-eyebrow">Add Ambassador</div></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: 12 }}>
          <input value={newAmb.creator} onChange={(e) => setNewAmb((n) => ({ ...n, creator: e.target.value }))} placeholder="Name" style={ambInput} />
          <input value={newAmb.code} onChange={(e) => setNewAmb((n) => ({ ...n, code: e.target.value.toUpperCase() }))} placeholder="CODE" style={{ ...ambInput, letterSpacing: "0.08em" }} />
          <div style={{ position: "relative" }}>
            <input value={newAmb.pct} onChange={(e) => setNewAmb((n) => ({ ...n, pct: e.target.value }))} placeholder="10" inputMode="decimal" style={{ ...ambInput, paddingRight: 26 }} />
            <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", fontSize: 13 }}>%</span>
          </div>
          <input value={newAmb.pin} onChange={(e) => setNewAmb((n) => ({ ...n, pin: e.target.value.replace(/[^0-9]/g, "") }))} placeholder="PIN (4+ digits)" inputMode="numeric" style={ambInput} />
        </div>
        {ambError && <div style={{ color: "#e0a0a0", fontSize: 12, marginBottom: 10 }}>{ambError}</div>}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <button className="lp-btn lp-btn-solid" onClick={addAmbassador} style={{ fontSize: 12 }}>Add ambassador</button>
          <span style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.5 }}>They get {newAmb.pct || "10"}% off to share; you owe {newAmb.pct || "10"}% commission per order.</span>
        </div>
      </div>

      {/* Recent orders */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <div className="lp-eyebrow">Recent Orders</div>
        {live && <button className="lp-btn" onClick={refresh} style={{ fontSize: 10.5, padding: "5px 12px" }}>Refresh</button>}
      </div>
      <div style={{ border: "1px solid var(--line)", padding: "14px 20px 8px", marginBottom: 18 }}>
        {(() => {
          const all = view.recent || [];
          const q = orderQuery.trim().toLowerCase();
          const filtered = all.filter((o) => {
            const isArchived = !!o.archived;
            if (statusFilter === "archived") { if (!isArchived) return false; }
            else if (isArchived) return false;
            const isShipped = /shipped/i.test(o.status || "");
            const isPaid = /(paid|shipped)/i.test(o.status || "") && !/await/i.test(o.status || "");
            if (statusFilter === "awaiting" && isPaid) return false;
            if (statusFilter === "paid" && (!isPaid || isShipped)) return false;
            if (statusFilter === "shipped" && !isShipped) return false;
            if (!q) return true;
            const c = o.customer || {};
            return [o.id, o.creator_code, c.name, c.email].some((v) => String(v || "").toLowerCase().includes(q));
          });
          return (
            <>
              <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
                <input
                  value={orderQuery}
                  onChange={(e) => setOrderQuery(e.target.value)}
                  placeholder="Search order #, name, email, code…"
                  style={{ flex: "1 1 200px", minWidth: 160, background: "transparent", border: "1px solid var(--line)", color: "var(--cream)", padding: "8px 11px", fontSize: 12.5, outline: "none" }}
                />
                <div style={{ display: "flex", border: "1px solid var(--line)" }}>
                  {[["all", "All"], ["awaiting", "Awaiting"], ["paid", "Paid"], ["shipped", "Shipped"], ["archived", "Archived"]].map(([key, label]) => (
                    <button key={key} onClick={() => setStatusFilter(key)} style={{ fontSize: 10.5, padding: "6px 11px", cursor: "pointer", border: "none", background: statusFilter === key ? "var(--gold)" : "transparent", color: statusFilter === key ? "var(--bg)" : "var(--muted)" }}>{label}</button>
                  ))}
                </div>
                {live && <button className="lp-btn" onClick={clearIncomplete} style={{ fontSize: 10.5, padding: "7px 12px" }} title="Archive card forms that were opened but never paid (older than 24h)">Clear incomplete</button>}
                <button className="lp-btn" onClick={exportOrdersCsv} style={{ fontSize: 10.5, padding: "7px 12px" }}>Export CSV</button>
              </div>
              {all.length > 0 && (() => {
                const active = all.filter((o) => !o.archived);
                const isPaid = (o) => /(paid|shipped)/i.test(o.status || "") && !/await/i.test(o.status || "");
                const isShip = (o) => /shipped/i.test(o.status || "");
                const awaiting = active.filter((o) => !isPaid(o)).length;
                const paidN = active.filter((o) => isPaid(o) && !isShip(o)).length;
                const shipN = active.filter((o) => isShip(o)).length;
                return (
                  <div style={{ display: "flex", gap: 16, fontSize: 11.5, color: "var(--muted)", marginBottom: 12, flexWrap: "wrap" }}>
                    <span><b style={{ color: "var(--gold-bright)" }}>{awaiting}</b> awaiting payment</span>
                    <span><b style={{ color: "#8fca8f" }}>{paidN}</b> paid · to ship</span>
                    <span><b style={{ color: "#9ec3ee" }}>{shipN}</b> shipped</span>
                  </div>
                );
              })()}
              {clearMsg && <p style={{ fontSize: 11.5, color: "var(--gold-bright)", margin: "0 0 10px" }}>{clearMsg}</p>}
              {all.length === 0 ? (
                <p style={{ color: "var(--muted)", fontSize: 13, margin: "4px 0 12px", lineHeight: 1.7 }}>No orders yet.</p>
              ) : filtered.length === 0 ? (
                <p style={{ color: "var(--muted)", fontSize: 13, margin: "4px 0 12px", lineHeight: 1.7 }}>No orders match — clear the search or filter.</p>
              ) : (
                <div style={{ fontSize: 12.5 }}>
                  {filtered.map((o, i) => (
                    <OrderRow key={o.id} o={o} first={i === 0} onMarkPaid={markPaid} onMarkUnpaid={markUnpaid} onMarkShipped={markShipped} onArchive={archiveOrder} canMarkPaid={!sampleMode} />
                  ))}
                  {(q || statusFilter !== "all") && <div style={{ fontSize: 11, color: "var(--muted)", padding: "8px 0 6px" }}>{filtered.length} of {all.length} orders</div>}
                </div>
              )}
            </>
          );
        })()}
      </div>

      {/* Payout requests from ambassadors */}
      {(() => {
        const reqs = live ? ((view && view.payoutRequests) || []) : localReqs;
        if (reqs.length === 0) return null;
        return (
          <>
            <div className="lp-eyebrow" style={{ marginBottom: 14 }}>Payout Requests <span style={{ color: "var(--gold-bright)" }}>({reqs.length})</span></div>
            <div style={{ border: "1px solid var(--gold)", padding: "8px 20px", marginBottom: 18, background: "linear-gradient(135deg, rgba(176,130,67,0.06), transparent 70%)" }}>
              {reqs.map((r, i) => {
                const amt = r.amount_cents != null ? r.amount_cents : r.amountCents;
                return (
                  <div key={r.id || i} style={{ padding: "13px 0", borderTop: i === 0 ? "none" : "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
                    <div style={{ minWidth: 180 }}>
                      <div style={{ color: "var(--cream)", fontSize: 13.5 }}>{r.creator || r.code} <span style={{ color: "var(--gold-bright)", fontSize: 11.5, marginLeft: 6 }}>{r.code}</span></div>
                      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4, lineHeight: 1.5 }}>Pay via <span style={{ color: "var(--cream)" }}>{r.method}</span> → <span style={{ color: "var(--cream)" }}>{r.details}</span></div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ color: "var(--gold-bright)", fontSize: 17, fontWeight: 600 }}>{money(amt)}</div>
                      <div style={{ display: "flex", gap: 8, marginTop: 7, justifyContent: "flex-end" }}>
                        <button className="lp-btn lp-btn-solid" onClick={() => resolveRequest(r.id, "paid")} style={{ fontSize: 11, padding: "6px 14px" }}>Mark Paid</button>
                        <button className="lp-btn" onClick={() => resolveRequest(r.id, "declined")} style={{ fontSize: 11, padding: "6px 12px" }}>Decline</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        );
      })()}

      {/* Inbox — contact messages + ambassador applications */}
      <div className="lp-eyebrow" style={{ marginBottom: 14 }}>Inbox</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14, marginBottom: 18 }}>
        <div style={{ border: "1px solid var(--line)", padding: "16px 18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
            <span style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)" }}>Contact Messages</span>
            <span style={{ fontSize: 11, color: "var(--gold-bright)" }}>{live ? inboxMsgs.length : "—"}</span>
          </div>
          {!live ? (
            <p style={{ color: "var(--muted)", fontSize: 12.5, margin: 0, lineHeight: 1.6 }}>Appears once the backend is connected.</p>
          ) : inboxMsgs.length === 0 ? (
            <p style={{ color: "var(--muted)", fontSize: 12.5, margin: 0 }}>No messages yet.</p>
          ) : inboxMsgs.slice(0, 8).map((m, i) => (
            <div key={i} style={{ borderTop: i === 0 ? "none" : "1px solid var(--line)", padding: "9px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12 }}>
                <span style={{ color: "var(--cream)" }}>{m.name || "—"} <span style={{ color: "var(--muted)" }}>· {m.email}</span></span>
                <span style={{ color: "var(--muted)", flexShrink: 0 }}>{String(m.created_at || "").slice(0, 10)}</span>
              </div>
              {m.subject && <div style={{ fontSize: 11.5, color: "var(--gold-bright)", marginTop: 2 }}>{m.subject}</div>}
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3, lineHeight: 1.55 }}>{String(m.message || "").slice(0, 220)}{String(m.message || "").length > 220 ? "…" : ""}</div>
            </div>
          ))}
        </div>
        <div style={{ border: "1px solid var(--line)", padding: "16px 18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
            <span style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)" }}>Ambassador Applications</span>
            <span style={{ fontSize: 11, color: "var(--gold-bright)" }}>{live ? inboxApps.length : "—"}</span>
          </div>
          {!live ? (
            <p style={{ color: "var(--muted)", fontSize: 12.5, margin: 0, lineHeight: 1.6 }}>Appears once the backend is connected.</p>
          ) : inboxApps.length === 0 ? (
            <p style={{ color: "var(--muted)", fontSize: 12.5, margin: 0 }}>No applications yet.</p>
          ) : inboxApps.slice(0, 8).map((a, i) => (
            <div key={i} style={{ borderTop: i === 0 ? "none" : "1px solid var(--line)", padding: "9px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12 }}>
                <span style={{ color: "var(--cream)" }}>{a.name || "—"} <span style={{ color: "var(--muted)" }}>· {a.email}</span></span>
                <span style={{ color: "var(--muted)", flexShrink: 0 }}>{String(a.created_at || "").slice(0, 10)}</span>
              </div>
              <div style={{ fontSize: 11.5, color: "var(--gold-bright)", marginTop: 2 }}>{[a.platform, a.handle, a.followers ? a.followers + " followers" : null].filter(Boolean).join(" · ")}</div>
              {a.why && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3, lineHeight: 1.55 }}>{String(a.why).slice(0, 180)}{String(a.why).length > 180 ? "…" : ""}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AmbassadorPortal({ setPage }) {
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState("");
  const money = (c) => "$" + ((c || 0) / 100).toFixed(2);
  const live = BACKEND_LIVE;

  // Payout requests
  const [reqMethod, setReqMethod] = useState("Cash App");
  const [reqDetails, setReqDetails] = useState("");
  const [reqAmount, setReqAmount] = useState("");
  const [reqStatus, setReqStatus] = useState(""); // "" | sending | sent | error
  const [myRequests, setMyRequests] = useState([]);
  useEffect(() => { if (data && Array.isArray(data.requests)) setMyRequests(data.requests); }, [data]);

  const loadLocalRequests = async (c) => {
    try { const r = await window.storage.get("payoutRequests", false); const list = r && r.value ? JSON.parse(r.value) : []; setMyRequests(list.filter((x) => String(x.code || "").toUpperCase() === c).map((x) => ({ id: x.id, amount_cents: x.amountCents, method: x.method, status: x.status, created_at: x.createdAt }))); } catch (_) { /* none */ }
  };
  const submitPayoutRequest = async () => {
    const amountCents = reqAmount ? Math.round(parseFloat(reqAmount) * 100) : (data ? data.paid.commissionCents : 0);
    if (!Number.isFinite(amountCents) || amountCents <= 0) { setReqStatus("error"); setError("Enter a valid amount."); return; }
    if (!reqDetails.trim()) { setReqStatus("error"); setError("Add where to send it (your Cash App tag, email, etc.)."); return; }
    setError(""); setReqStatus("sending");
    const c = String(code).trim().toUpperCase();
    if (live) {
      try {
        const res = await fetch(API_BASE + "/api/creator/" + encodeURIComponent(c) + "/request-payout", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin, amountCents, method: reqMethod, details: reqDetails }),
        });
        if (res.ok) { setReqStatus("sent"); setReqDetails(""); setReqAmount(""); }
        else { setReqStatus("error"); setError("Couldn't send the request. Try again shortly."); }
      } catch (_) { setReqStatus("error"); setError("Couldn't reach the server."); }
    } else {
      try {
        const r = await window.storage.get("payoutRequests", false);
        const list = r && r.value ? JSON.parse(r.value) : [];
        list.push({ id: "PR-" + Date.now().toString(36).toUpperCase(), code: c, creator: data ? data.creator : c, amountCents, method: reqMethod, details: reqDetails, status: "pending", createdAt: new Date().toISOString() });
        await window.storage.set("payoutRequests", JSON.stringify(list), false);
        setReqStatus("sent"); setReqDetails(""); setReqAmount(""); loadLocalRequests(c);
      } catch (_) { setReqStatus("error"); }
    }
  };

  const persistCreator = async (c, pn) => { try { await window.storage.set("creator:auth", JSON.stringify({ code: c, pin: pn, ts: Date.now() }), false); } catch (_) { /* ignore */ } };

  const lookup = async (codeArg, pinArg) => {
    const c = (typeof codeArg === "string" ? codeArg : code).trim().toUpperCase();
    const pn = (typeof pinArg === "string" ? pinArg : pin).trim();
    if (!c) { setError("Enter your ambassador code."); return; }
    if (!pn) { setError("Enter your PIN."); return; }
    setError("");
    setLoading(true);
    try {
      if (live) {
        const url = API_BASE + "/api/creator/" + encodeURIComponent(c) + "/stats?pin=" + encodeURIComponent(pn);
        const res = await fetch(url);
        if (res.status === 404) { setError("That code isn't recognized."); setLoading(false); return; }
        if (res.status === 401) { setError("PIN required or incorrect."); setLoading(false); return; }
        if (!res.ok) { setError("Couldn't load your dashboard. Try again shortly."); setLoading(false); return; }
        setData(await res.json());
        setCode(c); setPin(pn); persistCreator(c, pn);
      } else {
        // Preview mode: validate the code and its required PIN, then show the
        // live-ready dashboard in its starting (no-orders-yet) state.
        const info = allCreatorCodes()[c];
        if (!info) { setError("That code isn't recognized."); setLoading(false); return; }
        if (pn !== allCreatorPins()[c]) { setError("PIN required or incorrect."); setLoading(false); return; }
        let orders = [];
        try { const r = await window.storage.get("orderHistory", false); if (r && r.value) { const arr = JSON.parse(r.value); if (Array.isArray(arr)) orders = arr; } } catch (_) { /* none */ }
        setData(buildCreatorFromOrders(orders, c, info));
        loadLocalRequests(c);
        setCode(c); setPin(pn); persistCreator(c, pn);
      }
    } catch (_) {
      setError("Couldn't reach the server. Check your connection and try again.");
    }
    setLoading(false);
  };

  // Stay signed in: resume a saved ambassador session (up to 7 days) on load.
  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get("creator:auth", false);
        if (r && r.value) {
          const s = JSON.parse(r.value);
          if (s && s.code && s.pin && s.ts && (Date.now() - s.ts) < 7 * 24 * 60 * 60 * 1000) lookup(s.code, s.pin);
        }
      } catch (_) { /* no saved session */ }
    })();
  }, []);

  const signOut = () => { setData(null); setCode(""); setPin(""); setError(""); try { window.storage.delete("creator:auth", false); } catch (_) { /* ignore */ } };

  if (!data) {
    return (
      <div className="lp-fade" style={{ maxWidth: 460, margin: "0 auto", padding: "80px 28px 120px" }}>
        <div className="lp-eyebrow" style={{ marginBottom: 10 }}>Ambassadors</div>
        <h1 className="lp-serif" style={{ fontSize: 34, marginBottom: 12 }}>Ambassador Portal</h1>
        <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.7, marginBottom: 28 }}>
          Enter your ambassador code and PIN to see your orders, sales, and commission.
        </p>
        <label className="lp-eyebrow" style={{ display: "block", marginBottom: 8 }}>Ambassador Code</label>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && lookup()}
          placeholder="Your ambassador code"
          style={{ width: "100%", padding: "12px 14px", background: "var(--panel)", border: "1px solid var(--line)", color: "var(--cream)", fontSize: 15, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 16, boxSizing: "border-box" }}
        />
        <label className="lp-eyebrow" style={{ display: "block", marginBottom: 8 }}>PIN</label>
        <input
          type="password"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && lookup()}
          placeholder="Enter your PIN"
          style={{ width: "100%", padding: "12px 14px", background: "var(--panel)", border: "1px solid var(--line)", color: "var(--cream)", fontSize: 15, letterSpacing: "0.2em", marginBottom: 20, boxSizing: "border-box" }}
        />
        {error && <div style={{ color: "#e0a0a0", fontSize: 13, marginBottom: 16 }}>{error}</div>}
        <button className="lp-btn lp-btn-solid" onClick={lookup} disabled={loading} style={{ width: "100%" }}>
          {loading ? "Loading…" : "View My Commission"}
        </button>
        <p style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 20, lineHeight: 1.7 }}>
          Not an ambassador yet? <button onClick={() => setPage("ambassador")} style={{ background: "none", border: "none", color: "var(--gold-bright)", cursor: "pointer", padding: 0, textDecoration: "underline", fontSize: 11.5 }}>Apply here.</button>
        </p>
      </div>
    );
  }

  const paidCommission = data.paid.commissionCents;
  const pendingCommission = data.pending.commissionCents;
  const balance = data.balanceCents != null ? data.balanceCents : paidCommission - (data.paidOutCents || 0);
  const shareUrl = "https://luxurypeps.com/?ref=" + data.code;
  const shareMsg = "Use my code " + data.code + " for " + Math.round(data.discountPct * 100) + "% off research-grade peptides at Luxury Peps: " + shareUrl;
  const series = data.series || [];
  const chartData = series.map((d) => (d.commission_cents || 0) / 100);
  const chartLabels = series.map((d) => String(d.day || "").slice(5));

  return (
    <div className="lp-fade" style={{ maxWidth: 760, margin: "0 auto", padding: "60px 28px 120px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="lp-eyebrow" style={{ marginBottom: 8 }}>Ambassador Portal</div>
          <h1 className="lp-serif" style={{ fontSize: 32 }}>Welcome, {data.creator}</h1>
        </div>
        <button className="lp-btn" onClick={signOut} style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}><LogOut size={13} /> Sign out</button>
      </div>

      {data.preview && (
        <div style={{ border: "1px solid var(--line)", padding: "10px 14px", fontSize: 12, color: "var(--muted)", marginBottom: 22, lineHeight: 1.55 }}>
          Your live dashboard. Orders and commission from your code appear here automatically once the store's backend is connected.
        </div>
      )}

      {/* Hero: your code + share tools */}
      <div style={{ border: "1px solid var(--gold)", borderRadius: 2, padding: "22px 22px", marginBottom: 22, background: "linear-gradient(135deg, rgba(176,130,67,0.12), transparent 70%)" }}>
        <div className="lp-eyebrow" style={{ marginBottom: 8 }}>Your Code</div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div className="lp-serif" style={{ fontSize: 40, color: "var(--gold-bright)", letterSpacing: "0.06em" }}>{data.code}</div>
          <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5 }}>
            {Math.round(data.discountPct * 100)}% off for your audience<br />{Math.round(data.commissionPct * 100)}% commission to you
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
          <button className="lp-btn lp-btn-solid" onClick={() => { if (copyText(data.code)) { setCopied("code"); setTimeout(() => setCopied(""), 1500); } }} style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
            {copied === "code" ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy code</>}
          </button>
          <button className="lp-btn" onClick={() => { if (copyText(shareUrl)) { setCopied("link"); setTimeout(() => setCopied(""), 1500); } }} style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
            {copied === "link" ? <><Check size={13} /> Copied</> : <><Share2 size={13} /> Copy link</>}
          </button>
          <button className="lp-btn" onClick={() => { if (copyText(shareMsg)) { setCopied("msg"); setTimeout(() => setCopied(""), 1500); } }} style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
            {copied === "msg" ? <><Check size={13} /> Copied</> : <>Copy promo text</>}
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 14 }}>
        <div style={{ border: "1px solid var(--line)", padding: "18px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}><DollarSign size={14} color="var(--gold-bright)" /><div className="lp-eyebrow">Earned</div></div>
          <div className="lp-serif" style={{ fontSize: 27, color: "var(--gold-bright)" }}>{money(paidCommission)}</div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{data.paid.orders} paid order{data.paid.orders === 1 ? "" : "s"}</div>
        </div>
        <div style={{ border: "1px solid var(--line)", padding: "18px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}><Wallet size={14} color="var(--muted)" /><div className="lp-eyebrow">Balance Owed</div></div>
          <div className="lp-serif" style={{ fontSize: 27 }}>{money(balance)}</div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{money(data.paidOutCents || 0)} paid out</div>
        </div>
        <div style={{ border: "1px solid var(--line)", padding: "18px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}><Loader2 size={14} color="var(--muted)" /><div className="lp-eyebrow">Pending</div></div>
          <div className="lp-serif" style={{ fontSize: 27 }}>{money(pendingCommission)}</div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{data.pending.orders} unpaid order{data.pending.orders === 1 ? "" : "s"}</div>
        </div>
      </div>

      {/* Earnings chart */}
      <div style={{ border: "1px solid var(--line)", padding: "18px 20px", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 14 }}><TrendingUp size={14} color="var(--gold-bright)" /><div className="lp-eyebrow">Commission — Last 14 Days</div></div>
        {chartData.some((v) => v > 0)
          ? <SparkBars data={chartData} labels={chartLabels} />
          : <p style={{ color: "var(--muted)", fontSize: 13, margin: 0, lineHeight: 1.7 }}>No earnings in this window yet. Your daily commission will chart here as orders come in.</p>}
      </div>

      {/* Request payout */}
      <div style={{ border: "1px solid var(--gold)", padding: "20px 22px", marginBottom: 14, background: "linear-gradient(135deg, rgba(176,130,67,0.08), transparent 70%)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}><DollarSign size={14} color="var(--gold-bright)" /><div className="lp-eyebrow">Request a Payout</div></div>
        <p style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6, marginBottom: 16 }}>
          You've earned <b style={{ color: "var(--gold-bright)" }}>{money(paidCommission)}</b> in commission. Request a payout and it goes straight to the owner.
        </p>
        {reqStatus === "sent" ? (
          <div style={{ border: "1px solid var(--gold)", padding: "12px 14px", fontSize: 13, color: "var(--gold-bright)", display: "flex", alignItems: "center", gap: 8 }}>
            <Check size={15} /> Request sent! The owner will review and send your payout.
            <button className="lp-btn" onClick={() => setReqStatus("")} style={{ fontSize: 11, marginLeft: "auto", padding: "5px 10px" }}>Request another</button>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 5 }}>Amount ($)</label>
                <input type="number" inputMode="decimal" value={reqAmount} onChange={(e) => setReqAmount(e.target.value)} placeholder={(paidCommission / 100).toFixed(2)} style={{ width: "100%", background: "var(--panel)", border: "1px solid var(--line)", color: "var(--cream)", fontSize: 13, padding: "10px 12px", outline: "none" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 5 }}>Pay me via</label>
                <select value={reqMethod} onChange={(e) => setReqMethod(e.target.value)} style={{ width: "100%", background: "var(--panel)", border: "1px solid var(--line)", color: "var(--cream)", fontSize: 13, padding: "10px 12px", outline: "none" }}>
                  <option>Cash App</option><option>Zelle</option><option>PayPal</option><option>Venmo</option><option>Bank transfer</option><option>Crypto (USDC)</option>
                </select>
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 5 }}>Where to send it (tag, email, or account)</label>
              <input type="text" value={reqDetails} onChange={(e) => setReqDetails(e.target.value)} placeholder="e.g. $yourcashtag or you@email.com" style={{ width: "100%", background: "var(--panel)", border: "1px solid var(--line)", color: "var(--cream)", fontSize: 13, padding: "10px 12px", outline: "none" }} />
            </div>
            {error && reqStatus === "error" && <div style={{ fontSize: 12, color: "#e0a0a0" }}>{error}</div>}
            <button className="lp-btn lp-btn-solid" onClick={submitPayoutRequest} disabled={reqStatus === "sending"} style={{ justifySelf: "start", padding: "10px 22px" }}>
              {reqStatus === "sending" ? "Sending…" : "Request Payout"}
            </button>
          </div>
        )}
        {myRequests.length > 0 && (
          <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
            <div className="lp-eyebrow" style={{ marginBottom: 10 }}>Your Requests</div>
            {myRequests.slice(0, 6).map((r, i) => (
              <div key={r.id || i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderTop: i === 0 ? "none" : "1px solid var(--line)", fontSize: 12.5 }}>
                <span style={{ color: "var(--cream)" }}>{money(r.amount_cents)} <span style={{ color: "var(--muted)" }}>· {r.method}</span></span>
                <span style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.05em", color: r.status === "paid" ? "#8fca8f" : r.status === "declined" ? "#e0a0a0" : "var(--gold-bright)" }}>{r.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent orders */}
      <div style={{ border: "1px solid var(--line)", padding: "20px 22px", marginBottom: 14 }}>
        <div className="lp-eyebrow" style={{ marginBottom: 14 }}>Recent Orders</div>
        {data.recent.length === 0 ? (
          <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.7, margin: 0 }}>
            No orders yet. When someone checks out with your code, it'll show up here with the commission you earned.
          </p>
        ) : (
          <div style={{ fontSize: 13 }}>
            {data.recent.map((o, i) => (
              <div key={o.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderTop: i === 0 ? "none" : "1px solid var(--line)" }}>
                <div>
                  <span style={{ color: "var(--cream)" }}>{o.id}</span>
                  <span style={{ color: "var(--muted)", marginLeft: 10, fontSize: 11.5, textTransform: "capitalize" }}>{String(o.status || "").replace(/_/g, " ")}</span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ color: "var(--gold-bright)" }}>{money(o.commissionCents)}</span>
                  <span style={{ color: "var(--muted)", marginLeft: 10, fontSize: 11.5 }}>on {money(o.totalCents)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payout history */}
      {(data.payoutHistory && data.payoutHistory.length > 0) && (
        <div style={{ border: "1px solid var(--line)", padding: "20px 22px", marginBottom: 14 }}>
          <div className="lp-eyebrow" style={{ marginBottom: 14 }}>Payout History</div>
          <div style={{ fontSize: 13 }}>
            {data.payoutHistory.map((p, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderTop: i === 0 ? "none" : "1px solid var(--line)" }}>
                <span style={{ color: "var(--muted)", fontSize: 12 }}>{String(p.createdAt || "").slice(0, 10)}{p.note ? " · " + p.note : ""}</span>
                <span style={{ color: "var(--gold-bright)" }}>{money(p.amountCents)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 4, lineHeight: 1.7 }}>
        Commission counts once an order is marked paid. Questions about a payout? Email {SITE_CONFIG.supportEmail}.
      </p>
    </div>
  );
}

function AmbassadorPage({ setPage }) {
  const [form, setForm] = useState({ name: "", email: "", platform: "Instagram", handle: "", followers: "1k–10k", niche: "", why: "" });
  const [sent, setSent] = useState(false);
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const valid = form.name.trim() && /\S+@\S+\.\S+/.test(form.email) && form.handle.trim();

  const submit = async () => {
    if (!valid) return;
    if (BACKEND_LIVE) {
      try {
        await fetch(API_BASE + "/api/ambassador", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      } catch (_) { /* show success regardless */ }
      setSent(true);
      return;
    }
    const body = encodeURIComponent(
      `Ambassador application\n\nName: ${form.name}\nEmail: ${form.email}\nPlatform: ${form.platform}\nHandle: ${form.handle}\nAudience size: ${form.followers}\nNiche: ${form.niche}\n\nWhy they're a fit:\n${form.why}`
    );
    window.location.href = `mailto:${SITE_CONFIG.socialEmail}?subject=${encodeURIComponent("[Ambassador] " + form.name)}&body=${body}`;
    setSent(true);
  };

  const perks = [
    ["10% for your audience", "Your followers get 10% off every order with your personal code."],
    ["10% commission", "Earn 10% on every sale your code drives — tracked automatically."],
    ["Premium product", "Represent a research-grade, third-party-tested catalog with a luxury look."],
  ];

  return (
    <div className="lp-fade" style={{ maxWidth: 760, margin: "0 auto", padding: "64px 28px 100px" }}>
      <button className="lp-nav-link" onClick={() => setPage("home")} style={{ marginBottom: 24, display: "inline-flex", alignItems: "center", gap: 6 }}>
        <ChevronLeft size={14} /> Home
      </button>
      <div className="lp-eyebrow" style={{ marginBottom: 10 }}>Partnerships</div>
      <h1 className="lp-serif" style={{ fontSize: 36, fontWeight: 400, marginBottom: 14 }}>Become a Luxury Peps Ambassador</h1>
      <p style={{ color: "var(--muted)", fontSize: 14.5, lineHeight: 1.8, marginBottom: 36 }}>
        Partner with Luxury Peps and earn on every order you send our way. Apply below — we review every
        application and reach out with your personal code if it's a fit.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 18, marginBottom: 44 }}>
        {perks.map(([t, d]) => (
          <div key={t} style={{ border: "1px solid var(--line)", padding: 20 }}>
            <Star size={18} color="var(--gold-bright)" style={{ marginBottom: 10 }} />
            <div className="lp-serif" style={{ fontSize: 17, marginBottom: 6 }}>{t}</div>
            <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.6 }}>{d}</p>
          </div>
        ))}
      </div>

      {sent ? (
        <div style={{ border: "1px solid var(--gold)", padding: 28, textAlign: "center" }}>
          <Check size={26} color="var(--gold-bright)" style={{ marginBottom: 10 }} />
          <div className="lp-serif" style={{ fontSize: 20, marginBottom: 8 }}>Application received</div>
          <p style={{ color: "var(--muted)", fontSize: 14 }}>Thanks for applying. If it's a fit, we'll reach out by email with your personal code and next steps.</p>
        </div>
      ) : (
        <div style={{ border: "1px solid var(--line)", padding: 28 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label className="lp-eyebrow" style={{ display: "block", marginBottom: 8 }}>Name</label>
              <input type="text" value={form.name} onChange={(e) => update("name", e.target.value)} />
            </div>
            <div>
              <label className="lp-eyebrow" style={{ display: "block", marginBottom: 8 }}>Email</label>
              <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label className="lp-eyebrow" style={{ display: "block", marginBottom: 8 }}>Platform</label>
              <select value={form.platform} onChange={(e) => update("platform", e.target.value)}>
                <option>Instagram</option>
                <option>TikTok</option>
                <option>Snapchat</option>
                <option>YouTube</option>
                <option>X / Twitter</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="lp-eyebrow" style={{ display: "block", marginBottom: 8 }}>Audience size</label>
              <select value={form.followers} onChange={(e) => update("followers", e.target.value)}>
                <option>Under 1k</option>
                <option>1k–10k</option>
                <option>10k–50k</option>
                <option>50k–250k</option>
                <option>250k+</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label className="lp-eyebrow" style={{ display: "block", marginBottom: 8 }}>Handle / profile link</label>
            <input type="text" value={form.handle} onChange={(e) => update("handle", e.target.value)} placeholder="@yourhandle" />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label className="lp-eyebrow" style={{ display: "block", marginBottom: 8 }}>Niche / audience</label>
            <input type="text" value={form.niche} onChange={(e) => update("niche", e.target.value)} placeholder="e.g. fitness, longevity, research" />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label className="lp-eyebrow" style={{ display: "block", marginBottom: 8 }}>Why are you a good fit?</label>
            <textarea rows={4} value={form.why} onChange={(e) => update("why", e.target.value)} style={{ width: "100%", resize: "vertical" }} />
          </div>
          <button className="lp-btn lp-btn-solid" onClick={submit} disabled={!valid} style={{ opacity: valid ? 1 : 0.5, width: "100%" }}>
            Submit Application
          </button>
          <p style={{ color: "var(--muted)", fontSize: 11.5, marginTop: 14, lineHeight: 1.6 }}>
            By applying you agree to promote Luxury Peps in line with our research-use-only positioning and to
            avoid any medical, dosing, or human-use claims.
          </p>
        </div>
      )}
    </div>
  );
}


// ── Research guide: education content (search traffic + pre-purchase answers) ─
const GUIDE_SECTIONS = [
  {
    title: "Purity and how it's measured",
    body: [
      "Purity is reported by High-Performance Liquid Chromatography (HPLC), which separates a sample into its components and measures each as a proportion of total peak area. A result of 99% means the target compound accounts for 99% of what the detector saw.",
      "Purity alone doesn't confirm identity. Mass spectrometry is used alongside HPLC to confirm that the compound present is the compound named — that its measured mass matches its expected molecular weight. A sample can be highly pure and still be the wrong molecule.",
      "Two batches of the same compound at different purities will not behave identically in an assay. This is the practical reason reproducible research depends on per-batch documentation rather than a supplier's general claim.",
    ],
  },
  {
    title: "Reading a Certificate of Analysis",
    body: [
      "A COA is a per-batch analytical record. It should state the batch or lot number, the analytical methods used, the measured purity, and the observed molecular weight.",
      "The first thing to check is that the batch number on the certificate matches the number printed on the vial you received. A COA for a different batch tells you nothing about the material in your hand.",
      "Next, confirm the reported mass is consistent with the compound's known molecular weight. A significant discrepancy means either the wrong compound or an error in the documentation — both worth resolving before the material is used.",
    ],
  },
  {
    title: "Molecular weight and concentration",
    body: [
      "Molecular weight (g/mol) is the bridge between mass and moles. Every conversion from a weighed quantity of lyophilized powder to a molar concentration passes through it.",
      "Because that conversion is unavoidable, an incorrect molecular weight silently corrupts every concentration derived from it. Published spec figures should be cross-checked against a public chemical database such as PubChem rather than taken on trust.",
      "Molecular formula matters for the same reason. A formula containing an element the compound doesn't actually possess is a signal that the specification was transcribed incorrectly somewhere upstream.",
    ],
  },
  {
    title: "Lyophilized powder, storage, and handling",
    body: [
      "Lyophilization removes water under vacuum at low temperature, leaving a dry cake or thin film. This form is substantially more stable in transit and storage than material in solution, which is why peptides ship this way.",
      "The visible quantity in a vial is often very small — a faint film rather than an obvious powder. This is normal at milligram scale and is not evidence of a short fill; the vial is filled by mass, not by volume.",
      "As general laboratory practice, lyophilized material stored below freezing and protected from light is the most stable form. Material in solution degrades considerably faster, and repeated freeze-thaw cycles accelerate that further.",
    ],
  },
  {
    title: "Bacteriostatic versus sterile water",
    body: [
      "Bacteriostatic water contains approximately 0.9% benzyl alcohol, a preservative that inhibits bacterial growth. Sterile water contains no preservative at all.",
      "The two are not interchangeable, and the distinction is not cosmetic: the preservative is what permits a container to be accessed more than once over a working period without supporting microbial growth.",
      "Both are supplied strictly as laboratory reagents, for use in in-vitro work by qualified personnel.",
    ],
  },
];

function ResearchGuide({ setPage }) {
  return (
    <div className="lp-fade" style={{ maxWidth: 820, margin: "0 auto", padding: "64px 28px 100px" }}>
      <button className="lp-nav-link" onClick={() => setPage("home")} style={{ marginBottom: 24, display: "inline-flex", alignItems: "center", gap: 6 }}>
        <ChevronLeft size={14} /> Home
      </button>
      <div className="lp-eyebrow" style={{ marginBottom: 10 }}>Education</div>
      <h1 className="lp-serif" style={{ fontSize: 34, fontWeight: 400, marginBottom: 12 }}>Research guide</h1>
      <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.8, marginBottom: 14 }}>
        Background on the analytical terms that appear on our product pages and certificates of analysis:
        what HPLC purity actually measures, how to read a COA, why molecular weight underpins every
        concentration calculation, and how lyophilized material should be stored.
      </p>

      <div style={{ border: "1px solid var(--gold)", background: "linear-gradient(135deg, rgba(176,130,67,0.12), transparent 72%)", padding: "14px 16px", marginBottom: 40, display: "flex", gap: 10, alignItems: "flex-start" }}>
        <AlertCircle size={16} color="var(--gold-bright)" style={{ flexShrink: 0, marginTop: 2 }} />
        <p style={{ fontSize: 13, color: "var(--cream)", lineHeight: 1.6, margin: 0 }}>
          This page is analytical background for laboratory professionals. It is not medical guidance, and it
          describes no human or veterinary use. All compounds sold here are for in-vitro research only.
        </p>
      </div>

      {GUIDE_SECTIONS.map((sec) => (
        <section key={sec.title} style={{ marginBottom: 40 }}>
          <h2 className="lp-serif" style={{ fontSize: 23, fontWeight: 400, marginBottom: 14 }}>{sec.title}</h2>
          {sec.body.map((para, i) => (
            <p key={i} style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.85, marginBottom: 14 }}>{para}</p>
          ))}
        </section>
      ))}

      <hr className="lp-hairline" style={{ margin: "10px 0 30px" }} />
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button className="lp-btn lp-btn-solid" onClick={() => setPage("shop")}>Browse the catalog</button>
        <button className="lp-btn" onClick={() => setPage("faq")}>Read the FAQ</button>
        <button className="lp-btn" onClick={() => setPage("calculator")}>Reconstitution calculator</button>
      </div>
    </div>
  );
}

// ── Account: server-side order history + one-tap reorder ───────────────────
function AccountPage({ setPage, addToCart, userEmail }) {
  const [orders, setOrders] = useState(null);   // null = loading
  const [error, setError] = useState("");
  const [added, setAdded] = useState("");

  useEffect(() => {
    (async () => {
      if (!BACKEND_LIVE) { setOrders([]); setError("preview"); return; }
      const token = await getAuthToken();
      if (!token) { setOrders([]); setError("signin"); return; }
      try {
        const res = await fetch(API_BASE + "/api/account/orders", { headers: { Authorization: "Bearer " + token } });
        if (res.status === 401) { setOrders([]); setError("signin"); return; }
        if (!res.ok) { setOrders([]); setError("load"); return; }
        const d = await res.json();
        setOrders(d.orders || []);
      } catch (_) { setOrders([]); setError("load"); }
    })();
  }, []);

  const reorder = (o) => {
    let n = 0;
    for (const it of o.items || []) {
      const prod = PRODUCTS.find((x) => x.id === it.product_id);
      if (!prod || isSoldOut(prod)) continue;
      const variant = prod.variants.find((v) => v.id === it.variant_id);
      if (!variant) continue;
      addToCart(prod.id, variant.id, it.qty || 1);
      n++;
    }
    if (n === 0) { setAdded("Those items are no longer available."); return; }
    setAdded(`Added ${n} item${n === 1 ? "" : "s"} to your cart.`);
    setTimeout(() => setPage("cart"), 700);
  };

  const statusLabel = (st) => st === "paid" ? "Paid" : st === "shipped" ? "Shipped" : st === "cancelled" ? "Cancelled" : "Awaiting payment";

  return (
    <div className="lp-fade" style={{ maxWidth: 780, margin: "0 auto", padding: "64px 28px 100px" }}>
      <button className="lp-nav-link" onClick={() => setPage("home")} style={{ marginBottom: 24, display: "inline-flex", alignItems: "center", gap: 6 }}>
        <ChevronLeft size={14} /> Home
      </button>
      <div className="lp-eyebrow" style={{ marginBottom: 10 }}>Your account</div>
      <h1 className="lp-serif" style={{ fontSize: 34, fontWeight: 400, marginBottom: 8 }}>Order history</h1>
      <p style={{ color: "var(--muted)", fontSize: 13.5, marginBottom: 32 }}>
        {userEmail && userEmail !== "guest" ? userEmail : "Sign in to see your orders."}
      </p>

      {orders === null && <p style={{ color: "var(--muted)", fontSize: 13.5 }}>Loading your orders…</p>}

      {orders && error === "signin" && (
        <div style={{ border: "1px solid var(--line)", padding: "26px 22px", textAlign: "center" }}>
          <p style={{ color: "var(--muted)", fontSize: 13.5, marginBottom: 16 }}>Sign in to view your order history and reorder in one tap.</p>
          <button className="lp-btn lp-btn-solid" onClick={() => setPage("orders")}>View orders on this device</button>
        </div>
      )}
      {orders && error === "preview" && (
        <div style={{ border: "1px solid var(--line)", padding: "26px 22px", textAlign: "center" }}>
          <p style={{ color: "var(--muted)", fontSize: 13.5 }}>Order history appears here once the site is live.</p>
        </div>
      )}
      {orders && error === "load" && (
        <p style={{ fontSize: 13, color: "#c98a6c" }}>Couldn't load your orders. Please try again shortly.</p>
      )}

      {orders && !error && orders.length === 0 && (
        <div style={{ border: "1px solid var(--line)", padding: "34px 22px", textAlign: "center" }}>
          <p style={{ color: "var(--muted)", fontSize: 13.5, marginBottom: 18 }}>You haven't placed any orders yet.</p>
          <button className="lp-btn lp-btn-solid" onClick={() => setPage("shop")}>Browse the catalog</button>
        </div>
      )}

      {added && <p style={{ fontSize: 13, color: "var(--gold-bright)", marginBottom: 14 }}>{added}</p>}

      {orders && orders.map((o) => (
        <div key={o.reference} style={{ border: "1px solid var(--line)", padding: "18px 20px", marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
            <span className="lp-serif" style={{ fontSize: 17, color: "var(--gold-bright)" }}>{o.reference}</span>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>{String(o.created_at || "").slice(0, 10)} · {statusLabel(o.status)}</span>
          </div>
          <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.7, marginBottom: 12 }}>
            {(o.items || []).map((it) => <div key={it.variant_id}>{it.name} × {it.qty}</div>)}
          </div>
          {o.tracking && <p style={{ fontSize: 12.5, marginBottom: 10 }}>Tracking: <span style={{ color: "var(--cream)" }}>{o.tracking}</span></p>}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 14 }}>Total <span style={{ color: "var(--gold-bright)" }}>${((o.total_cents || 0) / 100).toFixed(2)}</span></span>
            <button className="lp-btn lp-btn-solid" onClick={() => reorder(o)} style={{ fontSize: 12 }}>Reorder</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Write a review (verified purchase only) ────────────────────────────────
function WriteReviewPage({ setPage }) {
  const [ref, setRef] = useState("");
  const [email, setEmail] = useState("");
  const [eligible, setEligible] = useState(null); // null | [] | [{product_id,name}]
  const [productId, setProductId] = useState("");
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  // A shipped-order email links here with ?review=LP-XXXX prefilled.
  useEffect(() => {
    try {
      const r = new URLSearchParams(window.location.search).get("review");
      if (r) setRef(r.trim().toUpperCase());
    } catch (_) { /* no-op */ }
  }, []);

  const check = async () => {
    setError(""); setEligible(null);
    if (!ref.trim() || !email.trim()) { setError("Enter your order number and the email you used."); return; }
    if (!BACKEND_LIVE) { setError("Reviews open once the site is live."); return; }
    setLoading(true);
    try {
      const res = await fetch(API_BASE + "/api/review/eligible?ref=" + encodeURIComponent(ref.trim()) + "&email=" + encodeURIComponent(email.trim()));
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.error || "We couldn't find that order."); setLoading(false); return; }
      setEligible(d.products || []);
      if ((d.products || []).length === 1) setProductId(d.products[0].product_id);
    } catch (_) { setError("Couldn't reach the server. Try again shortly."); }
    setLoading(false);
  };

  const submit = async () => {
    setError("");
    if (!productId) { setError("Choose which compound you're reviewing."); return; }
    if (!rating) { setError("Choose a star rating."); return; }
    if (body.trim().length < 15) { setError("Please write at least a sentence."); return; }
    setLoading(true);
    try {
      const res = await fetch(API_BASE + "/api/review/submit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref: ref.trim(), email: email.trim(), productId, rating, body, displayName }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.error || "Couldn't submit that review."); setLoading(false); return; }
      setDone(true);
    } catch (_) { setError("Couldn't reach the server. Try again shortly."); }
    setLoading(false);
  };

  if (done) {
    return (
      <div className="lp-fade" style={{ maxWidth: 600, margin: "0 auto", padding: "110px 28px", textAlign: "center" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", border: "1px solid var(--gold)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
          <Check size={22} color="var(--gold-bright)" />
        </div>
        <h2 className="lp-serif" style={{ fontSize: 30, marginBottom: 12 }}>Thank you</h2>
        <p style={{ color: "var(--muted)", fontSize: 13.5, lineHeight: 1.7, marginBottom: 28 }}>
          Your review has been submitted and will appear once it's been reviewed. We read every one.
        </p>
        <button className="lp-btn lp-btn-solid" onClick={() => setPage("shop")}>Back to the catalog</button>
      </div>
    );
  }

  return (
    <div className="lp-fade" style={{ maxWidth: 640, margin: "0 auto", padding: "64px 28px 100px" }}>
      <button className="lp-nav-link" onClick={() => setPage("home")} style={{ marginBottom: 24, display: "inline-flex", alignItems: "center", gap: 6 }}>
        <ChevronLeft size={14} /> Home
      </button>
      <div className="lp-eyebrow" style={{ marginBottom: 10 }}>Verified reviews</div>
      <h1 className="lp-serif" style={{ fontSize: 34, fontWeight: 400, marginBottom: 12 }}>Write a review</h1>
      <p style={{ color: "var(--muted)", fontSize: 13.5, lineHeight: 1.7, marginBottom: 20 }}>
        Reviews can only be left against a paid order, so every review published is a verified purchase.
      </p>

      <div style={{ border: "1px solid var(--gold)", background: "linear-gradient(135deg, rgba(176,130,67,0.12), transparent 72%)", padding: "14px 16px", marginBottom: 28, display: "flex", gap: 10, alignItems: "flex-start" }}>
        <AlertCircle size={16} color="var(--gold-bright)" style={{ flexShrink: 0, marginTop: 2 }} />
        <p style={{ fontSize: 12.5, color: "var(--cream)", lineHeight: 1.6, margin: 0 }}>
          Please review <strong>product and service quality only</strong> — purity against the certificate of
          analysis, documentation, packaging, cold-chain condition, and shipping. All compounds are supplied
          for laboratory research only, so reviews describing human or veterinary use can't be published.
        </p>
      </div>

      {eligible === null ? (
        <div style={{ display: "grid", gap: 12 }}>
          <input type="text" placeholder="Order number (e.g. LP-XXXXXX)" value={ref} onChange={(e) => setRef(e.target.value)} style={{ fontSize: 14 }} />
          <input type="email" placeholder="Email used at checkout" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") check(); }} style={{ fontSize: 14 }} />
          <button className="lp-btn lp-btn-solid" onClick={check} disabled={loading}>{loading ? "Checking…" : "Continue"}</button>
        </div>
      ) : eligible.length === 0 ? (
        <div style={{ border: "1px solid var(--line)", padding: "26px 22px", textAlign: "center" }}>
          <p style={{ color: "var(--muted)", fontSize: 13.5 }}>You've already reviewed everything on this order. Thank you.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          <div>
            <label className="lp-eyebrow" style={{ display: "block", marginBottom: 8 }}>Which compound?</label>
            <select value={productId} onChange={(e) => setProductId(e.target.value)} style={{ width: "100%", background: "var(--panel)", border: "1px solid var(--line)", color: "var(--cream)", padding: "10px", fontSize: 14 }}>
              <option value="">Choose…</option>
              {eligible.map((it) => <option key={it.product_id} value={it.product_id}>{it.name}</option>)}
            </select>
          </div>

          <div>
            <label className="lp-eyebrow" style={{ display: "block", marginBottom: 8 }}>Rating</label>
            <div style={{ display: "flex", gap: 6 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRating(n)} aria-label={`${n} star${n === 1 ? "" : "s"}`} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>
                  <Star size={26} fill={n <= rating ? "#C9A05C" : "none"} color={n <= rating ? "#C9A05C" : "var(--line)"} strokeWidth={1.5} />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="lp-eyebrow" style={{ display: "block", marginBottom: 8 }}>Your review</label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} maxLength={1200}
              placeholder="How did the material and documentation hold up? Purity vs the COA, packaging, condition on arrival, shipping speed…"
              style={{ width: "100%", background: "var(--panel)", border: "1px solid var(--line)", color: "var(--cream)", padding: "10px", fontSize: 14, fontFamily: "inherit", resize: "vertical" }} />
            <div style={{ fontSize: 11, color: "var(--muted)", textAlign: "right" }}>{body.length}/1200</div>
          </div>

          <div>
            <label className="lp-eyebrow" style={{ display: "block", marginBottom: 8 }}>Display name (optional)</label>
            <input type="text" placeholder="Shown publicly — e.g. initials or lab name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={60} style={{ fontSize: 14 }} />
          </div>

          {error && <p style={{ fontSize: 13, color: "#c98a6c" }}>{error}</p>}
          <button className="lp-btn lp-btn-solid" onClick={submit} disabled={loading}>{loading ? "Submitting…" : "Submit review"}</button>
          <p style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.6 }}>
            Your email is used only to verify the purchase and is never published.
          </p>
        </div>
      )}
      {eligible === null && error && <p style={{ fontSize: 13, color: "#c98a6c", marginTop: 14 }}>{error}</p>}
    </div>
  );
}

// ── Public order status lookup (order number + email) ──────────────────────
function OrderStatusPage({ setPage }) {
  const [ref, setRef] = useState("");
  const [email, setEmail] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const lookup = async () => {
    setError(""); setResult(null);
    if (!ref.trim() || !email.trim()) { setError("Enter your order number and the email you used."); return; }
    if (!BACKEND_LIVE) { setError("Order lookup works once the site is live."); return; }
    setLoading(true);
    try {
      const res = await fetch(API_BASE + "/api/order-status?ref=" + encodeURIComponent(ref.trim()) + "&email=" + encodeURIComponent(email.trim()));
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.error || "We couldn't find that order."); setLoading(false); return; }
      setResult(d);
    } catch (_) { setError("Couldn't reach the server. Try again shortly."); }
    setLoading(false);
  };

  const steps = ["Order received", "Payment confirmed", "Shipped"];
  const stepIndex = !result ? -1 : result.status === "shipped" ? 2 : (result.paid_at || result.status === "paid") ? 1 : 0;

  return (
    <div className="lp-fade" style={{ maxWidth: 640, margin: "0 auto", padding: "64px 28px 100px" }}>
      <button className="lp-nav-link" onClick={() => setPage("home")} style={{ marginBottom: 24, display: "inline-flex", alignItems: "center", gap: 6 }}>
        <ChevronLeft size={14} /> Home
      </button>
      <div className="lp-eyebrow" style={{ marginBottom: 10 }}>Support</div>
      <h1 className="lp-serif" style={{ fontSize: 34, fontWeight: 400, marginBottom: 10 }}>Track your order</h1>
      <p style={{ color: "var(--muted)", fontSize: 13.5, lineHeight: 1.7, marginBottom: 28 }}>
        Enter your order number and the email you used at checkout.
      </p>

      <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
        <input type="text" placeholder="Order number (e.g. LP-XXXXXX)" value={ref} onChange={(e) => setRef(e.target.value)} style={{ fontSize: 14 }} />
        <input type="email" placeholder="Email used at checkout" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") lookup(); }} style={{ fontSize: 14 }} />
        <button className="lp-btn lp-btn-solid" onClick={lookup} disabled={loading}>{loading ? "Checking…" : "Check status"}</button>
      </div>
      {error && <p style={{ fontSize: 13, color: "#c98a6c", marginBottom: 20 }}>{error}</p>}

      {result && (
        <div style={{ border: "1px solid var(--gold)", padding: "22px 20px", marginTop: 10 }}>
          <div className="lp-eyebrow" style={{ marginBottom: 8 }}>Order</div>
          <div className="lp-serif" style={{ fontSize: 26, color: "var(--gold-bright)", marginBottom: 16 }}>{result.reference}</div>

          {result.status === "cancelled" ? (
            <p style={{ fontSize: 13.5, color: "#c98a6c" }}>This order was cancelled. Contact {SITE_CONFIG.ordersEmail} with any questions.</p>
          ) : (
            <div style={{ marginBottom: 16 }}>
              {steps.map((label, i) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0" }}>
                  <span style={{ width: 18, height: 18, borderRadius: "50%", border: "1px solid " + (i <= stepIndex ? "var(--gold-bright)" : "var(--line)"), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {i <= stepIndex && <Check size={11} color="var(--gold-bright)" />}
                  </span>
                  <span style={{ fontSize: 13.5, color: i <= stepIndex ? "var(--cream)" : "var(--muted)" }}>{label}</span>
                </div>
              ))}
            </div>
          )}

          {result.tracking && (
            <p style={{ fontSize: 13, marginBottom: 10 }}>Tracking number: <span style={{ color: "var(--gold-bright)" }}>{result.tracking}</span></p>
          )}
          <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.8, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
            {(result.items || []).map((it, i) => <div key={i}>{it.name} × {it.qty}</div>)}
            <div style={{ marginTop: 8 }}>Total <span style={{ color: "var(--gold-bright)" }}>${((result.total_cents || 0) / 100).toFixed(2)}</span></div>
          </div>
        </div>
      )}
    </div>
  );
}

function LuxuryPeps() {
  const [authChecked, setAuthChecked] = useState(false);
  const [userEmail, setUserEmail] = useState(null);
  const [ageOk, setAgeOk] = useState(null); // null = checking, true/false = decided
  const [ageDeclined, setAgeDeclined] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const ack = await window.storage.get("age_ack", false);
        if (ack && ack.value === "yes") setAgeOk(true);
        else setAgeOk(false);
      } catch (_) {
        setAgeOk(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const session = await window.storage.get("session", false);
        if (session) {
          const data = JSON.parse(session.value);
          if (data.remember !== false) setUserEmail(data.email);
        }
      } catch (_) {
        // no active session
      } finally {
        setAuthChecked(true);
      }
    })();
  }, []);

  const confirmAge = async () => {
    try { await window.storage.set("age_ack", "yes", false); } catch (_) { /* ignore */ }
    setAgeOk(true);
  };

  const handleLogout = async () => {
    try {
      await window.storage.delete("session", false);
    } catch (_) { /* ignore */ }
    setUserEmail(null);
  };

  return (
    <>
      {FONTS}
      {!authChecked && <div className="lp-root" style={{ minHeight: "100vh" }} />}
      {authChecked && !userEmail && <AuthGate onAuthenticated={(email) => setUserEmail(email)} />}
      {authChecked && userEmail && <LuxuryPepsStore userEmail={userEmail} onLogout={handleLogout} />}
      {ageOk === false && <AgeGate onConfirm={confirmAge} declined={ageDeclined} onDecline={() => setAgeDeclined(true)} />}
    </>
  );
}

function NewsletterPopup({ defaultEmail, onClose, onSubscribed }) {
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState(defaultEmail && defaultEmail !== "guest" ? defaultEmail : "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const isValidPhone = (v) => v.replace(/[^\d]/g, "").length >= 10;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!isValidPhone(phone)) return setError("Enter a valid phone number (at least 10 digits).");

    setLoading(true);
    try {
      // Demo storage only. For production, send this to a real ESP/SMS provider
      // (e.g. Klaviyo, Mailchimp, Twilio) from your backend instead of window.storage.
      await window.storage.set(`subscriber:${phone.replace(/[^\d]/g, "")}`, JSON.stringify({
        phone, email, optedInAt: Date.now(),
      }), true);
      setDone(true);
      setTimeout(() => onSubscribed(), 1800);
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }}>
      <div className="lp-fade" style={{ width: "100%", maxWidth: 420, background: "var(--panel)", border: "1px solid var(--line)", padding: "40px 36px", position: "relative" }}>
        <button onClick={onClose} aria-label="Close" style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: "var(--muted)", cursor: "pointer" }}>
          <X size={18} />
        </button>

        {!done ? (
          <>
            <Sparkles size={22} color="var(--gold)" style={{ marginBottom: 14 }} />
            <h3 className="lp-serif" style={{ fontSize: 24, marginBottom: 10 }}>Get first access</h3>
            <p style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.7, marginBottom: 24 }}>
              Share your phone number for exclusive texts on new compounds, restocks, and member-only
              discounts before they go public.
            </p>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input
                type="tel"
                placeholder="Phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
              />
              <input
                type="email"
                placeholder="Email (optional)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />

              {error && (
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12.5, color: "#D9A06B" }}>
                  <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>{error}</span>
                </div>
              )}

              <button type="submit" className="lp-btn lp-btn-solid" style={{ marginTop: 6, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }} disabled={loading}>
                {loading ? <><Loader2 size={14} className="lp-spin" /> Submitting…</> : <><Phone size={13} /> Notify Me</>}
              </button>
              <button type="button" onClick={onClose} className="lp-nav-link" style={{ textAlign: "center", color: "var(--muted)" }}>
                No thanks
              </button>
            </form>

            <p style={{ fontSize: 10.5, color: "var(--muted)", lineHeight: 1.6, marginTop: 18 }}>
              By submitting, you agree to receive marketing texts from Luxury Peps. Message and data rates
              may apply. Reply STOP to unsubscribe at any time.
            </p>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <Check size={26} color="var(--gold-bright)" style={{ marginBottom: 14 }} />
            <h3 className="lp-serif" style={{ fontSize: 22, marginBottom: 8 }}>You're on the list</h3>
            <p style={{ fontSize: 13, color: "var(--muted)" }}>Watch your phone for first access to new drops.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Welcome to Luxury Peps. I can help with our catalog, purity testing, shipping, storage, and orders. How can I help?" },
  ]);
  const scrollRef = React.useRef(null);

  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading, open]);

  // Compact catalog context the model can answer from.
  const catalogContext = PRODUCTS.map(
    (p) => `${p.name} (No.${p.no}, ${p.purity} HPLC, ${p.category}) — sizes: ${p.variants.map((v) => `${v.size.replace(" / vial", "")} $${v.price}`).join(", ")}`
  ).join("\n");

  const SYSTEM = `You are the customer-support assistant for Luxury Peps, a store selling reference-grade research peptides for LABORATORY RESEARCH USE ONLY.

Scope and rules:
- Help with: product catalog, pricing, vial sizes, HPLC purity, certificates of analysis, storage/handling of lyophilized powder, shipping (cold-chain, discreet, free over $${FREE_SHIP_THRESHOLD}), volume discounts (2+ 5%, 3+ 10%, 5+ 15%), bundle kits, accounts, and the ordering process.
- All products are sold strictly for in-vitro research and are NOT for human or animal use.
- NEVER provide dosing, administration, reconstitution-for-injection, cycling, or any human/animal-use guidance, even if asked. Politely decline and explain these are research-use-only compounds and you can't advise on use in humans or animals. Suggest a licensed medical professional for any health questions.
- Do not give medical, legal, or financial advice.
- Be concise, warm, and professional. If you don't know something specific (an order's status, etc.), say so and point them to support@luxurypeps.com.

Catalog:
${catalogContext}`;

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const next = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      let reply;
      if (BACKEND_LIVE) {
        // Live: proxy through the backend so the API key stays server-side.
        const res = await fetch(API_BASE + "/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: next.map((m) => ({ role: m.role, content: m.content })) }),
        });
        const data = await res.json();
        reply = (data.reply || "").trim();
      } else {
        // Preview: direct call (exposes the key — replaced by the proxy in production).
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "claude-sonnet-4-6",
            max_tokens: 1000,
            system: SYSTEM,
            messages: next.map((m) => ({ role: m.role, content: m.content })),
          }),
        });
        const data = await res.json();
        reply = (data.content || []).map((b) => (b.type === "text" ? b.text : "")).join("\n").trim();
      }
      reply = reply || `Sorry, I had trouble responding just now. Please email ${SITE_CONFIG.supportEmail}.`;
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", content: `I'm having trouble connecting right now. Please try again, or email ${SITE_CONFIG.supportEmail}.` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* launcher */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Open chat"
        style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 60,
          width: 56, height: 56, borderRadius: "50%", cursor: "pointer",
          background: "var(--gold)", border: "none",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 8px 24px -8px rgba(0,0,0,0.6)",
        }}
      >
        {open ? <X size={22} color="var(--bg)" /> : <MessageCircle size={24} color="var(--bg)" />}
      </button>

      {open && (
        <div className="lp-fade" style={{
          position: "fixed", bottom: 92, right: 24, zIndex: 60,
          width: "min(380px, calc(100vw - 48px))", height: "min(560px, calc(100vh - 140px))",
          background: "var(--panel)", border: "1px solid var(--line)",
          display: "flex", flexDirection: "column", boxShadow: "0 24px 60px -20px rgba(0,0,0,0.7)",
        }}>
          {/* header */}
          <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid var(--gold)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={15} color="var(--gold)" />
            </div>
            <div>
              <div className="lp-serif" style={{ fontSize: 16 }}>Luxury Peps Concierge</div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>Typically replies instantly</div>
            </div>
          </div>

          {/* messages */}
          <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "85%",
                background: m.role === "user" ? "var(--brown-deep)" : "var(--panel-2)",
                border: "1px solid var(--line)",
                color: "var(--cream)", fontSize: 13.5, lineHeight: 1.6,
                padding: "10px 13px", whiteSpace: "pre-wrap",
              }}>
                {m.content}
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: "flex-start", color: "var(--muted)", fontSize: 13, display: "flex", alignItems: "center", gap: 8, padding: "4px 2px" }}>
                <Loader2 size={14} className="lp-spin" /> Typing…
              </div>
            )}
          </div>

          {/* input */}
          <div style={{ padding: 12, borderTop: "1px solid var(--line)", display: "flex", gap: 8 }}>
            <input
              type="text"
              placeholder="Ask about products, shipping…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") send(); }}
              style={{ flex: 1 }}
            />
            <button onClick={send} disabled={loading || !input.trim()} aria-label="Send"
              className="lp-btn lp-btn-solid"
              style={{ padding: "0 14px", opacity: loading || !input.trim() ? 0.5 : 1, display: "flex", alignItems: "center" }}>
              <Send size={15} />
            </button>
          </div>
          <div style={{ fontSize: 10, color: "var(--muted)", textAlign: "center", padding: "0 12px 10px" }}>
            AI assistant · research-use info only, not medical advice
          </div>
        </div>
      )}
    </>
  );
}

function LuxuryPepsStore({ userEmail, onLogout }) {
  const [page, setPage] = useState("home");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cart, setCart] = useState([]);
  const [showNewsletter, setShowNewsletter] = useState(false);
  const [recentlyViewed, setRecentlyViewed] = useState([]);

  // Scroll to top and set the browser tab title whenever the page changes.
  useEffect(() => {
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "auto" });
    const titles = {
      home: "Research-Grade Peptides", shop: "Catalog", product: "Product", apparel: "Apparel",
      cart: "Cart", checkout: "Checkout", success: "Order Confirmed", orders: "My Orders", about: "Standards",
      calculator: "Concentration Calculator", coa: "Certificate of Analysis",
      terms: "Terms of Service", privacy: "Privacy Policy", shipping: "Shipping & Refunds",
      faq: "FAQ", contact: "Contact", ambassador: "Ambassador Program", portal: "Ambassador Portal", owner: "Owner", batch: "Batch Lookup", compare: "Compare",
    };
    const suffix = titles[page] || "";
    if (typeof document !== "undefined") {
      document.title = suffix ? `${SITE_CONFIG.brandName} — ${suffix}` : SITE_CONFIG.brandName;
    }
  }, [page, selectedProduct]);

  useEffect(() => {
    let timer;
    (async () => {
      try {
        const seen = await window.storage.get("newsletterPromptSeen", false);
        if (seen) return;
      } catch (_) {
        // not seen yet — fall through and show it
      }
      timer = setTimeout(() => setShowNewsletter(true), 3500);
    })();
    return () => clearTimeout(timer);
  }, []);

  const dismissNewsletter = async () => {
    setShowNewsletter(false);
    try {
      await window.storage.set("newsletterPromptSeen", "true", false);
    } catch (_) { /* ignore */ }
  };

  const addToCart = (id, variantId, qty) => {
    const prod = PRODUCTS.find((x) => x.id === id);
    if (prod && isSoldOut(prod)) return;
    setCart((c) => {
      const existing = c.find((i) => i.id === id && i.variantId === variantId);
      if (existing) return c.map((i) => (i.id === id && i.variantId === variantId ? { ...i, qty: i.qty + qty } : i));
      return [...c, { id, variantId, qty }];
    });
  };
  const updateQty = (id, variantId, qty) =>
    setCart((c) => c.map((i) => (i.id === id && i.variantId === variantId ? { ...i, qty } : i)));
  const removeItem = (id, variantId) =>
    setCart((c) => c.filter((i) => !(i.id === id && i.variantId === variantId)));
  const clearCart = () => setCart([]);
  const openProduct = (id) => {
    setSelectedProduct(id);
    setRecentlyViewed((prev) => [id, ...prev.filter((x) => x !== id)].slice(0, 6));
    setPage("product");
    track("product_view", id);
  };
  // One page_view per screen the visitor lands on; checkout_start when they
  // reach checkout, which is what makes the drop-off number meaningful.
  useEffect(() => {
    track("page_view");
    if (page === "checkout") track("checkout_start");
  }, [page]);

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  return (
    <div className="lp-root">
      <Header page={page} setPage={setPage} cartCount={cartCount} userEmail={userEmail} onLogout={onLogout} />
      {page === "home" && <Home setPage={setPage} addToCart={addToCart} />}
      {page === "shop" && <Shop setPage={setPage} openProduct={openProduct} addToCart={addToCart} recentlyViewed={recentlyViewed} />}
      {page === "product" && <ProductDetail productId={selectedProduct} setPage={setPage} addToCart={addToCart} openProduct={openProduct} recentlyViewed={recentlyViewed} />}
      {page === "coa" && <CertificateOfAnalysis productId={selectedProduct} setPage={setPage} />}
      {page === "cart" && <Cart cart={cart} setPage={setPage} updateQty={updateQty} removeItem={removeItem} addToCart={addToCart} />}
      {page === "checkout" && <Checkout cart={cart} setPage={setPage} addToCart={addToCart} />}
      {page === "success" && <Success setPage={setPage} clearCart={clearCart} />}
      {page === "orders" && <Orders setPage={setPage} />}
      {page === "account" && <AccountPage setPage={setPage} addToCart={addToCart} userEmail={userEmail} />}
      {page === "status" && <OrderStatusPage setPage={setPage} />}
      {page === "review" && <WriteReviewPage setPage={setPage} />}
      {page === "guide" && <ResearchGuide setPage={setPage} />}
      {page === "about" && <About setPage={setPage} />}
      {page === "calculator" && <Calculator setPage={setPage} />}
      {page === "terms" && <TermsPage setPage={setPage} />}
      {page === "privacy" && <PrivacyPage setPage={setPage} />}
      {page === "shipping" && <ShippingRefundPage setPage={setPage} />}
      {page === "faq" && <FAQPage setPage={setPage} />}
      {page === "contact" && <ContactPage setPage={setPage} />}
      {page === "ambassador" && <AmbassadorPage setPage={setPage} />}
      {page === "portal" && <AmbassadorPortal setPage={setPage} />}
      {page === "owner" && <OwnerPortal setPage={setPage} />}
      {page === "batch" && <BatchLookup setPage={setPage} openProduct={openProduct} />}
      {page === "compare" && <ComparePage setPage={setPage} openProduct={openProduct} />}
      {![ "home","shop","product","cart","checkout","success","orders","about","calculator","coa","terms","privacy","shipping","faq","contact","ambassador","portal","owner","batch","compare","account","status","guide","review" ].includes(page) && (
        <div className="lp-fade" style={{ maxWidth: 600, margin: "0 auto", padding: "100px 28px", textAlign: "center" }}>
          <div className="lp-eyebrow" style={{ marginBottom: 12 }}>404</div>
          <h2 className="lp-serif" style={{ fontSize: 30, marginBottom: 14 }}>Page not found</h2>
          <p style={{ color: "var(--muted)", fontSize: 14.5, marginBottom: 26 }}>The page you're looking for doesn't exist or has moved.</p>
          <button className="lp-btn lp-btn-solid" onClick={() => setPage("home")}>Return Home</button>
        </div>
      )}
      <Footer setPage={setPage} />
      <ChatWidget />
      {showNewsletter && (
        <NewsletterPopup
          defaultEmail={userEmail}
          onClose={dismissNewsletter}
          onSubscribed={dismissNewsletter}
        />
      )}
    </div>
  );
}

// Crash protection: if anything in the app throws, show a graceful recovery
// screen instead of a blank page.
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  render() {
    if (this.state.err) {
      return (
        <div style={{ minHeight: "100vh", background: "#0A0705", color: "#EAE0D0", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "Georgia, serif", textAlign: "center" }}>
          <div>
            <div style={{ fontSize: 26, marginBottom: 10, color: "#C9A05C" }}>Something went wrong</div>
            <div style={{ fontSize: 14, opacity: 0.75, marginBottom: 22 }}>A quick refresh usually fixes it.</div>
            <button onClick={() => window.location.reload()} style={{ background: "#C9A05C", color: "#0A0705", border: "none", padding: "12px 26px", fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}>Reload</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function LuxuryPepsRoot() {
  return <ErrorBoundary><LuxuryPeps /></ErrorBoundary>;
}
