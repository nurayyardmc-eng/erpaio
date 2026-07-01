export type PlanId = "starter" | "pro" | "enterprise";

export interface PlanFeatures {
  monthlyTokenBudget: number;
  maxUsers: number;
  maxConnections: number;
  features: string[];
}

export const PLANS: Record<PlanId, PlanFeatures> = {
  starter: {
    monthlyTokenBudget: 2_000_000,
    maxUsers: 3,
    maxConnections: 1,
    features: ["chat", "alerts", "audit"],
  },
  pro: {
    monthlyTokenBudget: 20_000_000,
    maxUsers: 25,
    maxConnections: 10,
    features: ["chat", "alerts", "audit", "annotations", "overview", "mfa", "csv_export"],
  },
  enterprise: {
    monthlyTokenBudget: 200_000_000,
    maxUsers: 500,
    maxConnections: 100,
    features: ["chat", "alerts", "audit", "annotations", "overview", "mfa", "csv_export", "on_prem_agent", "sso", "dedicated_support"],
  },
};

export function isPlanId(plan: string | null | undefined): plan is PlanId {
  return plan === "starter" || plan === "pro" || plan === "enterprise";
}

export function hasFeature(plan: string, feature: string): boolean {
  const p = PLANS[plan as PlanId];
  return p ? p.features.includes(feature) : false;
}

export function getPlan(plan: string): PlanFeatures {
  return PLANS[plan as PlanId] ?? PLANS.starter;
}
