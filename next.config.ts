import type { NextConfig } from 'next';

// Fully static export for Cloudflare Pages: every page is pre-rendered HTML.
const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
