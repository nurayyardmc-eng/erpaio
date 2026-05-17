import { api } from "./api";

export type AlertStatus = "open" | "acked" | "resolved";

export interface Alert {
  id: string;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string | null;
  module: string | null;
  evidence: unknown;
  status: AlertStatus;
  createdAt: string;
}

/**
 * Server `acked`/`resolved` döner. Önceden mobile/web `acknowledged`
 * gönderiyordu — server PATCH validation `acked`/`resolved` bekliyor, 400
 * dönüyordu (Track LLL'de fix). GET filter de aynı şekilde.
 */
export async function getAlerts(status: AlertStatus = "open"): Promise<Alert[]> {
  return api<Alert[]>(`/api/alerts?status=${status}`);
}

export async function getAlert(id: string): Promise<Alert> {
  return api<Alert>(`/api/alerts/${encodeURIComponent(id)}`);
}

export async function acknowledgeAlert(id: string): Promise<void> {
  await api("/api/alerts", {
    method: "PATCH",
    body: { id, status: "acked" },
  });
}

export async function resolveAlert(id: string): Promise<void> {
  await api("/api/alerts", {
    method: "PATCH",
    body: { id, status: "resolved" },
  });
}
