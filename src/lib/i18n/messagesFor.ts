/**
 * Server-safe locale → Dictionary lookup.
 *
 * Use inside generateMetadata() and other server components which cannot
 * import context.tsx (client-only). For client components, use useI18n()
 * from ./context.tsx instead.
 */
import { DEFAULT_LOCALE, type Dictionary, type Locale } from "./dictionary";
import { tr } from "./tr";
import { en } from "./en";

const DICTS: Record<Locale, Dictionary> = { tr, en };

export function messagesFor(locale: Locale): Dictionary {
  return DICTS[locale] ?? DICTS[DEFAULT_LOCALE];
}
