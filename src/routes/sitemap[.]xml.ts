import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "https://thai-posture-zen.lovable.app";

interface SitemapEntry {
  path: string;
  changefreq?: "weekly" | "monthly";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const { listActiveStudios } = await import("@/lib/studio.server");
        const studios = await listActiveStudios();
        const entries: SitemapEntry[] = studios.flatMap((s) => [
          { path: `/${s.slug}`, changefreq: "weekly" as const, priority: "1.0" },
          { path: `/${s.slug}/home-office`, changefreq: "weekly" as const, priority: "0.9" },
          { path: `/${s.slug}/kontakt`, changefreq: "monthly" as const, priority: "0.7" },
        ]);
        const urls = entries.map(
          (e) =>
            `  <url>\n    <loc>${BASE_URL}${e.path}</loc>\n    <changefreq>${e.changefreq}</changefreq>\n    <priority>${e.priority}</priority>\n  </url>`
        );
        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");
        return new Response(xml, {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});