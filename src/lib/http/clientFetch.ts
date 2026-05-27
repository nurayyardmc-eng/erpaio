/**
 * Browser-side fetch helpers for JSON API calls.
 *
 * Track GGGGGGGGGGGG — dashboard pages ~30 yerde IDENTIK 4-satirlik:
 *   await fetch(url, {
 *     method: "POST",
 *     headers: { "Content-Type": "application/json" },
 *     body: JSON.stringify(body),
 *   });
 *
 * Bu helper'lar Response doner — caller kendi res.ok/res.json() ile
 * istedigi error UX'i (toast / status / revert / throw) uygular. throw
 * etmiyor cunku her call site farkli UI tepkisi gerektiriyor.
 *
 * GET icin tek satirlik `fetch(url)` zaten temiz; bu helper'lar
 * sadece body'li mutasyonlar (POST/PATCH/DELETE-with-body) icin.
 *
 * NOT: client-side, "use client" component'larda kullanilir. Server
 * route'larinda direkt fetch yine kullanilir (next/headers cookie
 * forwarding gibi gelismis kontrol gereken yerde).
 */

const JSON_HEADERS = { "Content-Type": "application/json" } as const;

export function postJson(url: string, body: unknown): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  });
}

export function patchJson(url: string, body: unknown): Promise<Response> {
  return fetch(url, {
    method: "PATCH",
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  });
}

export function deleteJson(url: string, body: unknown): Promise<Response> {
  return fetch(url, {
    method: "DELETE",
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  });
}
