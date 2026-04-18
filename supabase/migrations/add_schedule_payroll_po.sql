-- =============================================================================
-- Migration: Schedule, Payroll, and Purchase Order enhancements
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- Run AFTER the existing schema is already applied.
-- =============================================================================


-- ── 1. schedule ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.schedule (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID        NOT NULL,
  week_start  DATE        NOT NULL,
  day_of_week INTEGER     NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time  TEXT        NOT NULL,
  end_time    TEXT        NOT NULL,
  position    TEXT,
  note        TEXT,
  created_by  UUID        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS schedule_week_start_idx         ON public.schedule (week_start);
CREATE INDEX IF NOT EXISTS schedule_profile_id_idx         ON public.schedule (profile_id);
CREATE INDEX IF NOT EXISTS schedule_week_profile_idx       ON public.schedule (week_start, profile_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS schedule_updated_at ON public.schedule;
CREATE TRIGGER schedule_updated_at
  BEFORE UPDATE ON public.schedule
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ── 2. payroll_periods ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.payroll_periods (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start DATE        NOT NULL,
  period_end   DATE        NOT NULL,
  frequency    TEXT        NOT NULL DEFAULT 'weekly',
  status       TEXT        NOT NULL DEFAULT 'open',
  created_by   UUID        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payroll_periods_start_idx ON public.payroll_periods (period_start);

DROP TRIGGER IF EXISTS payroll_periods_updated_at ON public.payroll_periods;
CREATE TRIGGER payroll_periods_updated_at
  BEFORE UPDATE ON public.payroll_periods
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ── 3. payroll_entries ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.payroll_entries (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_period_id UUID         NOT NULL REFERENCES public.payroll_periods(id),
  profile_id        UUID         NOT NULL,
  actual_hours      NUMERIC(6,2),
  hourly_rate       NUMERIC(8,2),
  note              TEXT,
  created_by        UUID         NOT NULL,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (payroll_period_id, profile_id)
);

CREATE INDEX IF NOT EXISTS payroll_entries_period_idx  ON public.payroll_entries (payroll_period_id);
CREATE INDEX IF NOT EXISTS payroll_entries_profile_idx ON public.payroll_entries (profile_id);

DROP TRIGGER IF EXISTS payroll_entries_updated_at ON public.payroll_entries;
CREATE TRIGGER payroll_entries_updated_at
  BEFORE UPDATE ON public.payroll_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ── 4. purchase_orders — new columns ─────────────────────────────────────────

ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS po_number    TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS shipped_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tracking_ref TEXT,
  ADD COLUMN IF NOT EXISTS expected_at  DATE;

-- Back-fill po_number for any existing orders
DO $$
DECLARE
  rec   RECORD;
  yr    INTEGER := EXTRACT(YEAR FROM now())::INTEGER;
  seq   INTEGER := 1;
BEGIN
  FOR rec IN
    SELECT id FROM public.purchase_orders
    WHERE po_number IS NULL
    ORDER BY created_at
  LOOP
    UPDATE public.purchase_orders
    SET po_number = 'PO-' || yr || '-' || LPAD(seq::TEXT, 4, '0')
    WHERE id = rec.id;
    seq := seq + 1;
  END LOOP;
END $$;


-- ── 5. purchase_order_items — new column ──────────────────────────────────────

ALTER TABLE public.purchase_order_items
  ADD COLUMN IF NOT EXISTS qty_shipped NUMERIC(10,3);


-- ── 6. RLS policies ───────────────────────────────────────────────────────────

-- schedule
ALTER TABLE public.schedule ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "schedule: staff reads own"    ON public.schedule;
DROP POLICY IF EXISTS "schedule: manager can insert" ON public.schedule;
DROP POLICY IF EXISTS "schedule: manager can update" ON public.schedule;
DROP POLICY IF EXISTS "schedule: manager can delete" ON public.schedule;

CREATE POLICY "schedule: staff reads own"
  ON public.schedule FOR SELECT
  USING (profile_id = auth.uid()
      OR public.user_role() IN ('owner', 'manager'));

CREATE POLICY "schedule: manager can insert"
  ON public.schedule FOR INSERT
  WITH CHECK (public.user_role() IN ('owner', 'manager'));

CREATE POLICY "schedule: manager can update"
  ON public.schedule FOR UPDATE
  USING (public.user_role() IN ('owner', 'manager'));

CREATE POLICY "schedule: manager can delete"
  ON public.schedule FOR DELETE
  USING (public.user_role() IN ('owner', 'manager'));


-- payroll_periods
ALTER TABLE public.payroll_periods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payroll_periods: manager can read"  ON public.payroll_periods;
DROP POLICY IF EXISTS "payroll_periods: owner can insert"  ON public.payroll_periods;
DROP POLICY IF EXISTS "payroll_periods: owner can update"  ON public.payroll_periods;

CREATE POLICY "payroll_periods: manager can read"
  ON public.payroll_periods FOR SELECT
  USING (public.user_role() IN ('owner', 'manager'));

CREATE POLICY "payroll_periods: owner can insert"
  ON public.payroll_periods FOR INSERT
  WITH CHECK (public.user_role() = 'owner');

CREATE POLICY "payroll_periods: owner can update"
  ON public.payroll_periods FOR UPDATE
  USING (public.user_role() = 'owner');


-- payroll_entries
ALTER TABLE public.payroll_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payroll_entries: manager can read"   ON public.payroll_entries;
DROP POLICY IF EXISTS "payroll_entries: manager can insert" ON public.payroll_entries;
DROP POLICY IF EXISTS "payroll_entries: manager can update" ON public.payroll_entries;

CREATE POLICY "payroll_entries: manager can read"
  ON public.payroll_entries FOR SELECT
  USING (public.user_role() IN ('owner', 'manager'));

CREATE POLICY "payroll_entries: manager can insert"
  ON public.payroll_entries FOR INSERT
  WITH CHECK (public.user_role() IN ('owner', 'manager'));

CREATE POLICY "payroll_entries: manager can update"
  ON public.payroll_entries FOR UPDATE
  USING (public.user_role() IN ('owner', 'manager'));


-- ── 7. Verify ─────────────────────────────────────────────────────────────────
-- Run this to confirm all tables and policies were created:
--
-- SELECT tablename, rowsecurity FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;
