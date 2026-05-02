import { api } from "./api";

export interface Alert {
  id: string;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string | null;
  module: string | null;
  evidence: unknown;
  status: "open" | "acknowledged";
  createdAt: string;
}

export async function getAlerts(status: "open" | "acknowledged" = "open"): Promise<Alert[]> {
  return api<Alert[]>(`/api/alerts?status=${status}`);
}

export async function acknowledgeAlert(id: string): Promise<void> {
  await api("/api/alerts", {
    method: "PATCH",
    body: { id, status: "acknowledged" },
  });
}
