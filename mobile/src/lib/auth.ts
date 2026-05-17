import { Platform } from "react-native";
import { api, setToken, clearToken } from "./api";

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
  await setToken(res.token);
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
