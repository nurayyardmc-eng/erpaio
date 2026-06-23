"use client";
// Sprint P5+ — PostHog vendor wiring for the analytics seam (lib/analytics
// /track.ts dispatches to window.posthog.capture).
//
// Config + activation are passed in as PROPS resolved by the server (root
// layout reads process.env at runtime). This avoids the NEXT_PUBLIC_*
// build-time inlining trap: a Vercel redeploy now picks up new env values
// without a fresh rebuild / build-cache bust.
//
// Privacy posture: COOKIELESS (persistence "memory"), autocapture +
// session recording OFF — consistent with the CookieConsent banner's "no
// third-party ad cookies". capture_pageview is ON: $pageview sends no
// cookie under memory persistence, gives PostHog the standard event its
// onboarding expects, and yields automatic page-level funnel data.

import Script from "next/script";

export function PostHogLoader({
  enabled,
  postHogKey,
  host,
}: {
  enabled: boolean;
  postHogKey?: string;
  host?: string;
}) {
  if (!enabled || !postHogKey) return null;
  // Analytics traffic is first-party via the /ingest reverse proxy
  // (next.config.ts rewrites → PostHog). This is what makes events actually
  // arrive: the tightened CSP only allows 'self', and ad-blockers drop
  // *.posthog.com but not same-origin paths. ui_host stays the real PostHog
  // UI origin so the toolbar / "view in PostHog" links still resolve.
  const apiHost = "/ingest";
  const uiHost = host?.includes("eu.") ? "https://eu.posthog.com" : "https://us.posthog.com";

  const snippet = `!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys getNextSurveyStep".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
posthog.init(${JSON.stringify(postHogKey)},{api_host:${JSON.stringify(apiHost)},ui_host:${JSON.stringify(uiHost)},persistence:"memory",autocapture:false,capture_pageview:true,capture_pageleave:false,disable_session_recording:true});`;

  return (
    <Script id="posthog-init" strategy="afterInteractive">
      {snippet}
    </Script>
  );
}
