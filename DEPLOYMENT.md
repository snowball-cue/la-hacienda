# La Hacienda — Production Deployment Runbook

This document is the step-by-step guide for deploying the La Hacienda inventory
system to production. Follow each section in order.

---

## Prerequisites

- Node.js 20+ installed locally
- Vercel CLI: `npm i -g vercel`
- Supabase CLI: `npm i -g supabase`
- Access to the Supabase organisation (two projects: **dev** and **prod**)
- Access to the Vercel project
- Completed and tested development environment

---

## 1. Create the Production Supabase Project

1. Log in to [supabase.com](https://supabase.com) → New Project
2. Name: `la-hacienda-prod` | Region: **US East (N. Virginia)** (closest to Vercel iad1)
3. Generate a strong database password — save it in your password manager
4. Wait for the project to finish provisioning (~2 min)

---

## 2. Configure Environment Variables

### Gather Supabase credentials (prod project)

In the Supabase dashboard → **Project Settings → API**:

| Variable | Where to find it |
|----------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` `public` key |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` key (keep secret) |

In **Project Settings → Database → Connection string → Transaction pooler**:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Transaction pooler URL — append `?pgbouncer=true&connection_limit=1` |
| `DIRECT_URL` | Session mode / direct connection URL (for migrations only) |

### Add to Vercel

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add DATABASE_URL production
vercel env add DIRECT_URL production
```

Or add them through the Vercel dashboard → Project → Settings → Environment Variables.

---

## 3. Apply Database Migrations

Run migrations against the **production** database using the direct connection URL:

```bash
# Set DIRECT_URL to the prod direct connection for this command only
DIRECT_URL="<prod-direct-url>" npx prisma migrate deploy
```

Verify all migrations applied:

```bash
npx prisma migrate status
```

All migrations should show **Applied**.

---

## 4. Seed Categories and Units

The seed script creates categories, units, and one initial owner account.

```bash
# Point DATABASE_URL to prod direct connection temporarily
DATABASE_URL="<prod-direct-url>" npx tsx prisma/seed.ts
```

This is a one-time operation. Do **not** re-run on an existing database.

---

## 5. Enable Row Level Security (RLS)

Apply the RLS policies file to the production database:

1. In the Supabase dashboard → **SQL Editor**
2. Open and paste the contents of `supabase/rls-policies.sql`
3. Click **Run**
4. Verify: go to **Table Editor** → each table → **RLS** column shows **Enabled**

Critical check — every table must have RLS **on** with policies:

```sql
-- Quick verification query
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

All `rowsecurity` values must be `true`.

---

## 6. Create the Owner Account

1. Supabase dashboard → **Authentication → Users → Invite user**
2. Enter the owner's email address
3. They receive an invitation email — they set their password
4. After they log in for the first time, their profile row is created automatically
5. Update their role to `owner` via the SQL Editor:

```sql
UPDATE profiles SET role = 'owner' WHERE id = '<their-auth-user-id>';
```

Find their UUID: **Authentication → Users** → click their row → copy the User UID.

---

## 7. Deploy to Vercel

```bash
# Link the repo to the Vercel project (first time only)
vercel link

# Deploy to production
vercel --prod
```

Or push to the `main` branch — Vercel auto-deploys on every push to `main`.

---

## 8. Post-Deployment Verification Checklist

Run through each item after every production deployment:

### Authentication
- [ ] `/login` page loads and accepts credentials
- [ ] Invalid credentials show an error message (not a crash)
- [ ] Logged-in user is redirected to `/dashboard`
- [ ] Logging out redirects to `/login`

### Dashboard
- [ ] Dashboard stats load (Total SKUs, Low Stock, Soon to Expire)
- [ ] Recent Activity section appears for manager+
- [ ] Low-stock alert count is accurate

### Inventory
- [ ] Product list loads with categories and filters
- [ ] New product can be created (owner/manager)
- [ ] Stock adjustment form saves and updates the ledger
- [ ] Archive button soft-deletes (product disappears from active list)
- [ ] CSV import works with `public/product-import-template.csv`

### Reports
- [ ] Low-Stock report loads and CSV downloads correctly
- [ ] Inventory Snapshot report loads with correct totals
- [ ] Movements report loads with date/product filters working
- [ ] All CSV downloads are named correctly and open in Excel/Sheets

### Settings
- [ ] Settings page is accessible to owner only
- [ ] Role change saves and reloads immediately
- [ ] Staff and Manager are redirected away from Settings

### Security
- [ ] Check response headers in browser DevTools → Network:
  - `X-Frame-Options: SAMEORIGIN`
  - `X-Content-Type-Options: nosniff`
  - `Strict-Transport-Security: max-age=63072000...`
- [ ] `/dashboard` redirects to `/login` when not authenticated
- [ ] A staff account cannot access `/dashboard/settings` or `/dashboard/reports`

---

## 9. Rollback Procedure

If a deployment causes issues:

```bash
# Revert to the previous Vercel deployment
vercel rollback
```

For database issues, Supabase has point-in-time recovery on Pro plans.
Contact Supabase support if a migration needs to be reversed.

---

## 10. Environment Summary

| Environment | Supabase Project | Vercel Branch | URL |
|-------------|-----------------|---------------|-----|
| Development | `la-hacienda-dev` | `main` (local) | `http://localhost:3000` |
| Production  | `la-hacienda-prod` | `main` (auto-deploy) | Assigned by Vercel |

---

## Ongoing Maintenance

- **Schema changes:** `npx prisma migrate dev --name <description>` in dev,
  then `npx prisma migrate deploy` in prod after merging to `main`.
- **Adding staff:** Supabase dashboard → Authentication → Invite User → set role
  in Settings page.
- **Backups:** Supabase performs daily automated backups on Pro plans. Verify
  this is enabled in Project Settings → Backups.
