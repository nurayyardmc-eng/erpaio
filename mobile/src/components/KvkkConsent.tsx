import { useEffect, useState } from "react";
import { Linking, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors, font, fontSerif, radius, spacing } from "../lib/theme";

const CONSENT_KEY = "erpaio_kvkk_consent_v1";

/**
 * KVKK (Türk veri koruma yasası) onayı — ilk açılışta gösterilir.
 * Onay verilmeden uygulama kullanılamaz. AsyncStorage'da kaydedilir,
 * bir kez onaylanınca tekrar gösterilmez.
 */
export default function KvkkConsent() {
  const [needed, setNeeded] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(CONSENT_KEY).then((v) => {
      setNeeded(v !== "true");
    });
  }, []);

  const accept = async () => {
    await AsyncStorage.setItem(CONSENT_KEY, "true");
    setNeeded(false);
  };

  if (needed !== true) return null;

  return (
    <Modal transparent animationType="fade" visible={true} statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          <Text style={styles.brand}>ERPAIO · KVKK ONAYI</Text>
          <Text style={styles.title}>Veri İşleme Onayı</Text>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={true}>
            <Text style={styles.paragraph}>
              ERPAIO mobil uygulamasını kullanırken aşağıdaki kişisel verileriniz işlenir:
            </Text>

            <Text style={styles.listItem}>
              <Text style={styles.bold}>• Hesap bilgileri:</Text> Email adresi, isim, şifre (bcrypt ile hashlenir)
            </Text>
            <Text style={styles.listItem}>
              <Text style={styles.bold}>• Cihaz bilgileri:</Text> Platform (iOS/Android), model, push token
            </Text>
            <Text style={styles.listItem}>
              <Text style={styles.bold}>• Kullanım verileri:</Text> Sorgular, oturum logları, bildirim tercihleri
            </Text>
            <Text style={styles.listItem}>
              <Text style={styles.bold}>• Biyometrik:</Text> Face ID/Touch ID lokal olarak işlenir, sunucuya gönderilmez
            </Text>

            <Text style={[styles.paragraph, { marginTop: spacing(3) }]}>
              <Text style={styles.bold}>Verileriniz şu amaçlarla işlenir:</Text>
            </Text>
            <Text style={styles.listItem}>• Kimlik doğrulama ve oturum yönetimi</Text>
            <Text style={styles.listItem}>• ERP verilerinize AI ile sorgu üretimi</Text>
            <Text style={styles.listItem}>• Anomaly tespiti ve bildirim</Text>
            <Text style={styles.listItem}>• Hata izleme ve performans iyileştirme</Text>

            <Text style={[styles.paragraph, { marginTop: spacing(3) }]}>
              <Text style={styles.bold}>Haklarınız (KVKK m.11):</Text> Verilerinize erişme, düzeltme, silme,
              işlenmesini durdurma, taşınabilirlik. İstek için: support@erpaio.com
            </Text>

            <Text style={[styles.paragraph, { marginTop: spacing(3) }]}>
              <Text style={styles.bold}>3. taraf:</Text> Anthropic (AI), Resend (email), Twilio (WhatsApp),
              Sentry (hata izleme), Expo (push). KVKK uyumlu sözleşmeler.
            </Text>

            <Text style={[styles.paragraph, { marginTop: spacing(3), fontStyle: "italic" }]}>
              Devam ederek bu verilerin işlenmesine açık rızanızı vermiş olursunuz. Detay için:
            </Text>
          </ScrollView>

          <View style={styles.linksRow}>
            <TouchableOpacity
              onPress={() => Linking.openURL("https://erpaio.vercel.app/privacy")}
              activeOpacity={0.6}
            >
              <Text style={styles.link}>Gizlilik Politikası</Text>
            </TouchableOpacity>
            <Text style={styles.dot}>·</Text>
            <TouchableOpacity
              onPress={() => Linking.openURL("https://erpaio.vercel.app/terms")}
              activeOpacity={0.6}
            >
              <Text style={styles.link}>Kullanım Koşulları</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={accept} style={styles.acceptBtn} activeOpacity={0.85}>
            <Text style={styles.acceptText}>Okudum, Onaylıyorum</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(10,10,10,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  dialog: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing(5),
    width: "100%",
    maxWidth: 480,
    maxHeight: "85%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 40,
    elevation: 8,
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
    fontSize: 22,
    fontWeight: "400",
    letterSpacing: -0.5,
    marginBottom: spacing(4),
  },
  scroll: { maxHeight: 360 },
  paragraph: {
    color: colors.text,
    fontFamily: font,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: spacing(2),
  },
  bold: { fontWeight: "600" },
  listItem: {
    color: colors.textMuted,
    fontFamily: font,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 6,
    paddingLeft: 4,
  },
  linksRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing(2),
    marginTop: spacing(3),
    marginBottom: spacing(3),
  },
  link: {
    color: colors.brand,
    fontFamily: font,
    fontSize: 12,
    fontWeight: "500",
    textDecorationLine: "underline",
  },
  dot: { color: colors.textSubtle, fontSize: 12 },
  acceptBtn: {
    backgroundColor: colors.brand,
    borderRadius: radius.full,
    paddingVertical: 14,
    alignItems: "center",
  },
  acceptText: {
    color: colors.textInverse,
    fontFamily: font,
    fontSize: 15,
    fontWeight: "600",
  },
});
