/**
 * Coerce arbitrary value to a Prisma-safe JSON shape.
 *
 * Track CCCCCCCCCCC — 3 site AYNI `JSON.parse(JSON.stringify(x))` round-trip
 * yapiyordu Prisma Json field'i icin:
 *   * app/api/custom-metrics/route.ts (POST upsert, create+update branch)
 *   * app/api/cron/anomaly-detection/route.ts (finalizeCronRun metadata)
 *
 * Niye round-trip: Prisma'nin `Json` / `InputJsonValue` tipi sadece serialize-
 * edilebilir degerleri kabul eder. Round-trip su shape farklarini siler:
 *   * `undefined` field'lari (JSON spec icermez)
 *   * fonksiyonlar
 *   * BigInt (TypeError firlatir — ama bu helper'in scope'unda zaten yok)
 *   * Symbol-keyed property'ler
 *   * non-finite numbers (NaN/Infinity -> null)
 *
 * structuredClone DEGIL: structuredClone Date/Map/Set/etc'i de korur, fakat
 * Prisma Json field'i bunlari kabul etmez. JSON round-trip net sekilde sadece
 * JSON-safe shape uretir.
 *
 * NOT: Big payload'lar icin double-allocation maliyetli (1 string + 1 parsed
 * object). Cron metadata + config gibi <10KB veriler icin acceptable.
 */
import type { Prisma } from "@prisma/client";

export function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
