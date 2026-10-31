-- Apply this migration to an existing CampusIndustry.Connect database.
-- New installations already receive these fields from schema.sql.

alter table profiles
  add column if not exists phone text,
  add column if not exists alternate_email text,
  add column if not exists profile_photo_path text,
  add column if not exists resume_path text,
  add column if not exists gender text,
  add column if not exists designation text,
  add column if not exists department text,
  add column if not exists linkedin_url text,
  add column if not exists hiring_authority text,
  add column if not exists office_location text,
  add column if not exists office_phone text,
  add column if not exists programs_branches text;

alter table profiles
  add column if not exists is_primary boolean not null default true;

alter table profiles
  drop constraint if exists profiles_gender_check;

alter table profiles
  add constraint profiles_gender_check
  check (gender in ('female', 'male', 'non_binary', 'prefer_not_to_say'));

insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false)
on conflict (id) do nothing;

drop policy if exists "profile photos self manage" on storage.objects;

create policy "profile photos self manage" on storage.objects
  for all using (
    bucket_id = 'profile-photos'
    and ((storage.foldername(name))[1] = auth.uid()::text or is_admin())
  )
  with check (
    bucket_id = 'profile-photos'
    and ((storage.foldername(name))[1] = auth.uid()::text or is_admin())
  );

drop policy if exists "resumes self manage" on storage.objects;

create policy "resumes self manage" on storage.objects
  for all using (
    bucket_id = 'resumes'
    and ((storage.foldername(name))[1] = auth.uid()::text or is_admin())
  )
  with check (
    bucket_id = 'resumes'
    and ((storage.foldername(name))[1] = auth.uid()::text or is_admin())
  );

drop policy if exists "postings delete by owning hr" on postings;

create policy "postings delete by owning hr" on postings
  for delete using (
    current_role_name() = 'hr'
    and company_id = current_company_id()
  );

create index if not exists postings_company_created_at_idx
  on postings (company_id, created_at desc);
create index if not exists postings_status_created_at_idx
  on postings (status, created_at desc);
create index if not exists interest_reports_college_id_idx
  on interest_reports (college_id);
create index if not exists camps_visits_college_schedule_idx
  on camps_visits (college_id, status, scheduled_date);
create index if not exists camps_visits_company_schedule_idx
  on camps_visits (company_id, status, scheduled_date);
