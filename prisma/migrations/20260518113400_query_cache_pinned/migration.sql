-- Saved query pinning (Track EEEE). Kullanıcı sık kullanılan sorguları
-- listenin üstüne pinleyebilir. Default false, optimistic update mümkün.
ALTER TABLE "QueryCache" ADD COLUMN "pinned" BOOLEAN NOT NULL DEFAULT false;

-- Index: pinned öncelikli sıralama için (pinned desc + lastUsedAt desc).
-- Mevcut tenantId+lastUsedAt index'i tek başına yeterli değil çünkü pinned
-- secondary sort olmalı.
CREATE INDEX "QueryCache_tenantId_pinned_lastUsedAt_idx"
  ON "QueryCache"("tenantId", "pinned", "lastUsedAt" DESC);
