// Server-side i18n — Request → Locale resolver + typed message catalog.
//
// Order of precedence for resolving the locale of a request:
//   1. `erpaio_lang` cookie (set by the dashboard language switcher)
//   2. `Accept-Language` header (first supported locale from quality order)
//   3. DEFAULT_LOCALE
//
// Usage in an API route:
//   const m = await messages(req);
//   return Response.json({ error: m.api.unauthorized }, { status: 401 });

import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type Locale } from "./dictionary";

/* ------------------------------------------------------------------ */
/* Server message catalog — kept separate from the client Dictionary  */
/* because these are error-codes the server emits (caller-facing).    */
/* ------------------------------------------------------------------ */

export interface ServerMessages {
  api: {
    unauthorized: string;
    forbidden: string;
    notFound: string;
    invalidBody: string;
    rateLimited: string;
    serverError: string;
    networkError: string;
    payloadTooLarge: string;
  };
  auth: {
    invalidCredentials: string;
    accountLocked: string;
    mfaRequired: string;
    mfaInvalid: string;
    emailTaken: string;
    weakPassword: string;
    invalidToken: string;
    emailNotVerified: string;
  };
  validation: {
    required: string;
    invalidEmail: string;
    invalidUrl: string;
    invalidNumber: string;
    tooShort: string;
    tooLong: string;
  };
}

const SERVER_TR: ServerMessages = {
  api: {
    unauthorized: "Yetkisiz.",
    forbidden: "Bu işlem için yetkiniz yok.",
    notFound: "Bulunamadı.",
    invalidBody: "Geçersiz veri.",
    rateLimited: "Çok sık istek. Lütfen daha sonra tekrar deneyin.",
    serverError: "Sunucu hatası.",
    networkError: "Ağ hatası.",
    payloadTooLarge: "İstek boyutu çok büyük.",
  },
  auth: {
    invalidCredentials: "Email veya şifre hatalı.",
    accountLocked: "Hesap geçici olarak kilitlendi (15 dk).",
    mfaRequired: "İki faktörlü doğrulama gerekli.",
    mfaInvalid: "Doğrulama kodu yanlış.",
    emailTaken: "Bu email zaten kullanımda.",
    weakPassword: "Şifre en az 8 karakter olmalı.",
    invalidToken: "Geçersiz veya süresi dolmuş token.",
    emailNotVerified: "Lütfen önce email adresinizi doğrulayın.",
  },
  validation: {
    required: "Bu alan zorunlu.",
    invalidEmail: "Geçerli bir email girin.",
    invalidUrl: "Geçerli bir URL girin.",
    invalidNumber: "Geçerli bir sayı girin.",
    tooShort: "Çok kısa.",
    tooLong: "Çok uzun.",
  },
};

const SERVER_EN: ServerMessages = {
  api: {
    unauthorized: "Unauthorized.",
    forbidden: "You don't have permission for this action.",
    notFound: "Not found.",
    invalidBody: "Invalid data.",
    rateLimited: "Too many requests. Please try again later.",
    serverError: "Server error.",
    networkError: "Network error.",
    payloadTooLarge: "Request payload too large.",
  },
  auth: {
    invalidCredentials: "Invalid email or password.",
    accountLocked: "Account temporarily locked (15 min).",
    mfaRequired: "Two-factor authentication required.",
    mfaInvalid: "Verification code incorrect.",
    emailTaken: "This email is already in use.",
    weakPassword: "Password must be at least 8 characters.",
    invalidToken: "Invalid or expired token.",
    emailNotVerified: "Please verify your email address first.",
  },
  validation: {
    required: "This field is required.",
    invalidEmail: "Enter a valid email.",
    invalidUrl: "Enter a valid URL.",
    invalidNumber: "Enter a valid number.",
    tooShort: "Too short.",
    tooLong: "Too long.",
  },
};

const SERVER: Record<Locale, ServerMessages> = {
  tr: SERVER_TR,
  en: SERVER_EN,
};

/* ------------------------------------------------------------------ */
/* Locale resolution                                                  */
/* ------------------------------------------------------------------ */

/** Parse `erpaio_lang=tr` from a Cookie header. */
function localeFromCookieHeader(cookieHeader: string | null): Locale | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/(?:^|;\s*)erpaio_lang=([^;]+)/);
  const v = match?.[1];
  if (v && SUPPORTED_LOCALES.includes(v as Locale)) return v as Locale;
  return null;
}

/**
 * Parse an Accept-Language header and return the first supported locale.
 * Honors q-values: `tr-TR,en;q=0.8` → "tr".
 */
function localeFromAcceptLanguage(header: string | null): Locale | null {
  if (!header) return null;
  const parts = header
    .split(",")
    .map((p) => {
      const [tag, ...params] = p.trim().split(";");
      const q = params
        .map((s) => s.trim())
        .find((s) => s.startsWith("q="))
        ?.slice(2);
      return { tag: tag.toLowerCase(), q: q ? parseFloat(q) : 1.0 };
    })
    .filter((p) => p.tag)
    .sort((a, b) => b.q - a.q);

  for (const { tag } of parts) {
    const base = tag.split("-")[0];
    if (SUPPORTED_LOCALES.includes(base as Locale)) return base as Locale;
  }
  return null;
}

/** Resolve a Locale from a Request. */
export function resolveLocale(req: Request): Locale {
  return (
    localeFromCookieHeader(req.headers.get("cookie")) ??
    localeFromAcceptLanguage(req.headers.get("accept-language")) ??
    DEFAULT_LOCALE
  );
}

/**
 * Resolve a Locale from a Headers-like object (e.g. next/headers `headers()`).
 * Use this inside generateMetadata() server functions which can't access Request directly.
 */
export function resolveLocaleFromHeaders(h: { get: (name: string) => string | null }): Locale {
  return (
    localeFromCookieHeader(h.get("cookie")) ??
    localeFromAcceptLanguage(h.get("accept-language")) ??
    DEFAULT_LOCALE
  );
}

/** Look up the server message catalog for a request. */
export function serverMessages(req: Request): ServerMessages {
  return SERVER[resolveLocale(req)];
}

/** Convenience helper — `return jsonError(req, "api.unauthorized", 401)`. */
export function jsonError(
  req: Request,
  key: ServerMessageKey,
  status: number,
): Response {
  const [ns, name] = key.split(".") as [keyof ServerMessages, string];
  const msgs = serverMessages(req);
  const error = (msgs[ns] as Record<string, string>)[name] ?? msgs.api.serverError;
  return Response.json({ error }, { status });
}

/**
 * Endpoint-specific localized error response.
 * Use when the error message is unique to one endpoint and doesn't belong
 * in the shared ServerMessages catalog.
 *
 *   return localizedError(req, 400, { tr: "Önce X yapın.", en: "Do X first." });
 */
export function localizedError(
  req: Request,
  status: number,
  texts: Record<Locale, string>,
): Response {
  const locale = resolveLocale(req);
  return Response.json({ error: texts[locale] }, { status });
}

/** Dot-path keys into ServerMessages — `"api.unauthorized"`, `"auth.mfaInvalid"`, etc. */
export type ServerMessageKey =
  | `api.${keyof ServerMessages["api"]}`
  | `auth.${keyof ServerMessages["auth"]}`
  | `validation.${keyof ServerMessages["validation"]}`;
