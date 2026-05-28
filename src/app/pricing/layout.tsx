import { headers } from "next/headers";
import { resolveLocaleFromHeaders } from "@/lib/i18n/server";
import { messagesFor } from "@/lib/i18n/messagesFor";

export async function generateMetadata() {
  const h = await headers();
  const locale = resolveLocaleFromHeaders(h);
  const t = messagesFor(locale);
  return {
    title: t.pricing.metaTitle,
    description: t.pricing.metaDescription,
  };
}

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
