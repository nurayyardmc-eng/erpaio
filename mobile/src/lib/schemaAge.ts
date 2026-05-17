/**
 * Schema cache age classifier — mobile sürümü.
 *
 * SYNC NOTE: Web ikizi `src/lib/schema/age.ts`. İki dosya birebir aynı
 * kalmalı (vitest mobile/'i dışlıyor; web tarafında test'lenir).
 *
 * ERP schema cache snapshot ne kadar bayatlamış? UI'da renkli badge
 * göstergesi için kullanılır.
 */

export const STALE_DAYS = 7;
export const VERY_STALE_DAYS = 30;

export type SchemaAgeStatus = "fresh" | "stale" | "very-stale" | "never";

export function schemaAgeStatus(
  builtAt: Date | string | null | undefined,
  now: Date = new Date(),
): SchemaAgeStatus {
  if (!builtAt) return "never";
  const built = builtAt instanceof Date ? builtAt : new Date(builtAt);
  if (Number.isNaN(built.getTime())) return "never";
  const ageMs = now.getTime() - built.getTime();
  if (ageMs < 0) return "fresh";
  const ageDays = ageMs / (24 * 60 * 60_000);
  if (ageDays <= STALE_DAYS) return "fresh";
  if (ageDays <= VERY_STALE_DAYS) return "stale";
  return "very-stale";
}

export function schemaAgeRelative(
  builtAt: Date | string | null | undefined,
  now: Date = new Date(),
): { value: number; unit: "hour" | "day" } | null {
  if (!builtAt) return null;
  const built = builtAt instanceof Date ? builtAt : new Date(builtAt);
  if (Number.isNaN(built.getTime())) return null;
  const ageMs = now.getTime() - built.getTime();
  if (ageMs < 0) return { value: 0, unit: "hour" };
  const ageHours = ageMs / (60 * 60_000);
  if (ageHours < 24) return { value: Math.floor(ageHours), unit: "hour" };
  return { value: Math.floor(ageHours / 24), unit: "day" };
}
