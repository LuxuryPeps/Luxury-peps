# Luxury Peps — Cloudflare setup (runs entirely on Cloudflare)

This turns on the live backend — shared orders, ambassadors, and Resend emails —
using only Cloudflare services. No outside database, no other accounts.

## IMPORTANT: the backend needs the Git deploy, not the drag-and-drop upload
The quick "Upload assets" method deploys the storefront **only** (browser-mode,
no backend, no emails). The backend (the `functions/` folder) deploys only when
Cloudflare **builds your project from a Git repo**. So use the steps below.

---

## Step 1 — Put the project on GitHub
Create a GitHub repo and upload the full project (the `luxury-peps-site.zip`
contents). If Git isn't your thing, this one step is worth ~15 minutes of a
developer's time.

## Step 2 — Create the Pages project
Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git** →
pick your repo. Build settings: framework preset **Vite** (or build command
`npm run build`, output directory `dist`). Deploy once.

## Step 3 — Create a D1 database (Cloudflare's own database)
1. Cloudflare dashboard → **Storage & Databases → D1 → Create database**. Name
   it e.g. `luxurypeps`.
2. Open the database → **Console**, paste in the entire contents of
   **`db/schema.sql`**, and run it. That creates every table and seeds your two
   ambassadors.
   (Or, with the Wrangler CLI: `npx wrangler d1 execute luxurypeps --remote --file=db/schema.sql`.)

## Step 4 — Bind the database to your site
Pages project → **Settings → Functions → D1 database bindings → Add binding**:
- **Variable name:** `DB`  (exactly this)
- **D1 database:** the `luxurypeps` database from Step 3

Add it for Production (and Preview if you use it).

## Step 5 — Add environment variables
Pages project → **Settings → Environment variables** → add:

| Name | Value |
|------|-------|
| `OWNER_PIN` | your private owner-portal PIN |
| `APP_SECRET` | any long random string |
| `RESEND_API_KEY` | your Resend API key |
| `FROM_EMAIL` | e.g. `Luxury Peps <orders@send.luxurypeps.com>` (verified in Resend) |
| `OWNER_EMAIL` | where order alerts go, e.g. `orders@luxurypeps.com` |
| `PAY_BANK` / `PAY_CASHAPP` / `PAY_ZELLE` / `PAY_CRYPTO` | your payment instructions |
| `PREORDER` | `true` now, `false` when shipping from stock |

## Step 6 — Point the storefront at the backend
Open **`src/LuxuryPeps.jsx`**, find `SITE_CONFIG`, and set:

```
apiBaseUrl: "https://YOURDOMAIN.com",
```

Commit/push — Cloudflare rebuilds automatically. This one line flips the site
from browser-mode to live-backend mode.

## Step 7 — Test
- Visit `https://YOURDOMAIN.com/api/code/MORGAN11` → you should see
  `{"valid":true,...}` (backend + D1 working).
- Place a test order → you get the owner email, the customer gets a confirmation.
- Sign into the Owner portal with your `OWNER_PIN` → the order is listed.

---

## Notes
- No compatibility flags or npm database packages are needed — the backend uses
  Cloudflare D1 and built-in Web Crypto only.
- Change the seeded ambassador PINs after first deploy (they're `1234`): in the
  D1 Console run `update ambassadors set portal_pin='NEWPIN' where code='MORGAN11';`
- Keep `OWNER_PIN`, `APP_SECRET`, and `RESEND_API_KEY` private — only in
  Cloudflare's environment variables, never in the code.
- Before taking real payments, have someone review the setup and security.
