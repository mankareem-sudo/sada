import type { NextConfig } from "next";

const isCapacitor = process.env.BUILD_TARGET === 'capacitor';

const nextConfig: NextConfig = {
  output: isCapacitor ? 'export' : 'standalone',
  reactStrictMode: false,
  typescript: {
    ignoreBuildErrors: false,
  },
  compress: true,
  poweredByHeader: false,
  // For static export
  ...(isCapacitor
    ? {
        images: { unoptimized: true },
        trailingSlash: true,
        distDir: 'out',
      }
    : {
        images: {
          formats: ['image/avif', 'image/webp'],
        },
      }),
  async headers() {
    if (isCapacitor) return [];
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'microphone=(self), camera=(), geolocation=(), interest-cohort=()',
          },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ];
  },
};

export default nextConfig;

