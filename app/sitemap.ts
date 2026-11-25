import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { TOOLS } from "@/lib/tools";

const STATIC_PAGES = ["", "/resume", "/about", "/privacy", "/terms", "/contact"];

export default function sitemap(): MetadataRoute.Sitemap {
  const toolPages = TOOLS.map((t) => `/tools/${t.slug}`);
  return [...STATIC_PAGES, ...toolPages].map((path) => ({
    url: `${SITE_URL}${path}/`,
    lastModified: new Date(),
  }));
}
