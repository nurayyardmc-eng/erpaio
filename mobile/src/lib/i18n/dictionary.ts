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
  chat: {
    welcomeGreetingPrefix: string;
    welcomeGreetingSuffix: string;
    welcomeHint: string;
    noConnections: string;
    selectConnection: string;
    inputPlaceholderReady: string;
    inputPlaceholderNoConn: string;
    inputA11y: string;
    sendA11y: string;
    historyA11y: string;
    sending: string;
    errorGeneric: string;
    feedbackUp: string;
    feedbackDown: string;
    feedbackSent: string;
    sqlEdit: string;
    sqlRun: string;
    sqlCancel: string;
    sqlSaveEdit: string;
    shareCopy: string;
    shareCopied: string;
  };
  sessions: {
    title: string;
    tabActive: string;
    tabArchived: string;
    emptyActive: string;
    emptyArchived: string;
    pin: string;
    unpin: string;
    archive: string;
    unarchive: string;
    delete: string;
    deleteConfirmTitle: string;
    deleteConfirmMessagePrefix: string;
    deleteConfirmMessageSuffix: string;
    deleteConfirmYes: string;
    deleteOk: string;
    deleteFailed: string;
    untitled: string;
  };
}
