// Sprint F.5c — landing locale resolver. Same pattern as /dpa, /privacy,
// /terms (F.7/F.8/F.9): ?lang query param wins, else erpaio_lang cookie,
// else default to "en".

export type Locale = "en" | "tr" | "ar";

export const SUPPORTED_LOCALES: readonly Locale[] = ["en", "tr", "ar"] as const;

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "en" || value === "tr" || value === "ar";
}

/**
 * Pure helper: ?lang query value beats cookie value. Either invalid → "en".
 * Pulled into its own function so the unit test doesn't need cookies()
 * or next/headers — just pass strings.
 */
export function resolveLocale(query: string | undefined, cookie: string | undefined): Locale {
  if (isLocale(query)) return query;
  if (isLocale(cookie)) return cookie;
  return "en";
}
