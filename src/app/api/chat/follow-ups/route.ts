import * as Sentry from "@sentry/nextjs";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { getAuth } from "@/lib/auth/dual";
import { rateLimit, RATE_LIMITS } from "@/lib/rateLimit";
import { checkBodySize } from "@/lib/http/bodyLimit";
import { checkAndConsume, recordUsage } from "@/lib/budget";
import { childLogger } from "@/lib/observability/logger";

const client = new Anthropic();

const BodySchema = z.object({
  question: z.string().min(1).max(500),
  sql: z.string().min(1).max(5000),
  rowCount: z.number().int().min(0).max(1_000_000),
});

export async function POST(req: Request) {
  const tooBig = checkBodySize(req);
  if (tooBig) return tooBig;

  const session = await getAuth(req);
  if (!session?.user) return Response.json({ error: "Yetkisiz." }, { status: 401 });

  const limit = await rateLimit(session.user.tenantId, {
    prefix: "follow-ups",
    max: 30,
    windowMs: 60_000,
  });
  if (!limit.success) return Response.json({ error: "Rate limit." }, { status: 429 });

  const budget = await checkAndConsume(session.user.tenantId, 1500);
  if (!budget.ok) return Response.json({ error: budget.reason }, { status: 402 });

  const body = BodySchema.safeParse(await req.json());
  if (!body.success) return Response.json({ error: body.error.issues[0]?.message ?? "Geçersiz veri" }, { status: 400 });

  const { question, sql, rowCount } = body.data;
  const log = childLogger({ component: "follow-ups", tenantId: session.user.tenantId });

  try {
    const msg = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 256,
      system: "Türkçe iş zekası uzmanısın. Kullanıcının az önce sorduğu soruyu ve sonucunu görüp, mantıklı 3 takip sorusu öner. Her biri kısa Türkçe (max 60 karakter), JSON array dön: [\"...\", \"...\", \"...\"]. Başka hiçbir şey yazma.",
      messages: [{
        role: "user",
        content: `Önceki soru: "${question}"\nÜretilen SQL: ${sql.slice(0, 500)}\nDönen satır sayısı: ${rowCount}\n\n3 takip sorusu öner.`,
      }],
    });

    const block = msg.content.find((b) => b.type === "text");
    const raw = (block && "text" in block ? block.text : "")?.trim() ?? "[]";

    let suggestions: string[] = [];
    try {
      const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) suggestions = parsed.filter((x): x is string => typeof x === "string").slice(0, 3);
    } catch {
      suggestions = [];
    }

    void recordUsage(session.user.tenantId, msg.usage.input_tokens + msg.usage.output_tokens);
    log.info({ count: suggestions.length }, "Follow-up suggestions generated");
    return Response.json({ suggestions });
  } catch (err) {
    Sentry.captureException(err, { tags: { component: "follow-ups" } });
    return Response.json({ suggestions: [] });
  }
}
