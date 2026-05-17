import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addIpAllowlistEntry,
  getIpAllowlist,
  removeIpAllowlistEntry,
  type IpAllowlistEntry,
} from "../lib/dashboard";
import { getMe } from "../lib/auth";
import { colors, font, fontMono, radius, spacing } from "../lib/theme";
import ScreenHeader from "../components/ScreenHeader";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import { SkeletonList } from "../components/Skeleton";
import { confirmDialog } from "../components/Confirm";
import { showToast } from "../components/Toast";
import { useI18n } from "../lib/i18n/context";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { MoreStackParamList } from "./MoreStackNav";

interface Props { navigation: NativeStackNavigationProp<MoreStackParamList, "IpAllowlist">; }

// Server CidrSchema ile birebir aynı regex. Form submit'ten önce client
// tarafı feedback için kullanılır; server tekrar doğrular.
const CIDR_RE = /^\d{1,3}(\.\d{1,3}){3}(\/(?:[0-9]|[12][0-9]|3[0-2]))?$/;

export default function IpAllowlistScreen({ navigation }: Props) {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const meQuery = useQuery({ queryKey: ["me-role-allowlist"], queryFn: getMe });

  const listQuery = useQuery({
    queryKey: ["ip-allowlist"],
    queryFn: () => getIpAllowlist().then((d) => d.entries),
  });

  const [cidr, setCidr] = useState("");
  const [label, setLabel] = useState("");
  const [cidrError, setCidrError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const isOwnerOrAdmin =
    meQuery.data?.user.role === "owner" || meQuery.data?.user.role === "admin";

  const addMutation = useMutation({
    mutationFn: (params: { cidr: string; label?: string }) => addIpAllowlistEntry(params),
    onSuccess: () => {
      setCidr("");
      setLabel("");
      setCidrError(null);
      showToast(t.ipAllowlist.addedToast, "success");
      void qc.invalidateQueries({ queryKey: ["ip-allowlist"] });
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : t.ipAllowlist.addFailedToast;
      showToast(msg, "error");
    },
  });

  const onAdd = () => {
    if (!CIDR_RE.test(cidr)) {
      setCidrError(t.ipAllowlist.invalidCidrError);
      return;
    }
    setCidrError(null);
    addMutation.mutate({ cidr, label: label.trim() || undefined });
  };

  const onRemove = async (entry: IpAllowlistEntry) => {
    const display = entry.label || entry.cidr;
    const ok = await confirmDialog({
      title: t.ipAllowlist.removeConfirmTitle,
      message: `${t.ipAllowlist.removeConfirmMessagePrefix}${display}${t.ipAllowlist.removeConfirmMessageSuffix}`,
      confirmLabel: t.ipAllowlist.removeConfirmYes,
      destructive: true,
    });
    if (!ok) return;
    setRemoving(entry.id);
    try {
      await removeIpAllowlistEntry(entry.id);
      showToast(t.ipAllowlist.removedToast, "success");
      void qc.invalidateQueries({ queryKey: ["ip-allowlist"] });
    } catch (e) {
      showToast(e instanceof Error ? e.message : t.ipAllowlist.removeFailedToast, "error");
    } finally {
      setRemoving(null);
    }
  };

  const fmtDate = (s: string) =>
    new Date(s).toLocaleString(locale === "en" ? "en-US" : "tr-TR");

  const renderItem = ({ item }: { item: IpAllowlistEntry }) => (
    <View style={styles.row}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.cidr} selectable>{item.cidr}</Text>
        <Text style={styles.meta}>
          {item.label ? item.label : <Text style={styles.unnamed}>{t.ipAllowlist.unnamedLabel}</Text>}
          <Text style={styles.metaFaint}>{`  ·  ${fmtDate(item.createdAt)}`}</Text>
        </Text>
      </View>
      {isOwnerOrAdmin && (
        <TouchableOpacity
          onPress={() => onRemove(item)}
          disabled={removing === item.id}
          style={[styles.removeBtn, removing === item.id && { opacity: 0.5 }]}
          activeOpacity={0.7}
        >
          <Text style={styles.removeBtnText}>
            {removing === item.id ? "..." : t.ipAllowlist.removeBtn}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const entries = listQuery.data ?? [];

  return (
    <View style={[styles.root, { paddingTop: 50 }]}>
      <ScreenHeader
        brand={t.ipAllowlist.brand}
        title={t.ipAllowlist.title}
        description={t.ipAllowlist.description}
        onBack={() => navigation.goBack()}
      />

      {/* Add form (only for owner/admin) */}
      {isOwnerOrAdmin && (
        <View style={styles.addCard}>
          <Text style={styles.addTitle}>{t.ipAllowlist.addSectionTitle}</Text>
          <Text style={styles.label}>{t.ipAllowlist.fieldCidr}</Text>
          <TextInput
            value={cidr}
            onChangeText={(s) => {
              setCidr(s.trim());
              if (cidrError) setCidrError(null);
            }}
            placeholder={t.ipAllowlist.fieldCidrPlaceholder}
            placeholderTextColor={colors.textSubtle}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="numbers-and-punctuation"
            style={[styles.input, { fontFamily: fontMono }]}
          />
          {cidrError && <Text style={styles.errorText}>{cidrError}</Text>}
          <Text style={styles.label}>{t.ipAllowlist.fieldLabel}</Text>
          <TextInput
            value={label}
            onChangeText={setLabel}
            placeholder={t.ipAllowlist.fieldLabelPlaceholder}
            placeholderTextColor={colors.textSubtle}
            maxLength={80}
            style={styles.input}
          />
          <TouchableOpacity
            onPress={onAdd}
            disabled={addMutation.isPending || !cidr}
            style={[styles.primaryBtn, (addMutation.isPending || !cidr) && { opacity: 0.5 }]}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>
              {addMutation.isPending ? t.ipAllowlist.addingBtn : t.ipAllowlist.addBtn}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {!isOwnerOrAdmin && !meQuery.isLoading && (
        <View style={styles.ownerOnlyBox}>
          <Text style={styles.ownerOnlyText}>{t.ipAllowlist.ownerOnly}</Text>
        </View>
      )}

      {meQuery.isLoading || listQuery.isLoading ? (
        <View style={{ padding: spacing(5) }}>
          {meQuery.isLoading ? <ActivityIndicator color={colors.brand} /> : <SkeletonList count={4} height={56} gap={6} />}
        </View>
      ) : listQuery.isError ? (
        <View style={{ padding: spacing(5) }}><ErrorState onRetry={() => listQuery.refetch()} /></View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(e) => e.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 200, flexGrow: 1 }}
          ListEmptyComponent={
            <EmptyState
              title={t.ipAllowlist.emptyTitle}
              description={t.ipAllowlist.emptyDesc}
            />
          }
          refreshControl={
            <RefreshControl
              refreshing={listQuery.isRefetching}
              onRefresh={() => listQuery.refetch()}
              tintColor={colors.brand}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSubtle },
  addCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    margin: spacing(4),
    padding: spacing(4),
  },
  addTitle: { color: colors.text, fontFamily: font, fontSize: 14, fontWeight: "600", marginBottom: spacing(3) },
  label: {
    color: colors.textSubtle,
    fontFamily: font,
    fontSize: 11,
    letterSpacing: 1.5,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: spacing(1.5),
  },
  input: {
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2.5),
    color: colors.text,
    fontFamily: font,
    fontSize: 14,
    marginBottom: spacing(3),
  },
  errorText: { color: colors.error, fontFamily: font, fontSize: 12, marginTop: -spacing(2), marginBottom: spacing(3) },
  primaryBtn: {
    backgroundColor: colors.brand,
    borderRadius: radius.full,
    paddingVertical: spacing(3),
    alignItems: "center",
    marginTop: spacing(1),
  },
  primaryBtnText: { color: colors.textInverse, fontFamily: font, fontSize: 14, fontWeight: "600" },
  ownerOnlyBox: {
    backgroundColor: colors.warningSoft,
    borderRadius: radius.md,
    padding: spacing(3),
    marginHorizontal: spacing(4),
    marginTop: spacing(2),
    marginBottom: spacing(2),
  },
  ownerOnlyText: { color: colors.warning, fontFamily: font, fontSize: 12, lineHeight: 17, fontStyle: "italic" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing(3),
    paddingHorizontal: spacing(5),
    backgroundColor: colors.card,
    borderBottomColor: colors.borderSubtle,
    borderBottomWidth: 1,
  },
  cidr: { color: colors.text, fontFamily: fontMono, fontSize: 14, fontWeight: "600", marginBottom: 2 },
  meta: { color: colors.textMuted, fontFamily: font, fontSize: 12 },
  metaFaint: { color: colors.textSubtle, fontFamily: font, fontSize: 11 },
  unnamed: { color: colors.textSubtle, fontStyle: "italic" },
  removeBtn: {
    marginLeft: spacing(2),
    borderColor: colors.error,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1.5),
  },
  removeBtnText: { color: colors.error, fontFamily: font, fontSize: 12, fontWeight: "600" },
});
