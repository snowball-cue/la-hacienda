import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAuthUser, hasMinimumRole } from '@/lib/auth'
import ImportForm from './ImportForm'

export const metadata: Metadata = { title: 'Import Products' }

export default async function ImportPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')
  if (!hasMinimumRole(user.role, 'manager')) redirect('/dashboard/inventory')

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs text-stone-400 mb-2">
          <Link href="/dashboard/inventory" className="hover:text-stone-600">Inventory</Link>
          <span>/</span>
          <span>Import CSV</span>
        </div>
        <h1 className="page-title">Import Products</h1>
        <p className="text-sm text-stone-500 mt-1">
          Bulk-create products from a CSV file. Existing SKUs are skipped.
        </p>
      </div>

      <ImportForm />
    </div>
  )
}
