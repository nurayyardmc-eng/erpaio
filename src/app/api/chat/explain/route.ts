import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { getAuth } from "@/lib/auth/dual";
import { rateLimit, rateLimited429, RATE_LIMITS } from "@/lib/rateLimit";
import { checkBodySize } from "@/lib/http/bodyLimit";
import { parseJsonBody } from "@/lib/http/searchParams";
import { checkAndConsume, recordUsage, totalAnthropicTokens, budgetExhaustedError } from "@/lib/budget";
import { childLogger } from "@/lib/observability/logger";
import { jsonError } from "@/lib/i18n/server";
import { buildExplainPrompt } from "@/lib/ai/explainPrompt";
import { MODEL_HAIKU, anthropicClient } from "@/lib/ai/models";
import { extractAnthropicText } from "@/lib/ai/extractAnthropicText";


const BodySchema = z.object({
  question: z.string().min(1).max(500),
  sql: z.string().min(1).max(5000),
  topRows: z.array(z.record(z.string(), z.unknown())).max(20),
  totalRows: z.number().int().min(0).max(10_000_000),
});

export async function POST(req: Request) {
  const tooBig = checkBodySize(req);
  if (tooBig) return tooBig;

  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);

  const limit = await rateLimit(session.user.tenantId, RATE_LIMITS.CHAT_EXPLAIN);
  if (!limit.success) return rateLimited429(req, limit);

  const budget = await checkAndConsume(session.user.tenantId, 2000);
  if (!budget.ok) return budgetExhaustedError(req, budget);

  const body = await parseJsonBody(req, BodySchema);
  if (body instanceof Response) return body;

  const { question, sql, topRows, totalRows } = body;
  const log = childLogger({ component: "explain", tenantId: session.user.tenantId });

  try {
    const msg = await anthropicClient.messages.create({
      model: MODEL_HAIKU,
      max_tokens: 350,
      system: "Türkçe iş zekası uzmanısın. SQL sorusunu, üretilen SQL'i ve dönen ilk satırları gör. Türkçe, 2-4 cümlelik kısa bir özet yaz: ne sorgulandı, sonuç ne anlama geliyor, dikkat çekici nokta varsa belirt. Sadece düz metin, başka hiçbir şey yazma. Sayıları yorumla, '%X artış' gibi.",
      messages: [{
        role: "user",
        content: buildExplainPrompt(question, sql, topRows, totalRows),
      }],
    });

    const explanation = extractAnthropicText(msg);

    void recordUsage(session.user.tenantId, totalAnthropicTokens(msg.usage));
    log.info({ length: explanation.length }, "Result explanation generated");
    return Response.json({ explanation });
  } catch (err) {
    Sentry.captureException(err, { tags: { component: "explain" } });
    return Response.json({ explanation: "" });
  }
}
