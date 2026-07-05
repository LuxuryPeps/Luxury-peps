-- ===========================================================================
-- Luxury Peps — Cloudflare D1 (SQLite) schema.
-- Run once against your D1 database (see CLOUDFLARE_SETUP.md).
-- Safe to re-run: uses "if not exists" / "insert or ignore".
-- ===========================================================================

create table if not exists ambassadors (
  code        text primary key,
  creator     text not null,
  pct         real not null default 0.10,      -- 0.10 = 10%
  portal_pin  text not null,                   -- PIN the ambassador logs in with
  builtin     integer not null default 0,      -- 1 = can't be deleted in the UI
  active      integer not null default 1,
  created_at  text not null default (datetime('now'))
);

create table if not exists orders (
  reference        text primary key,
  email            text,
  method           text,                        -- bank / cashapp / zelle / crypto
  code             text,                        -- ambassador code (nullable)
  status           text not null default 'awaiting_payment',  -- or 'paid'
  subtotal_cents   integer not null default 0,
  discount_cents   integer not null default 0,
  shipping_cents   integer not null default 0,
  total_cents      integer not null default 0,
  commission_cents integer not null default 0,
  customer         text,                        -- JSON string
  certified        integer not null default 0,
  created_at       text not null default (datetime('now')),
  paid_at          text
);

create table if not exists order_items (
  id               integer primary key autoincrement,
  order_ref        text,
  variant_id       text,
  product_id       text,
  name             text,
  qty              integer not null default 1,
  unit_price_cents integer not null default 0,
  line_cents       integer not null default 0
);

create table if not exists payouts (
  id           integer primary key autoincrement,
  code         text,
  amount_cents integer not null default 0,
  note         text,
  created_at   text not null default (datetime('now'))
);

create table if not exists users (
  email         text primary key,
  password_hash text not null,
  salt          text not null,
  created_at    text not null default (datetime('now'))
);

create table if not exists contact_messages (
  id         integer primary key autoincrement,
  name       text, email text, subject text, message text,
  created_at text not null default (datetime('now'))
);

create table if not exists ambassador_applications (
  id         integer primary key autoincrement,
  name       text, email text, platform text, handle text,
  followers  text, niche text, why text,
  created_at text not null default (datetime('now'))
);

create table if not exists inventory (
  product_id text primary key,
  count      integer not null default 0,
  threshold  integer not null default 5,
  updated_at text not null default (datetime('now'))
);

create index if not exists idx_orders_status  on orders(status);
create index if not exists idx_orders_code    on orders(code);
create index if not exists idx_orders_paid_at on orders(paid_at);
create index if not exists idx_items_ref      on order_items(order_ref);
create index if not exists idx_payouts_code   on payouts(code);

-- Seed the two built-in ambassadors. Change these PINs after deploy:
--   update ambassadors set portal_pin='NEWPIN' where code='MORGAN11';
insert or ignore into ambassadors (code, creator, pct, portal_pin, builtin) values
  ('MORGAN11',  'Madden Morgan',  0.10, '1234', 1),
  ('MATTLIFTZ', 'Matthew Daniel', 0.10, '1234', 1);
