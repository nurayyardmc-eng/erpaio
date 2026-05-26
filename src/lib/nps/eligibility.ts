/**
 * Pure NPS prompt eligibility logic.
 *
 * Extracted (Track QQQQQ) from src/components/NpsPrompt.tsx so the cool-down
 * rules can be tested without localStorage / window timers. The rules form a
 * UX contract (don't pester users) and a regression here would either
 * spam-show the prompt or hide it forever.
 *
 * Rules:
 *  - If submitted within last 90 days → hide
 *  - If dismissed within explicit dismissedUntil window → hide
 *  - Otherwise → show
 *
 * Submission gives a longer cool-down than dismissal (we got the data; let
 * them rest).
 */

import { ONE_DAY_MS as DAY_MS } from "@/lib/time/units";

/** Days between repeat NPS prompts after a successful submission. */
export const NPS_RESUBMIT_COOLDOWN_DAYS = 90;
/** Days after explicit dismissal before re-prompting. */
export const NPS_DISMISS_COOLDOWN_DAYS = 14;

export interface NpsEligibilityInput {
  /** Unix ms when user last submitted (null if never). */
  submittedAt: number | null;
  /** Unix ms threshold below which we should suppress (null if never dismissed). */
  dismissedUntil: number | null;
  /** Current time — defaults to Date.now() for non-test callers. */
  now?: number;
}

export function shouldShowNps(input: NpsEligibilityInput): boolean {
  const now = input.now ?? Date.now();
  if (
    input.submittedAt !== null &&
    now - input.submittedAt < NPS_RESUBMIT_COOLDOWN_DAYS * DAY_MS
  ) {
    return false;
  }
  if (input.dismissedUntil !== null && now < input.dismissedUntil) {
    return false;
  }
  return true;
}

/**
 * NPS score → category per standard NPS scale:
 *  - 0–6  : detractor
 *  - 7–8  : passive
 *  - 9–10 : promoter
 *
 * Returns null for out-of-range scores (defensive — callers should restrict
 * UI to 0..10 already).
 */
export type NpsCategory = "detractor" | "passive" | "promoter";

export function npsCategory(score: number): NpsCategory | null {
  if (!Number.isInteger(score) || score < 0 || score > 10) return null;
  if (score <= 6) return "detractor";
  if (score <= 8) return "passive";
  return "promoter";
}

/** Compute the next dismissedUntil timestamp from `now` + cool-down. */
export function nextDismissedUntil(now: number = Date.now()): number {
  return now + NPS_DISMISS_COOLDOWN_DAYS * DAY_MS;
}
