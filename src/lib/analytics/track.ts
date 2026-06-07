// Sprint G.4 — analytics tracking seam.
//
// A vendor-agnostic, no-op-by-default tracker. Product code calls
// track("event_name", { ...props }) without caring whether PostHog,
// Plausible, or nothing is wired up. To activate PostHog later you only
// implement the dispatch in `flush()` / `track()` here — no call sites
// change. Keeping the seam in one file avoids sprinkling vendor SDK
// imports across components.
//
// Privacy: never pass PII (emails, names, raw queries) as event props.
// Pass categorical/aggregate values (erp type, locale, scenario id).

export type AnalyticsEvent =
  | "landing_view"
  | "demo_request_submitted"
  | "demo_request_error"
  | "ai_demo_run"
  | "cta_click"
  | "signup_completed"
  | "erp_connection_created";

export interface TrackProps {
  [key: string]: string | number | boolean | undefined;
}

// Flip via NEXT_PUBLIC_ANALYTICS_ENABLED at build time. While false,
// track() is a cheap no-op (events are dropped) — safe to ship call
// sites before the vendor is chosen.

declare global {
  interface Window {
    // PostHog (or compatible) global, present only once a snippet loads.
    posthog?: { capture: (event: string, props?: TrackProps) => void };
  }
}

// Enablement is signalled by the PRESENCE of window.posthog: PostHogLoader
// only injects the snippet when analytics is actually enabled (resolved
// server-side from ANALYTICS_ENABLED / NEXT_PUBLIC_ANALYTICS_ENABLED at
// runtime). We must NOT gate on process.env.NEXT_PUBLIC_ANALYTICS_ENABLED
// here — this is a client module, so that value is build-time inlined and
// is empty whenever the var is set non-prefixed or as a Vercel "Sensitive"
// var. Relying on it silently dropped every custom event while $pageview
// (fired by the snippet itself) still worked. window.posthog?. already
// no-ops cleanly when analytics is off.
export function track(event: AnalyticsEvent, props: TrackProps = {}): void {
  if (typeof window === "undefined") return;
  try {
    // PostHog-shaped dispatch. Swap this block for any vendor; call
    // sites stay identical.
    window.posthog?.capture(event, props);
  } catch {
    // Analytics must never break the app — swallow.
  }
}

/**
 * Page-view helper. Call once on mount of a tracked page/section.
 * Separated so the (future) implementation can attach referrer / UTM
 * without each caller repeating that logic.
 */
export function trackPageView(path: string, props: TrackProps = {}): void {
  track("landing_view", { path, ...props });
}
