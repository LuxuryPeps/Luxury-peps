# Luxury Peps — Deployable Storefront

This is the storefront packaged as a normal website you can put online at **luxurypeps.com**.
Use this to get the site **live for your payment processor to review** — it does **not** need
payments working yet. (Checkout will show that payment isn't connected; that's expected until
your merchant account is approved and a developer wires it in.)

## What's here
- A standard **Vite + React** project. `src/LuxuryPeps.jsx` is the whole storefront.
- `index.html` includes a small shim so the site's saved-state features work with the
  browser's localStorage on a real host.

## Fastest way to get it live (a developer can do this in ~15 min)

### Option A — Vercel or Cloudflare Pages (recommended, auto-HTTPS + custom domain)
1. Put this folder in a Git repo (GitHub/GitLab).
2. In Vercel (or Cloudflare Pages), "Import project" from the repo.
3. Framework preset: **Vite**. Build command: `npm run build`. Output dir: `dist`.
4. Deploy. Then add **luxurypeps.com** as a custom domain and follow their DNS steps.

### Option B — Netlify Drop (no account/repo needed for a quick public URL)
1. On any computer: `npm install` then `npm run build` (produces a `dist/` folder).
2. Go to app.netlify.com/drop and drag the **`dist`** folder in.
3. You get a public URL instantly; add luxurypeps.com as a custom domain in site settings.

### Option C — local test first
```bash
npm install
npm run dev      # preview at http://localhost:5173
npm run build    # production build -> dist/
```

## Point your domain at it
After deploying, add `luxurypeps.com` (and `www`) as a custom domain in the host's dashboard
and update the DNS records they give you at your registrar. HTTPS is automatic on Vercel/
Netlify/Cloudflare.

## Important: what works vs. what's pending
- **Works now (what the processor reviews):** full catalog, product pages, prices, cart,
  the checkout *flow*, Terms / Privacy / Shipping & Refund pages, FAQ, contact, age gate,
  COA, pre-order labeling. This is what underwriters want to see.
- **Pending (after merchant approval):** real payment processing. Until the backend +
  processor are connected (see `developer-brief.md`), checkout stops at the payment step and
  shows that it isn't connected. That is fine for the underwriting review.
- The AI concierge widget needs the backend to work; without it, it shows a "contact support"
  message. Harmless for review. (You can leave it; it doesn't affect approval.)

## After you're approved
Hand `developer-brief.md` + `luxury-peps-backend.zip` to your developer. They deploy the
backend, plug in your processor, and set `SITE_CONFIG.apiBaseUrl` in `src/LuxuryPeps.jsx`
to the live API URL, then redeploy this site. Checkout goes fully live.
