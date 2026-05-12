import { createNativeStackNavigator } from "@react-navigation/native-stack";
import SessionsScreen, { type ChatStackParamList } from "./SessionsScreen";
import ChatScreen from "./ChatScreen";

const Stack = createNativeStackNavigator<ChatStackParamList>();

export default function ChatStackNav() {
  return (
    <Stack.Navigator
      initialRouteName="Chat"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="Sessions" component={SessionsScreen} />
    </Stack.Navigator>
  );
}
