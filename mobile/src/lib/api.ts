import * as SecureStore from "expo-secure-store";
import { backoffDelayMs, parseRetryAfter, shouldRetry } from "./retry";

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "") ?? "https://erpaio.vercel.app";

const TOKEN_KEY = "erpaio_api_token";
const EXPIRES_KEY = "erpaio_api_token_expires_at"; // ISO 8601 string

// 30s — Vercel function cold start ~5-15s + DB query ~2-5s + buffer
const DEFAULT_TIMEOUT_MS = 30_000;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string, expiresAt?: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  if (expiresAt) {
    await SecureStore.setItemAsync(EXPIRES_KEY, expiresAt);
  }
}

export async function getTokenExpiresAt(): Promise<Date | null> {
  const iso = await SecureStore.getItemAsync(EXPIRES_KEY);
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(EXPIRES_KEY).catch(() => {});
}

/** Client-side error code for translation. Server-side errors arrive in `body.error`. */
export type ApiErrorCode = "timeout" | "network" | "http";

export class ApiError extends Error {
  /** Code for client-side i18n; server errors are pre-localized via Accept-Language. */
  public readonly code: ApiErrorCode;
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
    code: ApiErrorCode = "http",
  ) {
    super(message);
    this.code = code;
  }
}

export interface ApiOptions extends Omit<RequestInit, "body" | "signal"> {
  body?: unknown;
  authenticated?: boolean;
  timeoutMs?: number;
}

// 401 olduğunda dispatch edilir — App.tsx dinleyip logout yapar.
// React Native global EventTarget yok, basit bir callback registry kullanıyoruz.
type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(h: UnauthorizedHandler | null): void {
  unauthorizedHandler = h;
}

export async function api<T = unknown>(path: string, opts: ApiOptions = {}): Promise<T> {
  const { authenticated = true, body, headers, timeoutMs = DEFAULT_TIMEOUT_MS, method, ...rest } = opts;
  const finalHeaders: Record<string, string> = {
    Accept: "application/json",
    ...((headers as Record<string, string>) ?? {}),
  };

  if (authenticated) {
    const token = await getToken();
    if (token) finalHeaders["Authorization"] = `Bearer ${token}`;
  }

  let bodyToSend: BodyInit | undefined;
  if (body !== undefined) {
    finalHeaders["Content-Type"] = "application/json";
    bodyToSend = JSON.stringify(body);
  }

  const httpMethod = method ?? (body !== undefined ? "POST" : "GET");

  let attempt = 0;
  // Retry loop — sonlanma koşulu: ya başarılı response, ya non-retryable error
  // ya da MAX_RETRIES'a ulaştık.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    let res: Response;
    try {
      res = await fetch(`${BASE_URL}${path}`, {
        ...rest,
        method: httpMethod,
        headers: finalHeaders,
        body: bodyToSend,
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timeoutId);
      const isAbort = (err as Error).name === "AbortError";
      const decision = shouldRetry({ method: httpMethod, attempt, networkError: !isAbort });
      if (decision) {
        const delay = backoffDelayMs(attempt);
        await sleep(delay);
        attempt++;
        continue;
      }
      if (isAbort) {
        throw new ApiError(0, "Request timed out.", undefined, "timeout");
      }
      throw new ApiError(0, "Network error.", undefined, "network");
    }
    clearTimeout(timeoutId);

    // Transient HTTP error? Retry decision yap (response body parse etmeden)
    if (!res.ok && shouldRetry({ method: httpMethod, attempt, status: res.status })) {
      const retryAfter = parseRetryAfter(res.headers.get("retry-after"));
      const delay = backoffDelayMs(attempt, retryAfter);
      await sleep(delay);
      attempt++;
      continue;
    }

    let parsed: unknown;
    const text = await res.text();
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = text;
    }

    if (!res.ok) {
      const err =
        parsed && typeof parsed === "object" && "error" in parsed
          ? String((parsed as { error: unknown }).error)
          : `HTTP ${res.status}`;

      // 401 → token geçersiz/süresi dolmuş, otomatik logout
      if (res.status === 401 && authenticated) {
        void clearToken();
        unauthorizedHandler?.();
      }

      throw new ApiError(res.status, err, parsed);
    }

    return parsed as T;
  }
}
