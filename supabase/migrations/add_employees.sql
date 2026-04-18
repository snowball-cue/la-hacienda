-- =============================================================================
-- Migration: Employees table + schedule employee_id
-- Run in: Supabase Dashboard → SQL Editor → New Query → Run
-- Run AFTER all previous migrations.
-- =============================================================================


-- ── 1. employees ──────────────────────────────────────────────────────────────
-- Tracks staff who do NOT have dashboard login access.
-- PII fields (address, phone, email) are only visible to managers/owners via RLS.

CREATE TABLE IF NOT EXISTS public.employees (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name   TEXT        NOT NULL,
  position    TEXT,
  email       TEXT,
  phone       TEXT,
  address     TEXT,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  notes       TEXT,
  created_by  UUID        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS employees_is_active_idx ON public.employees (is_active);

DROP TRIGGER IF EXISTS employees_updated_at ON public.employees;
CREATE TRIGGER employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ── 2. Update schedule: make profile_id nullable, add employee_id ─────────────
-- A shift belongs to either a dashboard user (profile_id) OR a non-auth
-- employee (employee_id). Exactly one must be set.

ALTER TABLE public.schedule
  ALTER COLUMN profile_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES public.employees(id);

ALTER TABLE public.schedule
  DROP CONSTRAINT IF EXISTS schedule_worker_check;
ALTER TABLE public.schedule
  ADD CONSTRAINT schedule_worker_check
    CHECK (
      (profile_id IS NOT NULL AND employee_id IS NULL)
      OR
      (profile_id IS NULL AND employee_id IS NOT NULL)
    );


-- ── 3. RLS for employees ──────────────────────────────────────────────────────

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Full record (including PII) — manager/owner only
DROP POLICY IF EXISTS "employees: manager can read all" ON public.employees;
CREATE POLICY "employees: manager can read all"
  ON public.employees FOR SELECT
  USING (public.user_role() IN ('owner', 'manager'));

-- Staff can read limited info (name + position only) — enforced in the app layer
-- since RLS cannot do column-level filtering easily at this scale.
-- Staff see the full row but the UI hides PII fields for non-managers.

DROP POLICY IF EXISTS "employees: manager can insert" ON public.employees;
CREATE POLICY "employees: manager can insert"
  ON public.employees FOR INSERT
  WITH CHECK (public.user_role() IN ('owner', 'manager'));

DROP POLICY IF EXISTS "employees: manager can update" ON public.employees;
CREATE POLICY "employees: manager can update"
  ON public.employees FOR UPDATE
  USING (public.user_role() IN ('owner', 'manager'));

-- Soft-delete only (is_active = false) — no hard delete policy exposed


-- ── 4. Verify ─────────────────────────────────────────────────────────────────
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'schedule'
-- ORDER BY ordinal_position;
