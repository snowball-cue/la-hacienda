'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getAuthUser, hasMinimumRole } from '@/lib/auth'
import {
  TASK_STATUSES,
  TASK_PRIORITIES,
  type TaskStatus,
  type TaskPriority,
  type TaskActionResult,
  type TaskRow,
  type CommentRow,
} from '@/lib/task-types'

// Re-export types so existing imports from '@/actions/tasks' keep working.
// Type-only exports are erased at runtime and are allowed in 'use server' files.
export type { TaskStatus, TaskPriority, TaskActionResult, TaskRow, CommentRow }

// ── Zod schemas ──────────────────────────────────────────────────────────────

const CreateTaskSchema = z.object({
  title:       z.string().min(1, 'Title is required.').max(200).trim(),
  description: z.string().max(5000).trim().optional(),
  status:      z.enum(TASK_STATUSES).default('backlog'),
  priority:    z.enum(TASK_PRIORITIES).default('medium'),
  assignee:    z.string().max(100).trim().nullable().optional(),
  dueDate:     z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format.')
    .nullable()
    .optional(),
})

const UpdateTaskSchema = CreateTaskSchema.partial()

const UpdateStatusSchema = z.object({
  status: z.enum(TASK_STATUSES),
})

const AddCommentSchema = z.object({
  comment: z.string().min(1, 'Comment cannot be empty.').max(2000).trim(),
})

// Helper: serialise a Prisma task row for safe transfer to client components
function serialiseTask(t: {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  assignee: string | null
  dueDate: Date | null
  createdBy: string
  createdAt: Date
  updatedAt: Date
}): TaskRow {
  return {
    id:          t.id,
    title:       t.title,
    description: t.description,
    status:      t.status      as TaskStatus,
    priority:    t.priority    as TaskPriority,
    assignee:    t.assignee,
    dueDate:     t.dueDate ? t.dueDate.toISOString().split('T')[0] : null,
    createdBy:   t.createdBy,
    createdAt:   t.createdAt.toISOString(),
    updatedAt:   t.updatedAt.toISOString(),
  }
}

// ── createTask ───────────────────────────────────────────────────────────────

export async function createTask(
  _prev: TaskActionResult | null,
  formData: FormData,
): Promise<TaskActionResult<TaskRow>> {
  const user = await getAuthUser()
  if (!user || !hasMinimumRole(user.role, 'manager')) {
    return { success: false, error: 'Unauthorized.' }
  }

  const parsed = CreateTaskSchema.safeParse({
    title:       formData.get('title'),
    description: formData.get('description') || undefined,
    status:      formData.get('status')   || 'backlog',
    priority:    formData.get('priority') || 'medium',
    assignee:    formData.get('assignee') || null,
    dueDate:     formData.get('dueDate')  || null,
  })

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'Invalid input.' }
  }

  try {
    const task = await prisma.projectTask.create({
      data: {
        title:       parsed.data.title,
        description: parsed.data.description ?? null,
        status:      parsed.data.status,
        priority:    parsed.data.priority,
        assignee:    parsed.data.assignee ?? null,
        dueDate:     parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        createdBy:   user.id,
      },
    })
    revalidatePath('/dashboard/tasks')
    revalidatePath('/dashboard')
    return { success: true, data: serialiseTask(task) }
  } catch {
    return { success: false, error: 'Failed to create task. Please try again.' }
  }
}

// ── updateTask ───────────────────────────────────────────────────────────────

export async function updateTask(
  id: string,
  _prev: TaskActionResult | null,
  formData: FormData,
): Promise<TaskActionResult<TaskRow>> {
  const user = await getAuthUser()
  if (!user || !hasMinimumRole(user.role, 'manager')) {
    return { success: false, error: 'Unauthorized.' }
  }

  const parsed = UpdateTaskSchema.safeParse({
    title:       formData.get('title')       || undefined,
    description: formData.get('description') || undefined,
    status:      formData.get('status')      || undefined,
    priority:    formData.get('priority')    || undefined,
    assignee:    formData.get('assignee')    || null,
    dueDate:     formData.get('dueDate')     || null,
  })

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'Invalid input.' }
  }

  try {
    const task = await prisma.projectTask.update({
      where: { id },
      data: {
        ...(parsed.data.title       !== undefined && { title:       parsed.data.title }),
        ...(parsed.data.description !== undefined && { description: parsed.data.description }),
        ...(parsed.data.status      !== undefined && { status:      parsed.data.status }),
        ...(parsed.data.priority    !== undefined && { priority:    parsed.data.priority }),
        assignee: parsed.data.assignee ?? null,
        ...(parsed.data.dueDate !== undefined && {
          dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        }),
      },
    })
    revalidatePath('/dashboard/tasks')
    revalidatePath('/dashboard')
    return { success: true, data: serialiseTask(task) }
  } catch {
    return { success: false, error: 'Failed to update task. Please try again.' }
  }
}

// ── updateTaskStatus ─────────────────────────────────────────────────────────

export async function updateTaskStatus(
  id: string,
  status: TaskStatus,
): Promise<TaskActionResult<TaskRow>> {
  const user = await getAuthUser()
  if (!user || !hasMinimumRole(user.role, 'manager')) {
    return { success: false, error: 'Unauthorized.' }
  }

  const parsed = UpdateStatusSchema.safeParse({ status })
  if (!parsed.success) {
    return { success: false, error: 'Invalid status value.' }
  }

  try {
    const task = await prisma.projectTask.update({
      where: { id },
      data:  { status: parsed.data.status },
    })
    revalidatePath('/dashboard/tasks')
    revalidatePath('/dashboard')
    return { success: true, data: serialiseTask(task) }
  } catch {
    return { success: false, error: 'Failed to update status. Please try again.' }
  }
}

// ── addTaskComment ───────────────────────────────────────────────────────────

export async function addTaskComment(
  taskId: string,
  _prev: TaskActionResult | null,
  formData: FormData,
): Promise<TaskActionResult<CommentRow>> {
  const user = await getAuthUser()
  if (!user || !hasMinimumRole(user.role, 'manager')) {
    return { success: false, error: 'Unauthorized.' }
  }

  const parsed = AddCommentSchema.safeParse({ comment: formData.get('comment') })
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'Invalid input.' }
  }

  try {
    const row = await prisma.taskComment.create({
      data: {
        taskId,
        comment:     parsed.data.comment,
        performedBy: user.id,
      },
    })
    revalidatePath('/dashboard/tasks')
    return {
      success: true,
      data: {
        id:          row.id,
        taskId:      row.taskId,
        comment:     row.comment,
        performedBy: row.performedBy,
        createdAt:   row.createdAt.toISOString(),
      },
    }
  } catch {
    return { success: false, error: 'Failed to add comment. Please try again.' }
  }
}

// ── getTaskSummary ───────────────────────────────────────────────────────────

export async function getTaskSummary(): Promise<
  TaskActionResult<{
    backlog:     number
    in_progress: number
    review:      number
    done:        number
    overdue:     number
  }>
> {
  const user = await getAuthUser()
  if (!user || !hasMinimumRole(user.role, 'manager')) {
    return { success: false, error: 'Unauthorized.' }
  }

  try {
    const [grouped, overdue] = await Promise.all([
      prisma.projectTask.groupBy({
        by:     ['status'],
        _count: { id: true },
      }),
      prisma.projectTask.count({
        where: {
          status:   { in: ['backlog', 'in_progress', 'review'] },
          dueDate:  { lt: new Date() },
          priority: 'high',
        },
      }),
    ])

    const counts = { backlog: 0, in_progress: 0, review: 0, done: 0 }
    for (const row of grouped) {
      const key = row.status as keyof typeof counts
      if (key in counts) counts[key] = (row._count as Record<string, number>).id ?? 0
    }

    return { success: true, data: { ...counts, overdue } }
  } catch {
    return { success: false, error: 'Could not load task summary.' }
  }
}

// ── getTasks ─────────────────────────────────────────────────────────────────

export async function getTasks(filters?: {
  priority?: TaskPriority
  assignee?: string
  dueBefore?: string
}): Promise<TaskActionResult<TaskRow[]>> {
  const user = await getAuthUser()
  if (!user || !hasMinimumRole(user.role, 'manager')) {
    return { success: false, error: 'Unauthorized.' }
  }

  try {
    const tasks = await prisma.projectTask.findMany({
      where: {
        ...(filters?.priority  && { priority: filters.priority }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(filters?.assignee  && { assignee: { contains: filters.assignee, mode: 'insensitive' } as any }),
        ...(filters?.dueBefore && {
          dueDate: { lte: new Date(filters.dueBefore) },
        }),
      },
      orderBy: [{ status: 'asc' }, { priority: 'asc' }, { createdAt: 'desc' }],
    })
    return { success: true, data: tasks.map(serialiseTask) }
  } catch {
    return { success: false, error: 'Could not load tasks.' }
  }
}

// ── getTaskWithComments ───────────────────────────────────────────────────────

export async function getTaskWithComments(id: string): Promise<
  TaskActionResult<{ task: TaskRow; comments: CommentRow[] }>
> {
  const user = await getAuthUser()
  if (!user || !hasMinimumRole(user.role, 'manager')) {
    return { success: false, error: 'Unauthorized.' }
  }

  try {
    const task = await prisma.projectTask.findUnique({
      where: { id },
      include: {
        comments: { orderBy: { createdAt: 'asc' } },
      },
    })

    if (!task) return { success: false, error: 'Task not found.' }

    return {
      success: true,
      data: {
        task:     serialiseTask(task),
        comments: task.comments.map((c) => ({
          id:          c.id,
          taskId:      c.taskId,
          comment:     c.comment,
          performedBy: c.performedBy,
          createdAt:   c.createdAt.toISOString(),
        })),
      },
    }
  } catch {
    return { success: false, error: 'Could not load task.' }
  }
}
