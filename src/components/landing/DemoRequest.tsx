"use client";
// Sprint G.2 — demo request / lead-gen form.
//
// Captures pre-signup enterprise interest: name, corporate email, ERP
// system. Full client-side state machine (idle → loading → success |
// error) with an accessible success modal. Submits to /api/demo-request
// (created alongside) and also console.logs the payload so the data is
// observable in dev even before any CRM wiring.
//
// Styling: landing design tokens + inline styles (repo does not compile
// Tailwind utilities — no `@import "tailwindcss"` directive exists).

import { useState } from "react";
import type { Locale } from "@/lib/landing/locale";
import { track } from "@/lib/analytics/track";

type ErpSystem = "nebim" | "sap" | "oracle" | "dynamics" | "logo" | "mikro" | "other";

interface DemoCopy {
  label: string;
  title: string;
  desc: string;
  nameLabel: string;
  namePlaceholder: string;
  emailLabel: string;
  emailPlaceholder: string;
  erpLabel: string;
  erpPlaceholder: string;
  submit: string;
  submitting: string;
  successTitle: string;
  successBody: string;
  closeLabel: string;
  errEmail: string;
  errRequired: string;
  errNetwork: string;
  erpOptions: { value: ErpSystem; label: string }[];
}

const ERP_OPTIONS: { value: ErpSystem; label: string }[] = [
  { value: "nebim", label: "Nebim V3" },
  { value: "sap", label: "SAP S/4HANA" },
  { value: "oracle", label: "Oracle Fusion" },
  { value: "dynamics", label: "Dynamics 365" },
  { value: "logo", label: "Logo" },
  { value: "mikro", label: "Mikro" },
  { value: "other", label: "Other / Diğer" },
];

const COPY: Record<Locale, DemoCopy> = {
  en: {
    label: "Request a Demo",
    title: "See it on your own ERP",
    desc: "Tell us where to reach you and which system you run. We'll set up a tailored walkthrough.",
    nameLabel: "Full name",
    namePlaceholder: "Jane Doe",
    emailLabel: "Work email",
    emailPlaceholder: "jane@company.com",
    erpLabel: "ERP system",
    erpPlaceholder: "Select your ERP",
    submit: "Request demo",
    submitting: "Sending…",
    successTitle: "Request received",
    successBody: "Thanks! Our team will reach out within one business day to schedule your walkthrough.",
    closeLabel: "Close",
    errEmail: "Please enter a valid work email.",
    errRequired: "Please fill in every field.",
    errNetwork: "Something went wrong. Please try again.",
    erpOptions: ERP_OPTIONS,
  },
  tr: {
    label: "Demo Talep Et",
    title: "Kendi ERP'nizde görün",
    desc: "Size nasıl ulaşacağımızı ve hangi sistemi kullandığınızı söyleyin. Size özel bir tur ayarlayalım.",
    nameLabel: "Ad soyad",
    namePlaceholder: "Ayşe Yılmaz",
    emailLabel: "Kurumsal e-posta",
    emailPlaceholder: "ayse@sirket.com",
    erpLabel: "ERP sistemi",
    erpPlaceholder: "ERP'nizi seçin",
    submit: "Demo talep et",
    submitting: "Gönderiliyor…",
    successTitle: "Talebiniz alındı",
    successBody: "Teşekkürler! Ekibimiz bir iş günü içinde turunuzu planlamak için sizinle iletişime geçecek.",
    closeLabel: "Kapat",
    errEmail: "Lütfen geçerli bir kurumsal e-posta girin.",
    errRequired: "Lütfen tüm alanları doldurun.",
    errNetwork: "Bir şeyler ters gitti. Lütfen tekrar deneyin.",
    erpOptions: ERP_OPTIONS,
  },
  ar: {
    label: "اطلب عرضًا توضيحيًا",
    title: "شاهده على ERP الخاص بك",
    desc: "أخبرنا بكيفية الوصول إليك وأي نظام تستخدم. سنرتّب جولة مخصّصة لك.",
    nameLabel: "الاسم الكامل",
    namePlaceholder: "آية يلماز",
    emailLabel: "بريد العمل",
    emailPlaceholder: "aya@company.com",
    erpLabel: "نظام ERP",
    erpPlaceholder: "اختر نظام ERP",
    submit: "اطلب عرضًا",
    submitting: "جارٍ الإرسال…",
    successTitle: "تم استلام الطلب",
    successBody: "شكرًا! سيتواصل فريقنا خلال يوم عمل واحد لتحديد موعد جولتك.",
    closeLabel: "إغلاق",
    errEmail: "يرجى إدخال بريد عمل صالح.",
    errRequired: "يرجى ملء كل الحقول.",
    errNetwork: "حدث خطأ ما. حاول مرة أخرى.",
    erpOptions: ERP_OPTIONS,
  },
};

type Status = "idle" | "loading" | "success" | "error";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function DemoRequest({ locale = "en" }: { locale?: Locale }) {
  const t = COPY[locale];
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [erp, setErp] = useState<ErpSystem | "">("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !erp) {
      setStatus("error");
      setErrorMsg(t.errRequired);
      return;
    }
    if (!EMAIL_RE.test(email)) {
      setStatus("error");
      setErrorMsg(t.errEmail);
      return;
    }
    const payload = { name: name.trim(), email: email.trim(), erp, locale };
    // Observable in dev even before CRM wiring (per spec).
    console.log("[demo-request]", payload);
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/demo-request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStatus("success");
      track("demo_request_submitted", { erp, locale });
    } catch {
      setStatus("error");
      setErrorMsg(t.errNetwork);
      track("demo_request_error", { erp, locale });
    }
  }

  function reset() {
    setStatus("idle");
    setName("");
    setEmail("");
    setErp("");
    setErrorMsg("");
  }

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: "var(--text-secondary)",
    marginBottom: 6,
    letterSpacing: 0.3,
  };
  const fieldStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 14px",
    fontSize: 14,
    fontFamily: "inherit",
    color: "var(--text)",
    background: "var(--bg)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    outline: "none",
  };

  return (
    <section id="demo-request" style={{ background: "var(--bg-alt)" }}>
      <div style={{ maxWidth: 560, margin: "0 auto", textAlign: "center" }}>
        <div className="section-label">{t.label}</div>
        <div className="section-title">{t.title}</div>
        <div className="section-desc" style={{ margin: "20px auto 0" }}>
          {t.desc}
        </div>

        <form
          onSubmit={onSubmit}
          style={{
            marginTop: 40,
            textAlign: "start",
            display: "flex",
            flexDirection: "column",
            gap: 18,
            background: "var(--bg)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            padding: 28,
            direction: locale === "ar" ? "rtl" : "ltr",
          }}
        >
          <div>
            <label htmlFor="dr-name" style={labelStyle}>
              {t.nameLabel}
            </label>
            <input
              id="dr-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.namePlaceholder}
              autoComplete="name"
              style={fieldStyle}
            />
          </div>
          <div>
            <label htmlFor="dr-email" style={labelStyle}>
              {t.emailLabel}
            </label>
            <input
              id="dr-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.emailPlaceholder}
              autoComplete="email"
              style={fieldStyle}
            />
          </div>
          <div>
            <label htmlFor="dr-erp" style={labelStyle}>
              {t.erpLabel}
            </label>
            <select
              id="dr-erp"
              value={erp}
              onChange={(e) => setErp(e.target.value as ErpSystem)}
              style={{ ...fieldStyle, cursor: "pointer" }}
            >
              <option value="" disabled>
                {t.erpPlaceholder}
              </option>
              {t.erpOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {status === "error" && (
            <p role="alert" style={{ margin: 0, fontSize: 13, color: "#DC2626" }}>
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={status === "loading"}
            className="btn-primary"
            style={{
              marginTop: 4,
              opacity: status === "loading" ? 0.6 : 1,
              cursor: status === "loading" ? "wait" : "pointer",
            }}
          >
            {status === "loading" ? t.submitting : t.submit}
          </button>
        </form>
      </div>

      {/* Success modal */}
      {status === "success" && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="dr-success-title"
          onClick={reset}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(10,10,10,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--bg)",
              border: "1px solid var(--border)",
              borderRadius: 18,
              padding: "36px 32px",
              maxWidth: 420,
              width: "100%",
              textAlign: "center",
              boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
            }}
          >
            <div
              aria-hidden
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "var(--bg-dark)",
                color: "var(--text-light)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
              }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3 id="dr-success-title" style={{ fontSize: 20, fontWeight: 600, margin: "0 0 10px", color: "var(--text)" }}>
              {t.successTitle}
            </h3>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--text-secondary)", margin: "0 0 24px" }}>
              {t.successBody}
            </p>
            <button onClick={reset} className="btn-primary" style={{ minWidth: 140 }}>
              {t.closeLabel}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
