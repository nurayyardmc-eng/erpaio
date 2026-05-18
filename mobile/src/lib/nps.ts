import { api } from "./api";

/**
 * NPS submission — Track TTTT. Web NpsPrompt component'i mevcut endpoint'i
 * (POST /api/nps) kullanıyor; mobile aynı yola data POST eder. Server response
 * { ok: true } sade — mobile sadece submit başarılı/başarısız ayırt eder.
 */
export async function submitNps(input: { score: number; comment?: string }): Promise<void> {
  await api("/api/nps", {
    method: "POST",
    body: {
      score: input.score,
      ...(input.comment ? { comment: input.comment } : {}),
    },
  });
}
