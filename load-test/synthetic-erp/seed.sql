-- =============================================================
-- ERPAIO — Synthetic ERP fixture (PostgreSQL)
--
-- Purpose: validate the core engine END-TO-END against a real DB
-- (schema scan → AI SQL generation → read-only execution) without
-- needing a customer's real Nebim. Schema + data mirror the 4 landing
-- demo scenarios so you can ask the exact demo questions and verify the
-- AI produces correct SQL and correct answers.
--
-- Postgres is the easiest test target (a free Neon/Supabase instance):
-- the demo SQL uses date_trunc/now()/interval which are Postgres-native.
--
-- All dates are RELATIVE to now() → the fixture is evergreen (correct
-- results no matter what day you run it). Re-runnable (drops + recreates).
--
-- ── RUNBOOK ──────────────────────────────────────────────────
-- 1. Provision a throwaway Postgres (Neon/Supabase free tier).
-- 2. Load this seed:
--      psql "<TEST_PG_URL>" -f load-test/synthetic-erp/seed.sql
-- 3. In the running app, add an ERP connection:
--      erpType = postgres, host/port/dbName/user/password from the URL.
-- 4. Open chat and ask the 4 demo questions (TR):
--      • "İstanbul'da yeniden sipariş noktasının altındaki ürünler hangileri?"
--      • "Geçen ay ciroya göre ilk 3 müşteri"
--      • "Vadesi geçmiş faturaların toplamı ne kadar?"
--      • "Bu ay en çok satan 3 ürün hangisi?"
-- 5. Verify: generated SQL is read-only + correct, results match the
--    expected rows noted next to each table below.
-- ─────────────────────────────────────────────────────────────
-- =============================================================

DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS customers CASCADE;

CREATE TABLE customers (
  id   TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE products (
  id    TEXT PRIMARY KEY,
  name  TEXT NOT NULL,
  price NUMERIC(12,2) NOT NULL
);

CREATE TABLE inventory (
  sku           TEXT PRIMARY KEY,
  product_name  TEXT NOT NULL,
  warehouse     TEXT NOT NULL,
  stock         INTEGER NOT NULL,
  reorder_point INTEGER NOT NULL
);

CREATE TABLE orders (
  id          TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  total       NUMERIC(14,2) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL
);

CREATE TABLE order_items (
  id         TEXT PRIMARY KEY,
  order_id   TEXT NOT NULL REFERENCES orders(id),
  product_id TEXT NOT NULL REFERENCES products(id),
  qty        INTEGER NOT NULL,
  price      NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE invoices (
  id          TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  amount      NUMERIC(14,2) NOT NULL,
  status      TEXT NOT NULL,        -- 'paid' | 'unpaid'
  due_date    DATE NOT NULL
);

-- ── customers ───────────────────────────────────────────────
INSERT INTO customers (id, name) VALUES
  ('c1', 'Perakende Co.'),
  ('c2', 'Tekstil A.Ş.'),
  ('c3', 'Mavi Lojistik'),
  ('c4', 'Anadolu Gıda'),
  ('c5', 'Ege Mobilya');

-- ── products ────────────────────────────────────────────────
INSERT INTO products (id, name, price) VALUES
  ('p1', 'Pamuklu Tişört', 150.00),
  ('p2', 'Kot Pantolon',   350.00),
  ('p3', 'Sweatshirt',     250.00),
  ('p4', 'Mont',           600.00),
  ('p5', 'Çorap',           40.00);

-- ── inventory ───────────────────────────────────────────────
-- Scenario 1 expectation: warehouse='İstanbul' AND stock < reorder_point
-- → 3 rows: SKU-4821, SKU-1190, SKU-2277 (ordered by stock ASC).
INSERT INTO inventory (sku, product_name, warehouse, stock, reorder_point) VALUES
  ('SKU-4821', 'Pamuklu Tişört', 'İstanbul',  3, 25),  -- below
  ('SKU-1190', 'Kot Pantolon',   'İstanbul',  5, 20),  -- below
  ('SKU-2277', 'Sweatshirt',     'İstanbul',  6, 30),  -- below
  ('SKU-3300', 'Mont',           'İstanbul', 80, 25),  -- ok
  ('SKU-9001', 'Çorap',          'İstanbul', 12, 10),  -- ok
  ('SKU-5500', 'Pamuklu Tişört', 'Ankara',  2, 15);  -- below but different warehouse

-- ── orders ──────────────────────────────────────────────────
-- Scenario 2 expectation: top 3 customers by revenue LAST month
-- → Perakende (1.24M), Tekstil (890K), Mavi (610K).
-- "last month" window in demo SQL:
--   created_at >= date_trunc('month', now()) - interval '1 month'
--   created_at <  date_trunc('month', now())
-- so we date these mid-previous-month.
INSERT INTO orders (id, customer_id, total, created_at) VALUES
  ('o_lm1', 'c1', 1240000.00, date_trunc('month', now()) - interval '12 days'),
  ('o_lm2', 'c2',  890000.00, date_trunc('month', now()) - interval '10 days'),
  ('o_lm3', 'c3',  610000.00, date_trunc('month', now()) - interval '18 days'),
  ('o_lm4', 'c4',  200000.00, date_trunc('month', now()) - interval '8 days'),
  ('o_lm5', 'c5',  150000.00, date_trunc('month', now()) - interval '5 days'),
  -- one order THIS month (carrier for this-month order_items below)
  ('o_tm1', 'c1',  442600.00, date_trunc('month', now()) + interval '3 days');

-- ── order_items ─────────────────────────────────────────────
-- Scenario 4 expectation: best-selling THIS month by units
-- → Pamuklu Tişört (1240), Kot Pantolon (890), Sweatshirt (640).
INSERT INTO order_items (id, order_id, product_id, qty, price, created_at) VALUES
  ('oi1', 'o_tm1', 'p1', 1240, 150.00, date_trunc('month', now()) + interval '3 days'),
  ('oi2', 'o_tm1', 'p2',  890, 350.00, date_trunc('month', now()) + interval '3 days'),
  ('oi3', 'o_tm1', 'p3',  640, 250.00, date_trunc('month', now()) + interval '3 days'),
  ('oi4', 'o_tm1', 'p5',  300,  40.00, date_trunc('month', now()) + interval '3 days');

-- ── invoices ────────────────────────────────────────────────
-- Scenario 3 expectation: unpaid AND due_date < now() (overdue)
-- → Tekstil (92K, 47d), Mavi (61K, 31d), Perakende (38K, 12d).
INSERT INTO invoices (id, customer_id, amount, status, due_date) VALUES
  ('inv1', 'c2', 92000.00, 'unpaid', (now()::date - 47)),  -- overdue
  ('inv2', 'c3', 61000.00, 'unpaid', (now()::date - 31)),  -- overdue
  ('inv3', 'c1', 38000.00, 'unpaid', (now()::date - 12)),  -- overdue
  ('inv4', 'c4', 50000.00, 'paid',   (now()::date - 5)),   -- paid, excluded
  ('inv5', 'c5', 20000.00, 'unpaid', (now()::date + 10));  -- not yet due, excluded
