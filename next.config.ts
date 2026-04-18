import type { NextConfig } from 'next'

/**
 * Next.js Configuration — La Hacienda
 *
 * We keep this minimal; Next.js 15 has sensible defaults.
 * Only override when there is a specific, documented reason.
 *
 * Reference: https://nextjs.org/docs/app/api-reference/config/next-config-js
 */
const nextConfig: NextConfig = {

  /**
   * ── Image Optimization ────────────────────────────────────────────────────
   *
   * next/image optimizes images on-the-fly (resizing, WebP conversion, lazy
   * loading). For security, only domains listed in `remotePatterns` are
   * allowed — this prevents SSRF attacks via the image optimization endpoint.
   *
   * We allow Supabase Storage URLs so that product images uploaded to our
   * Supabase Storage bucket can be displayed via next/image.
   *
   * Pattern: https://<any-subdomain>.supabase.co/storage/v1/object/public/**
   */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  /**
   * ── Reserved for future config ────────────────────────────────────────────
   *
   * Potential additions as the project grows:
   *
   * headers()  → Add security headers (Content-Security-Policy, X-Frame-Options)
   * redirects() → Permanent redirects for SEO (e.g., /tienda → /products)
   *
   * Do NOT add experimental features without explicit approval.
   */
}

export default nextConfig
