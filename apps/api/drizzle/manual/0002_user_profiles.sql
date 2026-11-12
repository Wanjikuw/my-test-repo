-- Run this once in the Supabase SQL editor (or `psql`) after 0001_rls_policies.sql.
-- Kept in drizzle/manual/ for the same reason: the API never touches this table, so drizzle-kit
-- has no business generating or sequencing it. The web app reads and writes it directly with the
-- signed-in user's own token, and row-level security is what keeps one person's rows from another.
--
-- A skin type and declared allergies are health-adjacent, so a row exists only after the person
-- chose "Save to my account", and deleting the row (or the account) removes everything.

create table if not exists public.user_profiles (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  skin_type text
    check (skin_type in ('dry', 'oily', 'combination', 'sensitive', 'normal')),
  sensitivity_issues text[] not null default '{}'
    check (
      sensitivity_issues <@ array['stinging', 'redness', 'fragrance_reaction', 'rash']::text[]
      and cardinality(sensitivity_issues) <= 4
    ),
  sun_exposure text
    check (sun_exposure in ('expected', 'avoided')),
  declared_allergies text[] not null default '{}'
    check (
      cardinality(declared_allergies) <= 50
      and octet_length(array_to_string(declared_allergies, '|')) <= 5100
    ),
  updated_at timestamptz not null default now()
);

-- The clock that decides which copy is newer is the database's, not a phone's.
create or replace function public.touch_user_profile()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists user_profiles_touch on public.user_profiles;
create trigger user_profiles_touch
  before insert or update on public.user_profiles
  for each row execute function public.touch_user_profile();

alter table public.user_profiles enable row level security;

drop policy if exists "own profile is readable" on public.user_profiles;
create policy "own profile is readable"
  on public.user_profiles for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "own profile can be created" on public.user_profiles;
create policy "own profile can be created"
  on public.user_profiles for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "own profile can be changed" on public.user_profiles;
create policy "own profile can be changed"
  on public.user_profiles for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "own profile can be deleted" on public.user_profiles;
create policy "own profile can be deleted"
  on public.user_profiles for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Nobody signed out has any business here, whatever the policies say.
revoke all on public.user_profiles from anon;
grant select, insert, update, delete on public.user_profiles to authenticated;

getent hosts github.com || echo "DNS broken"
cat /etc/resolv.conf
