// END-TO-END on-prem agent transport validation (in-process, no running server).
//
// Proves the full agent round-trip with the REAL cloud code:
//   queryERP (agent mode) → enqueueAgentJob → [agent: token-authed GET
//   /jobs/next handler → execute SQL on a real Postgres → POST /jobs/[id]/result
//   handler] → completeJob → waitForAgentJob resolves with the rows.
//
// The "agent" is simulated by calling the actual route handlers with a Bearer
// token, so auth + tenant-boundary + queue state machine are all exercised.
// No AI is involved here (deterministic demo SQL) — this isolates TRANSPORT.
//
// Gated: only runs with AGENT_E2E=1 + TEST_ERP_DATABASE_URL, AND the app DB
// (DATABASE_URL) must be the local erpaio_app — a hard guard refuses anything
// else so this can never touch prod.
//
// Run:
//   APP="postgresql://$(whoami)@localhost:5432/erpaio_app"
//   AGENT_E2E=1 DATABASE_URL="$APP" DIRECT_URL="$APP" \
//   TEST_ERP_DATABASE_URL="postgresql://$(whoami)@localhost:5432/erpaio_test" \
//   npx vitest run src/test/integration/agent-e2e.test.ts
import { describe, it, expect } from "vitest";

const PG_URL = process.env.TEST_ERP_DATABASE_URL;
const APP_URL = process.env.DATABASE_URL ?? "";
const GATED = process.env.AGENT_E2E === "1" && !!PG_URL;

// Deterministic demo SQL #3 (overdue unpaid invoices) — known 3-row answer.
const SQL =
  "SELECT c.name AS customer_name, SUM(i.amount) AS total_overdue " +
  "FROM invoices i JOIN customers c ON i.customer_id = c.id " +
  "WHERE i.due_date < now() AND i.status = 'unpaid' " +
  "GROUP BY c.name ORDER BY total_overdue DESC";

describe.skipIf(!GATED)("agent transport e2e", () => {
  it(
    "routes an agent-mode query through the queue + token-authed handlers",
    async () => {
      // HARD safety guard: never run against a non-local app DB.
      if (!APP_URL.includes("erpaio_app")) {
        throw new Error(`refusing: DATABASE_URL must be local erpaio_app, got "${APP_URL}"`);
      }

      const pg = (await import("pg")).default;
      const { prisma } = await import("@/lib/db/prisma");
      const { createAgentToken } = await import("@/lib/agent/createAgentToken");
      const { queryERP } = await import("@/lib/db/connector");
      const nextRoute = await import("@/app/api/agent/jobs/next/route");
      const resultRoute = await import("@/app/api/agent/jobs/[id]/result/route");

      // Declared out here so the finally can always clean up, even if pool
      // creation or seeding throws.
      let erpPool: import("pg").Pool | undefined;
      let tenantId: string | undefined;
      try {
        const pool = new pg.Pool({ connectionString: PG_URL, max: 2 });
        erpPool = pool;

        // 1) Seed cloud state: tenant + connection, then mint agent token
        //    (which also flips the connection into "agent" mode).
        const slug = `agent-e2e-${Date.now()}`;
        const tenant = await prisma.tenant.create({ data: { name: "Agent E2E", slug } });
        tenantId = tenant.id;
        const conn = await prisma.erpConnection.create({
          data: {
            tenantId: tenant.id,
            erpType: "postgres",
            host: "on-prem-unused",
            dbName: "unused",
            username: "unused",
            passwordEnc: "unused", // agent holds the real creds, not the cloud
          },
          select: { id: true },
        });
        const { raw: token } = await createAgentToken(tenant.id, conn.id, "e2e");
        const authHeaders = { authorization: `Bearer ${token}`, "content-type": "application/json" };

        // 2) Caller side: agent-mode queryERP enqueues + waits for the result.
        const callerPromise = queryERP(conn.id, SQL);

        // 3) Agent side: drive the REAL handlers until the job is processed.
        let processed = false;
        const agentLoop = (async () => {
          for (let i = 0; i < 100 && !processed; i++) {
            const res = await nextRoute.GET(
              new Request("http://local/api/agent/jobs/next", { headers: authHeaders }),
            );
            if (res.status === 200) {
              const job = (await res.json()) as { id: string; sql: string };
              const out = await pool.query(job.sql);
              await resultRoute.POST(
                new Request(`http://local/api/agent/jobs/${job.id}/result`, {
                  method: "POST",
                  headers: authHeaders,
                  body: JSON.stringify({ rows: out.rows }),
                }),
                { params: Promise.resolve({ id: job.id }) },
              );
              processed = true;
              return;
            }
            await new Promise((r) => setTimeout(r, 80));
          }
        })();

        const rows = (await callerPromise) as Array<Record<string, unknown>>;
        await agentLoop;

        // 4) Round-trip correctness: the cloud got the agent's rows back.
        expect(processed, "agent never claimed the job").toBe(true);
        expect(rows.length).toBe(3);
        expect(rows.map((r) => r.customer_name)).toEqual([
          "Tekstil A.Ş.",
          "Mavi Lojistik",
          "Perakende Co.",
        ]);
        expect(Number(rows[0].total_overdue)).toBe(92000);
      } finally {
        if (tenantId) await prisma.tenant.delete({ where: { id: tenantId } }).catch(() => {});
        if (erpPool) await erpPool.end();
      }
    },
    30_000,
  );
});
