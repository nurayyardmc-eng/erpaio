export interface MetricQuery {
  key: string;
  label: string;
  description: string;
  schedule: "hourly" | "daily";
  algorithm: "zscore" | "moving_avg" | "threshold";
  config?: Record<string, unknown>;
  direction?: "drop" | "spike" | "both";
  historyWindow?: number;
  sql: string;
  /**
   * Track YYYY — per-query ERP connection override. Static metrics tenant'ın
   * ilk aktif connection'ını kullanır (engine default). Custom metrics
   * (DB-stored) connectionId'sini buraya geçirir.
   */
  connectionId?: string;
}

export const METRIC_QUERIES: MetricQuery[] = [
  {
    key: "sales_last_hour_total",
    label: "Son 1 saat satış toplamı",
    description: "Son 1 saatte gerçekleşen satışların toplam tutarı (TL)",
    schedule: "hourly",
    algorithm: "zscore",
    direction: "drop",
    historyWindow: 168,
    sql: `SELECT ISNULL(SUM(NetTutar), 0) AS metric_value
FROM dbo.trFatura
WHERE FaturaTarihi >= DATEADD(HOUR, -1, GETDATE())
  AND FaturaTarihi < GETDATE()
  AND IptalDurumu = 0
  AND FaturaTipi IN (1, 2);`,
  },
  {
    key: "sales_daily_total",
    label: "Günlük satış toplamı",
    description: "Dünkü toplam satış (TL)",
    schedule: "daily",
    algorithm: "zscore",
    direction: "drop",
    historyWindow: 30,
    sql: `SELECT ISNULL(SUM(NetTutar), 0) AS metric_value
FROM dbo.trFatura
WHERE CAST(FaturaTarihi AS DATE) = CAST(DATEADD(DAY, -1, GETDATE()) AS DATE)
  AND IptalDurumu = 0
  AND FaturaTipi IN (1, 2);`,
  },
  {
    key: "return_rate_daily",
    label: "Günlük iade oranı",
    description: "Bugünkü iade tutarının satışa oranı (%)",
    schedule: "daily",
    algorithm: "moving_avg",
    direction: "spike",
    historyWindow: 30,
    sql: `WITH gun AS (
  SELECT
    ISNULL(SUM(CASE WHEN FaturaTipi IN (1,2) THEN NetTutar ELSE 0 END), 0) AS satis,
    ISNULL(SUM(CASE WHEN FaturaTipi IN (3,4) THEN NetTutar ELSE 0 END), 0) AS iade
  FROM dbo.trFatura
  WHERE CAST(FaturaTarihi AS DATE) = CAST(DATEADD(DAY, -1, GETDATE()) AS DATE)
    AND IptalDurumu = 0
)
SELECT CASE WHEN satis = 0 THEN 0 ELSE (iade * 100.0 / satis) END AS metric_value
FROM gun;`,
  },
  {
    key: "low_stock_skus",
    label: "Kritik stok altındaki ürün sayısı",
    description: "Stok seviyesi minimum stok limitinin altında olan SKU sayısı",
    schedule: "hourly",
    algorithm: "threshold",
    config: {
      rules: [
        { condition: "gte", value: 50, severity: "critical" },
        { condition: "gte", value: 20, severity: "high" },
        { condition: "gte", value: 10, severity: "medium" },
        { condition: "gte", value: 5, severity: "low" },
      ],
    },
    sql: `SELECT COUNT(*) AS metric_value
FROM (
  SELECT s.StokKodu
  FROM dbo.trStokHareket s
  INNER JOIN dbo.cdStokKart k ON k.StokKodu = s.StokKodu
  WHERE k.MinStok > 0
  GROUP BY s.StokKodu, k.MinStok
  HAVING ISNULL(SUM(s.Miktar), 0) <= k.MinStok
) t;`,
  },
  {
    key: "overdue_invoice_amount",
    label: "Vadesi geçmiş alacak toplamı",
    description: "Vadesi geçmiş tahsil edilmemiş faturaların toplam tutarı (TL)",
    schedule: "daily",
    algorithm: "threshold",
    config: {
      rules: [
        { condition: "gte", value: 1000000, severity: "critical" },
        { condition: "gte", value: 500000, severity: "high" },
        { condition: "gte", value: 100000, severity: "medium" },
        { condition: "gte", value: 25000, severity: "low" },
      ],
    },
    sql: `SELECT ISNULL(SUM(KalanTutar), 0) AS metric_value
FROM dbo.trCariHareket
WHERE VadeTarihi < GETDATE()
  AND KalanTutar > 0
  AND IptalDurumu = 0;`,
  },
  {
    key: "new_orders_last_hour",
    label: "Son 1 saat yeni sipariş sayısı",
    description: "Son 1 saatte oluşturulan sipariş adedi",
    schedule: "hourly",
    algorithm: "zscore",
    direction: "both",
    historyWindow: 168,
    sql: `SELECT COUNT(*) AS metric_value
FROM dbo.trSiparis
WHERE SiparisTarihi >= DATEADD(HOUR, -1, GETDATE())
  AND SiparisTarihi < GETDATE()
  AND IptalDurumu = 0;`,
  },
];

export function getHourlyQueries(): MetricQuery[] {
  return METRIC_QUERIES.filter((q) => q.schedule === "hourly");
}

export function getDailyQueries(): MetricQuery[] {
  return METRIC_QUERIES.filter((q) => q.schedule === "daily");
}

export function findQueryByKey(key: string): MetricQuery | undefined {
  return METRIC_QUERIES.find((q) => q.key === key);
}
