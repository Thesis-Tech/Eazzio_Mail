/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@eazzio/ui-kit', '@eazzio/contracts', '@eazzio/identity'],
};

export default nextConfig;
