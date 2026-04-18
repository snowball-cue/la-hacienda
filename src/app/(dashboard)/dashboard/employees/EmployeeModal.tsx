'use client'

import { useState, useActionState } from 'react'
import { createEmployee, updateEmployee, deactivateEmployee, deleteEmployee } from '@/actions/employees'
import type { EmployeeResult, EmployeeRow } from '@/actions/employees'

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10)
  if (digits.length === 0) return ''
  if (digits.length <= 3) return `(${digits}`
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

function PhoneInput({ name, defaultValue, placeholder, className }: {
  name: string; defaultValue?: string | null; placeholder?: string; className?: string
}) {
  const [value, setValue] = useState(() => formatPhone(defaultValue ?? ''))
  return (
    <input
      type="tel"
      name={name}
      value={value}
      onChange={e => setValue(formatPhone(e.target.value))}
      placeholder={placeholder}
      className={className}
    />
  )
}

type CreateAction = (prev: EmployeeResult<EmployeeRow> | null, fd: FormData) => Promise<EmployeeResult<EmployeeRow>>
type UpdateAction = (prev: EmployeeResult<EmployeeRow> | null, fd: FormData) => Promise<EmployeeResult<EmployeeRow>>

interface StoreOption { id: string; name: string }

interface Props {
  editEmployee?:      EmployeeRow
  stores:             StoreOption[]
  nextEmployeeNumber?: string
}

const EXIT_REASONS = ['resigned', 'terminated', 'laid_off', 'retired', 'contract_ended', 'other']
const EXIT_REASON_LABELS: Record<string, string> = {
  resigned: 'Resigned', terminated: 'Terminated', laid_off: 'Laid Off',
  retired: 'Retired', contract_ended: 'Contract Ended', other: 'Other',
}

export default function EmployeeModal({ editEmployee, stores, nextEmployeeNumber }: Props) {
  const [open, setOpen]           = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [showExit, setShowExit]   = useState(!!editEmployee?.exitDate)

  const action = editEmployee
    ? (updateEmployee.bind(null, editEmployee.id) as UpdateAction)
    : (createEmployee as CreateAction)

  const [state, dispatch, isPending] = useActionState<EmployeeResult<EmployeeRow> | null, FormData>(
    action, null,
  )

  function openModal() { setOpen(true); setSubmitted(false) }
  function close() { setOpen(false); setSubmitted(false) }

  if (state?.success && open && submitted) close()

  function handleSubmit(fd: FormData) {
    setSubmitted(true)
    // Normalise boolean checkboxes
    fd.set('rehireEligible', fd.get('rehireEligible_check') === 'on' ? 'true' : 'false')
    fd.set('i9Verified',     fd.get('i9Verified_check')     === 'on' ? 'true' : 'false')
    dispatch(fd)
  }

  if (!open) {
    return editEmployee ? (
      <button onClick={openModal} className="text-xs text-terracotta hover:underline">Edit</button>
    ) : (
      <button onClick={openModal} className="btn-primary text-xs px-3 py-1.5">+ Add Employee</button>
    )
  }

  const e = editEmployee

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={close} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">

          {/* Header */}
          <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between sticky top-0 bg-white z-10">
            <h2 className="text-base font-semibold text-stone-900">
              {e ? 'Edit Employee' : 'Add Employee'}
            </h2>
            <button onClick={close} className="text-stone-400 hover:text-stone-600 text-xl leading-none">×</button>
          </div>

          <form action={handleSubmit} noValidate className="px-6 py-5 space-y-5">

            {/* ── Basic Info ───────────────────────────────────────────── */}
            <section className="space-y-3">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Basic Info</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label">Last Name <span className="text-red-500">*</span></label>
                  <input type="text" name="lastName" required defaultValue={e?.lastName ?? ''} placeholder="Garcia" className="input w-full" />
                </div>
                <div>
                  <label className="label">First Name <span className="text-red-500">*</span></label>
                  <input type="text" name="firstName" required defaultValue={e?.firstName ?? ''} placeholder="Maria" className="input w-full" />
                </div>
                <div>
                  <label className="label">Middle Name</label>
                  <input type="text" name="middleName" defaultValue={e?.middleName ?? ''} placeholder="Elena" className="input w-full" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Position</label>
                  <input type="text" name="position" defaultValue={e?.position ?? ''} placeholder="Cashier" className="input w-full" list="pos-list" />
                  <datalist id="pos-list">
                    {['Cashier', 'Stock Clerk', 'Assistant Manager', 'Manager on Duty', 'Produce Clerk', 'Deli Clerk', 'Bakery', 'General'].map(p => (
                      <option key={p} value={p} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="label">Pay Type</label>
                  <select name="payType" defaultValue={e?.payType ?? 'hourly'} className="input w-full">
                    <option value="hourly">Hourly</option>
                    <option value="salary">Salary</option>
                  </select>
                </div>
              </div>
            </section>

            {/* ── Employment Dates ─────────────────────────────────────── */}
            <section className="space-y-3">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Employment Dates</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Hire Date</label>
                  <input type="date" name="hireDate" defaultValue={e?.hireDate ?? ''} className="input w-full" />
                </div>
                <div>
                  <label className="label flex items-center gap-2">
                    Separation
                    <button
                      type="button"
                      onClick={() => setShowExit(v => !v)}
                      className="text-[10px] text-terracotta hover:underline normal-case tracking-normal"
                    >
                      {showExit ? 'Hide' : 'Set exit info'}
                    </button>
                  </label>
                  {showExit ? (
                    <input type="date" name="exitDate" defaultValue={e?.exitDate ?? ''} className="input w-full" />
                  ) : (
                    <input type="hidden" name="exitDate" value={e?.exitDate ?? ''} />
                  )}
                </div>
              </div>
              {showExit && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Exit Reason</label>
                    <select name="exitReason" defaultValue={e?.exitReason ?? ''} className="input w-full">
                      <option value="">— Select —</option>
                      {EXIT_REASONS.map(r => (
                        <option key={r} value={r}>{EXIT_REASON_LABELS[r]}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end pb-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" name="rehireEligible_check" defaultChecked={e?.rehireEligible ?? true} className="rounded border-stone-300 text-terracotta focus:ring-terracotta" />
                      <span className="text-sm text-stone-700">Eligible for rehire</span>
                    </label>
                  </div>
                </div>
              )}
            </section>

            {/* ── Store Assignment ─────────────────────────────────────── */}
            {stores.length > 0 && (
              <section className="rounded-lg border border-stone-200 bg-stone-50 p-3 space-y-3">
                <p className="text-xs font-medium text-stone-600">Store Assignment</p>
                <div>
                  <label className="label">Primary Store</label>
                  <select name="storeId" defaultValue={e?.storeId ?? ''} className="input w-full">
                    <option value="">— No primary store —</option>
                    {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Also Works At (optional)</label>
                  <div className="space-y-1.5 mt-1">
                    {stores.map(s => (
                      <label key={s.id} className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          name="secondaryStoreIds"
                          value={s.id}
                          defaultChecked={e?.secondaryStoreIds?.includes(s.id) ?? false}
                          className="rounded border-stone-300 text-terracotta focus:ring-terracotta"
                        />
                        <span className="text-sm text-stone-700">{s.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* ── Contact — PII ────────────────────────────────────────── */}
            <section className="rounded-lg border border-amber-100 bg-amber-50 p-3 space-y-3">
              <p className="text-xs font-medium text-amber-700 flex items-center gap-1">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Confidential — visible to managers and owners only
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Email</label>
                  <input type="email" name="email" defaultValue={e?.email ?? ''} placeholder="maria@example.com" className="input w-full" />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <PhoneInput name="phone" defaultValue={e?.phone} placeholder="(512) 555-0100" className="input w-full" />
                </div>
              </div>
              <div>
                <label className="label">Address</label>
                <input type="text" name="address" defaultValue={e?.address ?? ''} placeholder="123 Main St, Austin, TX 78701" className="input w-full" />
              </div>
            </section>

            {/* ── Employee ID ──────────────────────────────────────────── */}
            <section className="space-y-3">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Employee ID</p>
              <div className="max-w-[200px]">
                <label className="label">Employee # <span className="text-red-500">*</span></label>
                <input type="text" name="employeeNumber" defaultValue={e?.employeeNumber ?? nextEmployeeNumber ?? ''} placeholder="EMP-001" className="input w-full" />
              </div>
            </section>

            {/* ── Compliance ───────────────────────────────────────────── */}
            <section className="space-y-3">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Compliance (Texas)</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Food Handler Cert Expiry</label>
                  <input type="date" name="foodHandlerCertExpiry" defaultValue={e?.foodHandlerCertExpiry ?? ''} className="input w-full" />
                </div>
                <div className="space-y-1.5 pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" name="i9Verified_check" defaultChecked={e?.i9Verified ?? false} className="rounded border-stone-300 text-terracotta focus:ring-terracotta" />
                    <span className="text-sm text-stone-700">I-9 Verified</span>
                  </label>
                </div>
                <div>
                  <label className="label">I-9 Verification Date</label>
                  <input type="date" name="i9VerificationDate" defaultValue={e?.i9VerificationDate ?? ''} className="input w-full" />
                </div>
              </div>
            </section>

            {/* ── Notes ───────────────────────────────────────────────── */}
            <section>
              <label className="label">Notes (internal)</label>
              <input type="text" name="notes" defaultValue={e?.notes ?? ''} placeholder="e.g. Part-time weekends only" className="input w-full" />
            </section>


            {state && !state.success && submitted && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">{state.error}</p>
            )}

            <div className="flex items-center justify-between pt-1">
              {e ? (
                <div className="flex items-center gap-3">
                  {e.isActive && <DeactivateButton id={e.id} onDone={close} />}
                  <DeleteButton id={e.id} name={e.fullName} onDone={close} />
                </div>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <button type="button" onClick={close} className="btn-secondary text-sm">Cancel</button>
                <button type="submit" disabled={isPending} className="btn-primary text-sm">
                  {isPending ? 'Saving…' : 'Save Employee'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

function DeleteButton({ id, name, onDone }: { id: string; name: string; onDone: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handle() {
    if (!confirm(`Permanently delete "${name}"?\n\nThis cannot be undone. If they have linked records (shifts, timekeeping, payroll) use Deactivate instead.`)) return
    setPending(true)
    setError(null)
    const result = await deleteEmployee(id)
    setPending(false)
    if (result.success) {
      onDone()
    } else {
      setError(result.error)
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handle}
        disabled={pending}
        className="text-sm text-red-700 hover:text-red-900 font-medium"
      >
        {pending ? 'Deleting…' : 'Delete'}
      </button>
      {error && <p className="text-xs text-red-600 mt-1 max-w-[220px]">{error}</p>}
    </div>
  )
}

function DeactivateButton({ id, onDone }: { id: string; onDone: () => void }) {
  const [showForm, setShowForm] = useState(false)
  const [reason, setReason]     = useState('')

  async function handle() {
    if (!confirm('Deactivate this employee? They will no longer appear in schedule dropdowns.')) return
    await deactivateEmployee(id, reason || undefined)
    onDone()
  }

  if (!showForm) {
    return (
      <button type="button" onClick={() => setShowForm(true)} className="text-sm text-red-600 hover:text-red-800">
        Deactivate
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <select value={reason} onChange={e => setReason(e.target.value)} className="input text-xs py-0.5 px-2">
        <option value="">Exit reason…</option>
        <option value="resigned">Resigned</option>
        <option value="terminated">Terminated</option>
        <option value="laid_off">Laid Off</option>
        <option value="retired">Retired</option>
        <option value="other">Other</option>
      </select>
      <button type="button" onClick={handle} className="text-sm text-red-600 hover:text-red-800 whitespace-nowrap">
        Confirm
      </button>
      <button type="button" onClick={() => setShowForm(false)} className="text-sm text-stone-400 hover:text-stone-600">
        Cancel
      </button>
    </div>
  )
}
