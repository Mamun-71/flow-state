-- FlowState schema
-- Run this whole file once in the Supabase SQL editor (Dashboard → SQL Editor → New query).

-- ─────────────────────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────────────────────

create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  name        text not null check (char_length(name) between 1 and 60),
  color       text,
  created_at  timestamptz not null default now(),
  unique (user_id, name),
  unique (id, user_id)
);

create table public.subcategories (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users on delete cascade,
  category_id  uuid not null,
  name         text not null check (char_length(name) between 1 and 60),
  created_at   timestamptz not null default now(),
  unique (category_id, name),
  unique (id, category_id),
  -- the parent category must belong to the same user
  foreign key (category_id, user_id) references public.categories (id, user_id) on delete cascade
);

create table public.tasks (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null default auth.uid() references auth.users on delete cascade,
  category_id        uuid not null,
  subcategory_id     uuid,
  title              text not null check (char_length(title) between 1 and 120),
  description        text check (char_length(description) <= 2000),
  planned_date       date not null,
  estimated_minutes  integer not null check (estimated_minutes between 1 and 1440),
  status             text not null default 'todo' check (status in ('todo','in_progress','done')),
  sort_order         integer not null default 0,
  completed_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (id, user_id),
  -- category must belong to the same user; a category with tasks cannot be deleted
  foreign key (category_id, user_id) references public.categories (id, user_id) on delete restrict,
  -- subcategory must belong to the chosen category
  foreign key (subcategory_id, category_id) references public.subcategories (id, category_id) on delete restrict
);

-- One row per Play → Pause (or one manual entry)
create table public.time_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  task_id     uuid not null,
  started_at  timestamptz not null default now(),
  ended_at    timestamptz,
  source      text not null default 'timer' check (source in ('timer','manual')),
  created_at  timestamptz not null default now(),
  check (ended_at is null or ended_at > started_at),
  check (source = 'timer' or ended_at is not null),
  -- the task must belong to the same user; sessions are deleted with their task
  foreign key (task_id, user_id) references public.tasks (id, user_id) on delete cascade
);

create index tasks_user_date_idx     on public.tasks (user_id, planned_date);
create index tasks_user_status_idx   on public.tasks (user_id, status);
create index tasks_category_idx      on public.tasks (category_id);
create index tasks_subcategory_idx   on public.tasks (subcategory_id);
create index subcategories_cat_idx   on public.subcategories (category_id);
create index sessions_task_idx       on public.time_sessions (task_id);
create index sessions_user_start_idx on public.time_sessions (user_id, started_at);

-- Only one running timer per user
create unique index one_running_timer on public.time_sessions (user_id) where ended_at is null;

-- Keep tasks.updated_at fresh
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger tasks_touch_updated_at
  before update on public.tasks
  for each row execute function public.touch_updated_at();

-- ─────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────

alter table public.categories    enable row level security;
alter table public.subcategories enable row level security;
alter table public.tasks         enable row level security;
alter table public.time_sessions enable row level security;

create policy "own categories" on public.categories for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own subcategories" on public.subcategories for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own tasks" on public.tasks for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own sessions" on public.time_sessions for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- ─────────────────────────────────────────────────────────────
-- Timer functions (atomic, server clock, RLS still applies)
-- ─────────────────────────────────────────────────────────────

-- Play: pause any running timer, start this task, set In Progress
create or replace function public.start_timer(p_task_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if not exists (select 1 from public.tasks where id = p_task_id) then
    raise exception 'Task not found';
  end if;

  -- already running on this task: nothing to do
  if exists (select 1 from public.time_sessions
              where task_id = p_task_id and ended_at is null) then
    return;
  end if;

  update public.time_sessions set ended_at = greatest(now(), started_at + interval '1 second')
   where user_id = auth.uid() and ended_at is null;

  insert into public.time_sessions (task_id) values (p_task_id);

  update public.tasks
     set status = 'in_progress', completed_at = null
   where id = p_task_id;
end $$;

-- Pause: stop the running timer (status stays In Progress)
create or replace function public.pause_timer()
returns void language plpgsql security invoker set search_path = '' as $$
begin
  update public.time_sessions set ended_at = greatest(now(), started_at + interval '1 second')
   where user_id = auth.uid() and ended_at is null;
end $$;

-- Done: stop this task's timer if running, mark Done
create or replace function public.complete_task(p_task_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  update public.time_sessions set ended_at = greatest(now(), started_at + interval '1 second')
   where task_id = p_task_id and ended_at is null;

  update public.tasks
     set status = 'done', completed_at = now()
   where id = p_task_id;
end $$;

-- Stop a forgotten timer at a chosen end time
create or replace function public.stop_timer_at(p_ended_at timestamptz)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  update public.time_sessions
     set ended_at = least(greatest(p_ended_at, started_at + interval '1 second'), now())
   where user_id = auth.uid() and ended_at is null;
end $$;

-- Reorder / move tasks: the given ids, in order, get this status and sort_order 0..n
create or replace function public.reorder_tasks(p_status text, p_ids uuid[])
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if p_status not in ('todo', 'in_progress') then
    raise exception 'Invalid status';
  end if;

  -- moving the running task back to To Do pauses it
  if p_status = 'todo' then
    update public.time_sessions set ended_at = greatest(now(), started_at + interval '1 second')
     where task_id = any(p_ids) and ended_at is null;
  end if;

  update public.tasks t
     set status = p_status,
         sort_order = o.ord - 1,
         completed_at = null
    from unnest(p_ids) with ordinality as o(id, ord)
   where t.id = o.id;
end $$;

revoke execute on function public.start_timer(uuid)            from public, anon;
revoke execute on function public.pause_timer()                from public, anon;
revoke execute on function public.complete_task(uuid)          from public, anon;
revoke execute on function public.stop_timer_at(timestamptz)   from public, anon;
revoke execute on function public.reorder_tasks(text, uuid[])  from public, anon;
grant  execute on function public.start_timer(uuid)            to authenticated;
grant  execute on function public.pause_timer()                to authenticated;
grant  execute on function public.complete_task(uuid)          to authenticated;
grant  execute on function public.stop_timer_at(timestamptz)   to authenticated;
grant  execute on function public.reorder_tasks(text, uuid[])  to authenticated;
