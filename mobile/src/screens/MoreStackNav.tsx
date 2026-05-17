import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MoreScreen from "./MoreScreen";
import ConnectionsScreen from "./ConnectionsScreen";
import ConnectionFormScreen from "./ConnectionFormScreen";
import SavedScreen from "./SavedScreen";
import AnnotationsScreen from "./AnnotationsScreen";
import InsightsScreen from "./InsightsScreen";
import WatchlistsScreen from "./WatchlistsScreen";
import ScheduledReportsScreen from "./ScheduledReportsScreen";
import TeamScreen from "./TeamScreen";
import AuditScreen from "./AuditScreen";
import SecurityScreen from "./SecurityScreen";
import OverviewScreen from "./OverviewScreen";

export type MoreStackParamList = {
  More: undefined;
  Overview: undefined;
  Saved: undefined;
  Connections: undefined;
  ConnectionForm: undefined;
  Annotations: undefined;
  Watchlists: undefined;
  Insights: undefined;
  ScheduledReports: undefined;
  Team: undefined;
  Audit: undefined;
  Security: undefined;
};

const Stack = createNativeStackNavigator<MoreStackParamList>();

export default function MoreStackNav() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="More" component={MoreScreen} />
      <Stack.Screen name="Overview" component={OverviewScreen} />
      <Stack.Screen name="Saved" component={SavedScreen} />
      <Stack.Screen name="Connections" component={ConnectionsScreen} />
      <Stack.Screen name="ConnectionForm" component={ConnectionFormScreen} />
      <Stack.Screen name="Annotations" component={AnnotationsScreen} />
      <Stack.Screen name="Watchlists" component={WatchlistsScreen} />
      <Stack.Screen name="Insights" component={InsightsScreen} />
      <Stack.Screen name="ScheduledReports" component={ScheduledReportsScreen} />
      <Stack.Screen name="Team" component={TeamScreen} />
      <Stack.Screen name="Audit" component={AuditScreen} />
      <Stack.Screen name="Security" component={SecurityScreen} />
    </Stack.Navigator>
  );
}
