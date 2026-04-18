import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import NewPeriodForm from './NewPeriodForm'

export const metadata: Metadata = { title: 'New Pay Period' }

export default async function NewPayrollPeriodPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')
  if (user.role !== 'owner') redirect('/dashboard/payroll')

  // Default to the Monday of the current week for convenience
  const today = new Date()
  const day   = today.getUTCDay()
  const monday = new Date(today)
  monday.setUTCDate(today.getUTCDate() - (day === 0 ? 6 : day - 1))
  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)

  const defaultStart = monday.toISOString().slice(0, 10)
  const defaultEnd   = sunday.toISOString().slice(0, 10)

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-lg">
      <div className="mb-6">
        <h1 className="page-title">New Pay Period</h1>
        <p className="text-sm text-stone-500 mt-1">Create a weekly or bi-weekly period to track and export hours.</p>
      </div>
      <NewPeriodForm defaultStart={defaultStart} defaultEnd={defaultEnd} />
    </div>
  )
}
