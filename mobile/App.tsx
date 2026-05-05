import { useEffect, useState } from "react";
import { ActivityIndicator, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import AsyncStorage from "@react-native-async-storage/async-storage";

import LoginScreen from "./src/screens/LoginScreen";
import SignupScreen from "./src/screens/SignupScreen";
import ForgotPasswordScreen from "./src/screens/ForgotPasswordScreen";
import ChatStackNav from "./src/screens/ChatStackNav";
import AlertsScreen from "./src/screens/AlertsScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import MoreStackNav from "./src/screens/MoreStackNav";
import { getToken, clearToken, setUnauthorizedHandler } from "./src/lib/api";
import { logout as authLogout } from "./src/lib/auth";
import { registerForPush } from "./src/lib/push";
import { authenticate, isBiometricEnabled, isBiometricSupported } from "./src/lib/biometric";
import { colors, font } from "./src/lib/theme";
import Toaster from "./src/components/Toast";
import ConfirmHost from "./src/components/Confirm";

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
      <Tabs.Screen name="Sohbet" component={ChatStackNav} options={{ headerShown: false }} />
      <Tabs.Screen name="Bildirimler" component={AlertsScreen} options={{ headerShown: false }} />
      <Tabs.Screen name="Menü" component={MoreStackNav} options={{ headerShown: false }} />
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
          <NavigationContainer theme={navTheme}>
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
