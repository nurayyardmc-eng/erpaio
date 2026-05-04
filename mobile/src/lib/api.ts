import * as SecureStore from "expo-secure-store";

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "") ?? "https://erpaio.vercel.app";

const TOKEN_KEY = "erpaio_api_token";

const DEFAULT_TIMEOUT_MS = 15_000;

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message);
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
  const { authenticated = true, body, headers, timeoutMs = DEFAULT_TIMEOUT_MS, ...rest } = opts;
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

  // AbortController — fetch'e timeout uygula
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...rest,
      headers: finalHeaders,
      body: bodyToSend,
      signal: controller.signal,
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new ApiError(0, "İstek zaman aşımına uğradı (timeout).");
    }
    throw new ApiError(0, "Ağ hatası. İnternet bağlantınızı kontrol edin.");
  } finally {
    clearTimeout(timeoutId);
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
