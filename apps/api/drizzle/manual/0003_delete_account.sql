-- Run this once in the Supabase SQL editor (or `psql`) after 0002_user_profiles.sql. It is safe to
-- run again. Kept in drizzle/manual/ for the same reason as the others: the API never touches it.
--
-- Lets a signed-in person delete their own account from the web app, with their own token and
-- no server-side secret. Deleting the auth user removes everything that points at it: the
-- sessions, the linked sign-in methods and, through `on delete cascade`, the saved profile.
--
-- `security definer` is what allows a signed-in person to touch the auth schema at all, so the
-- function does exactly one thing and takes no argument: it can only ever remove the caller.

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null then
    raise exception 'Sign in to delete an account.' using errcode = '28000';
  end if;

  delete from auth.users where id = caller;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
