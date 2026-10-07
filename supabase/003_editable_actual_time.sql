-- FlowState: let a task's Actual time be edited directly (also after it's Done).
-- Run once in the Supabase SQL editor, after 002_users_and_admin.sql.
--
-- Actual time is still the sum of time sessions, so daily stats and the calendar
-- stay correct. Setting a new total either adds one manual session (more time)
-- or trims the newest sessions (less time).

create or replace function public.set_task_actual(p_task_id uuid, p_seconds integer, p_anchor timestamptz)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  v_current double precision;
  v_delta   double precision;
  v_start   timestamptz;
  v_len     double precision;
  r         record;
begin
  if p_seconds < 0 or p_seconds > 7 * 86400 then
    raise exception 'Invalid actual time';
  end if;
  if not exists (select 1 from public.tasks where id = p_task_id) then
    raise exception 'Task not found';
  end if;
  if exists (select 1 from public.time_sessions where task_id = p_task_id and ended_at is null) then
    raise exception 'Pause the timer before editing the actual time' using errcode = 'P0001';
  end if;

  select coalesce(sum(extract(epoch from ended_at - started_at)), 0)
    into v_current
    from public.time_sessions
   where task_id = p_task_id;

  v_delta := p_seconds - v_current;
  if abs(v_delta) < 1 then
    return;
  end if;

  if v_delta > 0 then
    -- Add the difference as one manual session, starting at the anchor
    -- (the planned day), but never ending in the future.
    v_start := least(p_anchor, now() - make_interval(secs => v_delta));
    insert into public.time_sessions (task_id, started_at, ended_at, source)
    values (p_task_id, v_start, v_start + make_interval(secs => v_delta), 'manual');
  else
    -- Remove the difference from the newest sessions first.
    v_delta := -v_delta;
    for r in
      select id, started_at, ended_at
        from public.time_sessions
       where task_id = p_task_id
       order by ended_at desc
    loop
      exit when v_delta < 1;
      v_len := extract(epoch from r.ended_at - r.started_at);
      if v_len <= v_delta then
        delete from public.time_sessions where id = r.id;
        v_delta := v_delta - v_len;
      else
        update public.time_sessions
           set ended_at = r.ended_at - make_interval(secs => v_delta)
         where id = r.id;
        v_delta := 0;
      end if;
    end loop;
  end if;
end $$;

revoke execute on function public.set_task_actual(uuid, integer, timestamptz) from public, anon;
grant  execute on function public.set_task_actual(uuid, integer, timestamptz) to authenticated;
