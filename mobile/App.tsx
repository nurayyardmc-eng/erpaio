import { useEffect, useState } from "react";
import { ActivityIndicator, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import AsyncStorage from "@react-native-async-storage/async-storage";

import LoginScreen from "./src/screens/LoginScreen";
import ChatStackNav from "./src/screens/ChatStackNav";
import AlertsScreen from "./src/screens/AlertsScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import { getToken, clearToken, setUnauthorizedHandler } from "./src/lib/api";
import { logout as authLogout } from "./src/lib/auth";
import { registerForPush } from "./src/lib/push";
import { authenticate, isBiometricEnabled, isBiometricSupported } from "./src/lib/biometric";
import { colors, font } from "./src/lib/theme";

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

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.surface,
    text: colors.text,
    primary: colors.accent,
    border: colors.border,
  },
};

function TabsRoot({ onLogout }: { onLogout: () => void }) {
  return (
    <Tabs.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { color: colors.text, fontFamily: font, fontSize: 14 },
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: { fontFamily: font, fontSize: 10 },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textDim,
      }}
    >
      <Tabs.Screen name="Chat" component={ChatStackNav} options={{ headerShown: false }} />
      <Tabs.Screen name="Alerts" component={AlertsScreen} options={{ headerShown: false }} />
      <Tabs.Screen
        name="Ayarlar"
        children={() => <SettingsScreen onLogout={onLogout} />}
        options={{ headerShown: false }}
      />
    </Tabs.Navigator>
  );
}

export default function App() {
  const [authState, setAuthState] = useState<"loading" | "biometric" | "authed" | "guest">("loading");
  const [biometricFailed, setBiometricFailed] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

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
    // Expo Go SDK 53+ push notifications kısıtlı — dev client'ta tam çalışır.
    // Hata fırlatsa bile uygulamayı çökertme.
    registerForPush().catch(() => {});
  }, [authState]);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await authLogout();
    } catch {
      await clearToken();
    } finally {
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
        <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
        {authState === "loading" || authState === "biometric" ? (
          <View style={styles.loader}>
            <ActivityIndicator color={colors.accent} />
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
          <NavigationContainer theme={navTheme}>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              {authState === "guest" ? (
                <Stack.Screen name="Login">
                  {() => <LoginScreen onLoginSuccess={() => setAuthState("authed")} />}
                </Stack.Screen>
              ) : (
                <Stack.Screen name="Tabs">
                  {() => <TabsRoot onLogout={handleLogout} />}
                </Stack.Screen>
              )}
            </Stack.Navigator>
          </NavigationContainer>
        )}
      </PersistQueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  biometricFailedBox: { marginTop: 24, alignItems: "center", gap: 12 },
  biometricErrorText: { color: colors.danger, fontFamily: font, fontSize: 12 },
  biometricBtn: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accentBorder,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  biometricBtnText: { color: colors.accent, fontFamily: font, fontSize: 13 },
  biometricLink: { color: colors.textDim, fontFamily: font, fontSize: 11 },
});
