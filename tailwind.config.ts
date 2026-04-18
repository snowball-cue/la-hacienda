import type { Config } from 'tailwindcss'

/**
 * Tailwind CSS v3 Configuration — La Hacienda
 *
 * Design language: "Mercado Moderno" — premium Mexican grocery chain.
 * Warm, artisanal, confident. Inspired by Cardenas, HEB, and Fiesta,
 * with inventory UX reference from Shopify POS / Square / Lightspeed.
 */
const config: Config = {
  darkMode: 'class',

  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],

  theme: {
    extend: {

      /**
       * Brand palette — expanded for tonal depth.
       * All colors chosen to work against cream (#fdf6e3) background
       * AND the warm-charcoal dark mode surface (#16130e).
       */
      colors: {
        // ── Terracotta (primary brand) ─────────────────────────────────
        terracotta: {
          50:  '#fdf4ef',
          100: '#fae3d5',
          200: '#f4c2a3',
          300: '#ec9a6d',
          400: '#e37544',
          DEFAULT: '#c1440e',
          500: '#c1440e',   // main brand
          600: '#9a3308',   // pressed
          700: '#7a2706',
          light:   '#e8612c',
          dark:    '#9a3308',
        },

        // ── Saffron / gold (accent — featured, success highlights) ────
        saffron: {
          50:  '#fdf9e9',
          100: '#faefc4',
          200: '#f4df88',
          300: '#eec94c',
          DEFAULT: '#d4a017',
          400: '#d4a017',
          500: '#b58410',
          600: '#8c630c',
        },

        // ── Moss / forest (success, produce category) ─────────────────
        moss: {
          50:  '#f0f5ee',
          100: '#dae9d5',
          200: '#b0cda6',
          300: '#7eaa71',
          DEFAULT: '#2d5a27',
          400: '#4d7f44',
          500: '#2d5a27',
          600: '#204018',
          light:   '#3d7a35',
        },

        // ── Cream / masa (surfaces, subtle backgrounds) ───────────────
        cream:  '#fdf6e3',
        masa:   '#f7ecd0',   // warmer cream for hero sections
        adobe:  '#efe3c9',   // subtle terracotta-tinted surface
        copper: '#b87333',   // metallic accent for dividers/icons

        // Legacy aliases (keep existing class names working)
        gold: {
          DEFAULT: '#d4a017',
          light:   '#f0c040',
        },
        forest: {
          DEFAULT: '#2d5a27',
          light:   '#3d7a35',
        },
      },

      /**
       * Typography — two-font system.
       * fraunces → display font for hero text, large numbers, marketing moments
       * inter    → body font for data-dense UI, forms, tables
       */
      fontFamily: {
        sans:    ['var(--font-inter)',    'system-ui', 'sans-serif'],
        display: ['var(--font-fraunces)', 'Georgia',   'serif'],
        mono:    ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },

      fontSize: {
        // Tighter tracking defaults for display sizes
        'display-xl': ['4.5rem', { lineHeight: '1.05', letterSpacing: '-0.02em', fontWeight: '600' }],
        'display-lg': ['3.5rem', { lineHeight: '1.08', letterSpacing: '-0.02em', fontWeight: '600' }],
        'display-md': ['2.5rem', { lineHeight: '1.1',  letterSpacing: '-0.015em', fontWeight: '600' }],
        'display-sm': ['2rem',   { lineHeight: '1.15', letterSpacing: '-0.01em',  fontWeight: '600' }],
      },

      borderRadius: {
        '4xl': '2rem',
        '3xl': '1.5rem',
      },

      /**
       * Elevation system — soft, premium shadows layered for depth.
       * Use `shadow-soft` for cards, `shadow-lift` for interactive hover,
       * `shadow-float` for modals/popovers.
       */
      boxShadow: {
        soft:  '0 1px 2px rgba(31, 20, 10, 0.04), 0 1px 8px rgba(31, 20, 10, 0.04)',
        lift:  '0 2px 4px rgba(31, 20, 10, 0.06), 0 8px 24px rgba(31, 20, 10, 0.08)',
        float: '0 4px 12px rgba(31, 20, 10, 0.08), 0 16px 40px rgba(31, 20, 10, 0.12)',
        inset: 'inset 0 1px 2px rgba(31, 20, 10, 0.06)',
        'glow-terracotta': '0 0 0 3px rgba(193, 68, 14, 0.18)',
        'glow-saffron':    '0 0 0 3px rgba(212, 160, 23, 0.20)',
      },

      transitionTimingFunction: {
        'swift': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },

      backgroundImage: {
        // Subtle radial tint for hero surfaces — evokes warm afternoon light
        'masa-glow':   'radial-gradient(circle at 20% 0%, #fbe9c0 0%, #fdf6e3 55%)',
        'adobe-glow':  'radial-gradient(circle at 80% 0%, #f4d8a8 0%, #f7ecd0 60%)',
      },

      keyframes: {
        'fade-in':  { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in':  'fade-in 260ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'slide-up': 'slide-up 340ms cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },

  plugins: [],
}

export default config
