import type { Config } from 'tailwindcss'

/**
 * Tailwind CSS v3 Configuration — La Hacienda
 *
 * This file controls:
 * 1. CONTENT PATHS — which files Tailwind scans for class names.
 *    Any file using Tailwind classes MUST be included here, or those
 *    classes will be purged from the production CSS bundle.
 *
 * 2. THEME EXTENSIONS — custom design tokens on top of Tailwind defaults.
 *    We extend (not replace) the default theme, so all standard Tailwind
 *    colors, spacing, etc. remain available.
 *
 * 3. PLUGINS — approved Tailwind plugins only (see CLAUDE.md).
 *
 * Brand palette (from PROJECT-PLAN.md design notes):
 *   Warm Mexican colors: terracotta, cream, forest green, gold.
 */
const config: Config = {

  /* ── Dark Mode ──────────────────────────────────────────────────────────── */
  // 'class' strategy — toggled by adding/removing 'dark' class on <html>.
  // ThemeProvider.tsx handles persistence via localStorage.
  darkMode: 'class',

  /* ── Content Paths ──────────────────────────────────────────────────────── */
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',      /* Legacy pages dir — included for safety */
    './src/components/**/*.{js,ts,jsx,tsx,mdx}', /* All UI and domain components */
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',        /* All App Router pages and layouts */
  ],

  /* ── Theme Extensions ───────────────────────────────────────────────────── */
  theme: {
    extend: {

      /**
       * Brand color palette.
       * Usage: className="bg-terracotta text-cream border-forest"
       *
       * These map to the CSS custom properties defined in globals.css and
       * reflect the warm Mexican aesthetic described in PROJECT-PLAN.md.
       */
      colors: {
        terracotta: {
          DEFAULT: '#c1440e',   /* Main brand red-orange */
          light:   '#e8612c',   /* Hover state */
          dark:    '#9a3308',   /* Active / pressed state */
        },
        cream:   '#fdf6e3',     /* Page background, cards */
        forest: {
          DEFAULT: '#2d5a27',   /* Primary green — categories, badges */
          light:   '#3d7a35',   /* Hover state */
        },
        gold: {
          DEFAULT: '#d4a017',   /* Accent — featured products, highlights */
          light:   '#f0c040',   /* Hover / lighter accent */
        },

      },

      /**
       * Font family.
       * Inter is loaded via next/font/google in src/app/layout.tsx
       * and injected as the CSS variable --font-inter on <html>.
       */
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },

      /**
       * Custom border radius for cards and modals.
       * "xl" from Tailwind defaults is 0.75rem — we add an extra "2xl" for
       * the dashboard card panels to give them a slightly softer look.
       */
      borderRadius: {
        '3xl': '1.5rem',
      },
    },
  },

  /* ── Plugins ────────────────────────────────────────────────────────────── */
  plugins: [
    /*
     * No plugins included yet to keep dependencies minimal (per CLAUDE.md).
     *
     * When approved, add:
     *   require('@tailwindcss/forms')   — normalizes form element styles
     *   require('@tailwindcss/typography') — prose styles for product descriptions
     */
  ],
}

export default config
