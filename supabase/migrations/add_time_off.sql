-- =============================================================================
-- Migration: Time-Off tracking — shift types + time_off_requests
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- Run AFTER add_schedule_payroll_po.sql has been applied.
-- =============================================================================


-- ── 1. Add shift_type to schedule ─────────────────────────────────────────────
-- shift_type values:
--   work      Regular scheduled shift (has start_time + end_time)
--   day_off   Scheduled rest day (no hours)
--   vacation  Paid vacation day (no hours)
--   sick      Sick day (no hours)
--   holiday   Public holiday / store closed (no hours)

ALTER TABLE public.schedule
  ADD COLUMN IF NOT EXISTS shift_type TEXT NOT NULL DEFAULT 'work';

-- Make start_time and end_time nullable (non-work entries have no hours)
ALTER TABLE public.schedule
  ALTER COLUMN start_time DROP NOT NULL,
  ALTER COLUMN end_time   DROP NOT NULL;

-- Add CHECK constraint so only valid types are stored
ALTER TABLE public.schedule
  DROP CONSTRAINT IF EXISTS schedule_shift_type_check;
ALTER TABLE public.schedule
  ADD CONSTRAINT schedule_shift_type_check
    CHECK (shift_type IN ('work', 'day_off', 'vacation', 'sick', 'holiday'));


-- ── 2. time_off_requests ──────────────────────────────────────────────────────
-- Tracks multi-day time-off requests with an approval workflow.
-- Staff submit requests; managers approve or deny them.
-- Approved requests can be reflected in the schedule grid by the manager.

CREATE TABLE IF NOT EXISTS public.time_off_requests (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   UUID        NOT NULL,
  type         TEXT        NOT NULL DEFAULT 'vacation',
  date_start   DATE        NOT NULL,
  date_end     DATE        NOT NULL,
  total_days   NUMERIC(4,1),
  status       TEXT        NOT NULL DEFAULT 'pending',
  note         TEXT,
  approved_by  UUID,
  approved_at  TIMESTAMPTZ,
  created_by   UUID        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT time_off_type_check
    CHECK (type IN ('vacation', 'sick', 'personal', 'holiday')),
  CONSTRAINT time_off_status_check
    CHECK (status IN ('pending', 'approved', 'denied')),
  CONSTRAINT time_off_date_order_check
    CHECK (date_end >= date_start)
);

CREATE INDEX IF NOT EXISTS time_off_profile_idx    ON public.time_off_requests (profile_id);
CREATE INDEX IF NOT EXISTS time_off_date_start_idx ON public.time_off_requests (date_start);
CREATE INDEX IF NOT EXISTS time_off_status_idx     ON public.time_off_requests (status);

DROP TRIGGER IF EXISTS time_off_requests_updated_at ON public.time_off_requests;
CREATE TRIGGER time_off_requests_updated_at
  BEFORE UPDATE ON public.time_off_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ── 3. RLS for time_off_requests ──────────────────────────────────────────────

ALTER TABLE public.time_off_requests ENABLE ROW LEVEL SECURITY;

-- Staff can see their own; managers/owner see all
DROP POLICY IF EXISTS "time_off: read own or manager" ON public.time_off_requests;
CREATE POLICY "time_off: read own or manager"
  ON public.time_off_requests FOR SELECT
  USING (
    profile_id = auth.uid()
    OR public.user_role() IN ('owner', 'manager')
  );

-- Anyone can submit a request for themselves
DROP POLICY IF EXISTS "time_off: staff can insert own" ON public.time_off_requests;
CREATE POLICY "time_off: staff can insert own"
  ON public.time_off_requests FOR INSERT
  WITH CHECK (profile_id = auth.uid());

-- Only managers/owner can approve/deny (update status, approved_by, approved_at)
DROP POLICY IF EXISTS "time_off: manager can update" ON public.time_off_requests;
CREATE POLICY "time_off: manager can update"
  ON public.time_off_requests FOR UPDATE
  USING (public.user_role() IN ('owner', 'manager'));

-- Staff can delete their own PENDING requests
DROP POLICY IF EXISTS "time_off: staff can delete pending own" ON public.time_off_requests;
CREATE POLICY "time_off: staff can delete pending own"
  ON public.time_off_requests FOR DELETE
  USING (
    profile_id = auth.uid()
    AND status = 'pending'
  );


-- ── 4. Verify ─────────────────────────────────────────────────────────────────
-- Run to confirm:
--
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'schedule'
-- ORDER BY ordinal_position;
--
-- SELECT tablename, rowsecurity FROM pg_tables
-- WHERE schemaname = 'public' ORDER BY tablename;
