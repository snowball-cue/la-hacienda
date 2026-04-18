'use client'

import Link from 'next/link'
import { useState } from 'react'

const NAV_LINKS = [
  { href: '/',         label: 'Home' },
  { href: '/about',    label: 'About' },
  { href: '/hours',    label: 'Hours' },
  { href: '/products', label: 'Products' },
  { href: '/contact',  label: 'Contact' },
]

export default function NavBar() {
  const [open, setOpen] = useState(false)

  return (
    <header className="bg-white border-b border-stone-200 sticky top-0 z-50">
      <nav className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* ── Logo ──────────────────────────────────────────────────── */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="flex gap-0.5">
              <div className="h-5 w-1.5 rounded-full bg-forest" />
              <div className="h-5 w-1.5 rounded-full bg-stone-200" />
              <div className="h-5 w-1.5 rounded-full bg-terracotta" />
            </div>
            <span className="text-xl font-bold text-terracotta tracking-tight">
              La Hacienda
            </span>
          </Link>

          {/* ── Desktop nav ───────────────────────────────────────────── */}
          <div className="hidden md:flex items-center gap-7">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-sm font-medium text-stone-600 hover:text-terracotta transition-colors"
              >
                {label}
              </Link>
            ))}
            <Link href="/login" className="btn-primary">
              Staff Login
            </Link>
          </div>

          {/* ── Mobile hamburger ──────────────────────────────────────── */}
          <button
            onClick={() => setOpen(!open)}
            className="md:hidden p-2 rounded-md text-stone-500 hover:text-terracotta hover:bg-stone-100 transition-colors"
            aria-expanded={open}
            aria-label="Toggle navigation menu"
          >
            {open ? (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* ── Mobile menu ───────────────────────────────────────────────── */}
        {open && (
          <div className="md:hidden border-t border-stone-100 py-3 space-y-0.5">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="block px-3 py-2.5 text-sm font-medium text-stone-700 hover:text-terracotta hover:bg-stone-50 rounded-md transition-colors"
              >
                {label}
              </Link>
            ))}
            <div className="pt-2 border-t border-stone-100">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="block px-3 py-2 text-sm font-medium text-terracotta"
              >
                Staff Login →
              </Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}
