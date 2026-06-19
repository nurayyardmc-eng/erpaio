// Mock on-prem agent (Node) — verifies the Phase-1 agent transport end-to-end
// without needing the Go binary. It plays the agent's role: poll the cloud for
// jobs, run the SQL against a local Postgres, post the result back.
//
// Pairs with seed.sql: load that into a throwaway Postgres, mint an agent token
// in the dashboard ("Set up agent" on a connection), then run this. Ask the 4
// demo questions in chat → AI SQL flows through the queue → real rows.
//
// Usage:
//   AGENT_TOKEN=erpaio_... \
//   TEST_PG_URL="postgresql://user:pass@host:5432/postgres" \
//   CLOUD=http://localhost:3000 \
//   node load-test/synthetic-erp/mock-agent.mjs
//
// This is a DEV/verification tool only — the real agent is agent/ (Go), which
// additionally validates SQL locally, audits, and runs as a service.

import pg from "pg";

const CLOUD = process.env.CLOUD ?? "http://localhost:3000";
const TOKEN = process.env.AGENT_TOKEN;
const PG_URL = process.env.TEST_PG_URL;
const POLL_MS = 1000;

if (!TOKEN || !PG_URL) {
  console.error("Set AGENT_TOKEN and TEST_PG_URL (see file header).");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: PG_URL, max: 2 });
const headers = { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" };

// Minimal defense-in-depth — refuse anything that isn't a plain read. The real
// Go agent ports the full validators/sql.ts blocklist.
function isReadOnly(sql) {
  const s = sql.trim().toLowerCase();
  if (!/^(select|with)\b/.test(s)) return false;
  return !/\b(insert|update|delete|drop|alter|create|truncate|exec|execute|merge|grant|revoke)\b/.test(s);
}

async function postResult(id, body) {
  await fetch(`${CLOUD}/api/agent/jobs/${id}/result`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

async function tick() {
  const res = await fetch(`${CLOUD}/api/agent/jobs/next`, { headers });
  if (res.status === 204) return false;
  if (res.status === 401) throw new Error("Unauthorized — check AGENT_TOKEN");
  if (!res.ok) throw new Error(`poll failed: ${res.status}`);

  const job = await res.json();
  console.log(`[job ${job.id}] ${job.sql.replace(/\s+/g, " ").slice(0, 80)}`);
  try {
    if (!isReadOnly(job.sql)) throw new Error("rejected by local read-only guard");
    const result = await pool.query(job.sql);
    await postResult(job.id, { rows: result.rows });
    console.log(`[job ${job.id}] → ${result.rows.length} rows`);
  } catch (err) {
    await postResult(job.id, { error: err instanceof Error ? err.message : String(err) });
    console.log(`[job ${job.id}] → error: ${err.message ?? err}`);
  }
  return true;
}

console.log(`Mock agent polling ${CLOUD} … (Ctrl-C to stop)`);
for (;;) {
  try {
    const had = await tick();
    if (!had) await new Promise((r) => setTimeout(r, POLL_MS));
  } catch (err) {
    console.error("poll error:", err.message ?? err);
    await new Promise((r) => setTimeout(r, POLL_MS * 3));
  }
}
