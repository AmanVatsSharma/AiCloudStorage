-- Add explicit trash timestamp for retention governance logic.
alter table if exists public.files
  add column if not exists trashed_at timestamptz;

comment on column public.files.trashed_at is
  'Timestamp when file was moved to trash. Used for retention-based purge eligibility.';

-- Backfill historical records so existing trashed files can participate in retention checks.
update public.files
set trashed_at = coalesce(updated_at, created_at, now())
where is_trashed = true
  and trashed_at is null;

create index if not exists idx_files_user_trashed_at
  on public.files (user_id, is_trashed, trashed_at desc);
