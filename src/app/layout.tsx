import type { Metadata } from 'next'
import { Inter, Fraunces } from 'next/font/google'
import './globals.css'

/**
 * Root Layout — src/app/layout.tsx
 *
 * This is the TOP-LEVEL layout that wraps every single page in the application,
 * both public (/) and protected (/dashboard/**).
 *
 * What belongs here:
 *  ✓ Global font loading
 *  ✓ <html> and <body> structure
 *  ✓ Root-level metadata
 *  ✓ Any truly global providers (e.g., a future toast notification system)
 *
 * What does NOT belong here:
 *  ✗ Navigation bars (public nav vs dashboard nav are different — add to
 *    their respective route group layouts: app/(public)/layout.tsx
 *    and app/(dashboard)/layout.tsx, created in Phase 3 and Phase 4)
 *  ✗ Auth checks (handled by middleware.ts and server-side role resolution)
 *  ✗ Page-specific content
 *
 * Route groups used in this project:
 *  (public)/   — public marketing pages (no auth required) — Phase 3
 *  (dashboard)/ — protected staff/owner pages — Phase 4
 *
 * The parentheses in route group names are a Next.js convention — they
 * group routes for layout purposes WITHOUT affecting the URL path.
 */

/**
 * Inter font — loaded via next/font for zero-layout-shift optimization.
 *
 * next/font downloads the font at BUILD TIME (not from Google's CDN at
 * runtime), so users never experience a flash of unstyled text (FOUT)
 * and there are no third-party network requests for fonts.
 *
 * The CSS variable `--font-inter` is set on the <html> element and
 * referenced in tailwind.config.ts → theme.fontFamily.sans.
 */
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',          // Shows a fallback font until Inter loads
  variable: '--font-inter', // Injects as CSS custom property on <html>
})

// Fraunces — warm, slightly-quirky display serif used for hero headings,
// large numbers on dashboard cards, and marketing-style surfaces.
// Matches the artisanal feel of a Mexican grocery while staying refined.
const fraunces = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-fraunces',
  axes:    ['SOFT', 'opsz'],
})

/**
 * Site-wide metadata — used by Next.js to populate <head> tags.
 *
 * Individual pages and nested layouts can OVERRIDE these by exporting
 * their own `metadata` object. The `template` in `title` automatically
 * formats page titles as "Page Name | La Hacienda".
 *
 * Example override in a page:
 *   export const metadata: Metadata = { title: 'Inventory' }
 *   → renders as: "Inventory | La Hacienda"
 */
export const metadata: Metadata = {
  title: {
    default: 'La Hacienda',          // Used when no page title is set
    template: '%s | La Hacienda',    // %s is replaced by the page's title
  },
  description: 'La Hacienda Mexican Grocery — Austin, Texas. Fresh produce, tortillas, dairy, and authentic Mexican products.',
  keywords: ['Mexican grocery', 'Austin Texas', 'tortillas', 'produce', 'queso', 'La Hacienda'],
  // Phase 3: Add openGraph and twitter metadata for social sharing
}

/**
 * Root layout component.
 *
 * `children` receives whatever page or nested layout Next.js is rendering
 * for the current URL. This component never needs to be a Client Component —
 * it has no interactivity or browser-only APIs.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    /*
     * lang="en" — declares the primary language for screen readers and SEO.
     * className={inter.variable} — sets the --font-inter CSS variable so
     *   tailwind's `font-sans` class resolves to Inter.
     */
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`} suppressHydrationWarning>
      <head>
        {/* Preconnect shaves ~100-200ms off the first Supabase request by
            starting the DNS lookup and TLS handshake in parallel with
            HTML parsing, rather than serially when the first fetch fires. */}
        {process.env.NEXT_PUBLIC_SUPABASE_URL && (
          <>
            <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL} crossOrigin="" />
            <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_SUPABASE_URL} />
          </>
        )}
      </head>
      <body
        className="min-h-screen bg-stone-50 text-stone-900 antialiased"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  )
}
