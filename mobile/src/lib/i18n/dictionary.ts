// ERPAIO mobile i18n — mirror of web dictionary
// Keep keys in sync with src/lib/i18n/dictionary.ts (web).

export type Locale = "tr" | "en";

export const SUPPORTED_LOCALES: Locale[] = ["tr", "en"];
export const DEFAULT_LOCALE: Locale = "tr";

export const LOCALE_LABELS: Record<Locale, string> = {
  tr: "Türkçe",
  en: "English",
};

export interface Dictionary {
  common: {
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    loading: string;
    saving: string;
    saved: string;
    error: string;
    networkError: string;
    back: string;
    confirm: string;
    yes: string;
    no: string;
  };
  settings: {
    title: string;
    profile: string;
    language: string;
    languageHint: string;
    languageSaved: string;
    logout: string;
    logoutConfirm: string;
  };
  menu: {
    title: string;
    sectionDaily: string;
    sectionSetup: string;
    sectionAnalysis: string;
    sectionAdmin: string;
  };
}
