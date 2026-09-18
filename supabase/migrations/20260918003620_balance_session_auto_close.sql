-- End inactive balance sessions without relying on an incoming web request.
-- Existing open sessions receive a fresh grace period when this migration lands.
alter table public.clans
  add column balance_auto_close_enabled boolean not null default true,
  add column balance_auto_close_hours integer not null default 3
    check (balance_auto_close_hours between 1 and 168);

comment on column public.clans.balance_auto_close_enabled is
  '진행 중인 내전 세션의 무활동 자동 종료 사용 여부.';
comment on column public.clans.balance_auto_close_hours is
  '마지막 세션 입력 후 자동 종료까지의 시간(1~168시간).';

alter table public.balance_session_series
  add column last_activity_at timestamptz not null default now();

comment on column public.balance_session_series.last_activity_at is
  '라운드 편집, 역할 선호, 맵/영웅 투표, 승부예측을 포함한 마지막 입력 시각.';

-- Legacy rows have no universal update timestamp. Use the latest timestamped
-- round, prediction or role preference instead of granting every old session
-- a new full timeout window at deployment.
with legacy_activity as (
  select s.id,
    greatest(
      s.opened_at,
      coalesce((select max(r.opened_at) from public.balance_sessions r where r.series_id = s.id), s.opened_at),
      coalesce((select max(p.created_at) from public.balance_session_predictions p join public.balance_sessions r on r.id = p.session_id where r.series_id = s.id), s.opened_at),
      coalesce((select max(pref.updated_at) from public.balance_round_role_preferences pref join public.balance_sessions r on r.id = pref.round_id where r.series_id = s.id), s.opened_at)
    ) as occurred_at
  from public.balance_session_series s
  where s.closed_at is null
)
update public.balance_session_series s
   set last_activity_at = a.occurred_at
  from legacy_activity a
 where s.id = a.id;

create index balance_session_series_auto_close_idx
  on public.balance_session_series(last_activity_at)
  where closed_at is null;

create function private.touch_balance_series_from_round() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_series_id uuid;
begin
  v_series_id := case when tg_op = 'DELETE' then old.series_id else new.series_id end;
  update public.balance_session_series
     set last_activity_at = clock_timestamp()
   where id = v_series_id and closed_at is null;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

create function private.touch_balance_series_from_vote() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_round_id uuid;
begin
  v_round_id := case when tg_op = 'DELETE' then old.session_id else new.session_id end;
  update public.balance_session_series s
     set last_activity_at = clock_timestamp()
    from public.balance_sessions r
   where r.id = v_round_id and s.id = r.series_id and s.closed_at is null;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

create function private.touch_balance_series_from_role_preference() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_round_id uuid;
begin
  v_round_id := case when tg_op = 'DELETE' then old.round_id else new.round_id end;
  update public.balance_session_series s
     set last_activity_at = clock_timestamp()
    from public.balance_sessions r
   where r.id = v_round_id and s.id = r.series_id and s.closed_at is null;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

create trigger touch_balance_series_from_round
before insert or update or delete on public.balance_sessions
for each row execute function private.touch_balance_series_from_round();
create trigger touch_balance_series_from_map_vote
before insert or update or delete on public.balance_session_map_votes
for each row execute function private.touch_balance_series_from_vote();
create trigger touch_balance_series_from_hero_vote
before insert or update or delete on public.balance_session_hero_votes
for each row execute function private.touch_balance_series_from_vote();
create trigger touch_balance_series_from_prediction
before insert or update or delete on public.balance_session_predictions
for each row execute function private.touch_balance_series_from_vote();
create trigger touch_balance_series_from_role_preference
before insert or update or delete on public.balance_round_role_preferences
for each row execute function private.touch_balance_series_from_role_preference();

create function private.update_balance_auto_close_settings(
  p_clan_id uuid,
  p_enabled boolean,
  p_hours integer
) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_clan_officer_plus(p_clan_id) then
    raise exception '운영진만 내전 관리 설정을 변경할 수 있습니다.' using errcode = '42501';
  end if;
  if p_enabled is null or p_hours is null or p_hours not between 1 and 168 then
    raise exception '자동 종료 시간은 1~168시간으로 설정해 주세요.' using errcode = '22023';
  end if;
  update public.clans
     set balance_auto_close_enabled = p_enabled,
         balance_auto_close_hours = p_hours
   where id = p_clan_id;
  if not found then raise exception '클랜을 찾을 수 없습니다.'; end if;
  return jsonb_build_object('ok', true);
end $$;

create function public.update_balance_auto_close_settings(
  p_clan_id uuid,
  p_enabled boolean,
  p_hours integer
) returns jsonb
language sql security invoker set search_path = '' as $$
  select private.update_balance_auto_close_settings(p_clan_id, p_enabled, p_hours);
$$;

create function private.close_stale_balance_sessions(p_limit integer default 50)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_round record;
  v_series record;
  v_closed integer := 0;
begin
  if p_limit is null or p_limit not between 1 and 100 then
    raise exception 'Batch limit must be 1..100' using errcode = '22023';
  end if;
  if not pg_try_advisory_xact_lock(726041914) then
    return jsonb_build_object('closed', 0);
  end if;

  for v_round in
    select r.id, r.series_id
      from public.balance_sessions r
      join public.balance_session_series s on s.id = r.series_id
      join public.clans c on c.id = s.clan_id
     where r.closed_at is null
       and s.closed_at is null
       and c.balance_auto_close_enabled
       and s.last_activity_at <= clock_timestamp() - make_interval(hours => c.balance_auto_close_hours)
     order by s.last_activity_at, r.id
     limit p_limit
     for update of r skip locked
  loop
    select s.id, s.closed_at, s.last_activity_at,
           c.balance_auto_close_enabled, c.balance_auto_close_hours
      into v_series
      from public.balance_session_series s
      join public.clans c on c.id = s.clan_id
     where s.id = v_round.series_id
     for update of s;

    if not found or v_series.closed_at is not null
       or not v_series.balance_auto_close_enabled
       or v_series.last_activity_at > clock_timestamp() - make_interval(hours => v_series.balance_auto_close_hours) then
      continue;
    end if;

    update public.balance_sessions
       set closed_at = clock_timestamp(),
           match_outcome = case
             when match_outcome = 'pending' then 'void'::public.balance_match_outcome
             else match_outcome
           end,
           prediction_deadline_at = null,
           map_ban_deadline_at = null,
           hero_ban_deadline_at = null
     where id = v_round.id and closed_at is null;
    update public.balance_session_series
       set closed_at = clock_timestamp()
     where id = v_series.id and closed_at is null;
    v_closed := v_closed + 1;
  end loop;
  return jsonb_build_object('closed', v_closed);
end $$;

create function public.close_stale_balance_sessions(p_limit integer default 50)
returns jsonb language sql security invoker set search_path = '' as $$
  select private.close_stale_balance_sessions(p_limit);
$$;

revoke all on function private.touch_balance_series_from_round() from public, anon, authenticated;
revoke all on function private.touch_balance_series_from_vote() from public, anon, authenticated;
revoke all on function private.touch_balance_series_from_role_preference() from public, anon, authenticated;
revoke all on function private.update_balance_auto_close_settings(uuid, boolean, integer) from public, anon, authenticated;
revoke all on function public.update_balance_auto_close_settings(uuid, boolean, integer) from public, anon, authenticated;
grant execute on function private.update_balance_auto_close_settings(uuid, boolean, integer) to authenticated, service_role;
grant execute on function public.update_balance_auto_close_settings(uuid, boolean, integer) to authenticated, service_role;

revoke all on function private.close_stale_balance_sessions(integer) from public, anon, authenticated;
revoke all on function public.close_stale_balance_sessions(integer) from public, anon, authenticated;
grant execute on function private.close_stale_balance_sessions(integer) to service_role;
grant execute on function public.close_stale_balance_sessions(integer) to service_role;

select cron.schedule(
  'balance-session-auto-close',
  '*/5 * * * *',
  'select private.close_stale_balance_sessions(50);'
);
