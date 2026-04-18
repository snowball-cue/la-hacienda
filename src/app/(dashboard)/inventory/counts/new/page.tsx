import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getAuthUser, hasMinimumRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import StartCountForm from './StartCountForm'

export const metadata: Metadata = { title: 'New Inventory Count' }

export default async function NewInventoryCountPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')
  if (!hasMinimumRole(user.role, 'manager')) redirect('/dashboard/inventory')

  let stores: { id: string; name: string }[] = []
  try {
    stores = await prisma.store.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } })
  } catch { /* DB not connected */ }

  return (
    <div className="p-6 lg:p-8 max-w-xl">
      <div className="mb-6">
        <h1 className="page-title">New Inventory Count</h1>
        <p className="text-sm text-stone-500 mt-1">
          Start a physical stocktake. A count sheet will be created for all active products.
        </p>
      </div>
      <StartCountForm stores={stores} />
    </div>
  )
}
