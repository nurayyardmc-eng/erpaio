import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "../lib/i18n/context";
import type { Dictionary } from "../lib/i18n/dictionary";
import { getMe } from "../lib/auth";
import { colors, font, fontSerif, radius, spacing } from "../lib/theme";
import type { MoreStackParamList } from "./MoreStackNav";

interface Props {
  navigation: NativeStackNavigationProp<MoreStackParamList, "More">;
}

interface MenuGroup {
  title: string;
  items: { route: keyof MoreStackParamList; label: string; description: string }[];
}

function buildGroups(t: Dictionary): MenuGroup[] {
  return [
    {
      title: t.menu.sectionDaily,
      items: [
        { route: "Overview", label: t.menu.overviewLabel, description: t.menu.overviewDesc },
        { route: "Saved", label: t.menu.savedLabel, description: t.menu.savedDesc },
      ],
    },
    {
      title: t.menu.sectionSetup,
      items: [
        { route: "Connections", label: t.menu.connectionsLabel, description: t.menu.connectionsDesc },
        { route: "Annotations", label: t.menu.annotationsLabel, description: t.menu.annotationsDesc },
        { route: "Watchlists", label: t.menu.watchlistsLabel, description: t.menu.watchlistsDesc },
      ],
    },
    {
      title: t.menu.sectionAnalysis,
      items: [
        { route: "Insights", label: t.menu.insightsLabel, description: t.menu.insightsDesc },
        { route: "ScheduledReports", label: t.menu.scheduledReportsLabel, description: t.menu.scheduledReportsDesc },
        { route: "Audit", label: t.menu.auditLabel, description: t.menu.auditDesc },
      ],
    },
    {
      title: t.menu.sectionAdmin,
      items: [
        { route: "Team", label: t.menu.teamLabel, description: t.menu.teamDesc },
        { route: "Security", label: t.menu.securityLabel, description: t.menu.securityDesc },
        { route: "IpAllowlist", label: t.menu.ipAllowlistLabel, description: t.menu.ipAllowlistDesc },
        { route: "SlowQueries", label: t.menu.slowQueriesLabel, description: t.menu.slowQueriesDesc },
        { route: "NotificationLog", label: t.menu.notificationLogLabel, description: t.menu.notificationLogDesc },
      ],
    },
    {
      title: t.menu.sectionKvkk,
      items: [
        { route: "Devices", label: t.menu.devicesLabel, description: t.menu.devicesDesc },
        { route: "Activity", label: t.menu.activityLabel, description: t.menu.activityDesc },
        { route: "Consents", label: t.menu.consentsLabel, description: t.menu.consentsDesc },
      ],
    },
  ];
}

export default function MoreScreen({ navigation }: Props) {
  const { t } = useI18n();
  const groups = buildGroups(t);
  const meQuery = useQuery({ queryKey: ["me-profile"], queryFn: getMe });
  const user = meQuery.data?.user;
  const displayName = (user?.name && user.name.trim()) || user?.email || "";
  const initial = (displayName || "?").charAt(0).toUpperCase();

  /**
   * Track QQQQ — profil kartı tap edilince Ayarlar tab'ına geç. Cross-tab
   * navigation: MoreStack → parent (Tabs) → "Ayarlar" tab. Web sidebar
   * avatar tıklaması da settings'e gider; aynı pattern.
   */
  const onProfilePress = () => {
    const parent = navigation.getParent() as
      | { navigate: (name: string, params?: unknown) => void }
      | undefined;
    parent?.navigate("Ayarlar");
  };

  return (
    <View style={[styles.root, { paddingTop: 50 }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing(5), paddingBottom: 200, flexGrow: 1 }}
        showsVerticalScrollIndicator={true}
      >
        <View style={{ marginBottom: spacing(5) }}>
          <Text style={styles.brand}>{t.menu.brand}</Text>
          <Text style={styles.pageTitle}>{t.menu.title}</Text>
        </View>

        {user && (
          <TouchableOpacity
            onPress={onProfilePress}
            activeOpacity={0.7}
            style={styles.profileCard}
            accessibilityRole="button"
            accessibilityLabel={t.menu.profileCardA11y}
          >
            <View style={styles.profileAvatarWrap}>
              {user.avatarBase64 ? (
                <Image source={{ uri: user.avatarBase64 }} style={styles.profileAvatar} />
              ) : (
                <View style={[styles.profileAvatar, styles.profileAvatarPlaceholder]}>
                  <Text style={styles.profileInitial}>{initial}</Text>
                </View>
              )}
            </View>
            <View style={{ flex: 1 }}>
              {user.name ? <Text style={styles.profileName} numberOfLines={1}>{user.name}</Text> : null}
              <Text style={styles.profileEmail} numberOfLines={1}>{user.email}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        )}

        {groups.map((group) => (
          <View key={group.title} style={styles.group}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            {group.items.map((item, i) => (
              <TouchableOpacity
                key={item.route}
                onPress={() => navigation.navigate(item.route as never)}
                style={[styles.item, i === group.items.length - 1 && styles.itemLast]}
                activeOpacity={0.6}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemLabel}>{item.label}</Text>
                  <Text style={styles.itemDesc}>{item.description}</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSubtle },
  profileCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing(4),
    marginBottom: spacing(3),
    flexDirection: "row",
    alignItems: "center",
  },
  profileAvatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: colors.bgSubtle,
    borderColor: colors.border,
    borderWidth: 1,
    marginRight: spacing(3),
  },
  profileAvatar: { width: "100%", height: "100%" },
  profileAvatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bgSubtle,
  },
  profileInitial: {
    color: colors.textMuted,
    fontFamily: fontSerif,
    fontSize: 22,
    fontWeight: "400",
  },
  profileName: { color: colors.text, fontFamily: font, fontSize: 15, fontWeight: "600" },
  profileEmail: { color: colors.textMuted, fontFamily: font, fontSize: 12, marginTop: 2 },
  brand: {
    color: colors.textSubtle,
    fontFamily: font,
    fontSize: 10,
    letterSpacing: 3,
    fontWeight: "600",
    marginBottom: 4,
  },
  pageTitle: {
    color: colors.text,
    fontFamily: fontSerif,
    fontSize: 28,
    fontWeight: "400",
    letterSpacing: -0.5,
  },
  group: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    marginBottom: spacing(3),
    overflow: "hidden",
  },
  groupTitle: {
    color: colors.textSubtle,
    fontFamily: font,
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: "700",
    paddingHorizontal: spacing(4),
    paddingTop: spacing(4),
    paddingBottom: spacing(2),
    textTransform: "uppercase",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3.5),
    borderBottomColor: colors.borderSubtle,
    borderBottomWidth: 1,
  },
  itemLast: { borderBottomWidth: 0 },
  itemLabel: {
    color: colors.text,
    fontFamily: font,
    fontSize: 15,
    fontWeight: "500",
  },
  itemDesc: {
    color: colors.textSubtle,
    fontFamily: font,
    fontSize: 12,
    marginTop: 2,
  },
  chevron: {
    color: colors.textSubtle,
    fontSize: 22,
    fontWeight: "300",
    marginLeft: spacing(2),
  },
});
