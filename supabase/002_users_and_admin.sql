-- FlowState: users (profiles) and the super admin role.
-- Run once in the Supabase SQL editor, after schema.sql.

-- ─────────────────────────────────────────────────────────────
-- Profiles: one row per auth user
-- ─────────────────────────────────────────────────────────────

create table public.profiles (
  id            uuid primary key references auth.users on delete cascade,
  email         text not null,
  display_name  text check (char_length(display_name) <= 80),
  role          text not null default 'user' check (role in ('user', 'super_admin')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Emails that become super admin when their account is created.
create or replace function public.default_role_for(p_email text)
returns text language sql immutable set search_path = '' as $$
  select case
    when lower(p_email) in ('dev.almamunsalauddin@gmail.com') then 'super_admin'
    else 'user'
  end
$$;

-- Create a profile automatically for every new auth user.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    public.default_role_for(new.email)
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep the profile email in sync if the auth email changes.
create or replace function public.handle_user_email_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end $$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- Backfill users that already exist.
insert into public.profiles (id, email, display_name, role)
select u.id, u.email, nullif(u.raw_user_meta_data ->> 'display_name', ''), public.default_role_for(u.email)
  from auth.users u
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────
-- Access rules
-- ─────────────────────────────────────────────────────────────

create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
     where id = (select auth.uid()) and role = 'super_admin'
  )
$$;

alter table public.profiles enable row level security;

-- Everyone sees their own profile; the super admin sees all profiles.
create policy "read own profile, admin reads all" on public.profiles for select to authenticated
  using ((select auth.uid()) = id or (select public.is_super_admin()));

-- Users may edit their own display name only (role and email are not editable).
create policy "update own profile" on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
revoke insert, update, delete on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Admin overview: every user with usage totals (super admin only).
-- Tasks and time stay private: this returns only counts and totals.
-- ─────────────────────────────────────────────────────────────

create or replace function public.admin_user_overview()
returns table (
  id               uuid,
  email            text,
  display_name     text,
  role             text,
  created_at       timestamptz,
  last_sign_in_at  timestamptz,
  task_count       bigint,
  done_count       bigint,
  tracked_seconds  double precision,
  tracked_seconds_30d double precision,
  last_active_at   timestamptz
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_super_admin() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  return query
  select
    p.id,
    p.email,
    p.display_name,
    p.role,
    p.created_at,
    u.last_sign_in_at,
    coalesce(t.task_count, 0),
    coalesce(t.done_count, 0),
    coalesce(s.tracked_seconds, 0),
    coalesce(s.tracked_seconds_30d, 0),
    s.last_active_at
  from public.profiles p
  join auth.users u on u.id = p.id
  left join (
    select user_id,
           count(*) as task_count,
           count(*) filter (where status = 'done') as done_count
      from public.tasks
     group by user_id
  ) t on t.user_id = p.id
  left join (
    select user_id,
           sum(extract(epoch from coalesce(ended_at, now()) - started_at)) as tracked_seconds,
           sum(extract(epoch from coalesce(ended_at, now()) - greatest(started_at, now() - interval '30 days')))
             filter (where coalesce(ended_at, now()) > now() - interval '30 days') as tracked_seconds_30d,
           max(coalesce(ended_at, now())) as last_active_at
      from public.time_sessions
     group by user_id
  ) s on s.user_id = p.id
  order by p.created_at;
end $$;

revoke execute on function public.admin_user_overview() from public, anon;
grant  execute on function public.admin_user_overview() to authenticated;
revoke execute on function public.is_super_admin() from public, anon;
grant  execute on function public.is_super_admin() to authenticated;
