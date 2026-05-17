import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import Toaster from "@/components/Toaster";
import ConfirmHost from "@/components/Confirm";
import CookieConsent from "@/components/CookieConsent";
import { I18nProvider } from "@/lib/i18n/context";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin", "latin-ext"],
  variable: "--font-playfair",
  display: "swap",
  weight: ["400", "500", "700"],
});

const baseUrl = process.env.NEXTAUTH_URL ?? "https://erpaio.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "ERPAIO — ERP'nizle Türkçe konuşun",
    template: "%s | ERPAIO",
  },
  description:
    "ERP veritabanınıza Türkçe doğal dilde soru sorun. AI saniyeler içinde SQL üretip cevap verir. Anomaly tespiti, WhatsApp/email bildirim, anlık dashboard.",
  keywords: [
    "ERP",
    "SQL",
    "Türkçe",
    "AI",
    "yapay zeka",
    "Nebim",
    "SAP",
    "Logo",
    "Mikro",
    "Dynamics 365",
    "sorgu",
    "raporlama",
    "anomaly",
    "WhatsApp bildirim",
  ],
  authors: [{ name: "ERPAIO" }],
  creator: "ERPAIO",
  publisher: "ERPAIO",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    alternateLocale: ["en_US", "ar_SA"],
    url: baseUrl,
    siteName: "ERPAIO",
    title: "ERPAIO — ERP'nizle Türkçe konuşun",
    description:
      "ERP veritabanınıza Türkçe doğal dilde soru sorun. AI SQL üretir, sonucu yorumlar. Anomaly tespiti, çoklu kanal bildirim.",
    images: [
      {
        url: `${baseUrl}/logo.png`,
        width: 1254,
        height: 1254,
        alt: "ERPAIO Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ERPAIO — ERP'nizle Türkçe konuşun",
    description: "Türkçe doğal dil → SQL → ERP. Anomaly tespiti, anlık dashboard.",
    images: [`${baseUrl}/logo.png`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/logo.png",
  },
  alternates: {
    canonical: baseUrl,
    languages: {
      tr: `${baseUrl}/?lang=tr`,
      en: `${baseUrl}/?lang=en`,
      ar: `${baseUrl}/?lang=ar`,
    },
  },
  category: "business",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAFAF8" },
    { media: "(prefers-color-scheme: dark)", color: "#0A0A0A" },
  ],
};

// Schema.org JSON-LD — Organization + SoftwareApplication
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${baseUrl}#organization`,
      name: "ERPAIO",
      url: baseUrl,
      logo: `${baseUrl}/logo.png`,
      description:
        "ERP veritabanlarınızı Türkçe doğal dille sorgulayan AI platformu.",
      sameAs: ["https://github.com/nurayyardmc-eng/erpaio"],
      contactPoint: {
        "@type": "ContactPoint",
        email: "support@erpaio.com",
        contactType: "Customer Support",
        availableLanguage: ["Turkish", "English", "Arabic"],
      },
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${baseUrl}#software`,
      name: "ERPAIO",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web, iOS, Android",
      description:
        "Türkçe doğal dil ile ERP veritabanı sorgulama. AI SQL üretir, anomaly tespit eder, çoklu kanal bildirim.",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "TRY",
        description: "14 gün ücretsiz Pro deneme",
      },
      featureList: [
        "Türkçe doğal dil → SQL",
        "Anomaly tespiti",
        "WhatsApp/Email/Push bildirim",
        "Çok kiracılı (multi-tenant)",
        "Read-only ERP güvenliği",
        "AES-256-GCM şifreleme",
        "MFA / iki faktörlü doğrulama",
        "API token yönetimi",
      ],
      url: baseUrl,
    },
    {
      "@type": "WebSite",
      "@id": `${baseUrl}#website`,
      url: baseUrl,
      name: "ERPAIO",
      description:
        "Türkçe doğal dil ile ERP veritabanı sorgulama platformu",
      publisher: { "@id": `${baseUrl}#organization` },
      inLanguage: ["tr-TR", "en-US", "ar-SA"],
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${inter.variable} ${playfair.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <I18nProvider>
          {children}
          <Toaster />
          <ConfirmHost />
          <CookieConsent />
        </I18nProvider>
      </body>
    </html>
  );
}
