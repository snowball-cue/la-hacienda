import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getAuthUser, hasMinimumRole } from '@/lib/auth'
import { getCategories, getSuppliers } from '@/actions/inventory'
import ProductForm from '../ProductForm'

export const metadata: Metadata = { title: 'Add Product' }

export default async function NewProductPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')
  if (!hasMinimumRole(user.role, 'manager')) redirect('/dashboard/inventory')

  const [categories, suppliers] = await Promise.all([getCategories(), getSuppliers()])

  return (
    <div className="p-6 lg:p-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="page-title">Add Product</h1>
        <p className="text-sm text-stone-500 mt-1">Add a new SKU to the inventory catalog</p>
      </div>
      <ProductForm categories={categories} suppliers={suppliers} />
    </div>
  )
}
