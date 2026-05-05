import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { colors, font, fontSerif, radius, spacing } from "../lib/theme";
import type { MoreStackParamList } from "./MoreStackNav";

interface Props {
  navigation: NativeStackNavigationProp<MoreStackParamList, "More">;
}

interface MenuGroup {
  title: string;
  items: { route: keyof MoreStackParamList; label: string; description: string }[];
}

const GROUPS: MenuGroup[] = [
  {
    title: "Günlük",
    items: [
      { route: "Overview", label: "Anlık Metrikler", description: "Son 24 saat özeti" },
      { route: "Saved", label: "Kayıtlı Sorgular", description: "Sık kullanılan sorgular" },
    ],
  },
  {
    title: "Kurulum",
    items: [
      { route: "Connections", label: "ERP Bağlantıları", description: "Veritabanı bağlantıları" },
      { route: "Annotations", label: "Şema Açıklamaları", description: "Tablo / kolon notları" },
      { route: "Watchlists", label: "Watchlists", description: "Eşik tabanlı uyarı" },
    ],
  },
  {
    title: "Analiz",
    items: [
      { route: "Insights", label: "Şema Analizi", description: "İlişki + custom item tespiti" },
      { route: "ScheduledReports", label: "Planlı Raporlar", description: "Otomatik email raporları" },
      { route: "Audit", label: "Aktivite Logu", description: "Tenant aktivite geçmişi" },
    ],
  },
  {
    title: "Yönetim",
    items: [
      { route: "Team", label: "Takım", description: "Üyeler ve davetler" },
      { route: "Security", label: "Güvenlik", description: "MFA + IP allowlist" },
    ],
  },
];

export default function MoreScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing(5), paddingBottom: spacing(20) }}
      >
        <View style={{ marginBottom: spacing(5) }}>
          <Text style={styles.brand}>ERPAIO · MENÜ</Text>
          <Text style={styles.pageTitle}>Daha</Text>
        </View>

        {GROUPS.map((group) => (
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSubtle },
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
