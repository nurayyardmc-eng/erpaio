-- Per-user push notification opt-in flags (KVKK md. 11 / GDPR Art. 21).
-- Default true → opt-in for existing users; behavior unchanged on deploy.
ALTER TABLE "User"
  ADD COLUMN "pushPrefAlerts"     BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "pushPrefAnomaly"    BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "pushPrefWatchlists" BOOLEAN NOT NULL DEFAULT true;
