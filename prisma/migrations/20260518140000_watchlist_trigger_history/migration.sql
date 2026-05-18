-- Watchlist trigger history (Track NNNN). Önceden Watchlist.triggeredAt
-- her hit'te overwrite ediliyordu; "ne sıklıkta tetiklendi" sorusu
-- cevaplanamıyordu. Şimdi her tetiklenme ayrı kayıt.
-- Retention: cleanup cron 90 gün tutar (AnomalyBaseline ile aynı policy).

CREATE TABLE "WatchlistTrigger" (
  "id" TEXT NOT NULL,
  "watchlistId" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "value" DOUBLE PRECISION NOT NULL,
  "thresholdOp" TEXT NOT NULL,
  "thresholdVal" DOUBLE PRECISION NOT NULL,
  "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WatchlistTrigger_pkey" PRIMARY KEY ("id")
);

-- Index: watchlist-detay sayfasında son N tetiklenme listesi (DESC sort).
CREATE INDEX "WatchlistTrigger_watchlistId_triggeredAt_idx"
  ON "WatchlistTrigger"("watchlistId", "triggeredAt" DESC);

-- Index: tenant-wide retention scan (cleanup cron) join'siz çalışsın.
CREATE INDEX "WatchlistTrigger_tenantId_triggeredAt_idx"
  ON "WatchlistTrigger"("tenantId", "triggeredAt" DESC);

-- Foreign keys: cascade on watchlist/tenant delete.
ALTER TABLE "WatchlistTrigger"
  ADD CONSTRAINT "WatchlistTrigger_watchlistId_fkey"
  FOREIGN KEY ("watchlistId") REFERENCES "Watchlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WatchlistTrigger"
  ADD CONSTRAINT "WatchlistTrigger_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
