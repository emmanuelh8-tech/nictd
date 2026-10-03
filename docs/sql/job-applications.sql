-- Careers page applications (run once in the Supabase SQL editor).
--
-- Applicants submit from the public /careers form. Nobody can read, edit or delete applications
-- through the public API: row level security is on, the only policy allows inserts, and the
-- anon/authenticated roles hold no SELECT grant. Reading applications needs the server's secret
-- key (SUPABASE_SECRET_KEY), which bypasses RLS. See docs/sql/rls-lockdown.sql for the rest of
-- the tables.
--
-- CV files are not stored here: the server writes them to data/applications/ (outside /public)
-- and records only the stored filename.
--
-- Until this table exists, the server keeps each application as one line of
-- data/applications/applications.jsonl (same fields), so applicants are never turned away.
-- Once the table is created, new applications go here.

create table if not exists public.job_applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  reference text unique check (reference ~ '^NICTD-[0-9]{6}-[0-9A-F]{4}$'),
  role_title text not null check (char_length(role_title) between 1 and 120),
  full_name text not null check (char_length(full_name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 180),
  phone text check (char_length(phone) <= 40),
  county text not null check (char_length(county) between 1 and 60),
  cover_note text check (char_length(cover_note) <= 2000),
  cv_file text not null check (char_length(cv_file) <= 200),
  cv_original_name text check (char_length(cv_original_name) <= 200),
  status text not null default 'new'
    check (status in ('new', 'reviewing', 'shortlisted', 'declined', 'hired'))
);
comment on table public.job_applications is
  'Careers page applications. RLS on: anon/authenticated may insert only; reads need the secret key.';

alter table public.job_applications enable row level security;

drop policy if exists "applicants can submit" on public.job_applications;
create policy "applicants can submit" on public.job_applications
  for insert to anon, authenticated
  with check (status = 'new');

revoke all on public.job_applications from anon, authenticated;
grant insert on public.job_applications to anon, authenticated;

-- To undo:  drop table public.job_applications;
