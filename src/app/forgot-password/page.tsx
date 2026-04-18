import type { Metadata } from 'next'
import Link from 'next/link'
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm'

export const metadata: Metadata = {
  title: 'Reset your password',
  description: 'Request a password reset link for your La Hacienda account.',
  robots: 'noindex',
}

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-masa-glow flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-slide-up">

        {/* Brand */}
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
        </div>

        <div className="card p-8 md:p-10">
          <div className="mb-7">
            <h1 className="text-2xl font-display font-semibold text-stone-900 tracking-tight">
              Forgot your password?
            </h1>
            <p className="text-sm text-stone-500 mt-1">
              Enter your email and we&apos;ll send you a reset link.
            </p>
          </div>

          <ForgotPasswordForm />

          <div className="mt-6 pt-6 border-t border-stone-100 text-center">
            <Link href="/login" className="text-sm font-semibold text-terracotta hover:text-terracotta-dark">
              ← Back to sign in
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}
