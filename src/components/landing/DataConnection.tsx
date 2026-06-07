"use client";
// Sprint G.6 — data connection flow demo island.
//
// Illustrates how a customer connects their own ERP (e.g. Nebim): a
// masked connection-string / API-key field with show/hide, plus a
// prominent "Security Assurance" panel stating the connection is
// read-only, encrypted, and never exfiltrated. This is a landing
// DEMO — it does not transmit anything (submit is a local no-op with a
// reassuring confirmation). The real connect flow lives in the
// authenticated dashboard.
//
// Styling: landing design tokens + inline styles (Tailwind utilities are
// not compiled in this repo).

import { useState } from "react";
import type { Locale } from "@/lib/landing/locale";

interface ConnCopy {
  label: string;
  title: string;
  desc: string;
  fieldLabel: string;
  placeholder: string;
  showLabel: string;
  hideLabel: string;
  connectLabel: string;
  connectedLabel: string;
  assuranceTitle: string;
  assurances: string[];
  demoNote: string;
}

const COPY: Record<Locale, ConnCopy> = {
  en: {
    label: "Connect your data",
    title: "Your ERP, on your terms",
    desc: "Paste a read-only connection string. We encrypt it at rest and only ever issue SELECT queries.",
    fieldLabel: "Connection string / API key",
    placeholder: "Server=erp.company.com;Database=NebimV3;User=erpaio_ro;…",
    showLabel: "Show",
    hideLabel: "Hide",
    connectLabel: "Test connection",
    connectedLabel: "Connection looks valid ✓",
    assuranceTitle: "Security assurance",
    assurances: [
      "Read-only: ERPAIO can only run SELECT — a 50+ test validator blocks any write or DDL.",
      "Encrypted at rest with AES-256-GCM and key rotation; credentials are never logged.",
      "Your data is never used to train models and never leaves your tenant boundary.",
    ],
    demoNote: "Demo only — nothing is transmitted from this page.",
  },
  tr: {
    label: "Verinizi bağlayın",
    title: "ERP'niz, sizin kurallarınızla",
    desc: "Salt-okunur bir bağlantı dizesi yapıştırın. Beklemede şifreleriz ve yalnızca SELECT sorguları çalıştırırız.",
    fieldLabel: "Bağlantı dizesi / API anahtarı",
    placeholder: "Server=erp.firma.com;Database=NebimV3;User=erpaio_ro;…",
    showLabel: "Göster",
    hideLabel: "Gizle",
    connectLabel: "Bağlantıyı test et",
    connectedLabel: "Bağlantı geçerli görünüyor ✓",
    assuranceTitle: "Güvenlik güvencesi",
    assurances: [
      "Salt-okunur: ERPAIO yalnızca SELECT çalıştırabilir — 50+ testli doğrulayıcı her yazma/DDL'i engeller.",
      "Beklemede AES-256-GCM + anahtar rotasyonu ile şifrelenir; kimlik bilgileri asla loglanmaz.",
      "Veriniz model eğitiminde asla kullanılmaz ve kiracı sınırınızın dışına asla çıkmaz.",
    ],
    demoNote: "Yalnızca demo — bu sayfadan hiçbir şey iletilmez.",
  },
  ar: {
    label: "اربط بياناتك",
    title: "ERP الخاص بك، بشروطك",
    desc: "الصق سلسلة اتصال للقراءة فقط. نشفّرها أثناء التخزين وننفّذ استعلامات SELECT فقط.",
    fieldLabel: "سلسلة الاتصال / مفتاح API",
    placeholder: "Server=erp.company.com;Database=NebimV3;User=erpaio_ro;…",
    showLabel: "إظهار",
    hideLabel: "إخفاء",
    connectLabel: "اختبر الاتصال",
    connectedLabel: "يبدو الاتصال صالحًا ✓",
    assuranceTitle: "ضمان الأمان",
    assurances: [
      "للقراءة فقط: يمكن لـ ERPAIO تنفيذ SELECT فقط — مدقّق بأكثر من 50 اختبارًا يمنع أي كتابة أو DDL.",
      "مشفّر أثناء التخزين بـ AES-256-GCM مع تدوير المفاتيح؛ لا تُسجَّل بيانات الاعتماد أبدًا.",
      "لا تُستخدم بياناتك لتدريب النماذج ولا تغادر حدود مستأجرك أبدًا.",
    ],
    demoNote: "عرض فقط — لا يُرسَل شيء من هذه الصفحة.",
  },
};

export function DataConnection({ locale = "en" }: { locale?: Locale }) {
  const t = COPY[locale];
  const rtl = locale === "ar";
  const [value, setValue] = useState("");
  const [reveal, setReveal] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  return (
    <section id="data-connection" style={{ background: "var(--bg-alt)" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
        <div className="section-label">{t.label}</div>
        <div className="section-title">{t.title}</div>
        <div className="section-desc" style={{ margin: "20px auto 0" }}>
          {t.desc}
        </div>

        <div
          className="elevated"
          style={{
            marginTop: 36,
            textAlign: "start",
            background: "var(--bg)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            padding: 24,
            direction: rtl ? "rtl" : "ltr",
          }}
        >
          <label htmlFor="dc-conn" style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>
            {t.fieldLabel}
          </label>
          <div style={{ position: "relative" }}>
            <input
              id="dc-conn"
              type={reveal ? "text" : "password"}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setConfirmed(false);
              }}
              placeholder={t.placeholder}
              autoComplete="off"
              spellCheck={false}
              style={{
                width: "100%",
                padding: rtl ? "12px 14px 12px 70px" : "12px 70px 12px 14px",
                fontSize: 13,
                fontFamily: "'JetBrains Mono',monospace",
                color: "var(--text)",
                background: "var(--bg-alt)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                outline: "none",
              }}
            />
            <button
              type="button"
              onClick={() => setReveal((v) => !v)}
              style={{
                position: "absolute",
                top: "50%",
                transform: "translateY(-50%)",
                [rtl ? "left" : "right"]: 10,
                background: "transparent",
                border: "none",
                color: "var(--text-secondary)",
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {reveal ? t.hideLabel : t.showLabel}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setConfirmed(Boolean(value.trim()))}
            disabled={!value.trim()}
            className="btn-primary"
            style={{ marginTop: 16, opacity: value.trim() ? 1 : 0.5, cursor: value.trim() ? "pointer" : "not-allowed" }}
          >
            {t.connectLabel}
          </button>
          {confirmed && (
            <p style={{ marginTop: 12, marginBottom: 0, fontSize: 13, color: "#059669", fontWeight: 500 }}>
              {t.connectedLabel}
            </p>
          )}

          {/* Security assurance */}
          <div
            style={{
              marginTop: 24,
              padding: 18,
              borderRadius: 12,
              background: "var(--bg-alt)",
              border: "1px solid var(--border)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 12,
                color: "var(--text)",
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
              {t.assuranceTitle}
            </div>
            <ul style={{ margin: 0, paddingInlineStart: 18, display: "flex", flexDirection: "column", gap: 8 }}>
              {t.assurances.map((a) => (
                <li key={a} style={{ fontSize: 13, lineHeight: 1.55, color: "var(--text-secondary)" }}>
                  {a}
                </li>
              ))}
            </ul>
          </div>

          <p style={{ marginTop: 14, marginBottom: 0, fontSize: 12, color: "var(--text-secondary)", opacity: 0.8, textAlign: "center" }}>
            {t.demoNote}
          </p>
        </div>
      </div>
    </section>
  );
}
