// Shared task constants and types — importable from both server and client code.
// Kept separate from src/actions/tasks.ts because 'use server' files may only
// export async functions (Next.js 15.2+ enforcement).

export const TASK_STATUSES   = ['backlog', 'in_progress', 'review', 'done'] as const
export const TASK_PRIORITIES = ['high', 'medium', 'low']                    as const

export type TaskStatus   = (typeof TASK_STATUSES)[number]
export type TaskPriority = (typeof TASK_PRIORITIES)[number]

export type TaskActionResult<T = unknown> =
  | { success: true;  data: T }
  | { success: false; error: string }

export interface TaskRow {
  id:          string
  title:       string
  description: string | null
  status:      TaskStatus
  priority:    TaskPriority
  assignee:    string | null
  dueDate:     string | null
  createdBy:   string
  createdAt:   string
  updatedAt:   string
}

export interface CommentRow {
  id:          string
  taskId:      string
  comment:     string
  performedBy: string
  createdAt:   string
}
