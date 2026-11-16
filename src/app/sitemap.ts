import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  // Pricing is a home section; signup has no standalone route.
  return ['ar', 'en'].flatMap(locale => ['', '/login', '/demo'].map(path => ({
    url: `https://kochivo.site/${locale}${path}`,
  })));
}
