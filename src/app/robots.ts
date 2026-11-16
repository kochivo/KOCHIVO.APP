import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/captain', '/player', '/admin', '/api', '/dev'] },
    sitemap: 'https://kochivo.site/sitemap.xml',
  };
}
