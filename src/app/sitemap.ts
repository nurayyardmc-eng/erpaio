import type { MetadataRoute } from "next";
import { baseUrl } from "@/lib/url";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = baseUrl();
  const lastModified = new Date();

  return [
    // Landing (en yüksek priority)
    { url: base, lastModified, changeFrequency: "weekly", priority: 1.0 },
    // Marketing pages
    { url: `${base}/pricing`, lastModified, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/about`, lastModified, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/help`, lastModified, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/docs`, lastModified, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/docs/api`, lastModified, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/changelog`, lastModified, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/status`, lastModified, changeFrequency: "daily", priority: 0.5 },
    // Legal
    { url: `${base}/privacy`, lastModified, changeFrequency: "yearly", priority: 0.4 },
    { url: `${base}/terms`, lastModified, changeFrequency: "yearly", priority: 0.4 },
  ];
}
