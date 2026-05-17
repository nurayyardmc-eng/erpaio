import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MoreScreen from "./MoreScreen";
import ConnectionsScreen from "./ConnectionsScreen";
import ConnectionFormScreen from "./ConnectionFormScreen";
import SavedScreen from "./SavedScreen";
import AnnotationsScreen from "./AnnotationsScreen";
import AnnotationFormScreen from "./AnnotationFormScreen";
import InsightsScreen from "./InsightsScreen";
import WatchlistsScreen from "./WatchlistsScreen";
import WatchlistFormScreen from "./WatchlistFormScreen";
import ScheduledReportsScreen from "./ScheduledReportsScreen";
import ScheduledReportFormScreen from "./ScheduledReportFormScreen";
import TeamScreen from "./TeamScreen";
import AuditScreen from "./AuditScreen";
import SecurityScreen from "./SecurityScreen";
import OverviewScreen from "./OverviewScreen";
import ActivityScreen from "./ActivityScreen";
import ConsentsScreen from "./ConsentsScreen";
import DevicesScreen from "./DevicesScreen";

export type MoreStackParamList = {
  More: undefined;
  Overview: undefined;
  Saved: undefined;
  Connections: undefined;
  ConnectionForm: undefined;
  Annotations: undefined;
  AnnotationForm: undefined;
  Watchlists: undefined;
  WatchlistForm: undefined;
  Insights: undefined;
  ScheduledReports: undefined;
  ScheduledReportForm: undefined;
  Team: undefined;
  Audit: undefined;
  Security: undefined;
  Activity: undefined;
  Consents: undefined;
  Devices: undefined;
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
      <Stack.Screen name="AnnotationForm" component={AnnotationFormScreen} />
      <Stack.Screen name="Watchlists" component={WatchlistsScreen} />
      <Stack.Screen name="WatchlistForm" component={WatchlistFormScreen} />
      <Stack.Screen name="Insights" component={InsightsScreen} />
      <Stack.Screen name="ScheduledReports" component={ScheduledReportsScreen} />
      <Stack.Screen name="ScheduledReportForm" component={ScheduledReportFormScreen} />
      <Stack.Screen name="Team" component={TeamScreen} />
      <Stack.Screen name="Audit" component={AuditScreen} />
      <Stack.Screen name="Security" component={SecurityScreen} />
      <Stack.Screen name="Activity" component={ActivityScreen} />
      <Stack.Screen name="Consents" component={ConsentsScreen} />
      <Stack.Screen name="Devices" component={DevicesScreen} />
    </Stack.Navigator>
  );
}
