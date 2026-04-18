'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { signOut } from '@/actions/auth'
import type { UserRole } from '@/lib/auth'
import { useLang } from '@/lib/lang-context'
import { labels } from '@/lib/labels'
import ThemeToggle from './ThemeToggle'

interface SidebarProps {
  user: {
    fullName:       string | null
    email:          string
    role:           UserRole
    allowedModules: string[]
  }
}

type NavItem = {
  href:       string
  labelKey:   keyof typeof labels.nav
  exact:      boolean
  icon:       React.ReactNode
  minRole:    UserRole
  exclude?:   string
  moduleKey?: string
}

const NAV_ITEMS: NavItem[] = [
  {
    href:     '/dashboard',
    labelKey: 'dashboard',
    exact:    true,
    minRole:  'staff',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href:      '/dashboard/inventory',
    labelKey:  'inventory',
    exact:     false,
    exclude:   '/dashboard/inventory/purchase-orders',
    minRole:   'staff',
    moduleKey: 'inventory',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    href:      '/dashboard/inventory/purchase-orders',
    labelKey:  'purchaseOrders',
    exact:     false,
    minRole:   'manager',
    moduleKey: 'purchase_orders',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M3 20l1.5-4.5M21 20l-1.5-4.5M7.5 15.5h9" />
      </svg>
    ),
  },
  {
    href:      '/dashboard/analytics',
    labelKey:  'analytics',
    exact:     false,
    minRole:   'manager',
    moduleKey: 'analytics',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
      </svg>
    ),
  },
  {
    href:      '/dashboard/reports',
    labelKey:  'reports',
    exact:     false,
    minRole:   'manager',
    moduleKey: 'reports',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    href:      '/dashboard/schedule',
    labelKey:  'schedule',
    exact:     false,
    minRole:   'staff',
    moduleKey: 'schedule',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    href:      '/dashboard/timekeeping',
    labelKey:  'timekeeping',
    exact:     false,
    minRole:   'manager',
    moduleKey: 'timekeeping',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    href:      '/dashboard/employees',
    labelKey:  'employees',
    exact:     false,
    minRole:   'manager',
    moduleKey: 'employees',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    href:      '/dashboard/payroll',
    labelKey:  'payroll',
    exact:     false,
    minRole:   'manager',
    moduleKey: 'payroll',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    href:      '/dashboard/tasks',
    labelKey:  'tasks',
    exact:     false,
    minRole:   'manager',
    moduleKey: 'tasks',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    href:      '/dashboard/suppliers',
    labelKey:  'suppliers',
    exact:     false,
    minRole:   'manager',
    moduleKey: 'suppliers',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2M8 4a2 2 0 012-2h4a2 2 0 012 2M8 4h8M9 14l2 2 4-4" />
      </svg>
    ),
  },
  {
    href:     '/dashboard/test-log',
    labelKey: 'testLog',
    exact:    false,
    minRole:  'manager',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
  {
    href:     '/dashboard/notifications',
    labelKey: 'notifications',
    exact:    false,
    minRole:  'manager',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  },
  {
    href:     '/dashboard/settings',
    labelKey: 'settings',
    exact:    false,
    minRole:  'owner',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
]

const ROLE_RANK: Record<UserRole, number> = { owner: 3, manager: 2, staff: 1 }

function isVisible(item: NavItem, userRole: UserRole, allowedModules: string[]): boolean {
  if (ROLE_RANK[userRole] < ROLE_RANK[item.minRole]) return false
  if (!item.moduleKey) return true
  if (userRole === 'owner') return true
  if (userRole === 'staff') return true
  if (allowedModules.length === 0) return true
  return allowedModules.includes(item.moduleKey)
}

const ROLE_BADGE: Record<UserRole, string> = {
  owner:   'bg-gold/20 text-yellow-800 dark:bg-gold/10 dark:text-gold-light',
  manager: 'bg-forest/10 text-forest dark:bg-forest/20 dark:text-forest-light',
  staff:   'bg-stone-100 text-stone-600 dark:bg-white/5 dark:text-stone-400',
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { lang, toggle: toggleLang } = useLang()

  function t(label: { en: string; es: string }) {
    return lang === 'es' ? label.es : label.en
  }

  function isActive(item: NavItem) {
    if (item.exact) return pathname === item.href
    if (item.exclude && pathname.startsWith(item.exclude)) return false
    return pathname.startsWith(item.href)
  }

  const visibleNav = NAV_ITEMS.filter(item => isVisible(item, user.role, user.allowedModules))

  const navContent = (
    <div className="flex flex-col h-full">
      {/* ── Logo ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 px-4 h-16 border-b border-stone-200 dark:border-white/10 shrink-0">
        <div className="flex gap-0.5">
          <div className="h-4 w-1 rounded-full bg-forest" />
          <div className="h-4 w-1 rounded-full bg-stone-300 dark:bg-stone-600" />
          <div className="h-4 w-1 rounded-full bg-terracotta" />
        </div>
        <div>
          <p className="text-sm font-bold text-terracotta leading-tight">La Hacienda</p>
          <p className="text-[10px] text-stone-400 dark:text-stone-500 leading-tight">Inventory System</p>
        </div>
      </div>

      {/* ── Navigation ──────────────────────────────────────────────── */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {visibleNav.map((item) => {
          const { href, labelKey, icon } = item
          const active = isActive(item)
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-terracotta text-white'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-white/5 dark:hover:text-stone-100'
              }`}
            >
              <span className={active ? 'text-white' : 'text-stone-400'}>{icon}</span>
              {t(labels.nav[labelKey])}
            </Link>
          )
        })}
      </nav>

      {/* ── User footer ─────────────────────────────────────────────── */}
      <div className="border-t border-stone-200 dark:border-white/10 px-4 py-4 shrink-0 space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-terracotta/10 flex items-center justify-center shrink-0">
            <span className="text-sm font-semibold text-terracotta">
              {(user.fullName ?? user.email).charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">
              {user.fullName ?? 'Staff Member'}
            </p>
            <p className="text-xs text-stone-400 dark:text-stone-500 truncate">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className={`badge text-[10px] uppercase tracking-wide ${ROLE_BADGE[user.role]}`}>
            {user.role}
          </span>
          <form action={signOut}>
            <button
              type="submit"
              className="text-xs text-stone-400 dark:text-stone-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            >
              {t(labels.nav.signOut)}
            </button>
          </form>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {/* Language toggle */}
          <button
            onClick={toggleLang}
            title={lang === 'en' ? 'Cambiar a Español' : 'Switch to English'}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-semibold border border-stone-200 dark:border-white/10 text-stone-500 dark:text-stone-400 hover:border-terracotta hover:text-terracotta dark:hover:text-terracotta transition-colors"
          >
            <span className={`fi fi-${lang === 'en' ? 'us' : 'mx'} rounded-sm`} style={{ fontSize: '14px' }} />
            <span>{lang === 'en' ? 'EN' : 'ES'}</span>
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* ── Desktop sidebar ───────────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-56 shrink-0 bg-white dark:bg-stone-900 border-r border-stone-200 dark:border-white/10 h-screen sticky top-0">
        {navContent}
      </aside>

      {/* ── Mobile: top bar + drawer ──────────────────────────────────── */}
      <div className="lg:hidden">
        {/* Mobile top bar */}
        <div className="flex items-center justify-between h-14 px-4 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-white/10">
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5">
              <div className="h-3.5 w-1 rounded-full bg-forest" />
              <div className="h-3.5 w-1 rounded-full bg-stone-300 dark:bg-stone-600" />
              <div className="h-3.5 w-1 rounded-full bg-terracotta" />
            </div>
            <span className="text-sm font-bold text-terracotta">La Hacienda</span>
          </div>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-md text-stone-500 dark:text-stone-400 hover:text-terracotta hover:bg-stone-100 dark:hover:bg-white/5"
            aria-label="Toggle navigation"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {mobileOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              }
            </svg>
          </button>
        </div>

        {/* Drawer overlay */}
        {mobileOpen && (
          <>
            <div
              className="fixed inset-0 z-30 bg-black/30"
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />
            <aside className="fixed top-0 left-0 z-40 w-64 h-full bg-white dark:bg-stone-900 border-r border-stone-200 dark:border-white/10 shadow-xl">
              {navContent}
            </aside>
          </>
        )}
      </div>
    </>
  )
}
