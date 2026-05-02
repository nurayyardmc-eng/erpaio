import { useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { getSessions, type SessionListItem } from "../lib/chat";
import { colors, font, radius, spacing } from "../lib/theme";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

export type ChatStackParamList = {
  Sessions: undefined;
  Chat: { sessionId?: string; title?: string };
};

interface Props {
  navigation: NativeStackNavigationProp<ChatStackParamList, "Sessions">;
}

export default function SessionsScreen({ navigation }: Props) {
  const sessionsQuery = useQuery({
    queryKey: ["sessions"],
    queryFn: getSessions,
  });

  useFocusEffect(
    useCallback(() => {
      sessionsQuery.refetch();
    }, []),
  );

  const renderItem = ({ item }: { item: SessionListItem }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate("Chat", { sessionId: item.id, title: item.title })}
      style={styles.row}
    >
      <Text style={styles.rowTitle} numberOfLines={1}>
        {item.title}
      </Text>
      <Text style={styles.rowMeta}>
        {item.messageCount} mesaj · {new Date(item.createdAt).toLocaleDateString("tr-TR")}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.brand}>ERPAIO · CHAT</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate("Chat", {})}
          style={styles.newButton}
        >
          <Text style={styles.newButtonText}>+ Yeni Sohbet</Text>
        </TouchableOpacity>
      </View>

      {sessionsQuery.isLoading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: spacing(8) }} />
      ) : sessionsQuery.isError ? (
        <Text style={styles.error}>Yüklenemedi: {(sessionsQuery.error as Error).message}</Text>
      ) : (
        <FlatList
          data={sessionsQuery.data ?? []}
          keyExtractor={(s) => s.id}
          renderItem={renderItem}
          ListEmptyComponent={
            <Text style={styles.empty}>
              Henüz sohbet yok. Yukarıdaki butondan başla.
            </Text>
          }
          refreshControl={
            <RefreshControl
              refreshing={sessionsQuery.isRefetching}
              onRefresh={() => sessionsQuery.refetch()}
              tintColor={colors.accent}
            />
          }
          contentContainerStyle={{ paddingVertical: spacing(2) }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    padding: spacing(4),
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: { color: colors.accent, fontFamily: font, fontSize: 9, letterSpacing: 3 },
  newButton: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accentBorder,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
  },
  newButtonText: { color: colors.accent, fontFamily: font, fontSize: 11 },
  row: {
    paddingVertical: spacing(3),
    paddingHorizontal: spacing(4),
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  rowTitle: { color: colors.text, fontFamily: font, fontSize: 13, marginBottom: spacing(1) },
  rowMeta: { color: colors.textDim, fontFamily: font, fontSize: 10 },
  empty: { color: colors.textDim, fontFamily: font, fontSize: 12, textAlign: "center", marginTop: spacing(10) },
  error: { color: colors.danger, fontFamily: font, fontSize: 12, textAlign: "center", marginTop: spacing(8), paddingHorizontal: spacing(4) },
});
