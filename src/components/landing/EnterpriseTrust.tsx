// Sprint G.1 — Enterprise Trust & Security section.
//
// Standalone, reusable section for the landing flow. Server component
// (no client state) so it ships zero JS. Styling follows the project
// convention — NOT Tailwind utilities (this repo has the Tailwind v4
// PostCSS plugin installed but never adds the `@import "tailwindcss"`
// directive, so utility classes are no-ops). Instead we use the landing
// design tokens (CSS custom properties from landing.css: var(--text),
// var(--bg-alt), var(--border), …) plus inline styles, matching every
// other landing section.
//
// Four pillars enterprise ERP buyers ask about before any pilot:
//   1. Read-Only Connection — we can't mutate their ERP, by construction
//   2. Role-Based Access    — least-privilege, per-seat scoping
//   3. Human Approval       — AI drafts, a human authorizes
//   4. Full Audit Logs      — every query + action is attributable

import type { Locale } from "@/lib/landing/locale";

interface Pillar {
  iconKey: "readonly" | "rbac" | "approval" | "audit";
  title: string;
  body: string;
}

interface TrustCopy {
  label: string;
  title: string;
  desc: string;
  pillars: Pillar[];
}

const COPY: Record<Locale, TrustCopy> = {
  en: {
    label: "Trust & Security",
    title: "Enterprise-grade by default",
    desc: "Built for the security teams who sign off on ERP integrations — not bolted on afterwards.",
    pillars: [
      {
        iconKey: "readonly",
        title: "Read-Only Connection",
        body: "Every ERP adapter issues SELECT-only traffic. A 50+ test validator blocks INSERT/UPDATE/DELETE/DDL at the query layer — your production data is physically unwritable from ERPAIO.",
      },
      {
        iconKey: "rbac",
        title: "Role-Based Access",
        body: "Owner, admin and member roles scope every action. Multi-tenant isolation enforces a tenantId boundary on each query, so no seat ever sees another company's data.",
      },
      {
        iconKey: "approval",
        title: "Human Approval",
        body: "The AI drafts SQL and proposes actions — a human authorizes execution. Nothing runs against your ERP without an explicit, logged confirmation step.",
      },
      {
        iconKey: "audit",
        title: "Full Audit Logs",
        body: "Every question, generated query, and notification is recorded immutably with actor, timestamp and IP. KVKK md. 13 + GDPR Art. 30 processing records, export on demand.",
      },
    ],
  },
  tr: {
    label: "Güven & Güvenlik",
    title: "Tasarımı gereği kurumsal sınıf",
    desc: "ERP entegrasyonlarını onaylayan güvenlik ekipleri için kuruldu — sonradan eklenmedi.",
    pillars: [
      {
        iconKey: "readonly",
        title: "Salt-Okunur Bağlantı",
        body: "Her ERP adaptörü yalnızca SELECT trafiği üretir. 50+ testli doğrulayıcı INSERT/UPDATE/DELETE/DDL'i sorgu katmanında engeller — üretim veriniz ERPAIO'dan fiziksel olarak yazılamaz.",
      },
      {
        iconKey: "rbac",
        title: "Rol Tabanlı Erişim",
        body: "Sahip, yönetici ve üye rolleri her eylemi kapsar. Çok kiracılı izolasyon her sorguda tenantId sınırı uygular; hiçbir kullanıcı başka bir şirketin verisini göremez.",
      },
      {
        iconKey: "approval",
        title: "İnsan Onayı",
        body: "AI, SQL taslağı üretir ve eylem önerir — yürütmeyi bir insan yetkilendirir. ERP'nizde hiçbir şey açık ve loglanan onay adımı olmadan çalışmaz.",
      },
      {
        iconKey: "audit",
        title: "Tam Denetim Kaydı",
        body: "Her soru, üretilen sorgu ve bildirim; aktör, zaman damgası ve IP ile değiştirilemez biçimde kaydedilir. KVKK md. 13 + GDPR Art. 30 işleme kaydı, talep üzerine dışa aktarım.",
      },
    ],
  },
  ar: {
    label: "الثقة والأمان",
    title: "بمستوى المؤسسات افتراضيًا",
    desc: "مبني لفرق الأمن التي تعتمد تكاملات ERP — وليس مُضافًا لاحقًا.",
    pillars: [
      {
        iconKey: "readonly",
        title: "اتصال للقراءة فقط",
        body: "كل محوّل ERP يصدر حركة SELECT فقط. مدقّق بأكثر من 50 اختبارًا يمنع INSERT/UPDATE/DELETE/DDL على مستوى الاستعلام — بياناتك الإنتاجية غير قابلة للكتابة من ERPAIO.",
      },
      {
        iconKey: "rbac",
        title: "وصول قائم على الأدوار",
        body: "أدوار المالك والمشرف والعضو تحدّد كل إجراء. العزل متعدد المستأجرين يفرض حدّ tenantId على كل استعلام؛ لا يرى أي مستخدم بيانات شركة أخرى.",
      },
      {
        iconKey: "approval",
        title: "موافقة بشرية",
        body: "يصيغ الذكاء الاصطناعي SQL ويقترح الإجراءات — ويُصرّح إنسان بالتنفيذ. لا شيء يعمل على ERP دون خطوة تأكيد صريحة ومُسجّلة.",
      },
      {
        iconKey: "audit",
        title: "سجلّات تدقيق كاملة",
        body: "كل سؤال واستعلام مُولّد وإشعار يُسجّل بشكل غير قابل للتغيير مع الفاعل والطابع الزمني وعنوان IP. سجلّات معالجة وفق KVKK م.13 + GDPR م.30، تصدير عند الطلب.",
      },
    ],
  },
};

function PillarIcon({ k }: { k: Pillar["iconKey"] }) {
  const common = {
    width: 26,
    height: 26,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    style: { display: "block" },
  };
  switch (k) {
    case "readonly":
      return (
        <svg {...common}>
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
          <line x1="3" y1="3" x2="21" y2="21" />
        </svg>
      );
    case "rbac":
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "approval":
      return (
        <svg {...common}>
          <path d="M9 12l2 2 4-4" />
          <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
          <path d="M3 5c0 1.66 4 3 9 3s9-1.34 9-3-4-3-9-3-9 1.34-9 3" />
        </svg>
      );
    case "audit":
      return (
        <svg {...common}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <line x1="10" y1="9" x2="8" y2="9" />
        </svg>
      );
  }
}

export function EnterpriseTrust({ locale = "en" }: { locale?: Locale }) {
  const t = COPY[locale];
  return (
    <section id="enterprise-trust" style={{ background: "var(--bg-alt)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", textAlign: "center" }}>
        <div className="section-label">{t.label}</div>
        <div className="section-title">{t.title}</div>
        <div className="section-desc" style={{ margin: "20px auto 0" }}>
          {t.desc}
        </div>
        <div
          style={{
            marginTop: 56,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 20,
            textAlign: "start",
          }}
        >
          {t.pillars.map((p) => (
            <div
              key={p.iconKey}
              className="elevated fade-in"
              style={{
                background: "var(--bg)",
                border: "1px solid var(--border)",
                borderRadius: 16,
                padding: "28px 24px",
              }}
            >
              <span
                aria-hidden
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: "var(--bg-dark)",
                  color: "var(--text-light)",
                  marginBottom: 18,
                }}
              >
                <PillarIcon k={p.iconKey} />
              </span>
              <h4 style={{ fontSize: 17, fontWeight: 600, margin: "0 0 8px", color: "var(--text)" }}>
                {p.title}
              </h4>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--text-secondary)", margin: 0 }}>
                {p.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
