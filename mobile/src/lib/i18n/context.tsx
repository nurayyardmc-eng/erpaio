import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type Dictionary, type Locale } from "./dictionary";
import { tr } from "./tr";
import { en } from "./en";

const DICTS: Record<Locale, Dictionary> = { tr, en };
const STORAGE_KEY = "erpaio_lang_v1";

interface I18nContextValue {
  locale: Locale;
  t: Dictionary;
  setLocale: (next: Locale) => Promise<void>;
  ready: boolean;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!mounted) return;
        if (stored && SUPPORTED_LOCALES.includes(stored as Locale)) {
          setLocaleState(stored as Locale);
        }
        setReady(true);
      })
      .catch(() => setReady(true));
    return () => {
      mounted = false;
    };
  }, []);

  const setLocale = useCallback(async (next: Locale) => {
    setLocaleState(next);
    await AsyncStorage.setItem(STORAGE_KEY, next);
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({ locale, t: DICTS[locale], setLocale, ready }),
    [locale, setLocale, ready],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    return {
      locale: DEFAULT_LOCALE,
      t: DICTS[DEFAULT_LOCALE],
      setLocale: async () => {},
      ready: true,
    };
  }
  return ctx;
}

export function useT(): Dictionary {
  return useI18n().t;
}
