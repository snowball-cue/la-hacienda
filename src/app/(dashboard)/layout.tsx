import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getSelectedStoreIds } from '@/lib/store-filter'
import Sidebar from '@/components/dashboard/Sidebar'
import StoreFilter from '@/components/dashboard/StoreFilter'
import { LangProvider } from '@/lib/lang-context'

// Runs synchronously before React hydrates — applies saved theme class to <html>
// so there is never a flash of the wrong theme on load.
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('lh-theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme:dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();`

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getAuthUser()
  if (!user) {
    // Check if they have a Supabase session but no profile row.
    // If so, send them to /setup (creates profile) rather than /login (loop).
    const supabase = await createClient()
    const { data: { user: supabaseUser } } = await supabase.auth.getUser()
    redirect(supabaseUser ? '/setup' : '/login')
  }

  const [stores, selectedStoreIds] = await Promise.all([
    prisma.store.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    getSelectedStoreIds(),
  ])

  return (
    <LangProvider>
      {/* Blocking script — must run before any paint to avoid theme flash */}
      <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />

      <div className="flex flex-col lg:flex-row min-h-screen bg-stone-50 dark:bg-stone-950">
        <Sidebar user={user} />
        <div className="flex-1 flex flex-col min-w-0 w-full">
          {stores.length > 1 && (
            <div className="flex items-center gap-3 px-4 sm:px-6 py-2 border-b border-stone-200 dark:border-white/10 bg-white dark:bg-stone-900">
              <span className="text-xs text-stone-500 font-semibold uppercase tracking-wide shrink-0">Store</span>
              <StoreFilter stores={stores} selected={selectedStoreIds} />
            </div>
          )}
          {children}
        </div>
      </div>
    </LangProvider>
  )
}
