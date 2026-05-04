import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { api } from "./api";

// Expo Go SDK 53+ push notifications'ı kaldırdı — sadece dev/standalone build'de çalışır.
// Expo Go'da bu fonksiyonları çağırmaktan kaçınıyoruz, yoksa New Architecture
// "expected boolean, got string" hatası fırlatabiliyor.
const isExpoGo = Constants.executionEnvironment === "storeClient";

if (!isExpoGo) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function registerForPush(): Promise<string | null> {
  if (isExpoGo) {
    // Sessizce skip — Expo Go'da push çalışmaz, dev/production build gerekir.
    return null;
  }

  if (!Device.isDevice) return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#00E5FF",
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let granted = existing.status === "granted";
  if (!granted) {
    const req = await Notifications.requestPermissionsAsync();
    granted = req.status === "granted";
  }
  if (!granted) return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants.easConfig as { projectId?: string } | undefined)?.projectId;

  let token: string;
  try {
    const result = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    token = result.data;
  } catch (e) {
    console.warn("Push token alınamadı:", e);
    return null;
  }

  try {
    await api("/api/me/push-token", {
      method: "POST",
      body: {
        token,
        platform: Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "web",
        deviceName: Device.modelName ?? undefined,
      },
    });
  } catch (e) {
    console.warn("Backend'e push token kaydedilemedi:", e);
  }

  return token;
}

export async function unregisterPushToken(token: string): Promise<void> {
  if (isExpoGo) return;
  try {
    await api(`/api/me/push-token?token=${encodeURIComponent(token)}`, { method: "DELETE" });
  } catch {
    // ignore
  }
}
