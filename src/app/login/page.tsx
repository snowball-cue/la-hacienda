import type { Metadata } from 'next'
import Link from 'next/link'
import LoginForm from '@/components/auth/LoginForm'

export const metadata: Metadata = {
  title: 'Staff Login',
  description: 'Sign in to the La Hacienda inventory management system.',
  robots: 'noindex',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>
}) {
  const { redirectTo } = await searchParams

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        {/* ── Brand ─────────────────────────────────────────────────── */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="flex gap-0.5">
              <div className="h-5 w-1.5 rounded-full bg-forest" />
              <div className="h-5 w-1.5 rounded-full bg-stone-200" />
              <div className="h-5 w-1.5 rounded-full bg-terracotta" />
            </div>
            <span className="text-2xl font-bold text-terracotta">La Hacienda</span>
          </div>
          <p className="text-sm text-stone-500">
            Inventory Management · Staff Portal
          </p>
        </div>

        {/* ── Login card ────────────────────────────────────────────── */}
        <div className="card p-8">
          <h1 className="text-xl font-bold text-stone-900 mb-1">Welcome back</h1>
          <p className="text-sm text-stone-500 mb-6">
            Sign in with your staff account to continue.
          </p>

          <LoginForm redirectTo={redirectTo} />
        </div>

        {/* ── Back to public site ───────────────────────────────────── */}
        <p className="mt-6 text-center text-xs text-stone-400">
          <Link href="/" className="hover:text-terracotta transition-colors">
            ← Back to La Hacienda store
          </Link>
        </p>

      </div>
    </div>
  )
}
