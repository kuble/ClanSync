-- A returning member starts a new continuous stay. Unknown historical dates stay unknown.
create function private.set_clan_membership_start() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if new.status='active' then
    if tg_op='INSERT' then
      new.joined_at:=coalesce(new.joined_at,now());
    elsif old.status is distinct from 'active' then
      new.joined_at:=now();
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.set_clan_membership_start() from public,anon,authenticated;
create trigger clan_members_continuous_start before insert or update of status on public.clan_members
  for each row execute function private.set_clan_membership_start();

-- Return small aggregates, including milestones' dates, without a REST row cap.
-- The caller checks active membership before using this service-only function.
create function private.read_clan_badge_metrics(p_clan_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare v_result jsonb;
begin
  if (select auth.jwt()->>'role') is distinct from 'service_role' then
    raise exception 'Service access required' using errcode='42501';
  end if;
  with records as materialized (
    select case when exists(select 1 from private.clan_match_record_corrections c where c.id=r.id)
      then r.series_id else coalesce(r.series_id,s.series_id) end series_id,r.occurred_at
    from private.clan_stats_records r
    left join public.balance_sessions s on s.id=r.id and s.clan_id=r.clan_id
    where r.clan_id=p_clan_id and r.match_type='intra' and r.outcome in ('team1','team2','draw')
    union all
    -- Flash rounds are intentionally absent from the regular-only stats projection.
    select s.series_id,coalesce(s.predictions_settled_at,s.closed_at,s.opened_at)
    from public.balance_sessions s
    where s.clan_id=p_clan_id and s.match_outcome in ('team1','team2','draw')
      and not exists(select 1 from private.clan_stats_records r where r.id=s.id)
      and not exists(select 1 from private.clan_match_record_corrections c where c.id=s.id)
      and not exists(select 1 from public.matches m where m.id=s.id and m.clan_id=s.clan_id)
  ), series as (
    select ss.id,room.kind::text metric,min(r.occurred_at) first_at
    from records r join public.balance_session_series ss on ss.id=r.series_id and ss.clan_id=p_clan_id
    join public.balance_rooms room on room.series_id=ss.id and room.clan_id=ss.clan_id
    where room.kind in ('regular','flash') group by ss.id,room.kind
  ), ranked_series as (
    select *,row_number() over(partition by metric order by first_at,id) n from series
  ), active_members as materialized (
    select id,joined_at from public.clan_members where clan_id=p_clan_id and status='active'
  ), tenure_dates as (
    select 'tenure-'||y.years metric,m.id,m.joined_at+make_interval(years=>y.years) reached_at
    from active_members m cross join (values(1),(3),(5),(10)) y(years)
    where m.joined_at is not null and m.joined_at+make_interval(years=>y.years)<=now()
  ), ranked_tenure as (
    select *,row_number() over(partition by metric order by reached_at,id) n from tenure_dates
  ), posts as (
    select created_at,row_number() over(order by created_at,id) n
    from public.clan_board_posts where clan_id=p_clan_id and kind='free'
  ), metrics as (
    select k.metric,count(r.id) amount,
      coalesce(jsonb_object_agg(r.n::text,r.first_at) filter(where r.n in (1,10,50,100,1000,10000)),'{}'::jsonb) dates
    from (values('regular'),('flash')) k(metric) left join ranked_series r using(metric) group by k.metric
    union all
    select k.metric,count(t.id),
      coalesce(jsonb_object_agg('10',t.reached_at) filter(where t.n=10),'{}'::jsonb)
    from (values('tenure-1'),('tenure-3'),('tenure-5'),('tenure-10')) k(metric)
    left join ranked_tenure t using(metric) group by k.metric
    union all select 'members',count(*),'{}'::jsonb from active_members
    union all select 'coaching',count(*),'{}'::jsonb
      from public.clan_board_posts where clan_id=p_clan_id and kind='feedback' and status='complete'
    union all select 'posts',count(*),
      coalesce(jsonb_object_agg(n::text,created_at) filter(where n in (50,100,1000,10000)),'{}'::jsonb) from posts
  )
  select jsonb_object_agg(metric,jsonb_build_object('count',amount,'dates',dates)) into v_result from metrics;
  return v_result;
end;
$$;
revoke all on function private.read_clan_badge_metrics(uuid) from public,anon,authenticated;
grant execute on function private.read_clan_badge_metrics(uuid) to service_role;

create function public.read_clan_badge_metrics(p_clan_id uuid) returns jsonb
language sql stable security invoker set search_path='' as $$
  select private.read_clan_badge_metrics(p_clan_id);
$$;
revoke all on function public.read_clan_badge_metrics(uuid) from public,anon,authenticated;
grant execute on function public.read_clan_badge_metrics(uuid) to service_role;
