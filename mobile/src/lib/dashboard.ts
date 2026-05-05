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
}

export async function getConnections(): Promise<ErpConnection[]> {
  return api("/api/connections");
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
