import type { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import { getAuthUser, hasMinimumRole } from '@/lib/auth'
import { getProduct, getCategories, getSuppliers, getStores } from '@/actions/inventory'
import ProductForm from '../../ProductForm'

export const metadata: Metadata = { title: 'Edit Product' }

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getAuthUser()
  if (!user) redirect('/login')
  if (!hasMinimumRole(user.role, 'manager')) redirect('/dashboard/inventory')

  const { id } = await params
  const [result, categories, suppliers, stores] = await Promise.all([
    getProduct(id),
    getCategories(),
    getSuppliers(),
    getStores(),
  ])

  if (!result.success) notFound()

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="page-title">Edit Product</h1>
        <p className="text-sm text-stone-500 mt-1">
          <span className="font-mono">{result.data.sku}</span> · {result.data.name}
        </p>
      </div>
      <ProductForm
        categories={categories}
        suppliers={suppliers}
        stores={stores}
        product={result.data}
      />
    </div>
  )
}
