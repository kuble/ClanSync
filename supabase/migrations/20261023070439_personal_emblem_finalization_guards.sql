drop function public.finalize_clan_personal_emblem_awards(uuid,text,text,jsonb);
drop function private.finalize_clan_personal_emblem_awards(uuid,text,text,jsonb);
create function private.finalize_clan_personal_emblem_awards(
  p_clan_id uuid,p_period_type text,p_period_key text,p_awards jsonb,p_expected_summary jsonb default null
) returns boolean language plpgsql security definer set search_path='' as $$
declare ends_at timestamptz; actual jsonb;
begin
  if p_period_type='month' and p_period_key ~ '^[0-9]{4}-(0[1-9]|1[0-2])$' then
    ends_at:=(make_date(left(p_period_key,4)::int,right(p_period_key,2)::int,1)+interval '1 month') at time zone 'Asia/Seoul';
  elsif p_period_type='year' and p_period_key ~ '^[0-9]{4}$' then
    ends_at:=make_date(p_period_key::int+1,1,1)::timestamp at time zone 'Asia/Seoul';
  else raise exception 'Invalid award period' using errcode='22023'; end if;
  if ends_at>now() or jsonb_typeof(p_awards) is distinct from 'array' or jsonb_array_length(p_awards)>15 then
    raise exception 'Only closed periods and at most fifteen award rows are accepted' using errcode='22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('clan-stats:'||p_clan_id::text,0));
  perform pg_advisory_xact_lock(hashtextextended('clan-personal-awards:'||p_clan_id::text||':'||p_period_type||':'||p_period_key,0));
  if exists(select 1 from public.clan_personal_emblem_award_periods
    where clan_id=p_clan_id and period_type=p_period_type and period_key=p_period_key) then return false; end if;
  if exists(select 1 from public.balance_session_series s join public.balance_rooms r on r.series_id=s.id
    where s.clan_id=p_clan_id and r.kind='regular' and s.closed_at is null and r.status<>'closed'
      and to_char(s.opened_at at time zone 'Asia/Seoul',case p_period_type when 'year' then 'YYYY' else 'YYYY-MM' end)=p_period_key)
    then return false; end if;
  if p_expected_summary is not null then
    select data into actual from private.clan_stats_periods where clan_id=p_clan_id and period=p_period_key;
    if p_expected_summary is distinct from jsonb_build_object(
      'totals',coalesce(actual->'totals','{"sessions":0,"days":0,"matches":0}'::jsonb),
      'players',coalesce(actual->'players','[]'::jsonb),'predictions',coalesce(actual->'predictions','[]'::jsonb)) then return false; end if;
  end if;
  insert into public.clan_personal_emblem_award_periods(clan_id,period_type,period_key)
    values(p_clan_id,p_period_type,p_period_key) on conflict do nothing;
  if not found then return false; end if;
  if exists(select 1 from jsonb_to_recordset(p_awards) as a(user_id uuid,family text,rank integer)
    where a.user_id is null or a.family is null or a.family not in ('victory','participation','appearances','streak','prediction')
      or a.rank is null or a.rank not between 1 and 3) then
    raise exception 'Invalid award candidate' using errcode='22023';
  end if;
  insert into public.clan_personal_emblem_awards(clan_id,user_id,emblem_key,family,rank,period_type,period_key,earned_at)
    select p_clan_id,a.user_id,p_period_type||'-'||p_period_key||'-'||case a.family
      when 'victory' then '승률' when 'participation' then '최다 참여' when 'appearances' then '최다 출전'
      when 'streak' then '최장 연승' else '예측 적중' end,
      a.family,a.rank,p_period_type,p_period_key,ends_at
    from jsonb_to_recordset(p_awards) as a(user_id uuid,family text,rank integer);
  return true;
end $$;
revoke all on function private.finalize_clan_personal_emblem_awards(uuid,text,text,jsonb,jsonb) from public,anon,authenticated;
create function public.finalize_clan_personal_emblem_awards(
  p_clan_id uuid,p_period_type text,p_period_key text,p_awards jsonb,p_expected_summary jsonb default null
) returns boolean language sql security invoker set search_path='' as $$
  select private.finalize_clan_personal_emblem_awards(p_clan_id,p_period_type,p_period_key,p_awards,p_expected_summary);
$$;
revoke all on function public.finalize_clan_personal_emblem_awards(uuid,text,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function private.finalize_clan_personal_emblem_awards(uuid,text,text,jsonb,jsonb),
  public.finalize_clan_personal_emblem_awards(uuid,text,text,jsonb,jsonb) to service_role;

alter function public.read_clan_personal_emblem_award_source(uuid) set schema private;
create function public.read_clan_personal_emblem_award_source(p_clan_id uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
  select private.read_clan_personal_emblem_award_source(p_clan_id);
$$;
revoke all on function public.read_clan_personal_emblem_award_source(uuid) from public,anon,authenticated;
grant execute on function public.read_clan_personal_emblem_award_source(uuid) to service_role;
alter function public.pending_clan_personal_emblem_awards(integer) set schema private;
create function public.pending_clan_personal_emblem_awards(p_limit integer default 20)
returns table(clan_id uuid) language sql stable security invoker set search_path='' as $$
  select * from private.pending_clan_personal_emblem_awards(p_limit);
$$;
revoke all on function public.pending_clan_personal_emblem_awards(integer) from public,anon,authenticated;
grant execute on function public.pending_clan_personal_emblem_awards(integer) to service_role;
