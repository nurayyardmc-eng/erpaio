"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type Dictionary, type Locale } from "./dictionary";
import { tr } from "./tr";
import { en } from "./en";

const DICTS: Record<Locale, Dictionary> = { tr, en };
const COOKIE_NAME = "erpaio_lang";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 yıl

interface I18nContextValue {
  locale: Locale;
  t: Dictionary;
  setLocale: (next: Locale) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function readCookieLocale(): Locale {
  if (typeof document === "undefined") return DEFAULT_LOCALE;
  const match = document.cookie.match(/(?:^|; )erpaio_lang=([^;]+)/);
  const val = match?.[1];
  if (val && SUPPORTED_LOCALES.includes(val as Locale)) return val as Locale;
  return DEFAULT_LOCALE;
}

function writeCookieLocale(locale: Locale) {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_NAME}=${locale}; max-age=${COOKIE_MAX_AGE}; path=/; SameSite=Lax`;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // Initial render is DEFAULT_LOCALE to avoid hydration mismatch; effect syncs to cookie.
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    const fromCookie = readCookieLocale();
    if (fromCookie !== locale) setLocaleState(fromCookie);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLocale = useCallback((next: Locale) => {
    writeCookieLocale(next);
    setLocaleState(next);
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({ locale, t: DICTS[locale], setLocale }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Tolerant fallback: components used outside provider still render in default locale.
    return { locale: DEFAULT_LOCALE, t: DICTS[DEFAULT_LOCALE], setLocale: () => {} };
  }
  return ctx;
}

/** Convenience hook — `const t = useT(); t.settings.title` */
export function useT(): Dictionary {
  return useI18n().t;
}
