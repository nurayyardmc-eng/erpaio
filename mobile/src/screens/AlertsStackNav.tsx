import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AlertsScreen from "./AlertsScreen";
import AlertDetailScreen from "./AlertDetailScreen";

export type AlertsStackParamList = {
  AlertsList: undefined;
  AlertDetail: { id: string };
};

const Stack = createNativeStackNavigator<AlertsStackParamList>();

export default function AlertsStackNav() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AlertsList" component={AlertsScreen} />
      <Stack.Screen name="AlertDetail" component={AlertDetailScreen} />
    </Stack.Navigator>
  );
}
