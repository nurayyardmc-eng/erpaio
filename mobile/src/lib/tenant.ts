import { api } from "./api";

export interface TenantSettings {
  id: string;
  name: string;
  slug: string;
  plan: string;
  whatsappTo: string | null;
  whatsappEnabled: boolean;
  emailTo: string | null;
  emailEnabled: boolean;
  alertMinSeverity: "low" | "medium" | "high" | "critical";
  createdAt: string;
}

export interface TenantPatch {
  name?: string;
  whatsappTo?: string | null;
  whatsappEnabled?: boolean;
  emailTo?: string | null;
  emailEnabled?: boolean;
  alertMinSeverity?: "low" | "medium" | "high" | "critical";
}

export async function getTenant(): Promise<TenantSettings> {
  return api<TenantSettings>("/api/tenant");
}

export async function updateTenant(patch: TenantPatch): Promise<Partial<TenantSettings>> {
  return api<Partial<TenantSettings>>("/api/tenant", {
    method: "PATCH",
    body: patch,
  });
}
