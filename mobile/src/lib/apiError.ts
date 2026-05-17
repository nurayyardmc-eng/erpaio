// Localize ApiError messages for display.
//
// Usage:
//   const { t } = useI18n();
//   catch (e) {
//     showToast(apiErrorMessage(e, t), "error");
//   }
//
// Server errors (HTTP 4xx/5xx with body.error) already come pre-localized
// (via Accept-Language + cookie). Only client-side codes (timeout, network)
// need translation here.

import { ApiError } from "./api";
import type { Dictionary } from "./i18n/dictionary";

export function apiErrorMessage(err: unknown, t: Dictionary): string {
  if (err instanceof ApiError) {
    switch (err.code) {
      case "timeout":
        return t.api.errTimeout;
      case "network":
        return t.api.errNetwork;
      case "http":
        // Server-localized error (Accept-Language honored by /lib/i18n/server.ts)
        return err.message || t.api.errGeneric;
    }
  }
  if (err instanceof Error) return err.message || t.api.errGeneric;
  return t.api.errGeneric;
}
