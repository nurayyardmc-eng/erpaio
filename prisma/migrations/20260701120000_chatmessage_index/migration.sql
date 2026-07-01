-- ChatMessage had no index at all (not even on its sessionId FK), so history
-- load (session + createdAt) and the cron question→SQL pairing lookup
-- (findLastSqlForQuestion) fell back to sequential scans. IF NOT EXISTS keeps
-- this safe on a db-push'd production DB that may already have it.
CREATE INDEX IF NOT EXISTS "ChatMessage_sessionId_createdAt_idx" ON "ChatMessage"("sessionId", "createdAt");
