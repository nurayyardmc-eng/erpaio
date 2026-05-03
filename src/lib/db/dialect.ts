// ERP-agnostic SQL dialect abstraction.
// Şu an mssql baseline, yakında Oracle + Postgres + MySQL desteği.

export type DbDialect = "mssql" | "oracle" | "postgres" | "mysql";

export interface DialectInfo {
  name: string;
  schemaQuery: string;
  sampleRowsLimit: (table: string, n: number, cols: string[]) => string;
  comments: { line: string; block: [string, string] };
  paramPrefix: string;
}

const dialects: Record<DbDialect, DialectInfo> = {
  mssql: {
    name: "SQL Server",
    schemaQuery: `
      SELECT c.TABLE_NAME, c.COLUMN_NAME, c.DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS c
      JOIN INFORMATION_SCHEMA.TABLES t ON c.TABLE_NAME = t.TABLE_NAME
      WHERE t.TABLE_TYPE = 'BASE TABLE'
      ORDER BY c.TABLE_NAME, c.ORDINAL_POSITION
    `,
    sampleRowsLimit: (table, n, cols) =>
      `SELECT TOP ${n} ${cols.map((c) => `[${c}]`).join(", ")} FROM dbo.[${table}] WITH (NOLOCK)`,
    comments: { line: "--", block: ["/*", "*/"] },
    paramPrefix: "@",
  },
  oracle: {
    name: "Oracle",
    schemaQuery: `
      SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE
      FROM USER_TAB_COLUMNS
      ORDER BY TABLE_NAME, COLUMN_ID
    `,
    sampleRowsLimit: (table, n, cols) =>
      `SELECT ${cols.join(", ")} FROM ${table} WHERE ROWNUM <= ${n}`,
    comments: { line: "--", block: ["/*", "*/"] },
    paramPrefix: ":",
  },
  postgres: {
    name: "PostgreSQL",
    schemaQuery: `
      SELECT c.table_name AS "TABLE_NAME",
             c.column_name AS "COLUMN_NAME",
             c.data_type AS "DATA_TYPE"
      FROM information_schema.columns c
      JOIN information_schema.tables t ON c.table_name = t.table_name
      WHERE t.table_type = 'BASE TABLE'
        AND c.table_schema = 'public'
      ORDER BY c.table_name, c.ordinal_position
    `,
    sampleRowsLimit: (table, n, cols) =>
      `SELECT ${cols.map((c) => `"${c}"`).join(", ")} FROM "${table}" LIMIT ${n}`,
    comments: { line: "--", block: ["/*", "*/"] },
    paramPrefix: "$",
  },
  mysql: {
    name: "MySQL",
    schemaQuery: `
      SELECT c.TABLE_NAME, c.COLUMN_NAME, c.DATA_TYPE
      FROM information_schema.COLUMNS c
      JOIN information_schema.TABLES t ON c.TABLE_NAME = t.TABLE_NAME AND c.TABLE_SCHEMA = t.TABLE_SCHEMA
      WHERE t.TABLE_TYPE = 'BASE TABLE'
        AND c.TABLE_SCHEMA = DATABASE()
      ORDER BY c.TABLE_NAME, c.ORDINAL_POSITION
    `,
    sampleRowsLimit: (table, n, cols) =>
      `SELECT ${cols.map((c) => `\`${c}\``).join(", ")} FROM \`${table}\` LIMIT ${n}`,
    comments: { line: "--", block: ["/*", "*/"] },
    paramPrefix: "?",
  },
};

export function getDialect(d: DbDialect): DialectInfo {
  return dialects[d];
}

export function dialectFromErpType(erpType: string): DbDialect {
  switch (erpType) {
    case "nebim_v3":
    case "dynamics365":
      return "mssql";
    case "sap":
    case "sap_ecc":
      return "oracle";
    case "oracle_ebs":
      return "oracle";
    case "postgres":
      return "postgres";
    case "mysql":
    case "odoo":
      return "mysql";
    default:
      return "mssql";
  }
}
