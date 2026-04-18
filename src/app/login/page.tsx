import type { Metadata } from 'next'
import Link from 'next/link'
import LoginForm from '@/components/auth/LoginForm'

export const metadata: Metadata = {
  title: 'Staff Login',
  description: 'Sign in to La Hacienda.',
  robots: 'noindex',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string; reset?: string }>
}) {
  const { redirectTo, reset } = await searchParams
  const resetSuccess = reset === 'success'

  return (
    <div className="min-h-screen bg-masa-glow flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-slide-up">

        {/* ── Brand ─────────────────────────────────────────────────── */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2.5 mb-4">
            <div className="flex gap-0.5">
              <div className="h-6 w-1.5 rounded-full bg-moss" />
              <div className="h-6 w-1.5 rounded-full bg-stone-200" />
              <div className="h-6 w-1.5 rounded-full bg-terracotta" />
            </div>
            <span className="text-3xl font-display font-semibold text-terracotta tracking-tight">
              La Hacienda
            </span>
          </div>
          <p className="text-sm text-stone-500 tracking-wide">
            Inventory Management · Staff Portal
          </p>
        </div>

        {/* ── Login card ────────────────────────────────────────────── */}
        <div className="card p-8 md:p-10">
          <div className="mb-7">
            <h1 className="text-2xl font-display font-semibold text-stone-900 tracking-tight">
              Bienvenido
            </h1>
            <p className="text-sm text-stone-500 mt-1">
              Sign in with your staff account to continue.
            </p>
          </div>

          <LoginForm redirectTo={redirectTo} resetSuccess={resetSuccess} />
        </div>

        {/* ── Footer ────────────────────────────────────────────────── */}
        <div className="mt-8 text-center">
          <Link href="/" className="text-xs text-stone-400 hover:text-terracotta transition-colors">
            ← Back to La Hacienda store
          </Link>
        </div>

      </div>
    </div>
  )
}
