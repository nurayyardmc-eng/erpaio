// Typed, validated URLSearchParams parsing for API routes.
//
// Avoids the `Number(searchParams.get(...) ?? "")` / `new Date(maybeInvalid)`
// trap by routing all query-string parsing through a Zod schema. Coercion
// happens at the schema layer; bad input gets a uniform 400 response.
//
// Usage:
//   const QuerySchema = z.object({
//     limit: zNumber({ min: 1, max: 500, default: 100 }),
//     before: zIsoDate().optional(),
//     role: z.enum(["user", "assistant"]).optional(),
//   });
//   const parsed = parseQuery(req, QuerySchema);
//   if (parsed instanceof Response) return parsed; // 400 already formed
//   // parsed is fully typed

import { z, type ZodError, type ZodTypeAny } from "zod";
import { jsonError, localizedError } from "@/lib/i18n/server";

// Validation messages stay in English (locale-neutral) — they're rare path:
// frontends validate first, and zodErrorResponse passes the message verbatim
// for both tr/en. Real i18n needs a full Zod issue → catalog mapper; out of
// scope for this helper.

/** Number coercion with bounds + default. Rejects NaN/Infinity. */
export function zNumber(opts?: { min?: number; max?: number; default?: number; int?: boolean }) {
  let s: z.ZodType<number> = z.coerce.number().refine(Number.isFinite, "Invalid number");
  if (opts?.int) s = (s as z.ZodNumber).int();
  if (opts?.min !== undefined) s = (s as z.ZodNumber).min(opts.min);
  if (opts?.max !== undefined) s = (s as z.ZodNumber).max(opts.max);
  if (opts?.default !== undefined) {
    return s.default(opts.default);
  }
  return s;
}

/** Boolean from "true"/"false"/"1"/"0" — strict, no truthy coercion. */
export function zBoolean(opts?: { default?: boolean }) {
  const s = z
    .string()
    .transform((v) => v.toLowerCase())
    .refine((v) => ["true", "false", "1", "0"].includes(v), "Expected boolean (true|false|1|0)")
    .transform((v) => v === "true" || v === "1");
  if (opts?.default !== undefined) {
    return s.default(opts.default);
  }
  return s;
}

/** ISO 8601 date string → Date. Rejects Invalid Date. */
export function zIsoDate() {
  return z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid ISO date")
    .transform((v) => new Date(v));
}

/** Cursor-style cuid identifier (or sufficiently restrictive token). */
export function zCuid() {
  return z.string().min(1).max(48).regex(/^[a-z0-9_-]+$/i, "Invalid id");
}

/**
 * Parse a Request's URL search params against a Zod schema.
 * Returns the parsed value, OR a 400 Response if validation failed.
 *
 * The caller checks `instanceof Response` and returns it directly.
 */
export function parseQuery<S extends ZodTypeAny>(req: Request, schema: S):
  z.infer<S> | Response
{
  const url = new URL(req.url);
  const raw: Record<string, string | undefined> = {};
  for (const [k, v] of url.searchParams.entries()) raw[k] = v;
  const result = schema.safeParse(raw);
  if (!result.success) {
    return zodErrorResponse(req, result.error);
  }
  return result.data;
}

/**
 * Parse a JSON body against a Zod schema. Returns parsed value or a 400 Response.
 * Caller checks instanceof Response.
 */
export async function parseJsonBody<S extends ZodTypeAny>(req: Request, schema: S):
  Promise<z.infer<S> | Response>
{
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return jsonError(req, "api.invalidBody", 400);
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    return zodErrorResponse(req, result.error);
  }
  return result.data;
}

/**
 * Empty-data response for partial PATCH endpoints.
 *
 * Track KKKKKKKKK — 2 PATCH route (watchlists/[id], scheduled-reports/[id])
 * IDENTIK 4-satirlik blok yapiyordu:
 *   if (Object.keys(data).length === 0) {
 *     return localizedError(req, 400, {
 *       tr: "Güncellenecek alan yok.",
 *       en: "No fields to update.",
 *     });
 *   }
 *
 * Empty PATCH is logically a no-op — returning 400 protects clients
 * from silent partial updates. This helper centralizes the wording.
 */
export function noFieldsToUpdateError(req: Request): Response {
  return localizedError(req, 400, {
    tr: "Güncellenecek alan yok.",
    en: "No fields to update.",
  });
}

/**
 * Pull the required `id` query param. Returns `{ id }` or a 400 Response.
 *
 * Track LLLLLLLLLL — 4 DELETE route (watchlists, scheduled-reports,
 * custom-metrics, security/allowlist) AYNI 3 satırı tekrar ediyordu:
 *
 *   const { searchParams } = new URL(req.url);
 *   const id = searchParams.get("id");
 *   if (!id) return localizedError(req, 400, { tr: "id gerekli.", en: "id required." });
 *
 * Caller pattern: `const r = getRequiredIdParam(req); if (r instanceof
 * Response) return r; const { id } = r;` — parseJsonBody ile aynı kontrat.
 */
export function getRequiredIdParam(req: Request): { id: string } | Response {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return localizedError(req, 400, { tr: "id gerekli.", en: "id required." });
  }
  return { id };
}

/**
 * Common "Kullanıcı bulunamadı." 404. Track VVVVVVVVV.
 * Used by: me/password, me/notification-prefs, tenant/delete, team/route.
 */
export function userNotFoundError(req: Request): Response {
  return localizedError(req, 404, {
    tr: "Kullanıcı bulunamadı.",
    en: "User not found.",
  });
}

/**
 * Common "Tenant bulunamadı." 404. Track VVVVVVVVV.
 * Used by: billing/checkout, team/invite.
 */
export function tenantNotFoundError(req: Request): Response {
  return localizedError(req, 404, {
    tr: "Tenant bulunamadı.",
    en: "Tenant not found.",
  });
}

/**
 * Common "Watchlist bulunamadı." 404. Track MMMMMMMMMM.
 * Used by: watchlists/[id] (PATCH), watchlists/[id]/triggers,
 * watchlists/[id]/run. Tenant-scope ownership check sonrası
 * count==0 / row==null path'lerinde aynı i18n string'i veriyorlardı.
 */
export function watchlistNotFoundError(req: Request): Response {
  return localizedError(req, 404, {
    tr: "Watchlist bulunamadı.",
    en: "Watchlist not found.",
  });
}

/**
 * Common "Bağlantı bulunamadı." 404. Track NNNNNNNNNN.
 * Used by: connections/[id] (DELETE/PATCH), connections/[id]/sync,
 * lib/db/erpConnection assertOwnedConnection. Tenant-scope ownership
 * check fail edince üç yer aynı i18n string'i veriyordu.
 */
export function connectionNotFoundError(req: Request): Response {
  return localizedError(req, 404, {
    tr: "Bağlantı bulunamadı.",
    en: "Connection not found.",
  });
}

/**
 * Common "Aktif bağlantı bulunamadı." 404. Track OOOOOOOOOO.
 * Used by: chat/route, chat/stream, chat/run-sql. Üçü aynı `findFirst
 * status: "active"` ile bağlantı arıyor, null sonrası aynı i18n string.
 * connectionNotFoundError'dan ayrı kalmalı: "aktif" filtresi semantik fark
 * yaratır — kullanıcı bağlantısı var ama paused/disabled olabilir.
 */
export function activeConnectionNotFoundError(req: Request): Response {
  return localizedError(req, 404, {
    tr: "Aktif bağlantı bulunamadı.",
    en: "No active connection found.",
  });
}

/**
 * Common "Geçersiz soru." 400. Track PPPPPPPPPP.
 * Used by: chat/route, chat/stream — detectInjection(question) true
 * dönünce kullanıcı sorusu reddedilir. Prompt injection defense
 * boundary — i18n string'i tek noktada tutmak audit/log için kritik.
 */
export function invalidQuestionError(req: Request): Response {
  return localizedError(req, 400, {
    tr: "Geçersiz soru.",
    en: "Invalid question.",
  });
}

/**
 * Common "Mevcut şifre hatalı." 400. Track RRRRRRRRRR.
 * Used by: me/password (change), me/email/request-change. Hassas
 * security-boundary mesaji — wording'in iki yerde drift etmemesi
 * kullaniciyi confuse etmemek + audit log korelasyonu icin onemli.
 */
export function incorrectPasswordError(req: Request): Response {
  return localizedError(req, 400, {
    tr: "Mevcut şifre hatalı.",
    en: "Current password is incorrect.",
  });
}

/**
 * Common "Sorgu bulunamadı." 404. Track FFFFFFFFFFFF.
 * Used by: saved-queries/[id] DELETE, saved-queries/[id]/pin POST.
 * Daha önce iki yerde farklı wording vardı:
 *   "Sorgu bulunamadı." / "Query not found."
 *   "Kayıtlı sorgu bulunamadı." / "Saved query not found."
 * Aynı kavram (QueryCache satırı tenant-scope ile bulunamadı); kısa
 * formu unify ettik.
 */
export function savedQueryNotFoundError(req: Request): Response {
  return localizedError(req, 404, {
    tr: "Sorgu bulunamadı.",
    en: "Query not found.",
  });
}

/**
 * Common "Bu soru için chat geçmişinde SQL bulunamadı." 422. Track SSSSSSSSSS.
 * Used by: watchlists/[id]/run, scheduled-reports/[id]/run. Manuel run
 * akışı için: önce chat'te aynı soruyu sorup başarılı bir
 * assistant mesajı oluşturmak gerekir. 422 (Unprocessable Entity):
 * request iyi formatta ama prerequisite yok.
 */
export function sqlNotInHistoryError(req: Request): Response {
  return localizedError(req, 422, {
    tr: "Bu soru için chat geçmişinde SQL bulunamadı. Önce sohbette soruyu sorun.",
    en: "No SQL found in chat history for this question. Ask it in chat first.",
  });
}

/**
 * Common "SQL hatası: ..." 500. Track UUUUUUUUUU.
 * Used by: watchlists/[id]/run, scheduled-reports/[id]/run,
 * custom-metrics/[id]/run. ERP query (queryERP) try/catch'inde 3
 * yer aynı mesajı veriyordu. err.message kullanıcıya gösterilmesi
 * ERP-side hatalarda diagnostic (örn. "table doesn't exist") — bu
 * preview/run akışında acceptable çünkü kullanıcı kendi connection'una
 * sorgu yolluyor; chat route'unda gizleniyor (farklı endpoint).
 */
export function sqlExecutionError(req: Request, err: unknown): Response {
  return localizedError(req, 500, {
    tr: err instanceof Error ? `SQL hatası: ${err.message}` : "SQL hatası",
    en: err instanceof Error ? `SQL error: ${err.message}` : "SQL error",
  });
}

function zodErrorResponse(req: Request, err: ZodError): Response {
  const issue = err.issues[0];
  const field = issue?.path?.join(".");
  // Fallback msg English; specific issue.message yine de TR olabilir (refine
  // çağrılarındaki custom message'lar). User-facing message i18n catalog
  // üzerinden değil, Zod issue üzerinden geliyor — frontend validate-before-
  // submit pattern'ı bu sayfayı nadir görür.
  const msg = issue?.message ?? "Invalid input";
  return localizedError(req, 400, {
    tr: field ? `${field}: ${msg}` : msg,
    en: field ? `${field}: ${msg}` : msg,
  });
}
