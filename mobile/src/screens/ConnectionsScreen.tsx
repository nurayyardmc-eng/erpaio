import { FlatList, Modal, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteConnection, getConnections, type ErpConnection } from "../lib/dashboard";
import { colors, font, radius, spacing } from "../lib/theme";
import ScreenHeader from "../components/ScreenHeader";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import { SkeletonList } from "../components/Skeleton";
import { confirmDialog } from "../components/Confirm";
import { showToast } from "../components/Toast";
import { useI18n } from "../lib/i18n/context";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { MoreStackParamList } from "./MoreStackNav";
import { useState } from "react";

interface Props {
  navigation: NativeStackNavigationProp<MoreStackParamList, "Connections">;
}

export default function ConnectionsScreen({ navigation }: Props) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const q = useQuery({ queryKey: ["dash-connections"], queryFn: getConnections });
  const [menuFor, setMenuFor] = useState<ErpConnection | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteConnection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dash-connections"] });
      queryClient.invalidateQueries({ queryKey: ["connections"] });
      showToast(t.connections.deletedToast, "success");
    },
    onError: (e: Error) => showToast(e.message, "error"),
  });

  const onDelete = async (item: ErpConnection) => {
    setMenuFor(null);
    const ok = await confirmDialog({
      title: t.connections.deleteConfirmTitle,
      message: `${item.dbName}${t.connections.deleteConfirmMessageSuffix}`,
      confirmLabel: t.connections.deleteConfirmYes,
      destructive: true,
    });
    if (!ok) return;
    deleteMutation.mutate(item.id);
  };

  const renderItem = ({ item }: { item: ErpConnection }) => (
    <View style={styles.card}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: spacing(2) }}>
        <Text style={styles.dbName}>{item.dbName}</Text>
        <View style={[styles.statusBadge, item.status === "active" ? styles.statusActive : styles.statusError]}>
          <Text style={[styles.statusText, item.status === "active" ? styles.statusActiveText : styles.statusErrorText]}>
            {item.status === "active" ? t.connections.statusActive : t.connections.statusError}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setMenuFor(item)}
          style={styles.menuBtn}
          activeOpacity={0.6}
          accessibilityRole="button"
          accessibilityLabel={t.connections.menuA11y}
        >
          <Text style={styles.menuDots}>⋯</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.host}>{item.host}:{item.port}</Text>
      <Text style={styles.meta}>{item.erpType}{item.erpProfile ? ` · ${item.erpProfile}` : ""}</Text>
      {item.lastSchemaSyncAt && (
        <Text style={styles.meta}>
          {t.connections.lastSchemaSync}{new Date(item.lastSchemaSyncAt).toLocaleString("tr-TR")}
        </Text>
      )}
    </View>
  );

  return (
    <View style={[styles.root, { paddingTop: 50 }]}>
      <ScreenHeader
        brand={t.connections.brand}
        title={t.connections.title}
        description={t.connections.description}
        onBack={() => navigation.goBack()}
        right={
          <TouchableOpacity
            onPress={() => navigation.navigate("ConnectionForm")}
            style={styles.addBtn}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={t.connections.addA11y}
          >
            <Text style={styles.addBtnText}>{t.connections.addLabel}</Text>
          </TouchableOpacity>
        }
      />
      {q.isLoading ? (
        <View style={{ padding: spacing(5) }}><SkeletonList count={3} height={100} gap={10} /></View>
      ) : q.isError ? (
        <View style={{ padding: spacing(5) }}><ErrorState onRetry={() => q.refetch()} /></View>
      ) : (
        <FlatList
          data={q.data ?? []}
          keyExtractor={(c) => c.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: spacing(5), paddingBottom: 200, flexGrow: 1 }}
          ListEmptyComponent={
            <EmptyState
              title={t.connections.emptyTitle}
              description={t.connections.emptyDesc}
            />
          }
          refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => q.refetch()} tintColor={colors.brand} />}
        />
      )}

      {/* Action sheet */}
      {menuFor && (
        <Modal transparent animationType="fade" visible={true} onRequestClose={() => setMenuFor(null)}>
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={() => setMenuFor(null)}
          >
            <View style={styles.sheet}>
              <Text style={styles.sheetTitle} numberOfLines={1}>{menuFor.dbName}</Text>
              <TouchableOpacity onPress={() => onDelete(menuFor)} style={styles.sheetItem} activeOpacity={0.6}>
                <Text style={[styles.sheetText, { color: colors.error }]}>{t.common.delete}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setMenuFor(null)} style={[styles.sheetItem, styles.sheetCancel]} activeOpacity={0.6}>
                <Text style={[styles.sheetText, { color: colors.textMuted }]}>{t.common.cancel}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSubtle },
  addBtn: {
    backgroundColor: colors.brand,
    borderRadius: radius.full,
    paddingHorizontal: spacing(3.5),
    paddingVertical: spacing(2),
    marginLeft: spacing(2),
  },
  addBtnText: { color: colors.textInverse, fontFamily: font, fontSize: 13, fontWeight: "600" },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing(4),
    marginBottom: spacing(3),
  },
  dbName: { color: colors.text, fontFamily: font, fontSize: 16, fontWeight: "600", flex: 1 },
  statusBadge: { paddingHorizontal: spacing(2), paddingVertical: 3, borderRadius: radius.sm, marginLeft: spacing(2) },
  statusActive: { backgroundColor: colors.successSoft },
  statusError: { backgroundColor: colors.errorSoft },
  statusText: { fontFamily: font, fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  statusActiveText: { color: colors.success },
  statusErrorText: { color: colors.error },
  host: { color: colors.text, fontFamily: font, fontSize: 13, marginBottom: 2 },
  meta: { color: colors.textSubtle, fontFamily: font, fontSize: 12, marginTop: 2 },
  menuBtn: { paddingHorizontal: spacing(2), paddingVertical: spacing(1) },
  menuDots: { color: colors.textMuted, fontSize: 22, fontWeight: "300" },

  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(10,10,10,0.4)",
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingBottom: 36,
  },
  sheetTitle: {
    color: colors.textMuted,
    fontFamily: font,
    fontSize: 13,
    fontWeight: "500",
    paddingHorizontal: spacing(5),
    paddingTop: spacing(4),
    paddingBottom: spacing(2),
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  sheetItem: {
    paddingHorizontal: spacing(5),
    paddingVertical: spacing(4),
    borderBottomColor: colors.borderSubtle,
    borderBottomWidth: 1,
  },
  sheetCancel: { borderBottomWidth: 0, marginTop: spacing(2) },
  sheetText: {
    color: colors.text,
    fontFamily: font,
    fontSize: 16,
    fontWeight: "500",
  },
});
