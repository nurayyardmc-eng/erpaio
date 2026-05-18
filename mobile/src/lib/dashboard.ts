// Dashboard API helpers — web /api/* endpoint'lerinin mobile karşılığı.
import { api } from "./api";

// ============= ERP Connections =============
export interface ErpConnection {
  id: string;
  dbName: string;
  host: string;
  port: number;
  status: "active" | "error" | "pending";
  erpType: string;
  erpProfile: string | null;
  lastSchemaSyncAt: string | null;
  /** Schema cache snapshot — null ise hiç sync olmadı. Track RRR'de eklendi. */
  schemaCache?: { builtAt: string; tableCount: number } | null;
}

export async function getConnections(): Promise<ErpConnection[]> {
  return api("/api/connections");
}

export interface CreateConnectionInput {
  erpType: "nebim_v3" | "sap" | "dynamics365" | "postgres";
  host: string;
  port: number;
  dbName: string;
  username: string;
  password: string;
}

export async function createConnection(input: CreateConnectionInput): Promise<{ id: string }> {
  return api("/api/connections", { method: "POST", body: input });
}

/**
 * Manuel schema cache re-sync. Owner/admin gerekir; 403 olursa server döner.
 * Başarılı olursa yeni schemaCache snapshot dönülür → UI badge anında günceller.
 *
 * Track SSS. ERP'ye INFORMATION_SCHEMA query yollar — birkaç saniye sürebilir.
 */
export async function syncConnectionSchema(id: string): Promise<{
  ok: true;
  schemaCache: { builtAt: string; tableCount: number } | null;
}> {
  return api(`/api/connections/${encodeURIComponent(id)}/sync`, { method: "POST" });
}

/**
 * Bağlantı sağlığını test et — ERP'ye INFORMATION_SCHEMA.TABLES query yollar,
 * dönen satır sayısını tableCount olarak verir. Server connection.status'unu
 * "active" veya "error" olarak günceller.
 *
 * Hata durumunda server 503 + {ok: false, error}. api() throw eder; caller
 * apiErrorMessage helper'ı ile insanca mesaj çıkarır.
 */
export async function testConnection(id: string): Promise<{ ok: true; tableCount: number }> {
  return api(`/api/connections/${encodeURIComponent(id)}/test`);
}

// ============= Tenant token usage (monthly budget) =============
export interface TenantUsage {
  used: number;
  budget: number;
  remaining: number;
  percentUsed: number;
  resetsOn: string; // ISO date
}

export async function getTenantUsage(): Promise<TenantUsage> {
  return api(`/api/tenant/usage`);
}

export async function deleteConnection(id: string): Promise<void> {
  await api(`/api/connections/${id}`, { method: "DELETE" });
}

// ============= Saved Queries =============
export interface SavedQuery {
  id: string;
  question: string;
  sqlQuery: string;
  successCount: number;
  failCount: number;
  reliability: number;
  lastUsedAt: string;
}

export async function getSavedQueries(): Promise<{ queries: SavedQuery[] }> {
  return api("/api/saved-queries");
}

// ============= Annotations =============
export interface Annotation {
  id: string;
  tableName: string;
  columnName: string | null;
  description: string | null;
  hidden: boolean;
  updatedAt: string;
}

export async function getAnnotations(): Promise<{ annotations: Annotation[] }> {
  return api("/api/annotations");
}

export interface UpsertAnnotationInput {
  tableName: string;
  columnName?: string | null;
  description?: string | null;
  hidden?: boolean;
}

export async function upsertAnnotation(input: UpsertAnnotationInput): Promise<void> {
  await api("/api/annotations", { method: "PUT", body: input });
}

export async function deleteAnnotation(tableName: string, columnName?: string | null): Promise<void> {
  const params = new URLSearchParams({ tableName });
  if (columnName) params.set("columnName", columnName);
  await api(`/api/annotations?${params.toString()}`, { method: "DELETE" });
}

// ============= Insights =============
export interface InferredFk {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  occurrences: number;
}

export interface CustomItem {
  type: "table" | "column";
  table: string;
  column?: string;
  dataType?: string;
  reason: string;
}

export interface InsightsResp {
  inferredForeignKeys: InferredFk[];
  customItems: CustomItem[];
}

export async function getInsights(connectionId: string): Promise<InsightsResp> {
  return api(`/api/erp-insights?connectionId=${connectionId}`);
}

// ============= Watchlists =============
export interface Watchlist {
  id: string;
  name: string;
  question: string;
  thresholdOp: string;
  thresholdVal: number;
  emailTo: string | null;
  enabled: boolean;
  lastCheckedAt: string | null;
  lastValue: number | null;
  createdAt: string;
}

export async function getWatchlists(): Promise<{ watchlists: Watchlist[] }> {
  return api("/api/watchlists");
}

export interface CreateWatchlistInput {
  name: string;
  question: string;
  connectionId: string;
  thresholdOp: "lt" | "lte" | "gt" | "gte" | "eq";
  thresholdVal: number;
  emailTo?: string;
}

export async function createWatchlist(input: CreateWatchlistInput): Promise<{ id: string }> {
  return api("/api/watchlists", { method: "POST", body: input });
}

export async function deleteWatchlist(id: string): Promise<void> {
  await api(`/api/watchlists?id=${id}`, { method: "DELETE" });
}

// ============= Scheduled Reports =============
export interface ScheduledReport {
  id: string;
  name: string;
  question: string;
  schedule: string;
  emailTo: string;
  enabled: boolean;
  lastRunAt: string | null;
  createdAt: string;
}

export async function getScheduledReports(): Promise<{ reports: ScheduledReport[] }> {
  return api("/api/scheduled-reports");
}

export interface CreateReportInput {
  name: string;
  question: string;
  connectionId: string;
  schedule: "hourly" | "daily_06" | "daily_18" | "weekly_monday" | "monthly_first";
  emailTo: string;
}

export async function createScheduledReport(input: CreateReportInput): Promise<{ id: string }> {
  return api("/api/scheduled-reports", { method: "POST", body: input });
}

export async function deleteScheduledReport(id: string): Promise<void> {
  await api(`/api/scheduled-reports?id=${id}`, { method: "DELETE" });
}

// ============= Team =============
export interface TeamUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  totpEnabled: boolean;
  createdAt: string;
}

export interface TeamInvitation {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  expiresAt: string;
}

export async function getTeam(): Promise<{ users: TeamUser[]; invitations: TeamInvitation[] }> {
  return api("/api/team");
}

// ============= Audit =============
export interface AuditEntry {
  id: string;
  action: string;
  resource: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user: { email: string; name: string | null } | null;
}

export async function getAudit(limit = 50): Promise<{ entries: AuditEntry[] }> {
  return api(`/api/audit?limit=${limit}`);
}

// ============= KVKK / GDPR — User's own activity (right of access) =============
export interface MyActivityEntry {
  id: string;
  action: string;
  target: string | null;
  metadata: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export async function getMyActivity(limit = 100): Promise<{ activities: MyActivityEntry[] }> {
  return api(`/api/me/activity?limit=${limit}`);
}

// ============= KVKK / GDPR — User's own consents (right of access) =============
export interface MyConsentEntry {
  id: string;
  type: string;
  action: string;
  documentVer: string | null;
  context: string | null;
  createdAt: string;
}

export async function getMyConsents(): Promise<{ consents: MyConsentEntry[] }> {
  return api(`/api/me/consents`);
}

// ============= Push notification per-user prefs =============
export interface NotificationPrefs {
  alerts: boolean;
  anomaly: boolean;
  watchlists: boolean;
}

export async function getMyNotificationPrefs(): Promise<{ prefs: NotificationPrefs }> {
  return api(`/api/me/notification-prefs`);
}

export async function updateMyNotificationPrefs(
  partial: Partial<NotificationPrefs>,
): Promise<{ prefs: NotificationPrefs }> {
  return api(`/api/me/notification-prefs`, {
    method: "PATCH",
    body: partial,
  });
}

// ============= Device (push token) management =============
export interface MyDevice {
  id: string;
  platform: string;
  deviceName: string | null;
  lastSeenAt: string;
  createdAt: string;
  isCurrent: boolean;
}

/**
 * Mobile bu fonksiyonu çağırırken kendi `currentToken`'ını geçirir;
 * server response'a `isCurrent: true` rozeti döner. Web çağrılarında
 * `undefined` geçilir → tüm cihazlar `isCurrent: false`.
 */
export async function getMyDevices(currentToken?: string | null): Promise<{ devices: MyDevice[] }> {
  const qs = currentToken ? `?currentToken=${encodeURIComponent(currentToken)}` : "";
  return api(`/api/me/devices${qs}`);
}

export async function revokeMyDevice(id: string): Promise<{ ok: true }> {
  return api(`/api/me/devices?id=${encodeURIComponent(id)}`, { method: "DELETE" });
}

// ============= API token (active session) management =============
export interface ApiSession {
  id: string;
  name: string;
  lastUsedAt: string | null;
  expiresAt: string;
  createdAt: string;
  isCurrent: boolean;
}

export async function getApiSessions(): Promise<{ sessions: ApiSession[] }> {
  return api(`/api/me/sessions`);
}

export async function revokeApiSession(id: string): Promise<{ ok: true }> {
  return api(`/api/me/sessions?tokenId=${encodeURIComponent(id)}`, { method: "DELETE" });
}

// ============= IP allowlist (tenant security) =============
export interface IpAllowlistEntry {
  id: string;
  tenantId: string;
  cidr: string;
  label: string | null;
  createdAt: string;
}

export async function getIpAllowlist(): Promise<{ entries: IpAllowlistEntry[] }> {
  return api(`/api/security/allowlist`);
}

export async function addIpAllowlistEntry(params: {
  cidr: string;
  label?: string;
}): Promise<{ entry: IpAllowlistEntry }> {
  return api(`/api/security/allowlist`, {
    method: "POST",
    body: params,
  });
}

export async function removeIpAllowlistEntry(id: string): Promise<{ ok: true }> {
  return api(`/api/security/allowlist?id=${encodeURIComponent(id)}`, { method: "DELETE" });
}

// ============= Slow query trace (tenant-scoped) =============
export interface SlowQueryRow {
  id: string;
  connectionId: string | null;
  sqlSnippet: string;
  durationMs: number;
  ok: boolean;
  errorMessage: string | null;
  createdAt: string;
  connection: { erpType: string; host: string } | null;
}

export interface SlowQuerySummary {
  count: number;
  maxMs: number;
  avgMs: number;
}

/**
 * Owner/admin scope'lu — non-admin için 403. UI guard role check yapar
 * (görüntülemeden önce çağırmayı keser).
 */
export async function getMySlowQueries(
  params: { minMs?: number; limit?: number } = {},
): Promise<{ rows: SlowQueryRow[]; summary: SlowQuerySummary }> {
  const qs = new URLSearchParams();
  qs.set("limit", String(params.limit ?? 100));
  if (params.minMs && params.minMs > 0) qs.set("minMs", String(params.minMs));
  return api(`/api/me/slow-queries?${qs.toString()}`);
}

// ============= KVKK md. 11 / GDPR Art. 17 — right to erasure =============
/**
 * Tenant (hesap) silme talebi. Server `confirmation: 'HESABIMI SİL'` literal
 * bekler — locale'den bağımsız sabit. Owner role gerektirir; aksi halde 403.
 *
 * Başarılı olursa: ConsentLog'a withdrawn yazılır + tenant cascade-delete
 * + tüm kullanıcı verileri silinir. Mobile UI deleteTenant'tan sonra
 * onLogout()'u tetiklemeli (token zaten geçersiz).
 */
export async function deleteTenant(params: {
  password: string;
  confirmation: string;
}): Promise<{ ok: true; message?: string }> {
  return api(`/api/tenant/delete`, {
    method: "POST",
    body: params,
  });
}

// ============= Overview Metrics =============
export interface DashboardMetrics {
  todayQueries: number;
  weekQueries: number;
  cacheHitRate: number;
  avgLatencyMs: number;
  activeConnections: number;
  openAlerts: number;
}

export async function getMetrics(): Promise<DashboardMetrics> {
  return api("/api/metrics/dashboard");
}
