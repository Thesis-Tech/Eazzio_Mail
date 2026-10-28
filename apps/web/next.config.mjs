/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  transpilePackages: ['@eazzio/ui-kit', '@eazzio/contracts', '@eazzio/identity'],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; connect-src 'self' ws: wss: http: https:;",
          },
        ],
      },
    ];
  },
  async rewrites() {
    const backendUrl = process.env.API_BACKEND_URL || 'http://127.0.0.1:8080';
    return [
      {
        source: '/api/v1/:path*',
        destination: `${backendUrl}/v1/:path*`,
      },
      {
        source: '/v1/:path*',
        destination: `${backendUrl}/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
