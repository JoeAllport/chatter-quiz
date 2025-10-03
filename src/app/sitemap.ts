import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = process.env.NEXT_PUBLIC_SITE_ORIGIN ?? "https://your-app.vercel.app";
  // TODO: replace with a real index of slugs
  const slugs = ["demo", "island-prepositions"]; 
  const now = new Date().toISOString();

  return [
    { url: `${origin}/`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    ...slugs.map((s) => ({
      url: `${origin}/q/${s}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
