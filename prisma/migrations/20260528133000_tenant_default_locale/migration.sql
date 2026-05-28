-- Feature 6.1 — Tenant.defaultLocale for outbound communication locale.
-- Existing rows: TR (current Turkish-first market default).
ALTER TABLE "Tenant" ADD COLUMN "defaultLocale" TEXT NOT NULL DEFAULT 'tr';
