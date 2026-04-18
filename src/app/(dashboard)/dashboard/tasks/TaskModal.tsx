'use client'

import { useActionState, useRef, useEffect } from 'react'
import { createTask, updateTask, addTaskComment, updateTaskStatus } from '@/actions/tasks'
import type { TaskRow, CommentRow, TaskStatus, TaskPriority } from '@/lib/task-types'

// ── Shared primitives ────────────────────────────────────────────────────────

const PRIORITY_BADGE: Record<TaskPriority, string> = {
  high:   'badge-high',
  medium: 'badge-medium',
  low:    'badge-low',
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  backlog:     'Backlog',
  in_progress: 'In Progress',
  review:      'Review',
  done:        'Done',
}

function formatDate(iso: string | null) {
  if (!iso) return null
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function isOverdue(iso: string | null, status: TaskStatus) {
  if (!iso || status === 'done') return false
  return new Date(iso + 'T00:00:00') < new Date()
}

// ── FieldGroup ───────────────────────────────────────────────────────────────

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">
        {label}
      </label>
      {children}
    </div>
  )
}

function inputCls(extra = '') {
  return `w-full px-3 py-2 text-sm border border-stone-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-terracotta focus:border-terracotta ${extra}`
}

// ── NewTaskModal ─────────────────────────────────────────────────────────────

interface NewTaskModalProps {
  defaultStatus?: TaskStatus
  onClose: () => void
}

export function NewTaskModal({ defaultStatus = 'backlog', onClose }: NewTaskModalProps) {
  const [state, action, isPending] = useActionState(createTask, null)

  // Close on success
  useEffect(() => {
    if (state?.success) onClose()
  }, [state, onClose])

  return (
    <ModalShell title="New Task" onClose={onClose}>
      <form action={action} className="space-y-4">
        {state && !state.success && (
          <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {state.error}
          </p>
        )}

        <input type="hidden" name="status" value={defaultStatus} />

        <FieldGroup label="Title *">
          <input name="title" required autoFocus className={inputCls()} placeholder="What needs to be done?" />
        </FieldGroup>

        <FieldGroup label="Description">
          <textarea name="description" rows={3} className={inputCls('resize-y')} placeholder="Optional details…" />
        </FieldGroup>

        <div className="grid grid-cols-2 gap-3">
          <FieldGroup label="Priority">
            <select name="priority" defaultValue="medium" className={inputCls()}>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </FieldGroup>
          <FieldGroup label="Status">
            <select name="status" defaultValue={defaultStatus} className={inputCls()}>
              <option value="backlog">Backlog</option>
              <option value="in_progress">In Progress</option>
              <option value="review">Review</option>
              <option value="done">Done</option>
            </select>
          </FieldGroup>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FieldGroup label="Assignee">
            <input name="assignee" className={inputCls()} placeholder="e.g. Manager, Maria" />
          </FieldGroup>
          <FieldGroup label="Due Date">
            <input name="dueDate" type="date" className={inputCls()} />
          </FieldGroup>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={isPending} className="btn-primary">
            {isPending ? 'Creating…' : 'Create Task'}
          </button>
        </div>
      </form>
    </ModalShell>
  )
}

// ── TaskDetailModal ──────────────────────────────────────────────────────────

interface TaskDetailModalProps {
  task:     TaskRow
  comments: CommentRow[]
  onClose:  () => void
  onStatusChange: (id: string, status: TaskStatus) => void
}

export function TaskDetailModal({ task, comments, onClose, onStatusChange }: TaskDetailModalProps) {
  const [editMode, setEditMode] = useState_safe(false)

  if (editMode) {
    return (
      <EditTaskModal
        task={task}
        onClose={onClose}
        onCancelEdit={() => setEditMode(false)}
      />
    )
  }

  const overdue = isOverdue(task.dueDate, task.status)

  return (
    <ModalShell
      title={task.title}
      onClose={onClose}
      headerRight={
        <button
          onClick={() => setEditMode(true)}
          className="btn-secondary text-xs py-1 px-2"
        >
          Edit
        </button>
      }
    >
      <div className="space-y-5">
        {/* Meta row */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className={`badge ${PRIORITY_BADGE[task.priority]}`}>{task.priority}</span>
          <StatusSelect
            taskId={task.id}
            current={task.status}
            onChange={onStatusChange}
          />
          {task.assignee && (
            <span className="badge badge-neutral">{task.assignee}</span>
          )}
          {task.dueDate && (
            <span className={`badge ${overdue ? 'badge-high' : 'badge-neutral'}`}>
              {overdue ? '⚠ ' : ''}Due {formatDate(task.dueDate)}
            </span>
          )}
        </div>

        {/* Description */}
        {task.description ? (
          <div>
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-1">Description</p>
            <p className="text-sm text-stone-700 whitespace-pre-wrap leading-relaxed">{task.description}</p>
          </div>
        ) : (
          <p className="text-sm text-stone-400 italic">No description provided.</p>
        )}

        {/* Comments */}
        <div>
          <p className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-3">
            Comments ({comments.length})
          </p>
          <CommentThread taskId={task.id} comments={comments} />
        </div>
      </div>
    </ModalShell>
  )
}

// ── EditTaskModal ────────────────────────────────────────────────────────────

interface EditTaskModalProps {
  task:          TaskRow
  onClose:       () => void
  onCancelEdit:  () => void
}

function EditTaskModal({ task, onClose, onCancelEdit }: EditTaskModalProps) {
  const boundAction = updateTask.bind(null, task.id)
  const [state, action, isPending] = useActionState(boundAction, null)

  useEffect(() => {
    if (state?.success) onClose()
  }, [state, onClose])

  return (
    <ModalShell title="Edit Task" onClose={onClose}>
      <form action={action} className="space-y-4">
        {state && !state.success && (
          <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {state.error}
          </p>
        )}

        <FieldGroup label="Title *">
          <input name="title" required defaultValue={task.title} className={inputCls()} />
        </FieldGroup>

        <FieldGroup label="Description">
          <textarea
            name="description"
            rows={4}
            defaultValue={task.description ?? ''}
            className={inputCls('resize-y')}
          />
        </FieldGroup>

        <div className="grid grid-cols-2 gap-3">
          <FieldGroup label="Priority">
            <select name="priority" defaultValue={task.priority} className={inputCls()}>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </FieldGroup>
          <FieldGroup label="Status">
            <select name="status" defaultValue={task.status} className={inputCls()}>
              <option value="backlog">Backlog</option>
              <option value="in_progress">In Progress</option>
              <option value="review">Review</option>
              <option value="done">Done</option>
            </select>
          </FieldGroup>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FieldGroup label="Assignee">
            <input
              name="assignee"
              defaultValue={task.assignee ?? ''}
              className={inputCls()}
              placeholder="e.g. Manager, Maria"
            />
          </FieldGroup>
          <FieldGroup label="Due Date">
            <input
              name="dueDate"
              type="date"
              defaultValue={task.dueDate ?? ''}
              className={inputCls()}
            />
          </FieldGroup>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onCancelEdit} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={isPending} className="btn-primary">
            {isPending ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </ModalShell>
  )
}

// ── StatusSelect ─────────────────────────────────────────────────────────────

function StatusSelect({
  taskId,
  current,
  onChange,
}: {
  taskId:   string
  current:  TaskStatus
  onChange: (id: string, status: TaskStatus) => void
}) {
  const [busy, setBusy] = useState_safe(false)

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as TaskStatus
    setBusy(true)
    await onChange(taskId, next)
    setBusy(false)
  }

  return (
    <select
      value={current}
      onChange={handleChange}
      disabled={busy}
      className="text-xs border border-stone-300 rounded px-2 py-0.5 bg-white text-stone-700 focus:outline-none focus:ring-1 focus:ring-terracotta"
    >
      {(Object.entries(STATUS_LABELS) as [TaskStatus, string][]).map(([val, label]) => (
        <option key={val} value={val}>{label}</option>
      ))}
    </select>
  )
}

// ── CommentThread ─────────────────────────────────────────────────────────────

function CommentThread({ taskId, comments }: { taskId: string; comments: CommentRow[] }) {
  const boundAction = addTaskComment.bind(null, taskId)
  const [state, action, isPending] = useActionState(boundAction, null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state?.success) formRef.current?.reset()
  }, [state])

  return (
    <div className="space-y-3">
      {/* Existing comments */}
      {comments.length === 0 ? (
        <p className="text-xs text-stone-400 italic">No comments yet.</p>
      ) : (
        <ul className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {comments.map((c) => (
            <li key={c.id} className="bg-stone-50 rounded-lg px-3 py-2">
              <p className="text-sm text-stone-800 whitespace-pre-wrap">{c.comment}</p>
              <p className="text-xs text-stone-400 mt-1">
                {new Date(c.createdAt).toLocaleString('en-US', {
                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                })}
              </p>
            </li>
          ))}
        </ul>
      )}

      {/* Add comment form */}
      <form ref={formRef} action={action} className="space-y-2">
        {state && !state.success && (
          <p className="text-xs text-red-600">{state.error}</p>
        )}
        <textarea
          name="comment"
          rows={2}
          required
          placeholder="Add a comment…"
          className={inputCls('resize-none')}
        />
        <button type="submit" disabled={isPending} className="btn-secondary text-xs py-1">
          {isPending ? 'Posting…' : 'Post Comment'}
        </button>
      </form>
    </div>
  )
}

// ── ModalShell ───────────────────────────────────────────────────────────────

function ModalShell({
  title,
  onClose,
  headerRight,
  children,
}: {
  title:       string
  onClose:     () => void
  headerRight?: React.ReactNode
  children:    React.ReactNode
}) {
  // Close on Escape key
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex items-start justify-between px-6 py-4 border-b border-stone-100 shrink-0">
            <h2 className="text-base font-semibold text-stone-900 pr-4 leading-snug">{title}</h2>
            <div className="flex items-center gap-2 shrink-0">
              {headerRight}
              <button
                onClick={onClose}
                aria-label="Close"
                className="text-stone-400 hover:text-stone-700 transition-colors"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-5 overflow-y-auto">
            {children}
          </div>
        </div>
      </div>
    </>
  )
}

// ── useState shim (avoids extra import line) ─────────────────────────────────
// Re-export under a different name so the file doesn't need a separate import
import { useState as useState_safe } from 'react'
export { useState_safe }
