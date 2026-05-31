// Sprint F.3 — lightweight feature flag service.
//
// Goal: keep risky/staged rollouts gateable WITHOUT pulling in
// LaunchDarkly, Vercel KV, or another vendor. The set of flags is
// small and the cadence of change is slow — env-var-backed flags hit
// 99% of real needs at zero ops cost. Per-tenant overrides live in
// memory; if/when traffic warrants, we promote to a DB column.
//
// Three input sources, evaluated in order:
//   1. Explicit override (per-tenant or globally) — passed to isFlagEnabled
//   2. Env var FEATURE_FLAG_<UPPER> — "1"/"true"/"on" → enabled
//   3. Default in FLAG_DEFAULTS below
//
// Conventions:
//   - Flag keys are kebab-case strings, no namespacing prefix.
//   - Every flag MUST have an entry in FLAG_DEFAULTS so the type
//     system tracks it.
//   - When removing a flag (full rollout / kill), delete the key from
//     FLAG_DEFAULTS — call sites become a tsc error and force cleanup.

export type FeatureFlagKey =
  | "iyzico-billing"
  | "ai-cost-tooltip"
  | "anomaly-summarize"
  | "audit-export-jsonl";

interface FlagDefaults {
  default: boolean;
  /** Short description shown in admin UI / docs. */
  description: string;
}

export const FLAG_DEFAULTS: Record<FeatureFlagKey, FlagDefaults> = {
  "iyzico-billing": {
    default: true,
    description: "Show iyzico billing path for TR tenants (vs Stripe-only).",
  },
  "ai-cost-tooltip": {
    default: false,
    description: "Render per-query token cost tooltip on chat results.",
  },
  "anomaly-summarize": {
    default: true,
    description: "Use Claude Haiku to summarize anomaly evidence in alerts.",
  },
  "audit-export-jsonl": {
    default: false,
    description: "Offer JSONL alongside JSON when exporting tenant audit logs.",
  },
};

function envVarName(key: FeatureFlagKey): string {
  return `FEATURE_FLAG_${key.toUpperCase().replace(/-/g, "_")}`;
}

function parseEnvOverride(raw: string | undefined): boolean | null {
  if (raw === undefined || raw === "") return null;
  const v = raw.toLowerCase();
  if (v === "1" || v === "true" || v === "on" || v === "yes") return true;
  if (v === "0" || v === "false" || v === "off" || v === "no") return false;
  return null;
}

/**
 * Resolve a feature flag. Pure function so callers can unit-test
 * branching by passing explicit `env` and `override` arguments.
 */
export function resolveFlag(
  key: FeatureFlagKey,
  opts: { override?: boolean | null; env?: Record<string, string | undefined> } = {},
): boolean {
  if (opts.override === true || opts.override === false) return opts.override;
  const envSource = opts.env ?? process.env;
  const fromEnv = parseEnvOverride(envSource[envVarName(key)]);
  if (fromEnv !== null) return fromEnv;
  return FLAG_DEFAULTS[key].default;
}

/**
 * Convenience: check a flag using the live process.env + no override.
 * Use resolveFlag directly when you need to pass per-tenant overrides
 * (e.g., looked up from a Tenant.featureFlags JSON column).
 */
export function isFlagEnabled(key: FeatureFlagKey): boolean {
  return resolveFlag(key);
}

/**
 * Snapshot every flag's resolved state. Useful for /admin UIs and
 * for the openapi/spec route to surface the current configuration.
 */
export function snapshotFlags(): Array<{
  key: FeatureFlagKey;
  enabled: boolean;
  source: "default" | "env";
  description: string;
}> {
  return (Object.keys(FLAG_DEFAULTS) as FeatureFlagKey[]).map((key) => {
    const envVal = parseEnvOverride(process.env[envVarName(key)]);
    return {
      key,
      enabled: envVal ?? FLAG_DEFAULTS[key].default,
      source: envVal !== null ? "env" : "default",
      description: FLAG_DEFAULTS[key].description,
    };
  });
}
