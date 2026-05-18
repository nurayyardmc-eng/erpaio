import { useEffect, useState } from "react";
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { submitNps } from "../lib/nps";
import { colors, font, radius, spacing } from "../lib/theme";
import { useI18n } from "../lib/i18n/context";

/**
 * Mobile NPS prompt — Track TTTT. Web NpsPrompt ile parity:
 * - 30 saniye gecikme ile ilk gösterim (kullanıcı bir şey yapsın önce)
 * - 90 gün cool-down (submit edilmişse)
 * - 14 gün cool-down (dismiss edilmişse)
 * - Aynı POST /api/nps endpoint (score 0-10 + opsiyonel comment)
 *
 * Web localStorage kullanır; mobile AsyncStorage (KvkkConsent ile aynı pattern).
 * Visible olduğunda bottom sheet modal — backdrop tap = dismiss.
 */

const NPS_DISMISSED_KEY = "erpaio_nps_dismissed_until";
const NPS_SUBMITTED_KEY = "erpaio_nps_submitted";
const NINETY_DAYS_MS = 90 * 24 * 60 * 60_000;
const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60_000;
const INITIAL_DELAY_MS = 30_000;

export default function NpsPrompt() {
  const { t } = useI18n();
  const [show, setShow] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let mounted = true;
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
    void (async () => {
      const submittedAt = await AsyncStorage.getItem(NPS_SUBMITTED_KEY);
      if (submittedAt && Date.now() - Number(submittedAt) < NINETY_DAYS_MS) return;
      const dismissedUntil = await AsyncStorage.getItem(NPS_DISMISSED_KEY);
      if (dismissedUntil && Date.now() < Number(dismissedUntil)) return;
      timeoutHandle = setTimeout(() => {
        if (mounted) setShow(true);
      }, INITIAL_DELAY_MS);
    })();
    return () => {
      mounted = false;
      if (timeoutHandle) clearTimeout(timeoutHandle);
    };
  }, []);

  const dismiss = () => {
    setShow(false);
    void AsyncStorage.setItem(NPS_DISMISSED_KEY, String(Date.now() + FOURTEEN_DAYS_MS));
  };

  const submit = async () => {
    if (score === null) return;
    try {
      await submitNps({ score, comment: comment.trim() || undefined });
    } catch {
      // Best-effort; submission fail olursa sessiz geç (kullanıcı dismiss eder).
    }
    await AsyncStorage.setItem(NPS_SUBMITTED_KEY, String(Date.now()));
    setSubmitted(true);
    setTimeout(() => setShow(false), 1800);
  };

  if (!show) return null;

  return (
    <Modal transparent animationType="fade" visible={show} onRequestClose={dismiss}>
      <TouchableOpacity activeOpacity={1} onPress={dismiss} style={styles.backdrop}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}} style={styles.sheet}>
          {submitted ? (
            <View style={styles.thanksRow}>
              <Text style={styles.thanksText}>✓ {t.nps.thanksMsg}</Text>
            </View>
          ) : (
            <>
              <View style={styles.headerRow}>
                <Text style={styles.header}>{t.nps.header}</Text>
                <TouchableOpacity
                  onPress={dismiss}
                  accessibilityLabel={t.nps.dismissAria}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.dismissText}>×</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.promptText}>
                {t.nps.promptText} <Text style={styles.promptHint}>{t.nps.ratingHint}</Text>
              </Text>
              <View style={styles.scoreRow}>
                {Array.from({ length: 11 }, (_, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => setScore(i)}
                    style={[styles.scoreCell, score === i && styles.scoreCellActive]}
                    activeOpacity={0.7}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: score === i }}
                  >
                    <Text style={[styles.scoreText, score === i && styles.scoreTextActive]}>{i}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {score !== null && (
                <TextInput
                  value={comment}
                  onChangeText={setComment}
                  placeholder={t.nps.commentPlaceholder}
                  placeholderTextColor={colors.textSubtle}
                  multiline
                  numberOfLines={2}
                  maxLength={500}
                  style={styles.commentInput}
                />
              )}
              <TouchableOpacity
                onPress={submit}
                disabled={score === null}
                style={[styles.submitBtn, score === null && { opacity: 0.4 }]}
                activeOpacity={0.85}
              >
                <Text style={styles.submitBtnText}>{t.nps.submitBtn}</Text>
              </TouchableOpacity>
            </>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(10,10,10,0.4)",
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing(5),
    paddingBottom: spacing(8),
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing(2),
  },
  header: {
    color: colors.brand,
    fontFamily: font,
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  dismissText: { color: colors.textSubtle, fontSize: 22, fontWeight: "300", lineHeight: 22 },
  promptText: {
    color: colors.text,
    fontFamily: font,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: spacing(3),
  },
  promptHint: { fontWeight: "700" },
  scoreRow: {
    flexDirection: "row",
    gap: 4,
    marginBottom: spacing(3),
  },
  scoreCell: {
    flex: 1,
    minWidth: 24,
    paddingVertical: spacing(2),
    backgroundColor: colors.bgSubtle,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.sm,
    alignItems: "center",
  },
  scoreCellActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  scoreText: { color: colors.textMuted, fontFamily: font, fontSize: 13, fontWeight: "500" },
  scoreTextActive: { color: colors.textInverse, fontWeight: "700" },
  commentInput: {
    backgroundColor: colors.bgSubtle,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
    color: colors.text,
    fontSize: 13,
    fontFamily: font,
    minHeight: 60,
    textAlignVertical: "top",
    marginBottom: spacing(3),
  },
  submitBtn: {
    backgroundColor: colors.brand,
    borderRadius: radius.full,
    paddingVertical: spacing(3),
    alignItems: "center",
  },
  submitBtnText: { color: colors.textInverse, fontFamily: font, fontSize: 14, fontWeight: "600" },
  thanksRow: {
    alignItems: "center",
    paddingVertical: spacing(4),
  },
  thanksText: { color: colors.success, fontFamily: font, fontSize: 16, fontWeight: "600" },
});
