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

export async function logout(): Promise<void> {
  try {
    await api("/api/auth/mobile-logout", { method: "POST" });
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
