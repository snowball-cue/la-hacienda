import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getAuthUser, hasMinimumRole, hasModuleAccess } from '@/lib/auth'
import { getSuppliers } from '@/actions/suppliers'
import SupplierManager from './SupplierManager'

export const metadata: Metadata = { title: 'Suppliers' }

export default async function SuppliersPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')
  if (!hasMinimumRole(user.role, 'manager')) redirect('/dashboard')
  if (!hasModuleAccess(user, 'suppliers')) redirect('/dashboard')

  const result = await getSuppliers()
  const suppliers = result.success ? result.data : []

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="page-title">Suppliers</h1>
        <p className="text-sm text-stone-500 mt-1">
          Manage vendor and distributor contacts
        </p>
      </div>
      <SupplierManager initialSuppliers={suppliers} />
    </div>
  )
}
