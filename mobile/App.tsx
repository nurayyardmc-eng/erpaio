import { useEffect, useState } from "react";
import { ActivityIndicator, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer, DefaultTheme, createNavigationContainerRef } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MessageSquare, Bell, Menu, Settings } from "lucide-react-native";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";

import LoginScreen from "./src/screens/LoginScreen";
import SignupScreen from "./src/screens/SignupScreen";
import ForgotPasswordScreen from "./src/screens/ForgotPasswordScreen";
import ChatStackNav from "./src/screens/ChatStackNav";
import AlertsStackNav from "./src/screens/AlertsStackNav";
import SettingsScreen from "./src/screens/SettingsScreen";
import MoreStackNav from "./src/screens/MoreStackNav";
import { getToken, clearToken, setUnauthorizedHandler } from "./src/lib/api";
import { logout as authLogout, refreshIfNeeded } from "./src/lib/auth";
import { registerForPush } from "./src/lib/push";
import { routeFromNotificationData } from "./src/lib/notificationRouting";
import { authenticate, isBiometricEnabled, isBiometricSupported } from "./src/lib/biometric";
import { colors, font } from "./src/lib/theme";
import Toaster from "./src/components/Toast";
import ConfirmHost from "./src/components/Confirm";
import KvkkConsent from "./src/components/KvkkConsent";
import NpsPrompt from "./src/components/NpsPrompt";
import { I18nProvider } from "./src/lib/i18n/context";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      gcTime: 24 * 60 * 60_000,
    },
  },
});

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "erpaio-cache-v1",
});

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

/**
 * Global navigation ref — push notification tap handler buradan navigate eder.
 * Component dışında oluşturuldu çünkü `addNotificationResponseReceivedListener`
 * useEffect içinde çağrılır ama navigation hierarchy mount edildiğinde stabil olmalı.
 */
const navigationRef = createNavigationContainerRef();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card: colors.card,
    text: colors.text,
    primary: colors.brand,
    border: colors.border,
    notification: colors.error,
  },
};

function TabsRoot({ onLogout }: { onLogout: () => void }) {
  return (
    <Tabs.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg, borderBottomColor: colors.border, borderBottomWidth: 1 },
        headerTitleStyle: { color: colors.text, fontFamily: font, fontSize: 16, fontWeight: "600" },
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingTop: 6,
          height: 84,
        },
        tabBarLabelStyle: { fontFamily: font, fontSize: 11, fontWeight: "500" },
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textSubtle,
      }}
    >
      <Tabs.Screen
        name="Sohbet"
        component={ChatStackNav}
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => <MessageSquare size={size} color={color} strokeWidth={1.75} />,
        }}
      />
      <Tabs.Screen
        name="Bildirimler"
        component={AlertsStackNav}
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Bell size={size} color={color} strokeWidth={1.75} />,
        }}
      />
      <Tabs.Screen
        name="Menü"
        component={MoreStackNav}
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Menu size={size} color={color} strokeWidth={1.75} />,
        }}
      />
      <Tabs.Screen
        name="Ayarlar"
        children={() => <SettingsScreen onLogout={onLogout} />}
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} strokeWidth={1.75} />,
        }}
      />
    </Tabs.Navigator>
  );
}

export default function App() {
  const [authState, setAuthState] = useState<"loading" | "biometric" | "authed" | "guest">("loading");
  const [biometricFailed, setBiometricFailed] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  // Multi-device: logout sırasında server'a sadece BU cihazın push token'ını
  // gönderelim, diğer cihazların push kaydını silmesin.
  const [pushToken, setPushToken] = useState<string | null>(null);

  // 401 handler — token geçersiz/expired olduğunda otomatik logout
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setAuthState("guest");
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    void (async () => {
      const t = await getToken();
      if (!t) {
        setAuthState("guest");
        return;
      }
      const enabled = await isBiometricEnabled();
      if (enabled && (await isBiometricSupported())) {
        setAuthState("biometric");
        const ok = await authenticate("ERPAIO'ya giriş için doğrulama");
        if (ok) {
          setAuthState("authed");
        } else {
          setBiometricFailed(true);
        }
      } else {
        setAuthState("authed");
      }
    })();
  }, []);

  useEffect(() => {
    if (authState !== "authed") return;
    // Single-flight guard — rapid auth state churn (logout→login) tetiklenirse
    // registerForPush'u iki kez paralel çağırmayalım. cleanup flag closure'a
    // bağlı: effect re-run olursa eski çağrı setState yapmaz.
    let cancelled = false;
    // Expo Go SDK 53+ push notifications kısıtlı — dev client'ta tam çalışır.
    // Hata fırlatsa bile uygulamayı çökertme.
    registerForPush()
      .then((token) => {
        if (cancelled) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (token) setPushToken(token);
      })
      .catch(() => {});

    // Token refresh — 90 günlük expiry'a 14 gün kalınca otomatik yenile.
    // Best-effort, fail olursa kullanıcı 401 alırsa zaten /api/auth handler
    // ile guest'e düşer (setUnauthorizedHandler).
    refreshIfNeeded(14).catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [authState]);

  // Push notification tap deep-link routing.
  // authed olduğumuzda hem foreground/background listener'ı kuruyoruz hem de
  // app cold-start ile açıldığında getLastNotificationResponseAsync ile son
  // tapped notification'a backfill yapıyoruz. routeFromNotificationData pure
  // helper (test'li); navigationRef tabsRoot mount edildikten sonra erişilebilir.
  useEffect(() => {
    if (authState !== "authed") return;

    const handleResponse = (resp: Notifications.NotificationResponse | null) => {
      if (!resp) return;
      const data = resp.notification.request.content.data;
      const target = routeFromNotificationData(data);
      if (!target) return;
      // navigationRef hemen ready olmayabilir — short retry. Cold-start
      // path'inde navigation tree mount + ready arasında race var.
      const tryNavigate = (attemptsLeft: number) => {
        if (!navigationRef.isReady()) {
          if (attemptsLeft > 0) {
            setTimeout(() => tryNavigate(attemptsLeft - 1), 100);
          }
          return;
        }
        // navigationRef.navigate v7 overload sıkıştırıcı — TS narrowing two-arg
        // form'u "never" yapar. Pratikte string + params object çalışır;
        // type-assert with unknown intermediate to satisfy compiler.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const nav = navigationRef as any;
        if (target.tab === "Bildirimler") {
          // alertId varsa AlertsStack → AlertDetail'a derinleş; yoksa
          // sadece tab'a (AlertsList default ekran) git.
          if (target.alertId) {
            nav.navigate("Tabs", {
              screen: "Bildirimler",
              params: {
                screen: "AlertDetail",
                params: { id: target.alertId },
              },
            });
          } else {
            nav.navigate("Tabs", { screen: "Bildirimler" });
          }
        } else if (target.tab === "Menü") {
          nav.navigate("Tabs", {
            screen: "Menü",
            params: { screen: target.nestedRoute },
          });
        }
      };
      tryNavigate(10); // 10x100ms = 1s max wait
    };

    // App foreground'tayken bildirim tıklanırsa
    const sub = Notifications.addNotificationResponseReceivedListener(handleResponse);

    // App kapalıyken bildirim tıklanarak açıldıysa: cold-start backfill
    void Notifications.getLastNotificationResponseAsync()
      .then(handleResponse)
      .catch(() => {
        // Expo Go'da bu API yok / no-op
      });

    return () => sub.remove();
  }, [authState]);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await authLogout(pushToken);
    } catch {
      await clearToken();
    } finally {
      setPushToken(null);
      setLoggingOut(false);
      setAuthState("guest");
    }
  };

  const retryBiometric = async () => {
    setBiometricFailed(false);
    const ok = await authenticate("ERPAIO'ya giriş için doğrulama");
    if (ok) setAuthState("authed");
    else setBiometricFailed(true);
  };

  const passwordLogin = async () => {
    await clearToken();
    setAuthState("guest");
  };

  return (
    <SafeAreaProvider>
      <PersistQueryClientProvider client={queryClient} persistOptions={{ persister, maxAge: 24 * 60 * 60_000 }}>
        <I18nProvider>
        <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
        {authState === "loading" || authState === "biometric" ? (
          <View style={styles.loader}>
            <ActivityIndicator color={colors.brand} />
            {biometricFailed && (
              <View style={styles.biometricFailedBox}>
                <Text style={styles.biometricErrorText}>Doğrulama başarısız.</Text>
                <TouchableOpacity onPress={retryBiometric} style={styles.biometricBtn}>
                  <Text style={styles.biometricBtnText}>Tekrar Dene</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={passwordLogin}>
                  <Text style={styles.biometricLink}>Şifre ile giriş yap</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <NavigationContainer theme={navTheme} ref={navigationRef}>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              {authState === "guest" ? (
                <>
                  <Stack.Screen name="Login">
                    {(props) => (
                      <LoginScreen
                        onLoginSuccess={() => setAuthState("authed")}
                        onGoToSignup={() => props.navigation.navigate("Signup")}
                        onGoToForgot={() => props.navigation.navigate("ForgotPassword")}
                      />
                    )}
                  </Stack.Screen>
                  <Stack.Screen name="Signup">
                    {(props) => (
                      <SignupScreen
                        onSuccess={() => setAuthState("authed")}
                        onBack={() => props.navigation.goBack()}
                      />
                    )}
                  </Stack.Screen>
                  <Stack.Screen name="ForgotPassword">
                    {(props) => <ForgotPasswordScreen onBack={() => props.navigation.goBack()} />}
                  </Stack.Screen>
                </>
              ) : (
                <Stack.Screen name="Tabs">
                  {() => <TabsRoot onLogout={handleLogout} />}
                </Stack.Screen>
              )}
            </Stack.Navigator>
          </NavigationContainer>
        )}
        <Toaster />
        <ConfirmHost />
        <KvkkConsent />
        {/* Track TTTT — NPS prompt sadece auth'lı kullanıcıya. Component
            kendi AsyncStorage cool-down'unu yönetir (30s delay + 90g submit
            + 14g dismiss). Web NpsPrompt ile parity. */}
        {authState === "authed" && <NpsPrompt />}
        </I18nProvider>
      </PersistQueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bgSubtle },
  biometricFailedBox: { marginTop: 24, alignItems: "center", gap: 12 },
  biometricErrorText: { color: colors.error, fontFamily: font, fontSize: 13, fontWeight: "500" },
  biometricBtn: {
    backgroundColor: colors.brand,
    borderRadius: 100,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  biometricBtnText: { color: colors.textInverse, fontFamily: font, fontSize: 14, fontWeight: "600" },
  biometricLink: { color: colors.textMuted, fontFamily: font, fontSize: 13, textDecorationLine: "underline" },
});
