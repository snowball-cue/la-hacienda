/**
 * PostCSS Configuration — La Hacienda
 *
 * PostCSS is a CSS transformation tool. Next.js uses it automatically
 * during both development (hot reload) and production builds.
 *
 * Two plugins required for Tailwind CSS v3:
 *
 * 1. tailwindcss
 *    Reads tailwind.config.ts, scans all content paths, and generates
 *    the final utility CSS. In production, unused classes are purged,
 *    keeping the CSS bundle tiny.
 *
 * 2. autoprefixer
 *    Reads the Browserslist config (defaults to modern browsers) and
 *    automatically adds vendor prefixes where needed (-webkit-, -moz-, etc.).
 *    This ensures consistent rendering across Chrome, Safari, and Firefox
 *    without writing vendor prefixes by hand.
 *
 * Do NOT add other PostCSS plugins without explicit approval — they
 * can significantly increase build times.
 */
const config = {
  plugins: {
    tailwindcss: {},   /* Reads tailwind.config.ts */
    autoprefixer: {},  /* Adds vendor prefixes for cross-browser compat */
  },
}

export default config
