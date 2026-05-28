/**
 * iyzico billing provider — Türkiye için Stripe alternatifi.
 *
 * Feature 7 — full integration:
 *   - HMAC-SHA256 auth signing (IYZWSv2 scheme per iyzico API docs)
 *   - Subscription lifecycle (init checkout, retrieve, cancel)
 *   - Customer create + retrieve
 *   - Webhook signature verification
 *
 * Architecture mirrors src/lib/billing/stripe.ts: thin HTTP wrapper +
 * narrow typed methods. Real iyzico merchant credentials (sandbox or
 * live) drive `iyzicoFetch()`; tests mock the underlying fetch.
 *
 * Env variables:
 *   IYZICO_API_KEY        — merchant panel → API Yönetimi → API Anahtarı
 *   IYZICO_SECRET_KEY     — merchant panel → API Yönetimi → API Secret
 *   IYZICO_BASE_URL       — sandbox: https://sandbox-api.iyzipay.com
 *                          production: https://api.iyzipay.com
 *   IYZICO_WEBHOOK_SECRET — webhook verification (panel'den set)
 *   IYZICO_PRICE_PRO      — abonelik pricing plan reference code
 *   IYZICO_PRICE_ENTERPRISE
 *
 * Auth scheme (IYZWSv2):
 *   Authorization: IYZWSv2 <apiKey>:<base64(hmacSha256(payload, secretKey))>
 *   payload = randomKey + uri + JSON.stringify(body)
 *
 * Webhook verification:
 *   Headers contain X-Iyz-Signature (base64 HMAC-SHA256 over raw body).
 */

import * as crypto from "crypto";

export const IYZICO_PRICE_IDS: Record<"pro" | "enterprise", string | undefined> = {
  pro: process.env.IYZICO_PRICE_PRO,
  enterprise: process.env.IYZICO_PRICE_ENTERPRISE,
};

export interface IyzicoConfig {
  apiKey: string;
  secretKey: string;
  baseUrl: string;
}

/**
 * Read iyzico config from env. Returns null when credentials missing —
 * call sites should gate via isIyzicoConfigured().
 */
export function getIyzicoConfig(): IyzicoConfig | null {
  const apiKey = process.env.IYZICO_API_KEY;
  const secretKey = process.env.IYZICO_SECRET_KEY;
  if (!apiKey || !secretKey) return null;
  return {
    apiKey,
    secretKey,
    baseUrl: process.env.IYZICO_BASE_URL ?? "https://sandbox-api.iyzipay.com",
  };
}

export function isIyzicoConfigured(): boolean {
  return getIyzicoConfig() !== null;
}

/**
 * Composite payment provider check — Stripe veya iyzico'dan biri aktifse
 * pricing page upgrade flow çalışır.
 */
export function isPaymentProviderConfigured(): boolean {
  return (
    isIyzicoConfigured() ||
    !!process.env.STRIPE_SECRET_KEY
  );
}

/**
 * Pick the active payment provider. Returns "iyzico" if env present
 * (TR-priority), else "stripe", else "manual" (admin contact path).
 */
export type PaymentProvider = "iyzico" | "stripe" | "manual";

export function pickPaymentProvider(): PaymentProvider {
  if (isIyzicoConfigured()) return "iyzico";
  if (process.env.STRIPE_SECRET_KEY) return "stripe";
  return "manual";
}

/**
 * Generate iyzico IYZWSv2 Authorization header.
 *
 * payload = randomKey + uri + JSON.stringify(body)
 * sig     = base64(HMAC-SHA256(payload, secretKey))
 * header  = `IYZWSv2 <apiKey>:<sig>`
 *
 * Exported for unit testing.
 */
export function buildIyzicoAuthHeader(params: {
  apiKey: string;
  secretKey: string;
  randomKey: string;
  uri: string;
  body: object;
}): string {
  const { apiKey, secretKey, randomKey, uri, body } = params;
  const payload = randomKey + uri + JSON.stringify(body);
  const sig = crypto.createHmac("sha256", secretKey).update(payload).digest("base64");
  return `IYZWSv2 ${apiKey}:${sig}`;
}

/**
 * Generate a non-guessable randomKey for IYZWSv2 nonce.
 * Production overrides allowed for deterministic tests.
 */
let randomKeyGen: () => string = () =>
  Date.now().toString() + crypto.randomBytes(8).toString("hex");

/** Test-only: override randomKey generator. */
export function __setRandomKeyGenForTest(fn: () => string): void {
  randomKeyGen = fn;
}

/** Default: returns iyzico-format randomKey (ms timestamp + 16-hex chars). */
export function generateRandomKey(): string {
  return randomKeyGen();
}

/**
 * Verify webhook signature. iyzico sends X-Iyz-Signature header containing
 * base64 HMAC-SHA256 of the raw body using the webhook secret.
 * Constant-time comparison via crypto.timingSafeEqual.
 */
export function verifyIyzicoWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  webhookSecret: string,
): boolean {
  if (!signatureHeader) return false;
  const expected = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("base64");
  // Both must be same byte length for timingSafeEqual.
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Thin HTTP wrapper around iyzico REST API. Pure: no Sentry, no DB —
 * leave that to callers. Returns parsed JSON on 2xx, throws on non-2xx
 * with body string in error message.
 */
async function iyzicoFetch<T>(
  uri: string,
  body: object,
  method: "POST" | "GET" = "POST",
): Promise<T> {
  const cfg = getIyzicoConfig();
  if (!cfg) throw new Error("iyzico not configured");

  const randomKey = generateRandomKey();
  const auth = buildIyzicoAuthHeader({
    apiKey: cfg.apiKey,
    secretKey: cfg.secretKey,
    randomKey,
    uri,
    body,
  });

  const res = await fetch(`${cfg.baseUrl}${uri}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: auth,
      "x-iyzi-rnd": randomKey,
    },
    body: method === "POST" ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`iyzico non-JSON response (status ${res.status}): ${text.slice(0, 200)}`);
  }

  if (!res.ok) {
    const errMsg =
      typeof json === "object" && json !== null && "errorMessage" in json
        ? String((json as { errorMessage: unknown }).errorMessage)
        : `iyzico HTTP ${res.status}`;
    throw new Error(errMsg);
  }
  return json as T;
}

/** Test hook — override fetch impl. */
let fetchImpl: typeof iyzicoFetch = iyzicoFetch;
export function __setIyzicoFetchForTest(fn: typeof iyzicoFetch): void {
  fetchImpl = fn;
}
export function __resetIyzicoFetchForTest(): void {
  fetchImpl = iyzicoFetch;
}

/**
 * iyzico subscription init checkout (one-shot card collect + first charge).
 *
 * Returns an iyzico-hosted checkout URL (`checkoutFormContent`) that the
 * client opens in an iframe or full redirect. After payment, iyzico
 * POSTs the subscription event to our webhook.
 *
 * URI: /v2/subscription/checkoutform/initialize
 */
export interface IyzicoCheckoutInitInput {
  locale: "tr" | "en";
  conversationId: string;
  pricingPlanReferenceCode: string;
  subscriptionInitialStatus: "ACTIVE" | "PENDING";
  callbackUrl: string;
  customer: {
    email: string;
    name: string;
    surname: string;
    identityNumber?: string;
    gsmNumber?: string;
    billingAddress: {
      contactName: string;
      city: string;
      country: string;
      address: string;
      zipCode?: string;
    };
  };
}

export interface IyzicoCheckoutInitResult {
  status: "success" | "failure";
  systemTime: number;
  conversationId: string;
  /** iyzico hosted checkout URL — pass to client for redirect. */
  checkoutFormContent?: string;
  token?: string;
  tokenExpireTime?: number;
  errorCode?: string;
  errorMessage?: string;
}

export async function initSubscriptionCheckout(
  input: IyzicoCheckoutInitInput,
): Promise<IyzicoCheckoutInitResult> {
  return fetchImpl<IyzicoCheckoutInitResult>(
    "/v2/subscription/checkoutform/initialize",
    input,
  );
}

/**
 * Retrieve subscription by reference code.
 * URI: /v2/subscription/subscriptions/{referenceCode}
 */
export interface IyzicoSubscription {
  status: "success" | "failure";
  systemTime: number;
  referenceCode: string;
  parentReferenceCode?: string;
  pricingPlanReferenceCode: string;
  customerReferenceCode: string;
  subscriptionStatus:
    | "ACTIVE"
    | "PENDING"
    | "UNPAID"
    | "UPGRADED"
    | "CANCELED"
    | "EXPIRED";
  trialDays?: number;
  trialStartDate?: number;
  trialEndDate?: number;
  createdDate?: number;
  startDate?: number;
  endDate?: number;
  errorCode?: string;
  errorMessage?: string;
}

export async function getSubscription(
  subscriptionReferenceCode: string,
): Promise<IyzicoSubscription> {
  return fetchImpl<IyzicoSubscription>(
    `/v2/subscription/subscriptions/${encodeURIComponent(subscriptionReferenceCode)}`,
    {},
    "GET",
  );
}

/**
 * Cancel an active subscription.
 * URI: /v2/subscription/subscriptions/{referenceCode}/cancel
 */
export async function cancelSubscription(
  subscriptionReferenceCode: string,
): Promise<{ status: "success" | "failure"; errorMessage?: string }> {
  return fetchImpl<{ status: "success" | "failure"; errorMessage?: string }>(
    `/v2/subscription/subscriptions/${encodeURIComponent(subscriptionReferenceCode)}/cancel`,
    {},
  );
}

/**
 * iyzico webhook event shape (post-verified). Field names from iyzico
 * webhook docs.
 */
export interface IyzicoWebhookEvent {
  iyziEventType:
    | "subscription.activation"
    | "subscription.renewal"
    | "subscription.unpaid"
    | "subscription.cancellation"
    | "subscription.trial.expire"
    | "subscription.expire"
    | string;
  iyziEventTime: number;
  iyziReferenceCode: string;
  iyziSubscriptionReferenceCode?: string;
  iyziCustomerReferenceCode?: string;
  iyziPaymentId?: string;
  status?: string;
}

/**
 * Map iyzico pricing plan reference code back to our internal plan name.
 * Env stores reference codes; here we reverse-lookup against IYZICO_PRICE_*.
 *
 * Defensive default: any unknown ref falls back to "pro" (safer than
 * starter — a paid customer should always retain at least pro).
 */
export function inferPlanFromIyzicoReference(ref: string | undefined): "pro" | "enterprise" {
  if (!ref) return "pro";
  if (ref === process.env.IYZICO_PRICE_ENTERPRISE) return "enterprise";
  if (ref === process.env.IYZICO_PRICE_PRO) return "pro";
  return "pro";
}

/**
 * Decision result when reconciling a first-time activation webhook
 * against tenants in "pending iyzico checkout" state. Pure: caller
 * supplies the DB-fetched candidate list, this function decides.
 *
 * - "claim"     : exactly one candidate → safe to link
 * - "ambiguous" : multiple candidates → race; refuse to guess
 * - "no_match"  : no candidates → not a recoverable activation
 */
export type IyzicoReconcileResult =
  | { decision: "claim"; tenantId: string }
  | { decision: "ambiguous"; candidateCount: number }
  | { decision: "no_match" };

export function reconcileActivationCandidate<T extends { id: string }>(
  candidates: T[],
): IyzicoReconcileResult {
  if (candidates.length === 0) return { decision: "no_match" };
  if (candidates.length === 1) return { decision: "claim", tenantId: candidates[0].id };
  return { decision: "ambiguous", candidateCount: candidates.length };
}

/**
 * Classify an iyzico webhook event type into a normalized action kind
 * the dispatcher will route on. Centralizing this lets us unit-test the
 * branch logic without touching DB/Sentry/emails.
 */
export type IyzicoEventAction =
  | "activation"
  | "renewal"
  | "unpaid"
  | "cancellation"
  | "trial.expire"
  | "expire"
  | "unhandled";

export function classifyIyzicoEvent(eventType: string | undefined): IyzicoEventAction {
  switch (eventType) {
    case "subscription.activation":
      return "activation";
    case "subscription.renewal":
      return "renewal";
    case "subscription.unpaid":
      return "unpaid";
    case "subscription.cancellation":
      return "cancellation";
    case "subscription.trial.expire":
      return "trial.expire";
    case "subscription.expire":
      return "expire";
    default:
      return "unhandled";
  }
}

/** Map iyzico subscription status → our internal Tenant.subscriptionStatus. */
export function mapIyzicoStatusToInternal(
  status: IyzicoSubscription["subscriptionStatus"] | string,
): "active" | "trialing" | "past_due" | "canceled" | "expired" | "incomplete" {
  switch (status) {
    case "ACTIVE":
      return "active";
    case "PENDING":
      return "trialing";
    case "UNPAID":
      return "past_due";
    case "CANCELED":
      return "canceled";
    case "EXPIRED":
      return "expired";
    default:
      return "incomplete";
  }
}
