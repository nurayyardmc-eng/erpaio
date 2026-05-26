/**
 * Tenant setup completeness scorer.
 *
 * Track MMMMMMM — kullanıcının "ERPAIO'yu ne kadar tam kurdum?"
 * sorusunu cevaplar. Dashboard'da progress badge olarak gösterilir,
 * eksik adımlara link verir. Onboarding funnel'i için gözlemlenebilir
 * metrik.
 *
 * Pure function: alır bir tenant state snapshot'ı → score + per-step
 * status. DB I/O caller'ın işi (genelde tenant API endpoint'i).
 */

export interface TenantSetupState {
  hasActiveConnection: boolean;
  hasAtLeastOneChatMessage: boolean;
  hasMfaEnabled: boolean;
  hasNotificationChannel: boolean; // WhatsApp / Email / Slack / Teams / Webhook
  hasSavedQueryOrWatchlist: boolean;
  hasTeamMember: boolean; // owner dışında ≥1 user
}

export interface SetupStep {
  key: string;
  label: string;
  done: boolean;
  /** Help URL — caller routes to /dashboard/<href>. */
  href: string;
  /** Priority — lower = show first when undone. */
  priority: number;
}

export interface SetupScore {
  /** 0..100 integer. */
  percent: number;
  /** Step count completed. */
  doneCount: number;
  /** Step count total. */
  totalCount: number;
  /** First incomplete step — UI surfaces this as the "next action". */
  nextStep: SetupStep | null;
  /** All steps in priority order. */
  steps: SetupStep[];
}

export function computeSetupScore(state: TenantSetupState): SetupScore {
  const steps: SetupStep[] = [
    {
      key: "connection",
      label: "ERP bağlantısı kur",
      done: state.hasActiveConnection,
      href: "/dashboard/connections",
      priority: 1,
    },
    {
      key: "first_query",
      label: "İlk soruyu sor",
      done: state.hasAtLeastOneChatMessage,
      href: "/dashboard/chat",
      priority: 2,
    },
    {
      key: "notification",
      label: "Bildirim kanalı bağla",
      done: state.hasNotificationChannel,
      href: "/dashboard/settings",
      priority: 3,
    },
    {
      key: "saved_or_watchlist",
      label: "Kayıtlı sorgu veya watchlist oluştur",
      done: state.hasSavedQueryOrWatchlist,
      href: "/dashboard/watchlists",
      priority: 4,
    },
    {
      key: "mfa",
      label: "İki adımlı doğrulama (MFA) aktive et",
      done: state.hasMfaEnabled,
      href: "/dashboard/security",
      priority: 5,
    },
    {
      key: "team",
      label: "Ekip arkadaşı davet et",
      done: state.hasTeamMember,
      href: "/dashboard/team",
      priority: 6,
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const totalCount = steps.length;
  const percent = Math.round((doneCount / totalCount) * 100);
  const nextStep =
    steps
      .filter((s) => !s.done)
      .sort((a, b) => a.priority - b.priority)[0] ?? null;

  return { percent, doneCount, totalCount, nextStep, steps };
}
