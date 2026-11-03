import type { MetadataRoute } from 'next';

/** The production domain is public while the site is unfinished; nothing should index it yet. */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', disallow: '/' } };
}
