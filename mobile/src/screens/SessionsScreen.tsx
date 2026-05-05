import { useCallback } from "react";
import {
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
import { colors, font, fontSerif, radius, spacing } from "../lib/theme";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import { SkeletonList } from "../components/Skeleton";
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
      activeOpacity={0.7}
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
    <View style={[styles.root, { paddingTop: 50 }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>ERPAIO · SOHBET</Text>
          <Text style={styles.title}>Sohbetlerim</Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate("Chat", {})}
          style={styles.newButton}
          activeOpacity={0.85}
        >
          <Text style={styles.newButtonText}>+ Yeni</Text>
        </TouchableOpacity>
      </View>

      {sessionsQuery.isLoading ? (
        <View style={{ padding: spacing(4) }}>
          <SkeletonList count={5} height={64} gap={8} />
        </View>
      ) : sessionsQuery.isError ? (
        <View style={{ padding: spacing(4) }}>
          <ErrorState onRetry={() => sessionsQuery.refetch()} />
        </View>
      ) : (
        <FlatList
          data={sessionsQuery.data ?? []}
          keyExtractor={(s) => s.id}
          renderItem={renderItem}
          ListEmptyComponent={
            <EmptyState
              title="Henüz sohbet yok"
              description="Yukarıdaki + Yeni butonuyla ilk sohbetini başlat."
            />
          }
          refreshControl={
            <RefreshControl
              refreshing={sessionsQuery.isRefetching}
              onRefresh={() => sessionsQuery.refetch()}
              tintColor={colors.brand}
            />
          }
          contentContainerStyle={{ paddingVertical: spacing(1), flexGrow: 1 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    padding: spacing(5),
    paddingBottom: spacing(4),
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: {
    color: colors.textSubtle,
    fontFamily: font,
    fontSize: 10,
    letterSpacing: 3,
    fontWeight: "600",
    marginBottom: 4,
  },
  title: {
    color: colors.text,
    fontFamily: fontSerif,
    fontSize: 24,
    fontWeight: "400",
    letterSpacing: -0.5,
  },
  newButton: {
    backgroundColor: colors.brand,
    borderRadius: radius.full,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(2.5),
  },
  newButtonText: { color: colors.textInverse, fontFamily: font, fontSize: 13, fontWeight: "600" },
  row: {
    paddingVertical: spacing(3.5),
    paddingHorizontal: spacing(5),
    borderBottomColor: colors.borderSubtle,
    borderBottomWidth: 1,
  },
  rowTitle: {
    color: colors.text,
    fontFamily: font,
    fontSize: 15,
    fontWeight: "500",
    marginBottom: 4,
  },
  rowMeta: { color: colors.textSubtle, fontFamily: font, fontSize: 12 },
});
