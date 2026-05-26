import type { MetadataRoute } from "next";
import { baseUrl } from "@/lib/url";

export default function robots(): MetadataRoute.Robots {
  const base = baseUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/pricing",
          "/about",
          "/help",
          "/docs",
          "/changelog",
          "/privacy",
          "/terms",
          "/status",
        ],
        disallow: [
          "/api/",
          "/dashboard/",
          "/admin/",
          "/login",
          "/signup",
          "/forgot-password",
          "/reset-password",
          "/verify-email",
          "/accept-invite",
          "/maintenance",
        ],
      },
      {
        // AI tarayıcıları (GPTBot, Claude-Web vs.) — landing içeriği izinli, dashboard yasaklı
        userAgent: ["GPTBot", "ChatGPT-User", "Claude-Web", "anthropic-ai", "PerplexityBot"],
        allow: ["/", "/pricing", "/about", "/help", "/docs", "/changelog"],
        disallow: ["/api/", "/dashboard/", "/admin/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
