import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useQuery } from "@tanstack/react-query";
import { getTeam } from "../lib/dashboard";
import { colors, font, radius, spacing } from "../lib/theme";
import ScreenHeader from "../components/ScreenHeader";
import ErrorState from "../components/ErrorState";
import { SkeletonList } from "../components/Skeleton";
import { showToast } from "../components/Toast";
import { shareJson } from "../lib/share";
import { useI18n } from "../lib/i18n/context";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { MoreStackParamList } from "./MoreStackNav";

interface Props { navigation: NativeStackNavigationProp<MoreStackParamList, "Team">; }

const ROLE_COLOR: Record<string, string> = {
  owner: colors.brand,
  admin: colors.info,
  viewer: colors.textSubtle,
};

export default function TeamScreen({ navigation }: Props) {
  const { t } = useI18n();
  const q = useQuery({ queryKey: ["team"], queryFn: getTeam });

  return (
    <View style={[styles.root, { paddingTop: 50 }]}>
      <ScreenHeader
        brand={t.team.brand}
        title={t.team.title}
        description={t.team.description}
        onBack={() => navigation.goBack()}
        right={
          ((q.data?.users.length ?? 0) > 0 || (q.data?.invitations.length ?? 0) > 0) ? (
            <TouchableOpacity
              onPress={async () => {
                /* Track OOO — team share (kullanıcı listesi + bekleyen davetler audit). */
                const ts = new Date().toISOString().slice(0, 10);
                try {
                  await shareJson(`erpaio-team-${ts}.json`, {
                    users: q.data!.users,
                    invitations: q.data!.invitations,
                  });
                } catch {
                  showToast(t.common.error, "error");
                }
              }}
              style={styles.exportBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.exportBtnText}>↓</Text>
            </TouchableOpacity>
          ) : null
        }
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing(5), paddingBottom: 200 }}
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
                <Text style={styles.sectionTitle}>{t.team.pendingInvitations} ({q.data?.invitations.length})</Text>
                {q.data?.invitations.map((inv) => (
                  <View key={inv.id} style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.email}>{inv.email}</Text>
                      <Text style={styles.meta}>
                        {inv.role} · {new Date(inv.expiresAt).toLocaleDateString("tr-TR")}{t.team.invitationExpires}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t.team.usersHeader} ({q.data?.users.length ?? 0})</Text>
              {q.data?.users.map((u) => (
                <View key={u.id} style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.email}>
                      {u.email}
                      {u.totpEnabled && <Text style={styles.mfa}>{t.team.mfaTag}</Text>}
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSubtle },
  exportBtn: {
    backgroundColor: colors.bgSubtle,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
  },
  exportBtnText: { color: colors.text, fontFamily: font, fontSize: 14, fontWeight: "700" },
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
