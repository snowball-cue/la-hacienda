'use client'

import { useState, useRef, type ReactNode } from 'react'
import type { ShiftRow } from '@/lib/schedule-types'

interface Props {
  shift:     ShiftRow
  isManager: boolean
  editNode:  ReactNode | null
  children:  ReactNode
}

export default function PIIHoverCard({ shift, isManager, editNode, children }: Props) {
  const [show, setShow] = useState(false)
  const timeout         = useRef<ReturnType<typeof setTimeout> | null>(null)

  const hasPII = isManager && shift.isEmployee && (shift.workerEmail || shift.workerPhone)

  function open() {
    if (timeout.current) clearTimeout(timeout.current)
    setShow(true)
  }
  function close() {
    timeout.current = setTimeout(() => setShow(false), 150)
  }

  return (
    <div
      className="relative"
      onMouseEnter={open}
      onMouseLeave={close}
    >
      {children}

      {/* Edit link below the card */}
      {editNode && (
        <div className="mt-0.5">{editNode}</div>
      )}

      {/* PII popover — only for managers, only for non-auth employees */}
      {show && hasPII && (
        <div
          className="absolute left-full top-0 ml-2 z-50 w-52 rounded-lg border border-stone-200 bg-white shadow-lg p-3 text-xs"
          onMouseEnter={open}
          onMouseLeave={close}
        >
          {/* Lock icon header */}
          <div className="flex items-center gap-1.5 mb-2 pb-2 border-b border-stone-100">
            <svg className="h-3 w-3 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="font-semibold text-stone-700">{shift.workerName}</span>
          </div>

          <div className="space-y-1.5">
            {shift.workerEmail && (
              <div className="flex items-start gap-1.5">
                <svg className="h-3 w-3 text-stone-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <a href={`mailto:${shift.workerEmail}`} className="text-stone-600 hover:text-terracotta break-all">
                  {shift.workerEmail}
                </a>
              </div>
            )}
            {shift.workerPhone && (
              <div className="flex items-center gap-1.5">
                <svg className="h-3 w-3 text-stone-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <a href={`tel:${shift.workerPhone}`} className="text-stone-600 hover:text-terracotta">
                  {shift.workerPhone}
                </a>
              </div>
            )}
          </div>

          <p className="mt-2 pt-2 border-t border-stone-100 text-[10px] text-stone-400">
            Visible to managers only
          </p>
        </div>
      )}
    </div>
  )
}
