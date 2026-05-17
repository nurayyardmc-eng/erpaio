import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXTAUTH_URL ?? "https://erpaio.vercel.app";

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
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
