'use client'

import { useState, useCallback, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateTaskStatus } from '@/actions/tasks'
import { NewTaskModal, TaskDetailModal } from './TaskModal'
import type { TaskRow, CommentRow, TaskStatus, TaskPriority } from '@/lib/task-types'

// ── Column config ─────────────────────────────────────────────────────────────

const COLUMNS: { status: TaskStatus; label: string; labelEs: string }[] = [
  { status: 'backlog',     label: 'Backlog',     labelEs: 'Pendiente'   },
  { status: 'in_progress', label: 'In Progress', labelEs: 'En progreso' },
  { status: 'review',      label: 'Review',      labelEs: 'Revisión'    },
  { status: 'done',        label: 'Done',        labelEs: 'Hecho'       },
]

const PRIORITY_BADGE: Record<TaskPriority, string> = {
  high:   'badge-high',
  medium: 'badge-medium',
  low:    'badge-low',
}

const COLUMN_ACCENT: Record<TaskStatus, string> = {
  backlog:     'border-stone-300',
  in_progress: 'border-blue-400',
  review:      'border-amber-400',
  done:        'border-emerald-400',
}

const COLUMN_HEADER: Record<TaskStatus, string> = {
  backlog:     'text-stone-600',
  in_progress: 'text-blue-700',
  review:      'text-amber-700',
  done:        'text-emerald-700',
}

// ── Modal state types ─────────────────────────────────────────────────────────

type ModalState =
  | { kind: 'none' }
  | { kind: 'new';    defaultStatus: TaskStatus }
  | { kind: 'detail'; task: TaskRow; comments: CommentRow[] }

// ── Helpers ───────────────────────────────────────────────────────────────────

function isOverdue(dueDate: string | null, status: TaskStatus) {
  if (!dueDate || status === 'done') return false
  return new Date(dueDate + 'T00:00:00') < new Date()
}

function formatDue(dueDate: string | null, status: TaskStatus) {
  if (!dueDate) return null
  const date  = new Date(dueDate + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff  = Math.round((date.getTime() - today.getTime()) / 86_400_000)

  if (status === 'done') return null
  if (diff < 0)  return { label: `${Math.abs(diff)}d overdue`, urgent: true }
  if (diff === 0) return { label: 'Due today',   urgent: true }
  if (diff <= 3)  return { label: `Due in ${diff}d`, urgent: true }
  return {
    label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    urgent: false,
  }
}

// ── TaskCard ──────────────────────────────────────────────────────────────────

function TaskCard({
  task,
  onOpen,
  onStatusChange,
}: {
  task:           TaskRow
  onOpen:         (task: TaskRow) => void
  onStatusChange: (id: string, status: TaskStatus) => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const due = formatDue(task.dueDate, task.status)

  async function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    e.stopPropagation()
    setBusy(true)
    await onStatusChange(task.id, e.target.value as TaskStatus)
    setBusy(false)
  }

  return (
    <div
      className="card p-3.5 cursor-pointer hover:border-terracotta/40 hover:shadow-sm transition-all group"
      onClick={() => onOpen(task)}
    >
      {/* Priority + title */}
      <div className="flex items-start gap-2 mb-2.5">
        <span className={`badge ${PRIORITY_BADGE[task.priority]} mt-0.5 shrink-0`}>
          {task.priority}
        </span>
        <p className="text-sm font-medium text-stone-800 leading-snug group-hover:text-terracotta transition-colors line-clamp-2">
          {task.title}
        </p>
      </div>

      {/* Footer row */}
      <div
        className="flex items-center justify-between gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {task.assignee && (
            <span className="badge badge-neutral text-[10px] truncate max-w-[80px]">
              {task.assignee}
            </span>
          )}
          {due && (
            <span className={`badge ${due.urgent ? 'badge-high' : 'badge-neutral'} text-[10px]`}>
              {due.label}
            </span>
          )}
        </div>

        {/* Status quick-change */}
        <select
          value={task.status}
          disabled={busy}
          onChange={handleStatusChange}
          className="text-[10px] border border-stone-200 rounded px-1.5 py-0.5 bg-white text-stone-500
                     focus:outline-none focus:ring-1 focus:ring-terracotta shrink-0"
          title="Change status"
        >
          <option value="backlog">Backlog</option>
          <option value="in_progress">In Progress</option>
          <option value="review">Review</option>
          <option value="done">Done</option>
        </select>
      </div>
    </div>
  )
}

// ── KanbanColumn ──────────────────────────────────────────────────────────────

function KanbanColumn({
  status,
  label,
  labelEs,
  tasks,
  onNewTask,
  onOpenTask,
  onStatusChange,
}: {
  status:         TaskStatus
  label:          string
  labelEs:        string
  tasks:          TaskRow[]
  onNewTask:      (status: TaskStatus) => void
  onOpenTask:     (task: TaskRow) => void
  onStatusChange: (id: string, status: TaskStatus) => Promise<void>
}) {
  return (
    <div className={`flex flex-col rounded-xl border-t-2 ${COLUMN_ACCENT[status]} bg-stone-50 min-w-[220px] w-full`}>
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-stone-200">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold uppercase tracking-wider ${COLUMN_HEADER[status]}`}>
            {label}
          </span>
          <span className="text-xs text-stone-400 italic hidden sm:inline">{labelEs}</span>
          <span className="h-4 min-w-4 px-1 rounded-full bg-stone-200 text-[10px] text-stone-600 font-semibold flex items-center justify-center">
            {tasks.length}
          </span>
        </div>
        <button
          onClick={() => onNewTask(status)}
          title={`Add task to ${label}`}
          className="text-stone-400 hover:text-terracotta transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Cards */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto">
        {tasks.length === 0 ? (
          <p className="text-xs text-stone-400 text-center py-6 italic">No tasks</p>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onOpen={onOpenTask}
              onStatusChange={onStatusChange}
            />
          ))
        )}
      </div>
    </div>
  )
}

// ── FilterBar ─────────────────────────────────────────────────────────────────

function FilterBar({
  filters,
  onFilter,
}: {
  filters:  { priority: string; assignee: string }
  onFilter: (key: string, val: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <select
        value={filters.priority}
        onChange={(e) => onFilter('priority', e.target.value)}
        className="text-sm border border-stone-300 rounded-md px-3 py-1.5 bg-white text-stone-700 focus:outline-none focus:ring-2 focus:ring-terracotta"
      >
        <option value="">All priorities</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>

      <input
        type="search"
        value={filters.assignee}
        onChange={(e) => onFilter('assignee', e.target.value)}
        placeholder="Filter by assignee…"
        className="text-sm border border-stone-300 rounded-md px-3 py-1.5 bg-white text-stone-700 focus:outline-none focus:ring-2 focus:ring-terracotta min-w-36"
      />

      {(filters.priority || filters.assignee) && (
        <button
          onClick={() => { onFilter('priority', ''); onFilter('assignee', '') }}
          className="text-xs text-stone-400 hover:text-terracotta transition-colors"
        >
          Clear filters
        </button>
      )}
    </div>
  )
}

// ── TaskBoard (main export) ───────────────────────────────────────────────────

interface TaskBoardProps {
  initialTasks: TaskRow[]
}

export default function TaskBoard({ initialTasks }: TaskBoardProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [modal, setModal]   = useState<ModalState>({ kind: 'none' })
  const [filters, setFilters] = useState({ priority: '', assignee: '' })

  // Filter tasks client-side (simple, avoids round-trips for basic filtering)
  const filtered = initialTasks.filter((t) => {
    if (filters.priority && t.priority !== filters.priority) return false
    if (filters.assignee && !(t.assignee ?? '').toLowerCase().includes(filters.assignee.toLowerCase())) return false
    return true
  })

  const byStatus = (status: TaskStatus) => filtered.filter((t) => t.status === status)

  // Opens the detail modal; fetches comments lazily
  function openTask(task: TaskRow) {
    // Show modal immediately with empty comments, then fetch lazily in a full
    // page re-navigation (or via a server action call).
    // For now we open the modal with whatever data we have.
    setModal({ kind: 'detail', task, comments: [] })
  }

  const handleStatusChange = useCallback(async (id: string, status: TaskStatus) => {
    const result = await updateTaskStatus(id, status)
    if (result.success) {
      startTransition(() => router.refresh())
    }
  }, [router])

  function handleFilter(key: string, val: string) {
    setFilters((prev) => ({ ...prev, [key]: val }))
  }

  return (
    <>
      {/* ── Toolbar ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <FilterBar filters={filters} onFilter={handleFilter} />
        <button
          onClick={() => setModal({ kind: 'new', defaultStatus: 'backlog' })}
          className="btn-primary shrink-0"
        >
          + New Task
        </button>
      </div>

      {/* ── Kanban board ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
        {COLUMNS.map(({ status, label, labelEs }) => (
          <KanbanColumn
            key={status}
            status={status}
            label={label}
            labelEs={labelEs}
            tasks={byStatus(status)}
            onNewTask={(s) => setModal({ kind: 'new', defaultStatus: s })}
            onOpenTask={openTask}
            onStatusChange={handleStatusChange}
          />
        ))}
      </div>

      {/* ── Modals ───────────────────────────────────────────────────── */}
      {modal.kind === 'new' && (
        <NewTaskModal
          defaultStatus={modal.defaultStatus}
          onClose={() => {
            setModal({ kind: 'none' })
            startTransition(() => router.refresh())
          }}
        />
      )}

      {modal.kind === 'detail' && (
        <TaskDetailModal
          task={modal.task}
          comments={modal.comments}
          onClose={() => {
            setModal({ kind: 'none' })
            startTransition(() => router.refresh())
          }}
          onStatusChange={handleStatusChange}
        />
      )}
    </>
  )
}
