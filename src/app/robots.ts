import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: 'https://vinayshah.dev/sitemap.xml',
    host: 'https://vinayshah.dev',
  };
}
