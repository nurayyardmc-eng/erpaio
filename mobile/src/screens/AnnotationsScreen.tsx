import { FlatList, Modal, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteAnnotation, getAnnotations, type Annotation } from "../lib/dashboard";
import { shareJson } from "../lib/share";
import { colors, font, radius, spacing } from "../lib/theme";
import ScreenHeader from "../components/ScreenHeader";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import { SkeletonList } from "../components/Skeleton";
import { confirmDialog } from "../components/Confirm";
import { showToast } from "../components/Toast";
import { useI18n } from "../lib/i18n/context";
import { apiErrorMessage } from "../lib/apiError";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { MoreStackParamList } from "./MoreStackNav";

interface Props {
  navigation: NativeStackNavigationProp<MoreStackParamList, "Annotations">;
}

export default function AnnotationsScreen({ navigation }: Props) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const q = useQuery({ queryKey: ["annotations"], queryFn: getAnnotations });
  const [menuFor, setMenuFor] = useState<Annotation | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (a: Annotation) => deleteAnnotation(a.tableName, a.columnName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["annotations"] });
      showToast(t.annotations.deletedToast, "success");
    },
    onError: (e: Error) => showToast(apiErrorMessage(e, t), "error"),
  });

  const onDelete = async (a: Annotation) => {
    setMenuFor(null);
    const target = `${a.tableName}${a.columnName ? `.${a.columnName}` : ""}`;
    const ok = await confirmDialog({
      title: t.annotations.deleteConfirmTitle,
      message: `${target}${t.annotations.deleteConfirmMessageSuffix}`,
      confirmLabel: t.annotations.deleteConfirmYes,
      destructive: true,
    });
    if (!ok) return;
    deleteMutation.mutate(a);
  };

  const renderItem = ({ item }: { item: Annotation }) => (
    <View style={styles.card}>
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>
            {item.tableName}{item.columnName ? `.${item.columnName}` : ""}
            {item.hidden && <Text style={styles.hidden}>{t.annotations.hiddenSuffix}</Text>}
          </Text>
          {item.description && <Text style={styles.desc}>{item.description}</Text>}
          <Text style={styles.timestamp}>{new Date(item.updatedAt).toLocaleString("tr-TR")}</Text>
        </View>
        <TouchableOpacity
          onPress={() => setMenuFor(item)}
          style={styles.menuBtn}
          activeOpacity={0.6}
          accessibilityRole="button"
          accessibilityLabel={t.annotations.menuA11y}
        >
          <Text style={styles.menuDots}>⋯</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.root, { paddingTop: 50 }]}>
      <ScreenHeader
        brand={t.annotations.brand}
        title={t.annotations.title}
        description={t.annotations.description}
        onBack={() => navigation.goBack()}
        right={
          <View style={{ flexDirection: "row", gap: spacing(2), alignItems: "center" }}>
            {/* Track JJJ — annotations share (schema config backup/migration). */}
            {(q.data?.annotations.length ?? 0) > 0 && (
              <TouchableOpacity
                onPress={async () => {
                  const ts = new Date().toISOString().slice(0, 10);
                  try {
                    await shareJson(`erpaio-annotations-${ts}.json`, {
                      count: q.data!.annotations.length,
                      annotations: q.data!.annotations,
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
            )}
            <TouchableOpacity
              onPress={() => navigation.navigate("AnnotationForm")}
              style={styles.addBtn}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={t.annotations.addA11y}
            >
              <Text style={styles.addBtnText}>{t.annotations.addLabel}</Text>
            </TouchableOpacity>
          </View>
        }
      />
      {q.isLoading ? (
        <View style={{ padding: spacing(5) }}><SkeletonList count={4} height={80} gap={10} /></View>
      ) : q.isError ? (
        <View style={{ padding: spacing(5) }}><ErrorState onRetry={() => q.refetch()} /></View>
      ) : (
        <FlatList
          data={q.data?.annotations ?? []}
          keyExtractor={(a) => a.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: spacing(5), paddingBottom: 200, flexGrow: 1 }}
          ListEmptyComponent={
            <EmptyState
              title={t.annotations.emptyTitle}
              description={t.annotations.emptyDesc}
            />
          }
          refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => q.refetch()} tintColor={colors.brand} />}
        />
      )}

      {/* Action sheet */}
      {menuFor && (
        <Modal transparent animationType="fade" visible={true} onRequestClose={() => setMenuFor(null)}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setMenuFor(null)}>
            <View style={styles.sheet}>
              <Text style={styles.sheetTitle} numberOfLines={1}>
                {menuFor.tableName}{menuFor.columnName ? `.${menuFor.columnName}` : ""}
              </Text>
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
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing(4),
    marginBottom: spacing(3),
  },
  label: { color: colors.text, fontFamily: font, fontSize: 14, fontWeight: "600", marginBottom: spacing(1) },
  hidden: { color: colors.error, fontWeight: "400" },
  desc: { color: colors.textMuted, fontFamily: font, fontSize: 13, lineHeight: 19, marginBottom: spacing(1.5) },
  timestamp: { color: colors.textSubtle, fontFamily: font, fontSize: 11 },
  addBtn: {
    backgroundColor: colors.brand,
    borderRadius: radius.full,
    paddingHorizontal: spacing(3.5),
    paddingVertical: spacing(2),
    marginLeft: spacing(2),
  },
  addBtnText: { color: colors.textInverse, fontFamily: font, fontSize: 13, fontWeight: "600" },
  exportBtn: {
    backgroundColor: colors.bgSubtle,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
  },
  exportBtnText: { color: colors.text, fontFamily: font, fontSize: 13, fontWeight: "700" },
  menuBtn: { paddingHorizontal: spacing(2), paddingVertical: spacing(1) },
  menuDots: { color: colors.textMuted, fontSize: 22, fontWeight: "300" },

  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(10,10,10,0.4)" },
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
  sheetText: { color: colors.text, fontFamily: font, fontSize: 16, fontWeight: "500" },
});
