import { useEffect, useState } from "react";
import { ActivityIndicator, StatusBar, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import LoginScreen from "./src/screens/LoginScreen";
import PlaceholderScreen from "./src/screens/PlaceholderScreen";
import ChatStackNav from "./src/screens/ChatStackNav";
import AlertsScreen from "./src/screens/AlertsScreen";
import { getToken, clearToken } from "./src/lib/api";
import { logout as authLogout } from "./src/lib/auth";
import { registerForPush } from "./src/lib/push";
import { colors, font } from "./src/lib/theme";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
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
      <Tabs.Screen
        name="Chat"
        component={ChatStackNav}
        options={{ headerShown: false }}
      />
      <Tabs.Screen
        name="Alerts"
        component={AlertsScreen}
        options={{ headerShown: false }}
      />
      <Tabs.Screen
        name="Ayarlar"
        children={() => <PlaceholderScreen title="Ayarlar" onLogout={onLogout} />}
      />
    </Tabs.Navigator>
  );
}

export default function App() {
  const [authState, setAuthState] = useState<"loading" | "authed" | "guest">("loading");

  useEffect(() => {
    void (async () => {
      const t = await getToken();
      setAuthState(t ? "authed" : "guest");
    })();
  }, []);

  useEffect(() => {
    if (authState !== "authed") return;
    void registerForPush().catch(() => {});
  }, [authState]);

  const handleLogout = async () => {
    await authLogout().catch(async () => {
      await clearToken();
    });
    setAuthState("guest");
  };

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
        {authState === "loading" ? (
          <View style={styles.loader}>
            <ActivityIndicator color={colors.accent} />
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
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
});
