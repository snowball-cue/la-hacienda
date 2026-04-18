'use client'

import { useActionState, useState, useEffect } from 'react'
import { updateEmployeeProfile } from '@/actions/settings'
import type { SettingsResult } from '@/actions/settings'

interface Props {
  userId:                   string
  hireDate:                 string | null
  exitDate:                 string | null
  position:                 string | null
  employeeNumber:           string | null
  payType:                  string | null
  phone:                    string | null
  emergencyContactName:     string | null
  emergencyContactPhone:    string | null
  emergencyContactRelation: string | null
  foodHandlerCertExpiry:    string | null
  i9Verified:               boolean
  i9VerificationDate:       string | null
}

export default function EmployeeDateForm(props: Props) {
  const [open, setOpen] = useState(false)

  const action = updateEmployeeProfile.bind(null, props.userId)
  const [state, dispatch, isPending] = useActionState<SettingsResult | null, FormData>(action, null)

  useEffect(() => {
    if (state?.success) setOpen(false)
  }, [state])

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs text-terracotta hover:underline">
        Edit
      </button>
    )
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setOpen(false)} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-lg my-auto">

          <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between sticky top-0 bg-white rounded-t-xl">
            <h2 className="text-sm font-semibold text-stone-900">Edit Employee Profile</h2>
            <button onClick={() => setOpen(false)} className="text-stone-400 hover:text-stone-600 text-xl leading-none">×</button>
          </div>

          <form action={dispatch} className="px-5 py-5 space-y-5">

            {state && !state.success && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{state.error}</p>
            )}

            {/* Employment */}
            <div>
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">Employment</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label text-xs">Employee #</label>
                  <input name="employeeNumber" defaultValue={props.employeeNumber ?? ''} className="input w-full text-sm" placeholder="EMP-001" />
                </div>
                <div>
                  <label className="label text-xs">Pay Type</label>
                  <select name="payType" defaultValue={props.payType ?? ''} className="input w-full text-sm">
                    <option value="">— None —</option>
                    <option value="hourly">Hourly</option>
                    <option value="salary">Salary</option>
                  </select>
                </div>
                <div>
                  <label className="label text-xs">Position / Title</label>
                  <input name="position" defaultValue={props.position ?? ''} className="input w-full text-sm" placeholder="e.g. Cashier" />
                </div>
                <div>
                  <label className="label text-xs">Phone</label>
                  <input name="phone" type="tel" defaultValue={props.phone ?? ''} className="input w-full text-sm" />
                </div>
                <div>
                  <label className="label text-xs">Hire Date</label>
                  <input type="date" name="hireDate" defaultValue={props.hireDate ?? ''} className="input w-full text-sm" />
                </div>
                <div>
                  <label className="label text-xs">Exit Date <span className="text-stone-400 font-normal">(if applicable)</span></label>
                  <input type="date" name="exitDate" defaultValue={props.exitDate ?? ''} className="input w-full text-sm" />
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div>
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">Emergency Contact</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label text-xs">Name</label>
                  <input name="emergencyContactName" defaultValue={props.emergencyContactName ?? ''} className="input w-full text-sm" />
                </div>
                <div>
                  <label className="label text-xs">Relationship</label>
                  <input name="emergencyContactRelation" defaultValue={props.emergencyContactRelation ?? ''} placeholder="e.g. Spouse" className="input w-full text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="label text-xs">Phone</label>
                  <input name="emergencyContactPhone" type="tel" defaultValue={props.emergencyContactPhone ?? ''} className="input w-full text-sm" />
                </div>
              </div>
            </div>

            {/* Compliance */}
            <div>
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">Compliance (TX)</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label text-xs">Food Handler Cert Expiry</label>
                  <input type="date" name="foodHandlerCertExpiry" defaultValue={props.foodHandlerCertExpiry ?? ''} className="input w-full text-sm" />
                </div>
                <div>
                  <label className="label text-xs">I-9 Verification Date</label>
                  <input type="date" name="i9VerificationDate" defaultValue={props.i9VerificationDate ?? ''} className="input w-full text-sm" />
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`i9-${props.userId}`}
                    name="i9Verified"
                    value="true"
                    defaultChecked={props.i9Verified}
                    className="accent-terracotta"
                  />
                  <label htmlFor={`i9-${props.userId}`} className="text-sm text-stone-700 cursor-pointer">
                    I-9 verified (store document ID on file — do not record document numbers here)
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1 border-t border-stone-100">
              <button type="button" onClick={() => setOpen(false)} className="btn-secondary text-sm">Cancel</button>
              <button type="submit" disabled={isPending} className="btn-primary text-sm">
                {isPending ? 'Saving…' : 'Save Changes'}
              </button>
            </div>

          </form>
        </div>
      </div>
    </>
  )
}
