import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAuthUser, hasMinimumRole, hasModuleAccess } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import NewPOForm from './NewPOForm'

export const metadata: Metadata = { title: 'New Purchase Order' }

export default async function NewPurchaseOrderPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')
  if (!hasMinimumRole(user.role, 'manager')) redirect('/dashboard')
  if (!hasModuleAccess(user, 'purchase_orders')) redirect('/dashboard')

  const suppliers = await prisma.supplier.findMany({
    orderBy: { name: 'asc' },
    select:  { id: true, name: true },
  })

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-lg">
      <div className="mb-6">
        <Link href="/dashboard/inventory/purchase-orders" className="text-xs text-stone-400 hover:text-terracotta mb-1 inline-block">
          ← Purchase Orders
        </Link>
        <h1 className="page-title">New Purchase Order</h1>
        <p className="text-sm text-stone-500 mt-1">Select a supplier to get started. You&apos;ll add items on the next screen.</p>
      </div>
      <NewPOForm suppliers={suppliers} />
    </div>
  )
}
