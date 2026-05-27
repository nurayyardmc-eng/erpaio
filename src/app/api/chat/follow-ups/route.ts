import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { getAuth } from "@/lib/auth/dual";
import { rateLimit, rateLimited429, RATE_LIMITS } from "@/lib/rateLimit";
import { checkBodySize } from "@/lib/http/bodyLimit";
import { parseJsonBody } from "@/lib/http/searchParams";
import { checkAndConsume, recordUsage, totalAnthropicTokens, budgetExhaustedError } from "@/lib/budget";
import { MODEL_HAIKU, anthropicClient } from "@/lib/ai/models";
import { extractAnthropicText } from "@/lib/ai/extractAnthropicText";
import { stripCodeFences } from "@/lib/ai/stripCodeFences";
import { childLogger } from "@/lib/observability/logger";
import { jsonError } from "@/lib/i18n/server";


const BodySchema = z.object({
  question: z.string().min(1).max(500),
  sql: z.string().min(1).max(5000),
  rowCount: z.number().int().min(0).max(1_000_000),
});

export async function POST(req: Request) {
  const tooBig = checkBodySize(req);
  if (tooBig) return tooBig;

  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);

  const limit = await rateLimit(session.user.tenantId, RATE_LIMITS.CHAT_FOLLOW_UPS);
  if (!limit.success) return rateLimited429(req, limit);

  const budget = await checkAndConsume(session.user.tenantId, 1500);
  if (!budget.ok) return budgetExhaustedError(req, budget);

  const body = await parseJsonBody(req, BodySchema);
  if (body instanceof Response) return body;

  const { question, sql, rowCount } = body;
  const log = childLogger({ component: "follow-ups", tenantId: session.user.tenantId });

  try {
    const msg = await anthropicClient.messages.create({
      model: MODEL_HAIKU,
      max_tokens: 256,
      system: "Türkçe iş zekası uzmanısın. Kullanıcının az önce sorduğu soruyu ve sonucunu görüp, mantıklı 3 takip sorusu öner. Her biri kısa Türkçe (max 60 karakter), JSON array dön: [\"...\", \"...\", \"...\"]. Başka hiçbir şey yazma.",
      messages: [{
        role: "user",
        content: `Önceki soru: "${question}"\nÜretilen SQL: ${sql.slice(0, 500)}\nDönen satır sayısı: ${rowCount}\n\n3 takip sorusu öner.`,
      }],
    });

    const raw = extractAnthropicText(msg, "[]");

    let suggestions: string[] = [];
    try {
      const cleaned = stripCodeFences(raw);
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) suggestions = parsed.filter((x): x is string => typeof x === "string").slice(0, 3);
    } catch {
      suggestions = [];
    }

    void recordUsage(session.user.tenantId, totalAnthropicTokens(msg.usage));
    log.info({ count: suggestions.length }, "Follow-up suggestions generated");
    return Response.json({ suggestions });
  } catch (err) {
    Sentry.captureException(err, { tags: { component: "follow-ups" } });
    return Response.json({ suggestions: [] });
  }
}
