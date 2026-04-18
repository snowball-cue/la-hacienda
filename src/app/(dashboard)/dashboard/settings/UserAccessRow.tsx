'use client'

import { useState } from 'react'
import RoleForm from './RoleForm'
import ModuleAccessForm from './ModuleAccessForm'

interface Props {
  userId:         string
  displayName:    string
  role:           string
  isCurrentUser:  boolean
  allowedModules: string[]
}

export default function UserAccessRow({ userId, displayName, role, isCurrentUser, allowedModules }: Props) {
  const [expanded, setExpanded] = useState(false)
  const initial = (displayName ?? 'U').charAt(0).toUpperCase()
  const isManager = role === 'manager'

  return (
    <div>
      {/* ── Main row ──────────────────────────────────────────────────── */}
      <div className="px-5 py-4 flex items-center gap-4">
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center shrink-0">
          <span className="text-xs font-semibold text-stone-500 uppercase">{initial}</span>
        </div>

        {/* Name + role badge */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-stone-900 truncate">{displayName}</p>
          <span className={`badge text-[10px] uppercase tracking-wide ${
            role === 'owner'   ? 'bg-gold/20 text-yellow-800' :
            role === 'manager' ? 'bg-blue-100 text-blue-800'  :
                                 'bg-stone-100 text-stone-600'
          }`}>
            {role}
          </span>
        </div>

        {/* Right side: role form + expand toggle */}
        <div className="flex items-center gap-3 shrink-0">
          <RoleForm userId={userId} currentRole={role} isCurrentUser={isCurrentUser} />

          {isManager && (
            <button
              type="button"
              onClick={() => setExpanded(v => !v)}
              className="flex items-center gap-1 text-xs text-stone-400 hover:text-terracotta transition-colors"
              aria-expanded={expanded}
            >
              Modules
              <svg
                className={`h-3.5 w-3.5 transition-transform duration-150 ${expanded ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ── Module access panel ────────────────────────────────────────── */}
      {isManager && expanded && (
        <div className="px-5 pb-4 pt-0 border-t border-terracotta/10 bg-terracotta/5">
          <p className="text-xs text-stone-400 mt-3 mb-3">
            Check modules to restrict access. Leave all unchecked to grant full access.
          </p>
          <ModuleAccessForm userId={userId} allowedModules={allowedModules} />
        </div>
      )}
    </div>
  )
}
