# La Hacienda Inventory Management System – Project Plan

**Client:** La Hacienda Mexican Grocery Store, Austin, Texas  
**Tech Stack:** Next.js 15+ (App Router) · TypeScript · Tailwind CSS · Supabase (PostgreSQL) · Prisma ORM · Supabase Auth  
**Deployment:** Vercel (app) + Supabase (database + auth + storage)  
**Document Version:** 1.2 · April 2026 *(v1.2: added Task Tracking Dashboard as Phase 4b, ~9 h)*

---

## Project Overview

La Hacienda is a small independent Mexican grocery store operating manually today
(paper logs, spreadsheets, verbal reorder decisions). This system will give the
owner and staff real-time stock visibility, reduce manual counting errors, generate
low-stock alerts, and produce simple sales/inventory reports — at a scale and cost
suitable for a small business while borrowing best practices from larger chains like H-E-B.

**Primary Goals**
1. Replace paper-based inventory tracking with a digital system accessible from any device.
2. Reduce stockout and overstock incidents through automated low-stock alerts.
3. Provide a simple public-facing website for store hours, location, and featured products.
4. Lay the groundwork for optional POS integration in a future phase.

---

## Milestones at a Glance

| # | Milestone | Effort | Deliverable |
|---|-----------|--------|-------------|
| 0 | Business Discovery | 4 h | Requirements doc (this plan) |
| 1 | Environment Setup | 4 h | Running local + cloud dev environment |
| 2 | Database Schema | 6 h | Prisma schema, migrations, seed data |
| 3 | Public Website | 8 h | Live marketing pages on Vercel |
| 4 | Auth & Dashboard Shell | 6 h | Login/logout, role-gated dashboard layout |
| 5 | Core Inventory Features | 16 h | Full CRUD inventory, stock adjustments, alerts |
| 6 | Reporting | 6 h | Low-stock report, stock history, basic CSV export |
| 7 | Testing & QA | 6 h | Passing test suite, cross-device checks |
| 8 | Production Deployment | 4 h | Live on Vercel + Supabase (prod) |
| 9 | Handover & Training | 4 h | Training session + SOP handover |
| **Total** | | **~64 h** | **Fully operational system** |

*Assuming part-time work (~2–3 hours/weekday), this is approximately 5–6 weeks.*

---

## Phase 0 – Business Discovery (Complete)

**Effort:** 4 hours  
**Status:** Done — captured in this document

### Requirements Gathered
- Store sells approximately 300–600 SKUs across produce, dry goods, dairy, meat, and beverages.
- Owner and 1–2 managers need dashboard access; staff need limited receive/adjust access.
- Reorder decisions are currently made by memory or physical shelf checks.
- No POS system currently in place (future phase).
- Preferred language for staff UI: English with Spanish labels where possible.

### [v1.1] POS System Confirmation Step
Before closing discovery, confirm with the owner:
- Is any POS system currently in use or actively being evaluated (e.g., Square, Clover, Toast)?
- If **yes**: evaluate API/webhook integration (preferred) vs. periodic CSV export as a fallback for one-way sales-to-ledger sync. Document the vendor and API capability.
- If **no**: record this and revisit in Phase 10 when the owner is ready to add a POS.
- The outcome of this conversation is the primary input to Phase 10 scope and integration approach.

### Success Criteria
- All stakeholder roles and workflows documented.
- Tech stack confirmed and approved.
- POS readiness question answered and documented.

---

## Phase 1 – Environment Setup

**Effort:** 4 hours  
**Deliverables:** Local dev environment, Vercel project, Supabase project (dev + prod instances)

### Steps
1. Initialize Next.js 15 project in G:\Strix7 with TypeScript and Tailwind CSS.
   ```bash
   npx create-next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*"
   ```
2. Install and configure Prisma with the Supabase PostgreSQL connection string.
   ```bash
   npm install prisma @prisma/client
   npx prisma init
   ```
3. Install Supabase client libraries.
   ```bash
   npm install @supabase/supabase-js @supabase/ssr
   ```
4. Create Supabase project (development) via Supabase dashboard. Record `DATABASE_URL`, `ANON_KEY`, `SERVICE_ROLE_KEY`.
5. Set up `.env.local` with all secrets; add `.env.local` to `.gitignore`.
6. Connect Vercel project to GitHub repo; configure environment variables in Vercel dashboard.
7. Verify Prisma can reach Supabase by running `npx prisma db push`.

### Success Criteria
- `npm run dev` starts without errors.
- `npx prisma studio` opens and can query the Supabase database.
- Vercel preview URL resolves.

---

## Phase 2 – Database Schema Design

**Effort:** 6 hours  
**Deliverables:** Finalized Prisma schema, initial migrations, seed script with sample data

### Core Tables

**Users / Roles**
- Supabase Auth handles authentication (email + password).
- A `profiles` table in PostgreSQL extends auth users with `role: owner | manager | staff`.

**Products**
- `id`, `sku` (unique), `name`, `name_es` (Spanish), `category`, `unit` (each/lb/kg/case),
  `cost_price`, `sell_price`, `reorder_point`, `reorder_qty`, `supplier_id`, `image_url`,
  `is_active`, `created_at`, `updated_at`
- **[v1.1]** `expiration_date` (optional `Date`) — nearest expiration date for the current batch on hand; managers update this when receiving perishable goods.
- **[v1.1]** `shelf_life_days` (optional `Int`) — typical shelf life in days for this product; used to auto-calculate expected expiry when `expiration_date` is not set explicitly.

**Categories**
- `id`, `name`, `name_es`, `sort_order`

**Suppliers**
- `id`, `name`, `contact_name`, `phone`, `email`, `notes`

**Stock Ledger (append-only)**
- `id`, `product_id`, `change_qty` (positive = in, negative = out/shrinkage),
  `reason` (received | sold | adjustment | spoilage | theft | return), `note`,
  `performed_by` (user_id), `created_at`
- Current stock for any product = `SUM(change_qty)` — no mutable quantity field.

**Purchase Orders (optional MVP)**
- `id`, `supplier_id`, `status` (draft | sent | received | cancelled),
  `created_by`, `created_at`, `received_at`
- `purchase_order_items`: `po_id`, `product_id`, `qty_ordered`, `qty_received`, `unit_cost`

### Design Decisions
- **Append-only ledger** prevents accidental data loss and provides a full audit trail — mirrors H-E-B style inventory accuracy controls.
- **Supabase Row Level Security (RLS)** enforces role-based access at the database level.
- **Soft deletes** (`is_active = false`) for products — never hard-delete inventory history.

### Success Criteria
- `npx prisma migrate dev` runs cleanly.
- Seed script populates ~20 sample products across 5 categories.
- RLS policies tested via Supabase SQL editor.

---

## Phase 3 – Public Website

**Effort:** 8 hours  
**Deliverables:** 4–5 public pages deployed on Vercel

### Pages
| Route | Content |
|-------|---------|
| `/` | Hero, store tagline, featured products carousel |
| `/about` | Store story, family-owned messaging, photos |
| `/hours` | Store hours (Mon–Sun), holiday notes, address + embedded map |
| `/products` | Browse product catalog by category (read-only, no cart) |
| `/contact` | Phone, email, social links, contact form (Supabase or simple email) |

### Design Notes
- Colors: warm Mexican palette (terracotta, cream, forest green, gold).
- Mobile-first responsive layout.
- All pages server-rendered (Next.js RSC) for SEO and performance.
- No JavaScript bundle overhead on public pages where possible.

### Success Criteria
- Lighthouse score ≥ 90 on mobile for the home page.
- All pages render correctly on Chrome, Safari, and mobile browsers.

---

## Phase 4 – Authentication & Dashboard Shell

**Effort:** 6 hours  
**Deliverables:** Login/logout flow, role-gated routes, dashboard layout with navigation

### Auth Flow
- Email + password via Supabase Auth.
- Server-side session management using `@supabase/ssr` (cookie-based, no localStorage).
- Middleware (`middleware.ts`) redirects unauthenticated users to `/login`.
- Role fetched from `profiles` table; stored in auth context.

### Dashboard Pages (shell only)
- `/dashboard` — overview widgets (total SKUs, low-stock count, recent activity)
- `/dashboard/inventory` — product list (empty state)
- `/dashboard/reports` — placeholder
- `/dashboard/settings` — placeholder

### Role-Based Access
| Feature | Owner | Manager | Staff |
|---------|-------|---------|-------|
| View inventory | ✓ | ✓ | ✓ |
| Add/edit products | ✓ | ✓ | ✗ |
| Adjust stock | ✓ | ✓ | ✓ |
| Receive orders | ✓ | ✓ | ✓ |
| Delete/archive products | ✓ | ✗ | ✗ |
| View reports | ✓ | ✓ | ✗ |
| Manage users | ✓ | ✗ | ✗ |

### Success Criteria
- Login and logout work end-to-end.
- Navigating to `/dashboard` without a session redirects to `/login`.
- Role-based route protection verified for all three roles.

---

## Phase 4b – Task Tracking Dashboard

**Effort:** ~9 hours  
**Deliverables:** Internal Kanban board for owner/manager; summary widget on dashboard home  
**Depends on:** Phase 4 (auth + role system must be operational)

### Purpose
A lightweight internal task board (JIRA-like) for tracking development and
operational work related to La Hacienda. Accessible only to Owner and Manager.
Can be used during development ("Build CSV import UI") and operationally
after launch ("Schedule monthly stock count", "Call tortilla supplier").

### Database Schema

**`project_tasks`**
- `id` UUID PK, `title` TEXT NOT NULL, `description` TEXT
- `status` TEXT — `backlog | in_progress | review | done`
- `priority` TEXT — `high | medium | low`
- `assignee` TEXT (free-text; role or user name)
- `due_date` DATE (optional), `created_by` UUID → auth.users
- `created_at`, `updated_at` TIMESTAMPTZ

**`task_comments`** (append-only — same discipline as stock ledger)
- `id` UUID PK, `task_id` UUID → project_tasks
- `comment` TEXT NOT NULL, `performed_by` UUID → auth.users, `created_at` TIMESTAMPTZ

### RLS Policies
- `project_tasks`: Owner + Manager: SELECT/INSERT/UPDATE. Staff: no access.
- `task_comments`: Owner + Manager: SELECT/INSERT only. No UPDATE/DELETE for anyone.
- Policies join `profiles.role` — never trust client-supplied values.

### Server Actions (`src/actions/tasks.ts`)
- `createTask` — Zod-validated; injects `created_by` from session
- `updateTask` — full field update; owner/manager only
- `updateTaskStatus` — status change; logs update via `updated_at`
- `addTaskComment` — injects `performed_by` from session; append-only
- `getTaskSummary` — returns counts by status for dashboard widget

### UI
- Route `/dashboard/tasks`: four-column Kanban view (Backlog | In Progress | Review | Done)
- Cards: title, priority badge (color-coded), assignee, due date chip
- No drag-and-drop (avoids dependency); status changed via dropdown/modal
- Filter bar: by priority, assignee, due date range
- Detail modal: description, editable fields, append-only comment thread
- `/dashboard` home widget: "N in progress · N in review · N overdue (high priority)"

### Success Criteria
- Owner and Manager can create, edit, and move tasks between columns.
- Staff users are blocked from `/dashboard/tasks` at middleware level.
- Task comments persist and cannot be deleted or edited.
- Dashboard home widget shows correct task counts.
- All Server Actions validated with Zod; `performed_by` always injected server-side.

---

## Phase 5 – Core Inventory Features

**Effort:** 16 hours  
**Deliverables:** Full working inventory system

### 5a — Product Management (5 h)
- Product list with search, category filter, and sort.
- Add product form (all fields, SKU auto-suggestion or manual).
- Edit product form.
- Archive (soft-delete) product — owner only.
- Product detail page with current stock calculation.

### 5b — Stock Adjustments (4 h)
- "Receive Goods" form: select product, enter qty received, auto-logs to stock ledger with reason = `received`.
- "Manual Adjustment" form: positive or negative qty, required reason code, optional note.
- Spoilage/shrinkage recording: reason = `spoilage` or `theft`.
- All adjustments log the user who performed them.

### 5c — Low-Stock Alerts (3 h)
- Computed view: products where `SUM(ledger.change_qty) ≤ product.reorder_point`.
- Dashboard widget shows count and links to filtered list.
- Optional: Supabase Edge Function sends email alert daily for low-stock items (owner email).
- **[v1.1]** Soon-to-expire widget: separate dashboard counter flags active products where `expiration_date` is within 7 days (threshold configurable by owner in Settings). Shown alongside the low-stock counter on the dashboard home.

### 5d — Supplier Management (2 h)
- Supplier list: add, edit, view contact details.
- Link suppliers to products.

### 5e — Purchase Orders — MVP (2 h)
- Create PO from low-stock list.
- Mark PO as received → auto-populate "Receive Goods" form.

### 5f — [v1.1] CSV Bulk Product Import (3 h)
- Dashboard page: **Inventory → Import Products**.
- Downloadable CSV template with all supported columns.
- Required columns: `sku`, `name`, `name_es`, `category`, `unit`, `cost_price`, `sell_price`, `reorder_point`, `reorder_qty`.
- Optional columns: `supplier_name`, `expiration_date` (ISO date), `shelf_life_days`, `initial_stock_qty`.
- Server-side validation: duplicate SKU detection, missing required fields, unknown category names — errors listed in a preview before any data is written.
- On confirmed import: products upserted; if `initial_stock_qty` is provided, a stock ledger entry is auto-created with `reason = received` and `performed_by` = importing user.
- Supports initial seeding of 300–600 SKUs and ongoing bulk price updates.

### Success Criteria
- Can add a product, adjust its stock, and see the change reflected immediately.
- Low-stock alert appears when stock drops to/below reorder point.
- All ledger entries visible with user name, timestamp, and reason.

---

## Phase 6 – Reporting

**Effort:** 6 hours  
**Deliverables:** 3 reports accessible to owner and manager

### Reports
1. **Low-Stock Report** — current stock vs. reorder point for all active products.
2. **Stock Movement History** — ledger entries filterable by product, date range, reason.
3. **Inventory Snapshot** — all products with current stock, value (qty × cost), and sell value.
4. **CSV Export** — button on each report to download data as CSV.
5. **[v1.1] Audit Log** — owner/manager view of all stock ledger entries: who made each change, which product, quantity delta, reason, and timestamp. Filterable by user, product, date range, and reason. Read-only; no deletions or edits permitted from the UI.

### Success Criteria
- Each report renders correctly with seed data.
- CSV export downloads a valid file.

---

## Phase 7 – Testing & QA

**Effort:** 9 hours (+3h for Test Log — see below)
**Deliverables:** Test suite + QA checklist + Test Log report

### Testing Strategy
- **Unit tests:** Utility functions (stock calculation, CSV generation, label lookups) — Vitest.
- **Integration tests:** Server Actions and API routes — Vitest + Supabase test instance.
- **End-to-end (light):** Critical flows (login, add product, adjust stock, view report) — Playwright or manual QA checklist.
- **Cross-device:** Test on desktop Chrome, iOS Safari, Android Chrome.
- **[v1.1] Bilingual label verification:** Manually confirm Spanish labels render correctly on key UI elements — product list (nombre column), category names, unit labels, and all reason codes on the stock adjustment form. Check dashboard widget labels and report headers.

### [v1.2] Test Log Sub-Feature

**Effort:** 3 hours (within Phase 7)

Records all test run results in Supabase and lets Owner/Manager download an Excel
report. Serves as the quality gate that must be completed before Phase 8 deployment.

**Database — `test_results` table:**
```
id             UUID PK DEFAULT gen_random_uuid()
run_id         UUID NOT NULL              -- groups entries from one test run
test_name      TEXT NOT NULL              -- e.g., "createProduct - valid input"
category       TEXT NOT NULL             -- 'unit' | 'integration' | 'e2e' | 'manual_qa'
status         TEXT NOT NULL             -- 'pass' | 'fail' | 'skip'
duration_ms    INTEGER                   -- from Vitest JSON; null for manual QA rows
error_message  TEXT                      -- populated when status = 'fail'
performed_by   UUID NOT NULL REFERENCES auth.users(id)
created_at     TIMESTAMPTZ DEFAULT now()
```
- Append-only (no UPDATE or DELETE for anyone — same discipline as stock ledger).
- RLS: Owner + Manager SELECT/INSERT; Staff no access.

**Implementation files:**
- `src/actions/test-log.ts` — Server Actions: `insertTestResults`, `getTestRuns`
- `src/app/api/test-log/download/route.ts` — Route Handler: generates `.xlsx` via ExcelJS
- `src/app/(dashboard)/test-log/page.tsx` — run history table + Download button (Owner/Manager only)
- `scripts/import-test-results.ts` — Node script: parses Vitest JSON reporter output → inserts to DB
- Dashboard home widget: "Last Test Run: N/N passed" link to `/dashboard/test-log`
- New dependency: `exceljs@^4.4.0` — server-only (Route Handler only); zero client bundle impact

**Quality Gate (required before Phase 8):**
1. Owner or Manager opens `/dashboard/test-log`.
2. Confirms final run: 100% pass on unit + integration tests; manual QA checklist complete.
3. Downloads the `.xlsx` log — download is recorded server-side with `performed_by`.
4. Phase 8 may not begin until this sign-off download is confirmed.

### Success Criteria
- Unit and integration tests pass with `npm test`.
- All critical flows verified on 3 device types.
- No console errors on any public or dashboard page.
- **[v1.1]** Spanish labels verified on: product list, stock adjustment form (all reason codes), category filter, dashboard widgets, and at least one report.
- **[v1.2]** `test_results` table populated with all Phase 7 test runs.
- **[v1.2]** `.xlsx` download verified: 4 sheets (Summary, Unit, Integration, Manual QA), all results present, no empty rows.
- **[v1.2]** Download button not visible to Staff role (verified in QA).
- **[v1.2]** Quality gate sign-off download completed by Owner or Manager before Phase 8 begins.

---

## Phase 8 – Production Deployment

**Effort:** 4 hours  
**Deliverables:** Live production environment

### Steps
1. Create separate Supabase production project.
2. Run `prisma migrate deploy` against production database.
3. Configure production environment variables in Vercel.
4. Set up custom domain on Vercel (if applicable).
5. Enable Supabase backups (daily automated backups included in free tier).
6. Verify all features in production with real data entry.

### Success Criteria
- Production URL resolves and is accessible on mobile.
- Owner can log in and create a product in production.
- Supabase automated backups are enabled and confirmed.

---

## Phase 9 – Handover & Training

**Effort:** 4 hours  
**Deliverables:** Training session, SOP handover, admin account creation

### Steps
1. Walk owner through all dashboard features (screen-share or in-person).
2. Create owner account + any manager/staff accounts needed.
3. Seed initial product catalog (first ~50–100 real SKUs during training).
4. Hand over printed/PDF version of SOP document.
5. Provide developer contact for support questions.

### Success Criteria
- Owner can independently add a product, receive goods, and view a report without assistance.
- All staff accounts are active with correct roles.

---

## Phase 10 – Future: POS Integration (Optional)

**Planned but not in MVP scope**

When a POS system is introduced (e.g., Square, Toast, Clover):
- POS sales will decrement stock via API webhook → new ledger entries with reason = `sold`.
- Stock levels stay accurate without manual sales entry.
- Implementation effort: ~16–24 hours depending on POS vendor API.
- No architectural changes required — the ledger model already supports this.

**[v1.1] Integration approach** (determined by Phase 0 POS discovery step):
- **Preferred:** Real-time webhook → `POST /api/webhooks/pos` (authenticated via shared secret). Server Action creates a ledger entry with `reason = sold`, `performed_by = system`, and `external_id` set to the POS transaction ID to prevent duplicate processing.
- **Fallback:** Scheduled or manual CSV import from POS nightly export. Parsed server-side and inserted as batch ledger entries with the same `external_id` deduplication.

**[v1.1]** The `external_id` column (nullable, unique) is included in the `stock_ledger` schema from Phase 2 onward to enable this deduplication without a future migration.

---

## Risk Register

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| SKU data entry time for large catalog | Medium | Bulk CSV import feature in Phase 5 |
| Staff resistance to new system | Low | Simple UI, bilingual labels, SOP training |
| Internet outage at store | Low | System is cloud-based — mobile hotspot fallback |
| Supabase free tier limits | Low | 500 MB storage, 50,000 MAU — well above needs |
| Scope creep (new features mid-build) | Medium | Change requests reviewed against this plan |

---

## Technology Decisions Log

| Decision | Rationale |
|----------|-----------|
| Next.js App Router | Server components reduce JS bundle; excellent Vercel integration |
| Supabase over Firebase | PostgreSQL + RLS + built-in auth; no vendor lock-in on data |
| Prisma ORM | Type-safe queries; easy migrations; familiar to most JS devs |
| Append-only stock ledger | Full audit trail; no "magic" overwrites; mirrors enterprise practice |
| Tailwind CSS | Fast prototyping; no CSS file sprawl; consistent design system |
| No Redux/Zustand | Next.js server state + React context sufficient for this scale |
