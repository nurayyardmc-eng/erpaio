import { createNativeStackNavigator } from "@react-navigation/native-stack";
import SessionsScreen, { type ChatStackParamList } from "./SessionsScreen";
import ChatScreen from "./ChatScreen";
import { colors, font } from "../lib/theme";

const Stack = createNativeStackNavigator<ChatStackParamList>();

export default function ChatStackNav() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { color: colors.text, fontFamily: font, fontSize: 14 },
        headerTintColor: colors.accent,
      }}
    >
      <Stack.Screen
        name="Sessions"
        component={SessionsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={({ route }) => ({
          title: route.params?.title ?? "Yeni Sohbet",
          headerShown: false,
        })}
      />
    </Stack.Navigator>
  );
}
