-- =============================================================================
-- La Hacienda — Row Level Security Policies + Auth Trigger
-- =============================================================================
--
-- HOW TO APPLY:
--   1. Open your Supabase project dashboard
--   2. Go to SQL Editor
--   3. Paste this entire file and click Run
--   4. Run again after any schema migration to refresh policies
--
-- ORDER MATTERS:
--   Run this AFTER your Prisma migration creates the tables.
--   Running it before the tables exist will fail.
--
-- ROLE HELPER FUNCTION:
--   All policies call public.user_role() to get the current user's role
--   from the profiles table. This avoids repeating the subquery in every
--   policy and keeps logic consistent.
--
--   NOTE: The function lives in the `public` schema (not `auth`) because
--   Supabase restricts CREATE FUNCTION in the auth schema to internal use.
--
-- DENY-ALL DEFAULT:
--   Every table has RLS enabled. The default is deny-all — nothing is
--   accessible unless an explicit policy grants it.
--
-- =============================================================================


-- =============================================================================
-- STEP 1: Role helper function
--
-- Returns the role ('owner', 'manager', 'staff') for the currently
-- authenticated user by looking up their profile.
--
-- SECURITY DEFINER means it runs with the privileges of the function owner
-- (postgres), allowing it to read profiles even for RLS-restricted tables.
-- STABLE means Postgres can cache the result within a single query.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;


-- =============================================================================
-- STEP 2: Auth trigger — auto-create profile on user signup
--
-- When a new user registers via Supabase Auth, this trigger automatically
-- creates a corresponding row in public.profiles with role = 'staff'.
-- The owner must then manually promote the role via the Supabase dashboard
-- or a Server Action if needed.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, first_name, last_name, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'staff'),
    SPLIT_PART(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), ' ', 1),
    NULLIF(TRIM(SUBSTRING(COALESCE(NEW.raw_user_meta_data->>'full_name', ''), POSITION(' ' IN COALESCE(NEW.raw_user_meta_data->>'full_name', '')) + 1)), ''),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Drop and recreate the trigger so this file is idempotent
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- =============================================================================
-- STEP 3: Schema + table grants
--
-- Newer Supabase projects (post-2023) revoke default public schema access.
-- The anon and authenticated roles need explicit USAGE on the schema
-- and SELECT/INSERT/UPDATE/DELETE on the tables they touch.
-- RLS policies then further restrict what each role can actually see/do.
-- =============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;


-- =============================================================================
-- STEP 3b: Foreign key — stock_ledger.performed_by → profiles.id
--
-- Prisma cannot add this FK because profiles lives in the public schema
-- while Supabase Auth lives in the auth schema, causing Prisma to treat
-- performed_by as a plain UUID string. We add it here so PostgREST can
-- resolve the relationship for joined queries.
--
-- SAFE TO SKIP if existing stock_ledger rows have performed_by values that
-- don't match any profiles.id (the constraint will fail). In that case the
-- mobile dashboard will still work — it just won't show actor names.
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'stock_ledger_performed_by_fkey'
      AND table_name = 'stock_ledger'
  ) THEN
    ALTER TABLE public.stock_ledger
      ADD CONSTRAINT stock_ledger_performed_by_fkey
      FOREIGN KEY (performed_by) REFERENCES public.profiles(id)
      ON DELETE RESTRICT;
  END IF;
END $$;


-- =============================================================================
-- STEP 4: Enable RLS on all tables
-- =============================================================================

ALTER TABLE public.profiles                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_ledger            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tasks           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_results            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_store_config    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_counts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_count_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_documents      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications           ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- STEP 4: Drop all existing policies (makes this file safe to re-run)
-- =============================================================================

DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN (
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
      r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;


-- =============================================================================
-- profiles
--
-- Users can read their own profile.
-- Owners can read ALL profiles (needed for user management and audit views).
-- No one can INSERT via RLS — inserts happen via the auth trigger only.
-- Owners can UPDATE any profile (to promote/demote roles).
-- Users can UPDATE their own profile (to change their display name).
-- =============================================================================

CREATE POLICY "profiles: users read own"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "profiles: owner reads all"
  ON public.profiles FOR SELECT
  USING (public.user_role() = 'owner');

CREATE POLICY "profiles: owner updates any"
  ON public.profiles FOR UPDATE
  USING (public.user_role() = 'owner');

CREATE POLICY "profiles: user updates own"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());


-- =============================================================================
-- categories
--
-- All authenticated users can read categories (needed for product forms).
-- Only owner and manager can create/update categories.
-- No one can delete categories (soft approach — simply don't expose delete UI).
-- =============================================================================

CREATE POLICY "categories: authenticated can read"
  ON public.categories FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "categories: owner/manager can insert"
  ON public.categories FOR INSERT
  WITH CHECK (public.user_role() IN ('owner', 'manager'));

CREATE POLICY "categories: owner/manager can update"
  ON public.categories FOR UPDATE
  USING (public.user_role() IN ('owner', 'manager'));


-- =============================================================================
-- suppliers
--
-- All authenticated users can read suppliers (needed for product and PO forms).
-- Only owner and manager can create/update suppliers.
-- =============================================================================

CREATE POLICY "suppliers: authenticated can read"
  ON public.suppliers FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "suppliers: owner/manager can insert"
  ON public.suppliers FOR INSERT
  WITH CHECK (public.user_role() IN ('owner', 'manager'));

CREATE POLICY "suppliers: owner/manager can update"
  ON public.suppliers FOR UPDATE
  USING (public.user_role() IN ('owner', 'manager'));


-- =============================================================================
-- products
--
-- All authenticated users can read active products.
-- Only owner and manager can create products, update products, or soft-delete
-- (set is_active = false).
-- No one can hard-delete a product row via RLS or the application.
-- =============================================================================

CREATE POLICY "products: authenticated can read active"
  ON public.products FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_active = TRUE);

CREATE POLICY "products: owner/manager can read all (including inactive)"
  ON public.products FOR SELECT
  USING (public.user_role() IN ('owner', 'manager'));

CREATE POLICY "products: owner/manager can insert"
  ON public.products FOR INSERT
  WITH CHECK (public.user_role() IN ('owner', 'manager'));

CREATE POLICY "products: owner/manager can update"
  ON public.products FOR UPDATE
  USING (public.user_role() IN ('owner', 'manager'));


-- =============================================================================
-- stock_ledger — APPEND-ONLY
--
-- All authenticated users can read ledger entries (staff need to see history
-- of their own adjustments; managers need full visibility for reports).
-- All authenticated users can INSERT (staff need to receive goods / adjust).
-- NO ONE can UPDATE or DELETE — enforced at both RLS and application level.
-- performed_by is validated server-side; RLS cannot enforce this directly.
-- =============================================================================

CREATE POLICY "stock_ledger: authenticated can read"
  ON public.stock_ledger FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "stock_ledger: authenticated can insert"
  ON public.stock_ledger FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- No UPDATE policy — append-only
-- No DELETE policy — append-only


-- =============================================================================
-- purchase_orders
--
-- Owner and manager can read, create, and update purchase orders.
-- Staff cannot access purchase orders.
-- =============================================================================

CREATE POLICY "purchase_orders: owner/manager can read"
  ON public.purchase_orders FOR SELECT
  USING (public.user_role() IN ('owner', 'manager'));

CREATE POLICY "purchase_orders: owner/manager can insert"
  ON public.purchase_orders FOR INSERT
  WITH CHECK (public.user_role() IN ('owner', 'manager'));

CREATE POLICY "purchase_orders: owner/manager can update"
  ON public.purchase_orders FOR UPDATE
  USING (public.user_role() IN ('owner', 'manager'));


-- =============================================================================
-- purchase_order_items
--
-- Follows the same access rules as purchase_orders.
-- =============================================================================

CREATE POLICY "purchase_order_items: owner/manager can read"
  ON public.purchase_order_items FOR SELECT
  USING (public.user_role() IN ('owner', 'manager'));

CREATE POLICY "purchase_order_items: owner/manager can insert"
  ON public.purchase_order_items FOR INSERT
  WITH CHECK (public.user_role() IN ('owner', 'manager'));

CREATE POLICY "purchase_order_items: owner/manager can update"
  ON public.purchase_order_items FOR UPDATE
  USING (public.user_role() IN ('owner', 'manager'));


-- =============================================================================
-- project_tasks — Phase 4b
--
-- Owner and manager can read, create, and update tasks.
-- Staff cannot access the task board.
-- =============================================================================

CREATE POLICY "project_tasks: owner/manager can read"
  ON public.project_tasks FOR SELECT
  USING (public.user_role() IN ('owner', 'manager'));

CREATE POLICY "project_tasks: owner/manager can insert"
  ON public.project_tasks FOR INSERT
  WITH CHECK (public.user_role() IN ('owner', 'manager'));

CREATE POLICY "project_tasks: owner/manager can update"
  ON public.project_tasks FOR UPDATE
  USING (public.user_role() IN ('owner', 'manager'));


-- =============================================================================
-- task_comments — APPEND-ONLY
--
-- Owner and manager can read and insert comments.
-- NO UPDATE or DELETE — append-only comment thread.
-- =============================================================================

CREATE POLICY "task_comments: owner/manager can read"
  ON public.task_comments FOR SELECT
  USING (public.user_role() IN ('owner', 'manager'));

CREATE POLICY "task_comments: owner/manager can insert"
  ON public.task_comments FOR INSERT
  WITH CHECK (public.user_role() IN ('owner', 'manager'));

-- No UPDATE policy — append-only
-- No DELETE policy — append-only


-- =============================================================================
-- test_results — Phase 7
--
-- Owner and manager can read and insert test results.
-- NO UPDATE or DELETE — append-only audit trail.
-- =============================================================================

CREATE POLICY "test_results: owner/manager can read"
  ON public.test_results FOR SELECT
  USING (public.user_role() IN ('owner', 'manager'));

CREATE POLICY "test_results: owner/manager can insert"
  ON public.test_results FOR INSERT
  WITH CHECK (public.user_role() IN ('owner', 'manager'));

-- No UPDATE policy — append-only
-- No DELETE policy — append-only


-- =============================================================================
-- schedule — Phase 10: Staff Scheduling
--
-- Staff can read their own shifts only.
-- Manager/owner can read all shifts and perform all writes.
-- No DELETE policy at the RLS level — hard deletes are allowed for draft
-- schedule changes (unlike the stock ledger which is append-only).
-- =============================================================================

ALTER TABLE public.schedule ENABLE ROW LEVEL SECURITY;

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


-- =============================================================================
-- payroll_periods — Phase 10: Payroll
--
-- Manager/owner can read. Only owner can create or update (close) periods.
-- No DELETE — payroll records are permanent.
-- =============================================================================

ALTER TABLE public.payroll_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payroll_periods: manager can read"
  ON public.payroll_periods FOR SELECT
  USING (public.user_role() IN ('owner', 'manager'));

CREATE POLICY "payroll_periods: owner can insert"
  ON public.payroll_periods FOR INSERT
  WITH CHECK (public.user_role() = 'owner');

CREATE POLICY "payroll_periods: owner can update"
  ON public.payroll_periods FOR UPDATE
  USING (public.user_role() = 'owner');


-- =============================================================================
-- payroll_entries — Phase 10: Payroll
--
-- Manager/owner can read and write entries for open periods.
-- (Period closed check is enforced in the Server Action, not RLS.)
-- No DELETE — payroll entries are permanent once the period is closed.
-- =============================================================================

ALTER TABLE public.payroll_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payroll_entries: manager can read"
  ON public.payroll_entries FOR SELECT
  USING (public.user_role() IN ('owner', 'manager'));

CREATE POLICY "payroll_entries: manager can insert"
  ON public.payroll_entries FOR INSERT
  WITH CHECK (public.user_role() IN ('owner', 'manager'));

CREATE POLICY "payroll_entries: manager can update"
  ON public.payroll_entries FOR UPDATE
  USING (public.user_role() IN ('owner', 'manager'));


-- =============================================================================
-- stores
--
-- All authenticated users can read stores (needed for filters and forms).
-- Only owner and manager can create/update stores.
-- =============================================================================

CREATE POLICY "stores: authenticated can read"
  ON public.stores FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "stores: owner/manager can insert"
  ON public.stores FOR INSERT
  WITH CHECK (public.user_role() IN ('owner', 'manager'));

CREATE POLICY "stores: owner/manager can update"
  ON public.stores FOR UPDATE
  USING (public.user_role() IN ('owner', 'manager'));


-- =============================================================================
-- product_store_config
--
-- All authenticated users can read store-specific product config.
-- Only owner and manager can create/update config.
-- =============================================================================

CREATE POLICY "product_store_config: authenticated can read"
  ON public.product_store_config FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "product_store_config: owner/manager can insert"
  ON public.product_store_config FOR INSERT
  WITH CHECK (public.user_role() IN ('owner', 'manager'));

CREATE POLICY "product_store_config: owner/manager can update"
  ON public.product_store_config FOR UPDATE
  USING (public.user_role() IN ('owner', 'manager'));


-- =============================================================================
-- inventory_counts
--
-- All authenticated users can read inventory counts.
-- Owner and manager can create/update count sessions.
-- =============================================================================

CREATE POLICY "inventory_counts: authenticated can read"
  ON public.inventory_counts FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "inventory_counts: owner/manager can insert"
  ON public.inventory_counts FOR INSERT
  WITH CHECK (public.user_role() IN ('owner', 'manager'));

CREATE POLICY "inventory_counts: owner/manager can update"
  ON public.inventory_counts FOR UPDATE
  USING (public.user_role() IN ('owner', 'manager'));


-- =============================================================================
-- inventory_count_items
--
-- All authenticated users can read and update count items (staff enter counts).
-- Owner and manager can insert new count item rows.
-- =============================================================================

CREATE POLICY "inventory_count_items: authenticated can read"
  ON public.inventory_count_items FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "inventory_count_items: owner/manager can insert"
  ON public.inventory_count_items FOR INSERT
  WITH CHECK (public.user_role() IN ('owner', 'manager'));

CREATE POLICY "inventory_count_items: authenticated can update"
  ON public.inventory_count_items FOR UPDATE
  USING (auth.uid() IS NOT NULL);


-- =============================================================================
-- time_entries
--
-- Users can read their own entries; owner/manager can read all.
-- All authenticated users can insert (staff clock in/out).
-- Owner and manager can update (corrections).
-- =============================================================================

CREATE POLICY "time_entries: users read own"
  ON public.time_entries FOR SELECT
  USING (profile_id = auth.uid()
      OR public.user_role() IN ('owner', 'manager'));

CREATE POLICY "time_entries: authenticated can insert"
  ON public.time_entries FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "time_entries: owner/manager can update"
  ON public.time_entries FOR UPDATE
  USING (public.user_role() IN ('owner', 'manager'));


-- =============================================================================
-- employee_documents
--
-- Users can read their own documents; owner/manager can read all.
-- Owner and manager can insert and update documents.
-- =============================================================================

CREATE POLICY "employee_documents: users read own"
  ON public.employee_documents FOR SELECT
  USING (profile_id = auth.uid()
      OR public.user_role() IN ('owner', 'manager'));

CREATE POLICY "employee_documents: owner/manager can insert"
  ON public.employee_documents FOR INSERT
  WITH CHECK (public.user_role() IN ('owner', 'manager'));

CREATE POLICY "employee_documents: owner/manager can update"
  ON public.employee_documents FOR UPDATE
  USING (public.user_role() IN ('owner', 'manager'));


-- =============================================================================
-- notifications
--
-- Users can only read, update, and delete their own notifications.
-- System (service role) inserts notifications server-side.
-- =============================================================================

CREATE POLICY "notifications: users read own"
  ON public.notifications FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "notifications: users update own"
  ON public.notifications FOR UPDATE
  USING (profile_id = auth.uid());

CREATE POLICY "notifications: users delete own"
  ON public.notifications FOR DELETE
  USING (profile_id = auth.uid());


-- =============================================================================
-- STEP 5: Verify — run this SELECT to confirm policies were created
-- =============================================================================
--
-- SELECT schemaname, tablename, policyname, cmd
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;
