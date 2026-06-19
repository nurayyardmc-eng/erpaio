// END-TO-END engine validation against a real Postgres (synthetic ERP).
//
// Proves the core pipeline with the REAL engine modules:
//   live schema scan → Claude SQL generation → read-only guard (validateSQL)
//   → execution against a real DB → correct rows.
//
// Gated: only runs when BOTH are set, so normal CI skips it:
//   TEST_ERP_DATABASE_URL = postgresql URL of a DB seeded with
//                           load-test/synthetic-erp/seed.sql
//   ANTHROPIC_API_KEY     = a real sk-ant-... key (makes live AI calls)
//
// Run:
//   ANTHROPIC_API_KEY="$(grep ^ANTHROPIC_API_KEY= .env | cut -d= -f2-)" \
//   TEST_ERP_DATABASE_URL="postgresql://USER@localhost:5432/erpaio_test" \
//   npx vitest run src/test/integration/engine-validation.test.ts
//
// Client-constructing modules are imported dynamically INSIDE the tests so a
// skipped run (no env) never constructs the Anthropic client.
import { describe, it, expect } from "vitest";
import { validateSQL } from "@/lib/validators/sql";
import { parseAiResponse } from "@/lib/ai/parseResponse";

const PG_URL = process.env.TEST_ERP_DATABASE_URL;
const KEY = process.env.ANTHROPIC_API_KEY ?? "";
const HAS_AI = KEY.startsWith("sk-ant-");

const QUESTIONS = [
  "İstanbul deposunda stoğu yeniden sipariş noktasının altına düşen ürünler hangileri?",
  "Geçen ay ciroya göre ilk 3 müşteri kim?",
  "Vadesi geçmiş ödenmemiş faturaların toplam tutarı ve müşterileri ne?",
  "Bu ay adet bazında en çok satan 3 ürün hangisi?",
];

async function buildSchemaText(client: import("pg").Client): Promise<string> {
  const { rows } = await client.query<{ table_name: string; column_name: string; data_type: string }>(
    `SELECT table_name, column_name, data_type
       FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position`,
  );
  const byTable = new Map<string, string[]>();
  for (const r of rows) {
    const cols = byTable.get(r.table_name) ?? [];
    cols.push(`${r.column_name} ${r.data_type}`);
    byTable.set(r.table_name, cols);
  }
  return [...byTable.entries()].map(([t, c]) => `${t}(${c.join(", ")})`).join("\n");
}

function systemPrompt(schema: string): string {
  return `Sen bir PostgreSQL uzmanısın. ERP veritabanına Türkçe doğal dil sorularını SQL SELECT sorgusuna çeviriyorsun.

YANIT FORMATI (zorunlu, sadece JSON, başka hiçbir şey yazma):
{"sql": "SELECT ...", "confidence": 0.9, "explanation": "tek cümle", "ambiguity": null}

KESİN KURALLAR:
- Sadece SELECT veya WITH — DROP/DELETE/UPDATE/INSERT/ALTER/EXEC/MERGE YASAK.
- SADECE aşağıdaki şemada listelenen tablo ve kolonları kullan. Şemada olmayan kolon/tablo asla varsayma.
- PostgreSQL sözdizimi: now(), date_trunc('month', now()), interval '1 month', LIMIT.
- "geçen ay" = created_at >= date_trunc('month', now()) - interval '1 month' AND created_at < date_trunc('month', now()).
- "bu ay" = created_at >= date_trunc('month', now()).
- "vadesi geçmiş" = due_date < now() AND status = 'unpaid'.

## CANLI ŞEMA
${schema}`;
}

describe.skipIf(!PG_URL || !HAS_AI)("engine e2e — synthetic ERP", () => {
  it(
    "generates safe, correct SQL for the 4 demo questions and executes it",
    async () => {
      const { Client } = await import("pg");
      const { anthropicClient, MODEL_SONNET } = await import("@/lib/ai/models");

      const { writeFileSync } = await import("node:fs");
      const out: Record<string, unknown>[] = [];
      const client = new Client({ connectionString: PG_URL });
      await client.connect();
      try {
        const schema = await buildSchemaText(client);

        for (const question of QUESTIONS) {
          const msg = await anthropicClient.messages.create({
            model: MODEL_SONNET,
            max_tokens: 1024,
            system: systemPrompt(schema),
            messages: [{ role: "user", content: question }],
          });
          const raw = msg.content
            .map((b) => (b.type === "text" ? b.text : ""))
            .join("");
          const { sql, confidence } = parseAiResponse(raw);

          // HARD invariant 1: read-only guard must accept the generated SQL.
          expect(() => validateSQL(sql), `validateSQL rejected: ${sql}`).not.toThrow();

          // HARD invariant 2: it must execute against the real schema with no
          // hallucinated tables/columns (schema-awareness proof).
          const result = await client.query(sql);

          out.push({ question, confidence, sql, rowCount: result.rows.length, rows: result.rows });
          // Row-count correctness is judged from the written output (AI phrasing
          // varies); the hard invariants are safety + execution.
        }
      } finally {
        await client.end();
        if (process.env.ENGINE_VAL_OUT) {
          writeFileSync(process.env.ENGINE_VAL_OUT, JSON.stringify(out, null, 2));
        }
      }
    },
    120_000,
  );
});
