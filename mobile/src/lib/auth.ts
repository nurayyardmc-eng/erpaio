import { Platform } from "react-native";
import { api, setToken, clearToken, getTokenExpiresAt } from "./api";

export interface MobileUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  tenantId: string;
}

export interface LoginResponse {
  token: string;
  expiresAt: string;
  user: MobileUser;
}

export async function login(email: string, password: string): Promise<MobileUser> {
  const res = await api<LoginResponse>("/api/auth/mobile-login", {
    method: "POST",
    authenticated: false,
    body: {
      email,
      password,
      deviceName: `${Platform.OS}-${Platform.Version}`,
    },
  });
  await setToken(res.token, res.expiresAt);
  return res.user;
}

/**
 * Logout — bu cihazın API token'ını revoke et + push token kaydını sil.
 * `pushToken` parametresi varsa server yalnızca bu cihazın push token'ını
 * siler (multi-device kullanıcı diğer cihazlarda push almaya devam eder).
 * Yoksa kullanıcının TÜM push token'ları silinir.
 */
export async function logout(pushToken?: string | null): Promise<void> {
  try {
    await api("/api/auth/mobile-logout", {
      method: "POST",
      body: pushToken ? { token: pushToken } : undefined,
    });
  } catch {
    // ignore — local clear yine de yapılır
  }
  await clearToken();
}

export async function getMe(): Promise<{ user: MobileUser } | null> {
  try {
    const res = await api<{ user: MobileUser }>("/api/me");
    return { user: res.user };
  } catch {
    return null;
  }
}

// Single-flight refresh guard — concurrent caller'lar aynı in-flight Promise'i
// bekler. App launch'ta refreshIfNeeded() çağrılır + kullanıcı hemen chat'e
// gider; iki POST/api/auth/mobile-refresh paralel çıkmasın (server eski
// token'ı revoke ederse ikinci çağrı 401 alır).
let refreshPromise: Promise<{ token: string; expiresAt: string } | null> | null = null;

/**
 * API token'ı yenile (90 günlük expiry'a yaklaşırken).
 * Server eski token'ı revoke eder, yeni token'ı döner — SecureStore'a yaz.
 * Single-flight: concurrent çağrılar aynı promise'i paylaşır.
 */
export async function refreshApiToken(): Promise<{ token: string; expiresAt: string } | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const res = await api<{ token: string; expiresAt: string }>("/api/auth/mobile-refresh", {
        method: "POST",
      });
      await setToken(res.token, res.expiresAt);
      return res;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

/** Token kalan süresine bak; eşik altındaysa otomatik refresh. */
export async function refreshIfNeeded(thresholdDays: number = 14): Promise<boolean> {
  const expiresAt = await getTokenExpiresAt();
  // Eski format SecureStore (expiresAt henüz yazılmamış) — no-op, kullanıcı
  // bir sonraki login'de yeni format alır.
  if (!expiresAt) return false;
  const remainingMs = expiresAt.getTime() - Date.now();
  const thresholdMs = thresholdDays * 24 * 60 * 60_000;
  if (remainingMs > thresholdMs) return false;
  const refreshed = await refreshApiToken();
  return refreshed !== null;
}

export interface SignupParams {
  email: string;
  password: string;
  name?: string;
  tenantName: string;
}

export async function signup(params: SignupParams): Promise<void> {
  await api("/api/auth/signup", {
    method: "POST",
    authenticated: false,
    body: params,
  });
}

export async function requestPasswordReset(email: string): Promise<void> {
  await api("/api/auth/forgot-password", {
    method: "POST",
    authenticated: false,
    body: { email },
  });
}
