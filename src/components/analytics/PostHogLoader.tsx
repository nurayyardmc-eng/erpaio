"use client";
// Sprint P5+ — PostHog vendor wiring for the analytics seam (lib/analytics
// /track.ts dispatches to window.posthog.capture).
//
// Privacy posture: the site's CookieConsent banner states there are no
// third-party ad cookies. To stay consistent we initialise PostHog in
// COOKIELESS mode (persistence: "memory") with autocapture, session
// recording, and automatic pageviews all DISABLED. Only the explicit
// events we fire via track() flow — clean, intentional, and cookie-free.
//
// Activation is gated on two public env vars; with either unset this
// renders nothing, so the snippet never loads in dev/preview or before
// the key is provisioned.

import Script from "next/script";

export function PostHogLoader() {
  const enabled = process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === "true";
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
  if (!enabled || !key) return null;

  // Official PostHog bootstrap snippet (queues calls until the async lib
  // loads), then init with cookieless + privacy-conservative config.
  const snippet = `!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys getNextSurveyStep".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
posthog.init(${JSON.stringify(key)},{api_host:${JSON.stringify(host)},persistence:"memory",autocapture:false,capture_pageview:false,capture_pageleave:false,disable_session_recording:true});`;

  return (
    <Script id="posthog-init" strategy="afterInteractive">
      {snippet}
    </Script>
  );
}
