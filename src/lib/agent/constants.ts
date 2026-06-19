// On-prem agent constants — connection transport modes + job lifecycle.
// Matches the `as const` string-union convention (cf. ALERT_STATUSES).

/** ErpConnection.connectionMode values. */
export const CONNECTION_MODES = ["direct", "agent"] as const;
export type ConnectionMode = (typeof CONNECTION_MODES)[number];

/**
 * AgentQueryJob.status lifecycle:
 *   pending → running (agent claims) → done | error
 */
export const AGENT_JOB_STATUSES = ["pending", "running", "done", "error"] as const;
export type AgentJobStatus = (typeof AGENT_JOB_STATUSES)[number];
