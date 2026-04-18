import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getAuthUser, hasMinimumRole } from '@/lib/auth'
import { getProducts } from '@/actions/inventory'
import { prisma } from '@/lib/prisma'
import ReceiveForm from './ReceiveForm'

export const metadata: Metadata = { title: 'Receive Goods' }

export default async function ReceiveGoodsPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>
}) {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const isManager = hasMinimumRole(user.role, 'manager')

  const [result, profile, stores] = await Promise.all([
    getProducts(),
    prisma.profile.findUnique({ where: { id: user.id }, select: { storeId: true } }),
    isManager
      ? prisma.store.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } })
      : [],
  ])
  const products = result.success ? result.data : []

  return (
    <div className="p-6 lg:p-8 max-w-xl">
      <div className="mb-6">
        <h1 className="page-title">Receive Goods</h1>
        <p className="text-sm text-stone-500 mt-1">
          Record incoming stock from a supplier delivery
        </p>
      </div>
      <ReceiveForm
        products={products}
        defaultProductId={params.product}
        stores={stores}
        defaultStoreId={profile?.storeId ?? null}
        isManager={isManager}
      />
    </div>
  )
}
