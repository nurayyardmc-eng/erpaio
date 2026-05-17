// ERPAIO dashboard i18n — strongly-typed dictionary
//
// Pattern:
//   - Add new keys here first (typed source-of-truth)
//   - tr.ts is the "complete" reference; en.ts mirrors it
//   - Migrate components incrementally: replace hard-coded TR with t("namespace.key")
//
// To add a new namespace:
//   1. Add `<namespace>: { ... }` block below
//   2. Mirror keys in tr.ts and en.ts
//   3. TS will enforce parity at compile-time

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
    profileName: string;
    profileEmail: string;
    profileSave: string;
    profileSaved: string;
    avatarUpload: string;
    avatarRemove: string;
    avatarHint: string;
    company: string;
    tenantName: string;
    plan: string;
    language: string;
    languageHint: string;
    languageSaved: string;
    whatsapp: string;
    whatsappEnabled: string;
    whatsappTo: string;
    email: string;
    emailEnabled: string;
    emailTo: string;
    alertThreshold: string;
    alertSeverity: string;
    password: string;
    passwordCurrent: string;
    passwordNew: string;
    passwordConfirm: string;
    passwordChange: string;
    passwordChanged: string;
    passwordMismatch: string;
    passwordTooShort: string;
    accountSecurity: string;
    accountSecurityDescription: string;
    accountSecurityLink: string;
    dangerZone: string;
    dangerZoneDescription: string;
    deleteAccount: string;
    deleteAccountConfirmTitle: string;
    deleteAccountConfirmMessage: string;
    deleteAccountConfirmInputLabel: string;
    deleteAccountConfirmInputPlaceholder: string;
    deleteAccountFinal: string;
    deleting: string;
  };
}
