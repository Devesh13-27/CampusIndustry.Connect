# CampusIndustry.Connect

A private, invite-only portal connecting company HR teams and college
Training & Placement (T&P) officers — post openings, report interest,
message, and schedule recruitment camps / industry visits. No student
accounts, no payments, and no resume parsing — just the core discover → talk
→ schedule loop. Users can optionally upload a private resume for
administrator management.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase (Postgres + Auth + Row-Level Security)

## Setup

1. Create a Supabase project at [supabase.com](https://supabase.com).
2. In the SQL editor, run [`supabase/schema.sql`](supabase/schema.sql) — this
   creates all tables, RLS policies, and helper functions.
   If the database was created from an earlier version of the schema, run
   [`supabase/add_user_profiles.sql`](supabase/add_user_profiles.sql) instead
   to add the role-specific profile fields and private photo/resume storage.
3. Copy `.env.local.example` to `.env.local` and fill in your project's URL
   and keys (Project Settings → API):
   ```bash
   cp .env.local.example .env.local
   ```
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — safe for
     the browser.
   - `SUPABASE_SERVICE_ROLE_KEY` — server-only, used by the signup flow to
     create the org record and auth user before RLS would otherwise allow
     it. **Never expose this to the client.**
4. Install dependencies and run the dev server:
   ```bash
   npm install
   npm run dev
   ```
5. Sign up once through the app (`/signup`) to create your own account,
   then promote yourself to admin directly in the Supabase SQL editor:
   ```sql
   update profiles set role = 'admin', verification_status = 'verified',
     company_id = null, college_id = null where email = 'you@example.com';
   ```
   From then on, log in and use `/admin` to approve every new signup.

   After signing up, users can complete or update their profile at `/profile`.
   Profiles include common contact details and role-specific information for HR
   and T&P officers. Profile photos are stored in the private `profile-photos`
   Supabase Storage bucket.
   The primary HR or T&P account can add up to two assistant members from the
   profile page. Assistants use the same organization and role, but cannot add
   or remove organization members. The primary account provides each assistant
   with a temporary password, which should be shared securely.
   Resumes are stored separately in the private `resumes` bucket. Admins can
   delete users, job openings, and uploaded resumes from `/admin`.

### Password recovery

Add these URLs under Supabase **Authentication → URL Configuration → Redirect
URLs**:

```text
http://localhost:3000/reset-password
https://your-deployed-domain.com/reset-password
```

The login page links to `/forgot-password`. Supabase sends the recovery email
to `/reset-password`, where the user can choose a new password.

## How verification works

Signup requires an official (non-freemail) email address. The domain is
matched against existing colleges/companies, or a new pending org record is
created. Every new account starts `pending` and is invisible to the rest of
the platform until an admin approves both the person and their organization
from `/admin`. This is the trust layer the whole product depends on — no
student accounts, and no company or college can be impersonated.

## Core loop

- **HR** creates a posting → sees which colleges have logged interest →
  messages a T&P officer → proposes a camp/visit → marks the posting
  `camp_scheduled` / `closed`.
- **T&P** sees the feed of open postings → logs interested/eligible student
  counts for their college → messages the HR contact → confirms proposed
  camps/visits, tracked on `/college/camps`.
