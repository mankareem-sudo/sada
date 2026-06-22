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
          // Prevent MIME type sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Prevent clickjacking
          { key: 'X-Frame-Options', value: 'DENY' },
          // XSS protection (legacy browsers)
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          // Referrer policy — only send origin to other origins
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Permissions policy — restrict dangerous APIs
          {
            key: 'Permissions-Policy',
            value: 'microphone=(self), camera=(), geolocation=(), interest-cohort=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()',
          },
          // HSTS — force HTTPS for 2 years (including subdomains)
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          // CSP — Content Security Policy
          // Allow self, Vercel, Supabase, and inline styles/scripts (Next.js requires this)
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' data: https://fonts.gstatic.com",
              "img-src 'self' data: blob: https:",
              "audio-src 'self' data: blob:",
              "media-src 'self' data: blob:",
              "connect-src 'self' https://*.supabase.co https://*.vercel.app https://api.z.ai",
              "frame-ancestors 'none'",
              "form-action 'self'",
              "base-uri 'self'",
              "object-src 'none'",
              "manifest-src 'self'",
              "worker-src 'self' blob:",
            ].join('; '),
          },
          // Cross-Origin policies
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        // Admin page — extra strict
        source: '/admin.html',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, nosnippet, noarchive' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        ],
      },
    ];
  },
};

export default nextConfig;
