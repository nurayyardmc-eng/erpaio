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

const POSTGRES_RULES = `- String literal: '...' (NVARCHAR yok). Türkçe karakterler doğrudan UTF-8.
- Tarih: NOW(), CURRENT_DATE, INTERVAL '1 day', date_trunc('month', col).
- LIMIT n (TOP n yok).
- Identifier quoting: "tabloAdi" (köşeli parantez yok).
- TÜRKÇE TEXT KARŞILAŞTIRMA — KRİTİK:
  * Şehir/ad/ürün adı/kategori gibi text alanlarda ASLA "=" kullanma.
  * Her zaman ILIKE ile wildcard pattern: WHERE m.sehir ILIKE '%istanbul%'
  * Türkçe i/İ/I/ı karakterleri arasında karışıklık olabilir, ILIKE bunu önler (case-insensitive).
  * Yazım hatası toleransı için kullanıcı sorgusundaki kelimenin EN AYIRT EDİCİ KÖKÜNÜ % ile çevrele.
    Örn: "istanbul" → '%stanbul%' (i/İ farkı önemsiz), "Ankara" → '%nkara%', "İzmir" → '%zmir%'.
  * Noktasız ASCII transliterasyonu kullan (İstanbul/Istanbul/istambul hepsi '%stanbul%' ile yakalanır).
  * Sadece kesin eşleşme istenmediyse her text WHERE'de bu desen.`;

const MSSQL_RULES = `- Türkçe karakterler için NVARCHAR + N'...' prefix.
- Tarih: GETDATE(), DATEADD(), CAST(... AS DATE).
- TOP n (LIMIT yok).
- Identifier: [tabloAdi] (köşeli parantez).
- TÜRKÇE TEXT KARŞILAŞTIRMA — KRİTİK:
  * ASLA "=" kullanma text alanlarda.
  * LOWER(col) LIKE LOWER(N'%kök%') kullan.
  * Yazım hatası + i/İ toleransı için kelimenin ayırt edici kökünü % ile çevrele.
    Örn: "istanbul" → LIKE LOWER(N'%stanbul%'), "Ankara" → LIKE LOWER(N'%nkara%').`;

/**
 * Dialect-specific SQL syntax + Türkçe text comparison rules for the AI
 * system prompt. Track ZZZZZZZZZZ — chat/route'da inline 22-satirlik
 * template literal vardi; AI prompt davranisini etkileyen kritik veri
 * test edilebilir + diff-stable sekilde tek dosyada toplandi.
 *
 * Postgres ILIKE vs MS SQL LOWER+LIKE icin ayri kurallar — Turkce i/İ/I/ı
 * karakter karisikligi her iki dialect'te ayri cozumler gerektirdi.
 */
export function dialectRules(isPostgres: boolean): string {
  return isPostgres ? POSTGRES_RULES : MSSQL_RULES;
}
