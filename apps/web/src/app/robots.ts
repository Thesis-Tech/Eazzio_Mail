import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://eazzio.com';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/mail',
        '/mail/',
        '/api/',
        '/login',
        '/register',
        '/signup',
        '/forgot-password',
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
