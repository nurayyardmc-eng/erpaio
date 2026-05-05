import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { getTeam } from "../lib/dashboard";
import { colors, font, radius, spacing } from "../lib/theme";
import ScreenHeader from "../components/ScreenHeader";
import ErrorState from "../components/ErrorState";
import { SkeletonList } from "../components/Skeleton";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { MoreStackParamList } from "./MoreStackNav";

interface Props { navigation: NativeStackNavigationProp<MoreStackParamList, "Team">; }

const ROLE_COLOR: Record<string, string> = {
  owner: colors.brand,
  admin: colors.info,
  viewer: colors.textSubtle,
};

export default function TeamScreen({ navigation }: Props) {
  const q = useQuery({ queryKey: ["team"], queryFn: getTeam });

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ScreenHeader
        brand="ERPAIO · TAKIM"
        title="Takım"
        description="Tenant kullanıcıları ve bekleyen davetler."
        onBack={() => navigation.goBack()}
      />
      <ScrollView
        contentContainerStyle={{ padding: spacing(5), paddingBottom: spacing(40) }}
        refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => q.refetch()} tintColor={colors.brand} />}
      >
        {q.isLoading ? (
          <SkeletonList count={3} height={70} gap={8} />
        ) : q.isError ? (
          <ErrorState onRetry={() => q.refetch()} />
        ) : (
          <>
            {(q.data?.invitations ?? []).length > 0 && (
              <View style={[styles.section, { marginBottom: spacing(4) }]}>
                <Text style={styles.sectionTitle}>Bekleyen Davetler ({q.data?.invitations.length})</Text>
                {q.data?.invitations.map((inv) => (
                  <View key={inv.id} style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.email}>{inv.email}</Text>
                      <Text style={styles.meta}>
                        {inv.role} · {new Date(inv.expiresAt).toLocaleDateString("tr-TR")} sona erer
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Kullanıcılar ({q.data?.users.length ?? 0})</Text>
              {q.data?.users.map((u) => (
                <View key={u.id} style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.email}>
                      {u.email}
                      {u.totpEnabled && <Text style={styles.mfa}> · MFA</Text>}
                    </Text>
                    <Text style={styles.meta}>{u.name ?? "—"}</Text>
                  </View>
                  <View style={[styles.roleBadge, { backgroundColor: `${ROLE_COLOR[u.role] ?? colors.textSubtle}1A` }]}>
                    <Text style={[styles.roleText, { color: ROLE_COLOR[u.role] ?? colors.textSubtle }]}>
                      {u.role.toUpperCase()}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSubtle },
  section: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing(4),
  },
  sectionTitle: { color: colors.text, fontFamily: font, fontSize: 15, fontWeight: "600", marginBottom: spacing(3) },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing(2.5),
    borderBottomColor: colors.borderSubtle,
    borderBottomWidth: 1,
  },
  email: { color: colors.text, fontFamily: font, fontSize: 14 },
  mfa: { color: colors.success, fontSize: 11, fontWeight: "600", letterSpacing: 0.5 },
  meta: { color: colors.textSubtle, fontFamily: font, fontSize: 12, marginTop: 2 },
  roleBadge: { paddingHorizontal: spacing(2.5), paddingVertical: 4, borderRadius: radius.full },
  roleText: { fontFamily: font, fontSize: 11, fontWeight: "700", letterSpacing: 1 },
});
