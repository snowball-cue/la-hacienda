# La Hacienda – CLAUDE.md
## Project Specification for AI-Assisted Development

This file is the authoritative reference for all code generation in this project.
Read it before writing or modifying any file. The detailed roadmap lives in
`PROJECT-PLAN.md`; staff procedures live in `SOP-INVENTORY-SYSTEM.md`.

---

## Project Overview

**Client:** La Hacienda Mexican Grocery Store, Austin, Texas  
**Purpose:** Replace manual paper-based inventory tracking with a real-time,
web-based inventory management system and a public-facing store website.  
**Target users:**
- **Owner** — full access; receives alerts; manages accounts
- **Manager** — can add/edit products, receive goods, adjust stock, view reports
- **Staff** — can receive goods and log stock adjustments only

---

## Technology Stack (do not deviate without explicit approval)

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js 15+ (App Router) | Use server components and Server Actions by default |
| Language | TypeScript (strict mode) | No `any`; use Zod for runtime validation |
| Styling | Tailwind CSS | No additional CSS frameworks |
| Database | Supabase PostgreSQL | Accessed via Prisma ORM |
| ORM | Prisma (latest stable) | Schema lives in `prisma/schema.prisma` |
| Auth | Supabase Auth + `@supabase/ssr` | Cookie-based sessions; no localStorage for tokens |
| Storage | Supabase Storage | Product images only |
| Deployment | Vercel (app) + Supabase (DB/auth) | Two separate Supabase projects: dev and prod |

---

## Project Structure

```
C:\ClaudeCode\Strix7-LaHacienda\
├── prisma/
│   ├── schema.prisma          # Single source of truth for DB schema
│   ├── migrations/            # Never hand-edit; use `prisma migrate dev`
│   └── seed.ts                # Sample data for development
├── src/
│   ├── app/
│   │   ├── (public)/          # Public website routes (no auth required)
│   │   │   ├── page.tsx       # Home / hero
│   │   │   ├── about/
│   │   │   ├── hours/
│   │   │   ├── products/
│   │   │   └── contact/
│   │   ├── (dashboard)/       # Auth-required routes
│   │   │   ├── layout.tsx     # Dashboard shell + nav
│   │   │   ├── dashboard/
│   │   │   ├── inventory/
│   │   │   ├── reports/
│   │   │   └── settings/
│   │   ├── login/
│   │   └── api/               # Minimal — prefer Server Actions
│   ├── components/
│   │   ├── ui/                # Reusable primitives (Button, Input, Table…)
│   │   ├── inventory/         # Domain-specific components
│   │   └── public/            # Public website components
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts      # Browser Supabase client
│   │   │   └── server.ts      # Server Supabase client (uses cookies)
│   │   ├── prisma.ts          # Prisma client singleton
│   │   ├── auth.ts            # Session helpers, role resolution
│   │   └── labels.ts          # Bilingual label dictionary (EN/ES)
│   ├── actions/               # Server Actions (one file per domain)
│   │   ├── inventory.ts
│   │   ├── stock.ts
│   │   └── auth.ts
│   └── middleware.ts           # Route protection; redirects to /login
├── public/                    # Static assets (images, fonts)
├── .env.local                 # Secrets — NEVER commit this file
├── .env.example               # Committed placeholder (no real values)
├── CLAUDE.md                  # This file
├── PROJECT-PLAN.md
└── SOP-INVENTORY-SYSTEM.md
```

---

## Coding Rules

### General
- Use **server components** by default. Add `"use client"` only when browser APIs
  or interactivity (state, effects, event handlers) are required.
- Use **Server Actions** for all form submissions and mutations — not client-side
  fetch calls to API routes unless there is a strong reason.
- Keep components small and focused. Extract reusable UI into `src/components/ui/`.
- No `console.log` in committed code. Use structured error handling.

### Security — Non-Negotiable
1. **Never commit secrets.** All credentials go in `.env.local`. The `.env.example`
   file documents required variable names with placeholder values only.
2. **Row Level Security (RLS) is always on.** Every Supabase table must have RLS
   enabled with explicit policies. Default policy is deny-all.
3. **Always use the server Supabase client** (`src/lib/supabase/server.ts`) for
   database access from Server Components and Server Actions. Never use the browser
   client for privileged operations.
4. **Every stock change must log `performed_by`.** The `stock_ledger` table records
   the `user_id` of whoever triggered the change. Server Actions must inject this
   from the authenticated session — never trust client-supplied user IDs.
5. **Validate all user input with Zod** before it reaches Prisma or Supabase.
6. **Role checks happen server-side.** Never rely on client-side conditional rendering
   alone to restrict access. Check role in middleware or Server Action.

### Database
- The stock ledger is **append-only**. Never update or delete ledger rows.
  Current stock = `SUM(change_qty)` for a given `product_id`.
- Products use **soft deletes** (`is_active = false`). Never hard-delete products.
- Every table should have `created_at TIMESTAMPTZ DEFAULT now()`.
- Add `external_id VARCHAR` (nullable, unique) to `stock_ledger` to support future
  POS deduplication without schema changes.
- Run `npx prisma migrate dev --name <descriptive_name>` for every schema change.
  Never use `prisma db push` in production.

### Error Handling
- Server Actions return a typed result object: `{ success: true, data } | { success: false, error: string }`.
- Never expose raw database errors or stack traces to the client.

---

## Bilingual Support

- **English is the primary language** for all UI text.
- **Spanish labels** are provided for product-facing fields and key UI elements
  visible to store staff (category names, unit labels, reason codes, form field
  labels on the stock adjustment form).
- Translations live in `src/lib/labels.ts` as a simple typed dictionary:
  ```typescript
  export const labels = {
    categories: { produce: { en: 'Produce', es: 'Productos frescos' }, ... },
    units: { each: { en: 'Each', es: 'Unidad' }, lb: { en: 'lb', es: 'lb' }, ... },
    reasons: { received: { en: 'Received', es: 'Recibido' }, ... },
  } as const
  ```
- Do **not** add `next-intl` or other i18n libraries unless explicitly approved.
  The dictionary approach is sufficient at this scale.
- Bilingual label coverage is verified during Phase 7 QA.

---

## Extensibility — POS Integration (Future Phase)

The system is designed to accept POS-sourced stock data without architectural changes:

- Stock ledger entries with `reason = 'sold'` will be created by a future POS webhook.
- The `external_id` field on `stock_ledger` deduplicates POS transactions.
- Do not add POS-specific code now, but do not design anything that breaks this path.
- Webhook endpoint (when built): `POST /api/webhooks/pos` — authenticated via
  shared secret in `Authorization` header, not Supabase session.

---

## Development Commands Reference

```bash
# Start local dev server
npm run dev

# Open Prisma Studio (DB browser)
npx prisma studio

# Create a migration (development)
npx prisma migrate dev --name <name>

# Apply migrations (production)
npx prisma migrate deploy

# Generate Prisma client after schema changes
npx prisma generate

# Run tests
npm test

# Type-check without building
npx tsc --noEmit
```

---

## Environment Variables (required)

```bash
# .env.local — never commit real values

# Supabase (development project)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Prisma (direct connection for migrations; use pooler URL for runtime)
DATABASE_URL=
DIRECT_URL=
```

---

## Task Tracking Dashboard

An internal Kanban-style board accessible only to Owner and Manager roles.
Route: `/dashboard/tasks`. Staff are blocked at middleware.

### Routes and Access
| Route | Access | Description |
|-------|--------|-------------|
| `/dashboard/tasks` | Owner, Manager | Full Kanban board — create, edit, move tasks |
| `/dashboard` (widget) | Owner, Manager | Summary: N in progress, N in review, N overdue |

### Database Tables
**`project_tasks`**
- `id` (UUID PK), `title` (TEXT NOT NULL), `description` (TEXT)
- `status`: `'backlog' | 'in_progress' | 'review' | 'done'`
- `priority`: `'high' | 'medium' | 'low'`
- `assignee` (TEXT — free-text, e.g. "Database Specialist" or user name)
- `due_date` (DATE optional), `created_by` (UUID → auth.users)
- `created_at`, `updated_at` (TIMESTAMPTZ)

**`task_comments`** (append-only history — mirrors stock ledger discipline)
- `id` (UUID PK), `task_id` (UUID → project_tasks), `comment` (TEXT NOT NULL)
- `performed_by` (UUID → auth.users — always injected server-side)
- `created_at` (TIMESTAMPTZ)

### RLS Policies
- `project_tasks`: Owner + Manager can SELECT/INSERT/UPDATE. Staff: no access.
- `task_comments`: Owner + Manager can SELECT/INSERT. Nobody can UPDATE or DELETE.
- Both policies join against `profiles.role` — never trust client-supplied role.

### Server Actions (`src/actions/tasks.ts`)
All actions use Zod validation and inject `performed_by` from the server session:
- `createTask(data)` → `{ success, data: task }`
- `updateTask(id, data)` → `{ success, data: task }`
- `updateTaskStatus(id, status)` → `{ success, data: task }`
- `addTaskComment(taskId, comment)` → `{ success, data: comment }`
- `getTaskSummary()` → `{ success, data: { backlog, in_progress, review, done, overdue } }`

### UI Rules
- **No drag-and-drop library.** Status changed via dropdown on card or edit modal.
- Four columns: Backlog | In Progress | Review | Done
- Cards display: title, priority badge (color-coded), assignee, due date chip
- Filter bar: priority, assignee, due date range
- Detail modal: full description, edit form, append-only comment thread
- Summary widget on `/dashboard` home links to pre-filtered `/dashboard/tasks`

### Key Rules (same discipline as stock ledger)
- `task_comments` are append-only — never delete or edit a comment.
- `performed_by` is always injected from the authenticated session in Server Actions.
- Hard-delete of `project_tasks` is not exposed in the UI; soft-archive if needed.
- All mutations log who performed them for auditability.

---

## Do Not Do (common mistakes to avoid)

- Do not store session tokens in `localStorage` or `sessionStorage`.
- Do not use `prisma.raw()` with unvalidated user input — always parameterize.
- Do not add state management libraries (Redux, Zustand) — not needed at this scale.
- Do not create new npm dependencies without explicit approval.
- Do not hard-delete any product or stock ledger record.
- Do not trust `role` values sent from the client; always resolve from the DB session.
- Do not skip the `performed_by` field on any stock ledger entry.
