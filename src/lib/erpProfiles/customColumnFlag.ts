import { queryERP } from "@/lib/db/connector";
import { loadProfile, type ErpProfile } from "@/lib/erpProfiles";

export interface CustomItem {
  type: "table" | "column";
  table: string;
  column?: string;
  dataType?: string;
  reason: string;
}

interface SchemaRow {
  TABLE_NAME: string;
  COLUMN_NAME: string;
  DATA_TYPE: string;
}

export async function findCustomItems(
  connectionId: string,
  profileSlug: string,
): Promise<CustomItem[]> {
  const profile = loadProfile(profileSlug);
  if (!profile) return [];

  const rows = (await queryERP(
    connectionId,
    `SELECT c.TABLE_NAME, c.COLUMN_NAME, c.DATA_TYPE
     FROM INFORMATION_SCHEMA.COLUMNS c
     JOIN INFORMATION_SCHEMA.TABLES t ON c.TABLE_NAME = t.TABLE_NAME
     WHERE t.TABLE_TYPE = 'BASE TABLE'`,
  )) as SchemaRow[];

  const customs: CustomItem[] = [];
  const seenTables = new Set<string>();

  for (const r of rows) {
    if (!seenTables.has(r.TABLE_NAME)) {
      seenTables.add(r.TABLE_NAME);
      if (!isCanonicalTable(r.TABLE_NAME, profile)) {
        customs.push({
          type: "table",
          table: r.TABLE_NAME,
          reason: tableReason(r.TABLE_NAME),
        });
      }
    }

    if (isCanonicalTable(r.TABLE_NAME, profile)) {
      const def = profile.canonical_tables[r.TABLE_NAME];
      if (def) {
        const known = new Set(def.important_columns.map((c) => c.name.toLowerCase()));
        if (!known.has(r.COLUMN_NAME.toLowerCase())) {
          customs.push({
            type: "column",
            table: r.TABLE_NAME,
            column: r.COLUMN_NAME,
            dataType: r.DATA_TYPE,
            reason: "Profile'da tanımlı değil — müşteri özel alanı olabilir",
          });
        }
      }
    }
  }

  return customs;
}

function isCanonicalTable(name: string, profile: ErpProfile): boolean {
  const lower = name.toLowerCase();
  return Object.keys(profile.canonical_tables).some((t) => t.toLowerCase() === lower);
}

function tableReason(name: string): string {
  if (/_(ozel|custom|user|temp|bk|backup|old|test)$/i.test(name)) {
    return "Adından özel/yedek tablo gibi görünüyor";
  }
  if (/^z_/i.test(name) || /^x_/i.test(name)) {
    return "Z_/X_ prefix — genellikle müşteri özel tabloları";
  }
  return "Profile'da tanımlı değil";
}
