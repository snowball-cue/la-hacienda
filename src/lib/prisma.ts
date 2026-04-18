import { PrismaClient } from '@prisma/client'

/**
 * Prisma Client Singleton — src/lib/prisma.ts
 *
 * ── WHY A SINGLETON? ─────────────────────────────────────────────────────────
 *
 * Each `new PrismaClient()` call opens a connection pool to the database.
 * In PRODUCTION, there is one long-lived Node.js process, so creating one
 * PrismaClient at startup is fine — it holds the pool for the server's lifetime.
 *
 * In DEVELOPMENT, Next.js uses hot module replacement (HMR): every time you
 * save a file, Next.js re-evaluates your modules. Without the singleton pattern,
 * this would create a NEW PrismaClient (and a new connection pool) on every save,
 * quickly exhausting Supabase's connection limit (~15–60 connections on free tier).
 *
 * FIX: Store the PrismaClient on Node's `globalThis` in development.
 * `globalThis` persists across HMR cycles (unlike module-level variables
 * which are re-evaluated on each reload).
 *
 * ── HOW TO USE ───────────────────────────────────────────────────────────────
 *
 *   import { prisma } from '@/lib/prisma'
 *
 *   // In a Server Component or Server Action:
 *   const products = await prisma.product.findMany({ where: { isActive: true } })
 *
 * NEVER import this in a Client Component ("use client") — Prisma runs
 * server-side only and would crash in the browser.
 *
 * ── LOGGING ──────────────────────────────────────────────────────────────────
 *
 * In development: logs all queries, warnings, and errors to the console.
 * In production:  logs only errors (avoids noisy query logs in Vercel).
 *
 * ── CONNECTION URL ────────────────────────────────────────────────────────────
 *
 * Prisma reads DATABASE_URL from .env.local automatically.
 * We use the Transaction Pooler URL (PgBouncer) at runtime to keep
 * connection counts low in the serverless Vercel environment.
 * See .env.example for the exact URL format.
 */

/**
 * Extend the Node.js global type to include our cached PrismaClient.
 * TypeScript needs this declaration so it doesn't complain about
 * `globalThis.prisma` being an unknown property.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * The singleton PrismaClient instance.
 *
 * Uses the nullish coalescing assignment (??) — if globalThis.prisma
 * already exists (HMR re-evaluation in dev), reuse it.
 * Otherwise, create a fresh instance.
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
  })

/**
 * Cache the client on globalThis in non-production environments.
 * In production (Vercel), this block never runs because each
 * serverless invocation is a fresh process — no HMR concern.
 */
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
