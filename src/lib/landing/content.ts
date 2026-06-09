// Sprint F.5b — landing content catalog (EN catalog).
// Sprint F.5c — refactored shape: section "title" is now a single HTML
// string (containing <em> + <br/>) so each locale expresses word order
// naturally without rigid prefix/em/suffix slots. Renderer feeds these
// via dangerouslySetInnerHTML — content is fully static, not user input.
//
// Each locale fills the same shape. Adding a fourth locale = a single
// new file (e.g., ES) and a switch in resolveLocale().

import type { Locale } from "./locale";

export interface LandingContent {
  htmlLang: Locale;
  dir: "ltr" | "rtl";

  // Metadata
  metaTitle: string;
  metaDesc: string;

  // Topbar
  topbarTagline: string;

  // Nav
  navLinks: { href: string; label: string }[];
  signInLabel: string;
  navAriaHome: string;
  navAriaMenu: string;

  // Sidebar
  sidebarLinks: { href: string; label: string }[];
  sidebarFooterLinks: { href: string; label: string }[];
  sidebarCopyright: string;

  // Hero — heroTitle is HTML (contains <em> + <br/>).
  heroBadge: string;
  heroTitle: string;
  heroDesc: string;
  ctaPrimary: string;
  ctaSecondary: string;
  /** Compact above-the-fold trust signals shown under the hero CTAs. */
  heroTrust: string[];

  // Stats bar
  stats: { number: string; label: string }[];

  // Marquee
  marqueeItems: string[];

  // Core idea — title is HTML.
  coreIdea: { label: string; title: string; desc: string; loop: string[] };

  // Features
  features: {
    label: string;
    title: string;
    desc: string;
    cards: { number: string; title: string; body: string }[];
  };

  // Use cases
  useCases: {
    label: string;
    title: string;
    desc: string;
    cards: { title: string; bullets: string[] }[];
  };

  // Platform / bento
  platform: {
    label: string;
    title: string;
    desc: string;
    textToCode: { label: string; title: string; body: string; codeHtml: string };
    rag: { label: string; title: string; body: string };
    connector: { label: string; title: string; body: string; chips: string[] };
    threePillars: { label: string; title: string; body: string };
    industry: { label: string; title: string; body: string; tags: string[] };
  };

  // How it works
  howItWorks: {
    label: string;
    title: string;
    desc: string;
    steps: { number: string; title: string; body: string }[];
  };

  // Trust
  trust: {
    label: string;
    title: string;
    desc: string;
    cards: { iconKey: "lock" | "users" | "check" | "doc" | "bulb"; title: string; body: string }[];
  };

  // Technology
  technology: { label: string; title: string; desc: string; chips: string[] };

  // Trusted by
  trustedByLabel: string;
  trustedByItems: string[];

  // Quote
  quoteText: string;
  quoteAttribution: string;

  // Final CTA
  finalCta: { label: string; title: string; desc: string; cta: string };

  // Contact
  contact: {
    label: string;
    title: string;
    desc: string;
    location: string;
    firstName: { label: string; placeholder: string };
    lastName: { label: string; placeholder: string };
    email: { label: string; placeholder: string };
    company: { label: string; placeholder: string };
    interest: { label: string; placeholderOption: string; options: string[] };
    message: { label: string; placeholder: string };
    submit: string;
    sending: string;
    successTitle: string;
    successBody: string;
    errorBody: string;
  };

  // Footer
  footer: {
    tagline: string;
    cols: { heading: string; links: { href: string; label: string }[] }[];
    badges: string[];
    copyright: string;
    legalLinks: string;
  };
}

// ---------- EN ----------

export const EN: LandingContent = {
  htmlLang: "en",
  dir: "ltr",
  metaTitle: "ERPAIO \u2014 Ask your ERP, get answers in seconds",
  metaDesc:
    "Ask your ERP database in plain language. ERPAIO writes read-only SQL and answers instantly \u2014 anomaly alerts, multi-channel notifications, no changes to your ERP.",
  topbarTagline: "Ask your ERP, get answers in seconds",
  navLinks: [
    { href: "#core-idea", label: "Vision" },
    { href: "#features", label: "Features" },
    { href: "#use-cases", label: "Use Cases" },
    { href: "#platform", label: "Platform" },
    { href: "#how-it-works", label: "Process" },
    { href: "#contact", label: "Contact" },
  ],
  signInLabel: "Sign In",
  navAriaHome: "Home",
  navAriaMenu: "Menu",
  sidebarLinks: [
    { href: "#core-idea", label: "Vision" },
    { href: "#features", label: "Features" },
    { href: "#use-cases", label: "Use Cases" },
    { href: "#platform", label: "Platform" },
    { href: "#how-it-works", label: "Process" },
    { href: "#trust", label: "Trust" },
    { href: "#contact", label: "Contact" },
  ],
  sidebarFooterLinks: [
    { href: "#", label: "Twitter / X" },
    { href: "#", label: "LinkedIn" },
    { href: "#", label: "GitHub" },
  ],
  sidebarCopyright: "\u00A9 2026 ERPAIO",
  heroBadge: "Natural-language AI for your ERP",
  heroTitle: "Stop waiting on IT for reports.<br/>Ask, get <em>answers in seconds.</em>",
  heroDesc:
    "Type \u201CTop 5 products this month?\u201D \u2014 ERPAIO writes read-only SQL and answers instantly. No code, no waiting.",
  ctaPrimary: "Try with sample data",
  ctaSecondary: "Start free",
  heroTrust: ["Read-only", "AES-256 encrypted", "Your data is never stored"],
  stats: [
    { number: "$73B", label: "Global ERP Market" },
    { number: "9", label: "Industry Verticals" },
    { number: "0", label: "ERP Modifications" },
    { number: "24/7", label: "Proactive Monitoring" },
  ],
  marqueeItems: [
    "Daily Business Pulse",
    "Text-to-SQL Queries",
    "Cross-Module Anomaly Detection",
    "Forecasting & Prediction",
    "Prescriptive Optimization",
    "Knowledge Graph Intelligence",
    "Decisioning & Automation",
    "RAG + Tool Execution",
    "Causal Inference",
    "Continuous Feedback",
    "Flow Awareness",
  ],
  coreIdea: {
    label: "The Core Idea",
    title: "Not a tool.<br/>A system that <em>understands</em> your business.",
    desc:
      "ERPAIO doesn\u2019t just answer questions \u2014 it learns your business patterns, spots deviations, and tells you what matters before you ask. 24/7.",
    loop: ["Observe", "Understand", "Evaluate", "Detect", "Notify", "Act", "Learn"],
  },
  features: {
    label: "Capabilities",
    title: "Much more<br/>than just <em>asking</em>",
    desc:
      "Always-on monitoring, anomaly detection, and proactive notifications across every module. Every generated query is read-only; every proposed action runs only with your approval.",
    cards: [
      { number: "01", title: "Continuous Monitoring", body: "Always-on visibility across every ERP module. Tracks activities in real time, evaluates performance continuously, and surfaces what matters\u2014risks, opportunities, overdue flows, and fulfilled operations." },
      { number: "02", title: "Continuous Feedback", body: "AI-generated operational feedback covering both positive and negative performance. Continuous evaluation highlights improvements alongside problems\u2014so you see the full picture." },
      { number: "03", title: "Detection & Signals", body: "Negative signals: anomalies, risks, inefficiencies. Positive signals: optimizations, improvements, opportunities. Statistical and ML-powered, with severity scoring and cross-module correlation." },
      { number: "04", title: "Proactive Notifications", body: "The system tells you what matters\u2014you don\u2019t go looking for it. Daily briefings via WhatsApp, Telegram, or email. Each alert expands to evidence, root cause, and actionable next steps." },
      { number: "05", title: "Flow Awareness", body: "Tracks overdue processes and delays, fulfilled and completed operations, bottlenecks and accelerations. Every business flow is monitored end-to-end across modules." },
      { number: "06", title: "Prescriptive Recommendations", body: "AI-generated reorder, allocation, and planning recommendations respecting your constraints. Prioritized actions with scenario simulations. Everything ships as a draft requiring approval." },
      { number: "07", title: "Cross-Module Intelligence", body: "A knowledge graph that unifies customer, vendor, product, and location identities. Semantic queries and relationship reasoning find what no single module can reveal on its own." },
      { number: "08", title: "Decisioning & Execution", body: "Workflow automation with approval-based execution. ERP-integrated actions with audit logs, rollback plans, and full explainability. Every action is controlled\u2014never a surprise." },
      { number: "09", title: "Conversational ERP Agent", body: "Ask in plain language: \u201CWhat should I focus on today?\u201D \u201CWhat is going wrong?\u201D \u201CWhat is improving?\u201D \u201CWhat requires immediate action?\u201D Text-to-SQL, RAG-grounded, auditable." },
    ],
  },
  useCases: {
    label: "Use Cases",
    title: "Real use cases<br/>across your <em>business</em>",
    desc: "From retail to manufacturing to finance\u2014the same intelligence engine, adapted to your vertical.",
    cards: [
      { title: "Retail", bullets: ["Detect unusual sales drops or spikes", "Identify optimization opportunities in pricing", "Get notified about slow or fast-moving inventory"] },
      { title: "Manufacturing", bullets: ["Detect production inefficiencies or delays", "Identify improvement opportunities in processes", "Monitor completed vs delayed workflows"] },
      { title: "Finance", bullets: ["Detect unusual financial movements", "Identify positive trends and optimization areas", "Monitor overdue payments and fulfilled collections"] },
    ],
  },
  platform: {
    label: "Platform",
    title: "Dashboards wait.<br/>ERPAIO <em>notifies.</em>",
    desc:
      "From passive checking to proactive notification. From static analysis to continuous learning. From data to decisions to controlled actions\u2014with full approval flows and audit trails.",
    textToCode: {
      label: "Core Experience",
      title: "Text \u2192 Code \u2192 Text",
      body: "Type a question like you\u2019d ask a colleague. The agent reads ERP tables, generates structured queries, and returns human-readable answers with data citations. Every action is a draft requiring approval.",
      codeHtml:
        '<span class="comment">// You ask:</span><br/><span class="str">"Show low-stock items in Istanbul"</span><br/><br/><span class="comment">// Agent generates:</span><br/><span class="kw">SELECT</span> product, stock, reorder_point<br/><span class="kw">FROM</span> inventory<br/><span class="kw">WHERE</span> warehouse = <span class="str">\'IST\'</span><br/><span class="kw">AND</span> stock &lt; reorder_point<br/><br/><span class="comment">// You get:</span><br/><span class="str">"12 items below reorder point. Top 3: SKU-4821 (3 left), SKU-1190 (5 left)..."</span>',
    },
    rag: {
      label: "AI Engine",
      title: "RAG + Tool Execution",
      body: "Conversational analytics grounded via retrieval-augmented generation. Every answer includes citations from your actual data. Every action executes as a draft. Hallucination-resistant by design.",
    },
    connector: {
      label: "Connector Framework",
      title: "Universal Connector",
      body: "Not a single connector\u2014a connector framework. API Pull (OData/REST/SOAP), Event-driven streaming, CDC from database logs, and Bulk import/export. ERP-specific adapters with read-only access.",
      chips: ["Nebim V3", "SAP S/4HANA", "Dynamics 365", "Oracle Fusion", "Logo", "Mikro", "Shopify"],
    },
    threePillars: {
      label: "Intelligence Framework",
      title: "Three Pillars of Intelligence",
      body: "Flow Summaries: factual daily recaps across all modules. Anomaly Detection: intelligent flagging of deviations from learned business patterns. Proactive Recommendations: AI-generated insights connecting signals across modules with concrete actions.",
    },
    industry: {
      label: "Industry Coverage",
      title: "Horizontal Core + Vertical Packs",
      body: "A universal intelligence core with industry-specific configurations, KPI templates, detection rules, and domain ontologies.",
      tags: ["RETAIL", "WHOLESALE & DISTRIBUTION", "FOOD & BEVERAGE", "MANUFACTURING", "HEALTHCARE", "HOSPITALITY", "CONSTRUCTION", "LOGISTICS", "EDUCATION"],
    },
  },
  howItWorks: {
    label: "Process",
    title: "A self-improving<br/><em>intelligence loop</em>",
    desc: "From connection to continuous intelligence in days, not months. Zero ERP modifications, zero risk.",
    steps: [
      { number: "01", title: "Connect", body: "Secure, read-only integration with no ERP modifications required. API pull, event streaming, CDC, or bulk export. Adapters for SAP, Oracle, Dynamics, Nebim, Logo, Mikro, and more." },
      { number: "02", title: "Understand", body: "AI builds a semantic and contextual layer across all modules. A unified knowledge graph with entity resolution, baselines, patterns, and seasonality\u2014learning what\u2019s \u201Cnormal\u201D for your specific business." },
      { number: "03", title: "Monitor & Notify", body: "Always-on tracking across every activity. The system proactively notifies you of what matters\u2014risks, opportunities, overdue processes, and fulfilled operations\u2014before you think to check." },
      { number: "04", title: "Evaluate & Detect", body: "Detects anomalies (negative signals) and optimizations (positive signals). Cross-module correlations, velocity alerts, trend breaks\u2014all with severity scoring and root-cause reasoning." },
      { number: "05", title: "Recommend & Act", body: "Insights turn into suggested actions with approval workflows. Prescriptive recommendations ship as drafts. Write-back to ERP with audit logs, rollback plans, and full explainability." },
      { number: "06", title: "Learn & Improve", body: "The system learns from every outcome\u2014positive and negative feedback continuously sharpens decision quality. Running 24/7, improving with every cycle across your entire business." },
    ],
  },
  trust: {
    label: "Enterprise Trust",
    title: "Built for <em>enterprise</em> trust",
    desc: "Security, compliance, and transparency are not features\u2014they are the foundation.",
    cards: [
      { iconKey: "lock", title: "Read-Only Connection", body: "No disruption to your ERP. Zero modifications required." },
      { iconKey: "users", title: "Role-Based Access", body: "Granular permissions aligned with your org structure." },
      { iconKey: "check", title: "Human Approval", body: "Every action requires human sign-off before execution." },
      { iconKey: "doc", title: "Full Audit Logs", body: "Complete traceability of every decision and action." },
      { iconKey: "bulb", title: "Explainable AI", body: "Every recommendation comes with reasoning you can inspect." },
    ],
  },
  technology: {
    label: "Under the Hood",
    title: "Advanced systems,<br/><em>unified</em> intelligence",
    desc: "Multiple advanced systems working together as a single, self-improving intelligence engine.",
    chips: ["Semantic Data Modeling", "Knowledge Graphs", "Retrieval-Augmented Generation", "Text-to-SQL", "AI Agents", "Causal Inference"],
  },
  trustedByLabel: "Supported ERP systems",
  trustedByItems: ["Nebim V3", "SAP S/4HANA", "Oracle Fusion", "Dynamics 365", "Logo", "Mikro"],
  quoteText: "Stop waiting on reports. Ask, and get the answer.",
  quoteAttribution: "ERPAIO \u2014 your ERP, in plain language",
  finalCta: {
    label: "Get Started",
    title: "Ask your ERP in plain language,<br/>get the <em>answer</em> in seconds",
    desc: "Move beyond dashboards and complex reports. Ask your questions in natural language and get instant, accurate answers.",
    cta: "Request a Demo",
  },
  contact: {
    label: "Contact",
    title: "Let\u2019s talk",
    desc: "Whether you\u2019re in retail, manufacturing, finance, or any other vertical\u2014let us show you how to ask your ERP data questions in plain language and get answers in seconds.",
    location: "Istanbul, Turkey",
    firstName: { label: "First Name", placeholder: "John" },
    lastName: { label: "Last Name", placeholder: "Doe" },
    email: { label: "Email", placeholder: "john@company.com" },
    company: { label: "Company", placeholder: "Your company name" },
    interest: {
      label: "I\u2019m interested in",
      placeholderOption: "Select an option",
      options: ["AI Intelligence Platform", "Shopify ERP App", "Enterprise Integration", "Partnership", "Just exploring"],
    },
    message: { label: "Message", placeholder: "Tell us about your business..." },
    submit: "Send Message",
    sending: "Sending...",
    successTitle: "Message Sent",
    successBody: "We\u2019ll get back to you within 24 hours.",
    errorBody: "Something went wrong. Please try again or email us directly.",
  },
  footer: {
    tagline: "A self-improving system that understands, notifies, and acts.",
    cols: [
      { heading: "Product", links: [
        { href: "#features", label: "Features" },
        { href: "#platform", label: "Platform" },
        { href: "#how-it-works", label: "Process" },
        { href: "/pricing", label: "Pricing" },
        { href: "/changelog", label: "Changelog" },
      ] },
      { heading: "Company", links: [
        { href: "/about", label: "About" },
        { href: "/help", label: "Help" },
        { href: "#", label: "Blog" },
        { href: "#", label: "Careers" },
        { href: "#contact", label: "Contact" },
      ] },
      { heading: "Connect", links: [
        { href: "#", label: "Twitter / X" },
        { href: "#", label: "LinkedIn" },
        { href: "#", label: "GitHub" },
      ] },
    ],
    badges: ["KVKK uyumlu", "GDPR Art. 32", "AES-256-GCM", "7/24 \u0130zleme"],
    copyright: "\u00A9 2026 ERPAIO. All rights reserved.",
    legalLinks: "Privacy Policy \u00B7 Terms of Service",
  },
};
