// Sprint F.5c — landing locale resolver. ?lang query param wins, else
// erpaio_lang cookie, else default. Default is "tr": the primary market is
// Türkiye, and the root layout already defaults <html lang> to tr, so the
// landing content must match (previously defaulted "en" → mismatch: page
// opened in English by default).

export type Locale = "en" | "tr" | "ar";

export const SUPPORTED_LOCALES: readonly Locale[] = ["en", "tr", "ar"] as const;

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "en" || value === "tr" || value === "ar";
}

/**
 * Pure helper: ?lang query value beats cookie value. Either invalid → "tr"
 * (primary market default). Pulled into its own function so the unit test
 * doesn't need cookies() or next/headers — just pass strings.
 */
export function resolveLocale(query: string | undefined, cookie: string | undefined): Locale {
  if (isLocale(query)) return query;
  if (isLocale(cookie)) return cookie;
  return "tr";
}
