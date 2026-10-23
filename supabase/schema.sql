-- CampusIndustry.Connect — core schema
-- Run this in the Supabase SQL editor (or via `supabase db push`) on a fresh project.

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────
-- Organizations
-- ─────────────────────────────────────────────────────────────────────────

create table colleges (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  domain text not null,            -- e.g. "nit-trichy.ac.in" — used to auto-match signups
  city text,
  verification_status text not null default 'pending'
    check (verification_status in ('pending', 'verified', 'rejected')),
  created_at timestamptz not null default now()
);

create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  domain text not null,            -- e.g. "acmecorp.com"
  verification_status text not null default 'pending'
    check (verification_status in ('pending', 'verified', 'rejected')),
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- People (one row per auth.users id)
-- ─────────────────────────────────────────────────────────────────────────

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null,
  role text not null check (role in ('hr', 'tp', 'admin')),
  college_id uuid references colleges (id),
  company_id uuid references companies (id),
  verification_status text not null default 'pending'
    check (verification_status in ('pending', 'verified', 'rejected')),
  created_at timestamptz not null default now(),
  constraint one_org check (
    (role = 'hr' and company_id is not null and college_id is null) or
    (role = 'tp' and college_id is not null and company_id is null) or
    (role = 'admin' and company_id is null and college_id is null)
  )
);

-- ─────────────────────────────────────────────────────────────────────────
-- Postings (created by HR)
-- ─────────────────────────────────────────────────────────────────────────

create table postings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id),
  created_by uuid not null references profiles (id),
  role_title text not null,
  branches text[] not null default '{}',   -- target fields/branches, e.g. {"CSE","ECE"}
  num_openings int not null check (num_openings > 0),
  target_start date not null,
  target_end date not null,
  description text,
  status text not null default 'open'
    check (status in ('open', 'camp_scheduled', 'closed')),
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- Interest reports (one row per college per posting, entered by T&P)
-- ─────────────────────────────────────────────────────────────────────────

create table interest_reports (
  id uuid primary key default gen_random_uuid(),
  posting_id uuid not null references postings (id) on delete cascade,
  college_id uuid not null references colleges (id),
  reported_by uuid not null references profiles (id),
  interested_count int not null default 0 check (interested_count >= 0),
  eligible_count int not null default 0 check (eligible_count >= 0),
  updated_at timestamptz not null default now(),
  unique (posting_id, college_id)
);

-- ─────────────────────────────────────────────────────────────────────────
-- Messages — one thread per (posting, college) pair
-- ─────────────────────────────────────────────────────────────────────────

create table messages (
  id uuid primary key default gen_random_uuid(),
  posting_id uuid not null references postings (id) on delete cascade,
  college_id uuid not null references colleges (id),
  company_id uuid not null references companies (id),
  sender_id uuid not null references profiles (id),
  sender_role text not null check (sender_role in ('hr', 'tp')),
  body text not null,
  created_at timestamptz not null default now()
);

-- Enable Supabase Realtime subscriptions for live thread updates.
alter publication supabase_realtime add table messages;

-- ─────────────────────────────────────────────────────────────────────────
-- Camps / industry visits
-- ─────────────────────────────────────────────────────────────────────────

create table camps_visits (
  id uuid primary key default gen_random_uuid(),
  posting_id uuid not null references postings (id) on delete cascade,
  college_id uuid not null references colleges (id),
  company_id uuid not null references companies (id),
  type text not null check (type in ('camp', 'visit')),
  scheduled_date date not null,
  status text not null default 'proposed'
    check (status in ('proposed', 'confirmed', 'completed', 'cancelled')),
  created_by uuid not null references profiles (id),
  created_at timestamptz not null default now()
);

-- Only one active (proposed/confirmed) camp or visit per posting+college at
-- a time. The app re-proposes by updating this row rather than inserting a
-- new one; this index is the DB-level backstop against duplicates.
create unique index camps_visits_one_active_per_posting_college
  on camps_visits (posting_id, college_id)
  where status in ('proposed', 'confirmed');

-- ─────────────────────────────────────────────────────────────────────────
-- Helper functions (used by RLS policies)
--
-- These are `security definer`, which means they run with the privileges of
-- the function owner and bypass RLS on the tables they query internally.
-- This is required, not just an optimization: without it, each function's
-- own `select ... from profiles` would re-trigger the `profiles` table's own
-- RLS policies (which call these same functions to check visibility of
-- *other* users' rows), causing infinite recursion the moment the table has
-- more than one row. `set search_path` pins name resolution so the function
-- can't be hijacked by a malicious search_path.
-- ─────────────────────────────────────────────────────────────────────────

create or replace function is_verified_profile()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and verification_status = 'verified'
  );
$$;

create or replace function current_role_name()
returns text language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function current_company_id()
returns uuid language sql stable security definer set search_path = public as $$
  select company_id from profiles where id = auth.uid();
$$;

create or replace function current_college_id()
returns uuid language sql stable security definer set search_path = public as $$
  select college_id from profiles where id = auth.uid();
$$;

create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────────

alter table colleges enable row level security;
alter table companies enable row level security;
alter table profiles enable row level security;
alter table postings enable row level security;
alter table interest_reports enable row level security;
alter table messages enable row level security;
alter table camps_visits enable row level security;

-- colleges / companies: any authenticated user can read (needed to browse/match);
-- only admins can write. New orgs are inserted via the signup flow using the
-- service role (see profile-creation note below), not directly by end users.
create policy "colleges readable by authenticated" on colleges
  for select using (auth.uid() is not null);
create policy "colleges writable by admin" on colleges
  for all using (is_admin()) with check (is_admin());

create policy "companies readable by authenticated" on companies
  for select using (auth.uid() is not null);
create policy "companies writable by admin" on companies
  for all using (is_admin()) with check (is_admin());

-- profiles: users see/edit their own row; admins see/edit all (for approvals)
create policy "profiles self read" on profiles
  for select using (id = auth.uid() or is_admin());
create policy "profiles self update" on profiles
  for update using (id = auth.uid() or is_admin());
create policy "profiles self insert" on profiles
  for insert with check (id = auth.uid());
create policy "profiles admin update status" on profiles
  for update using (is_admin());

-- postings: verified users can read all; only verified HR of the owning
-- company can create/update their own company's postings
create policy "postings readable by verified" on postings
  for select using (is_verified_profile());
create policy "postings insert by owning hr" on postings
  for insert with check (
    current_role_name() = 'hr'
    and company_id = current_company_id()
    and is_verified_profile()
  );
create policy "postings update by owning hr" on postings
  for update using (
    current_role_name() = 'hr'
    and company_id = current_company_id()
  );

-- interest_reports: the reporting college can read/write its own row;
-- the owning company (via the posting) can read all rows for its posting
create policy "interest read by college or company" on interest_reports
  for select using (
    college_id = current_college_id()
    or exists (
      select 1 from postings p
      where p.id = interest_reports.posting_id
        and p.company_id = current_company_id()
    )
    or is_admin()
  );
create policy "interest upsert by owning tp" on interest_reports
  for insert with check (
    current_role_name() = 'tp'
    and college_id = current_college_id()
    and is_verified_profile()
  );
create policy "interest update by owning tp" on interest_reports
  for update using (
    current_role_name() = 'tp'
    and college_id = current_college_id()
  );

-- messages: readable/writable only by the two participants in that
-- (posting, college) thread — the posting's HR side and that college's TP side
create policy "messages read by participants" on messages
  for select using (
    (current_role_name() = 'hr' and company_id = current_company_id())
    or (current_role_name() = 'tp' and college_id = current_college_id())
    or is_admin()
  );
create policy "messages insert by participants" on messages
  for insert with check (
    is_verified_profile()
    and sender_id = auth.uid()
    and (
      (current_role_name() = 'hr' and company_id = current_company_id() and sender_role = 'hr')
      or (current_role_name() = 'tp' and college_id = current_college_id() and sender_role = 'tp')
    )
  );

-- camps_visits: readable/writable by either side of the pairing
create policy "camps read by participants" on camps_visits
  for select using (
    (current_role_name() = 'hr' and company_id = current_company_id())
    or (current_role_name() = 'tp' and college_id = current_college_id())
    or is_admin()
  );
create policy "camps insert by participants" on camps_visits
  for insert with check (
    is_verified_profile()
    and (
      (current_role_name() = 'hr' and company_id = current_company_id())
      or (current_role_name() = 'tp' and college_id = current_college_id())
    )
  );
create policy "camps update by participants" on camps_visits
  for update using (
    (current_role_name() = 'hr' and company_id = current_company_id())
    or (current_role_name() = 'tp' and college_id = current_college_id())
    or is_admin()
  );

-- ─────────────────────────────────────────────────────────────────────────
-- Bootstrap note: to make the first admin, sign up normally, then run:
--   update profiles set role = 'admin', verification_status = 'verified',
--     company_id = null, college_id = null where email = 'you@example.com';
-- ─────────────────────────────────────────────────────────────────────────
