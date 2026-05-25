/**
 * Pick the SQL dialect for the AI prompt based on the active ERP connection.
 *
 * Decision tree (Track DDDDD — extracted from chat route):
 *  - erpType === "postgres"                     → PostgreSQL
 *  - erpType ∈ {nebim_v3, dynamics365} OR
 *    erpProfile is null/empty                   → SQL Server (default)
 *  - everything else                            → "ERP veritabanı" (generic)
 *
 * Notes:
 *  - The chat route uses the returned `name` in the system prompt header
 *    ("Sen bir <name> uzmanısın.") so accidental mislabeling would feed the
 *    wrong syntax expectations to the model.
 *  - `erpProfile` participates because Nebim/D365 connections may be
 *    explicitly marked but the profile slug determines whether we trust
 *    the SQL Server default. A null profile defaults to SQL Server (Nebim
 *    legacy assumption).
 */
export interface DialectChoice {
  name: "PostgreSQL" | "SQL Server" | "ERP veritabanı";
  isPostgres: boolean;
  isMsSql: boolean;
}

export function pickDialect(
  erpType: string | null | undefined,
  erpProfile: string | null | undefined,
): DialectChoice {
  const isPostgres = erpType === "postgres";
  const isMsSql =
    !isPostgres &&
    (erpType === "nebim_v3" || erpType === "dynamics365" || !erpProfile);
  const name = isPostgres ? "PostgreSQL" : isMsSql ? "SQL Server" : "ERP veritabanı";
  return { name, isPostgres, isMsSql };
}
