/**
 * ERP connection types supported in `POST /api/connections`.
 *
 * Track VVVVVVVVVVV — api/connections/route inline z.enum kullaniyordu.
 * ERP listesi UI'da dropdown + backend zod validation icin tek noktada
 * tutulmali; yeni ERP (orn. odoo, netsuite) eklendiginde tek dosya degisir.
 *
 * NOT: dialectFromErpType (lib/db/dialect.ts) farkli bir set'i handle eder
 * (sap_ecc, oracle_ebs gibi profile-specific slug'lar dahil) — bu ERP_TYPES
 * UI seciminde gostermek istedigimiz "kanonik" listedir; dialect helper
 * profile-level kapsami genis tutar.
 */
export const ERP_TYPES = ["nebim_v3", "sap", "dynamics365", "postgres"] as const;
export type ErpType = (typeof ERP_TYPES)[number];
