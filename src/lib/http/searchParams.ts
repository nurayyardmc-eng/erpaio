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
