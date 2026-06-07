// Sprint P29 — connection config backup/restore (export side).
//
// SECURITY: a config backup must NEVER contain the database password.
// Credentials are stored AES-256-GCM encrypted (passwordEnc) and are
// deliberately excluded from the export; restore re-prompts for the
// password. This builder is pure so the "no secrets leak" guarantee is
// unit-tested.

export const CONFIG_EXPORT_VERSION = 1;

export interface ConnectionRow {
  erpType: string;
  erpProfile: string | null;
  host: string;
  port: number;
  dbName: string;
  username: string;
  // passwordEnc intentionally NOT part of this type — it must never reach
  // the export.
}

export interface ConfigExportItem {
  erpType: string;
  erpProfile: string | null;
  host: string;
  port: number;
  dbName: string;
  username: string;
}

export interface ConfigExport {
  version: number;
  exportedAt: string;
  connections: ConfigExportItem[];
}

export function buildConfigExport(rows: ConnectionRow[], now: Date = new Date()): ConfigExport {
  return {
    version: CONFIG_EXPORT_VERSION,
    exportedAt: now.toISOString(),
    connections: rows.map((r) => ({
      erpType: r.erpType,
      erpProfile: r.erpProfile,
      host: r.host,
      port: r.port,
      dbName: r.dbName,
      username: r.username,
    })),
  };
}
