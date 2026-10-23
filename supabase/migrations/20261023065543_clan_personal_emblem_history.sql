create table public.clan_personal_emblem_award_periods (
  clan_id uuid not null references public.clans(id) on delete cascade,
  period_type text not null check(period_type in ('month','year')),
  period_key text not null,
  finalized_at timestamptz not null default now(),
  primary key(clan_id,period_type,period_key),
  check((period_type='month' and period_key ~ '^[0-9]{4}-(0[1-9]|1[0-2])$')
    or (period_type='year' and period_key ~ '^[0-9]{4}$'))
);
create table public.clan_personal_emblem_awards (
  clan_id uuid not null,
  user_id uuid not null references public.users(id) on delete cascade,
  emblem_key text not null,
  family text not null check(family in ('victory','participation','appearances','streak','prediction')),
  rank integer not null check(rank between 1 and 3),
  period_type text not null,
  period_key text not null,
  earned_at timestamptz not null,
  primary key(clan_id,user_id,emblem_key),
  unique(clan_id,period_type,period_key,family,rank),
  unique(clan_id,period_type,period_key,family,user_id),
  foreign key(clan_id,period_type,period_key)
    references public.clan_personal_emblem_award_periods(clan_id,period_type,period_key) on delete cascade
);
create index clan_personal_emblem_awards_user_idx on public.clan_personal_emblem_awards(user_id);
create table public.clan_personal_emblem_milestones (
  clan_id uuid not null references public.clans(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  emblem_key text not null,
  family text not null check(family in ('sessions','matches','wins','streak','prediction')),
  stage integer not null check(stage between 1 and 4),
  target integer not null check(target>0),
  earned_at timestamptz not null,
  primary key(clan_id,user_id,emblem_key)
);
create index clan_personal_emblem_milestones_user_idx on public.clan_personal_emblem_milestones(user_id);
alter table public.clan_personal_emblem_award_periods enable row level security;
alter table public.clan_personal_emblem_awards enable row level security;
alter table public.clan_personal_emblem_milestones enable row level security;
revoke all on public.clan_personal_emblem_award_periods,public.clan_personal_emblem_awards,
  public.clan_personal_emblem_milestones from public,anon,authenticated,service_role;
grant select on public.clan_personal_emblem_award_periods,public.clan_personal_emblem_awards,
  public.clan_personal_emblem_milestones to service_role;

create function private.finalize_clan_personal_emblem_awards(
  p_clan_id uuid,p_period_type text,p_period_key text,p_awards jsonb
) returns boolean language plpgsql security definer set search_path='' as $$
declare ends_at timestamptz;
begin
  if p_period_type='month' and p_period_key ~ '^[0-9]{4}-(0[1-9]|1[0-2])$' then
    ends_at:=(make_date(left(p_period_key,4)::int,right(p_period_key,2)::int,1)+interval '1 month') at time zone 'Asia/Seoul';
  elsif p_period_type='year' and p_period_key ~ '^[0-9]{4}$' then
    ends_at:=make_date(p_period_key::int+1,1,1)::timestamp at time zone 'Asia/Seoul';
  else raise exception 'Invalid award period' using errcode='22023'; end if;
  if ends_at>now() or jsonb_typeof(p_awards) is distinct from 'array' or jsonb_array_length(p_awards)>15 then
    raise exception 'Only closed periods and at most fifteen award rows are accepted' using errcode='22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('clan-personal-awards:'||p_clan_id::text||':'||p_period_type||':'||p_period_key,0));
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
revoke all on function private.finalize_clan_personal_emblem_awards(uuid,text,text,jsonb) from public,anon,authenticated;
create function public.finalize_clan_personal_emblem_awards(
  p_clan_id uuid,p_period_type text,p_period_key text,p_awards jsonb
) returns boolean language sql security invoker set search_path='' as $$
  select private.finalize_clan_personal_emblem_awards(p_clan_id,p_period_type,p_period_key,p_awards);
$$;
revoke all on function public.finalize_clan_personal_emblem_awards(uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function private.finalize_clan_personal_emblem_awards(uuid,text,text,jsonb),
  public.finalize_clan_personal_emblem_awards(uuid,text,text,jsonb) to service_role;

create function private.refresh_clan_personal_emblem_milestones(p_clan_id uuid)
returns integer language plpgsql security definer set search_path='' set plan_cache_mode='force_custom_plan' as $$
declare inserted_count integer;
begin
  if not exists(select 1 from public.clans where id=p_clan_id) then return 0; end if;
  perform pg_advisory_xact_lock(hashtextextended('clan-stats:'||p_clan_id::text,0));
  with valid as materialized (
    select r.id,r.series_id,r.occurred_at,r.outcome,p.uid,p.team,(r.outcome='team'||p.team::text) win
    from private.clan_stats_records r cross join lateral (
      select (e.value->>'user_id')::uuid uid,
        (array_agg((e.value->>'team')::integer order by e.ord desc))[1] team
      from jsonb_array_elements(r.players) with ordinality e(value,ord) group by e.value->>'user_id'
    ) p join public.users u on u.id=p.uid
    where r.clan_id=p_clan_id and r.match_type='intra' and r.outcome in ('team1','team2','draw')
  ), groups as (
    select *,sum(case when win then 0 else 1 end) over(partition by uid order by occurred_at,id rows unbounded preceding) grp
    from valid
  ), counts as (
    select *,row_number() over(partition by uid order by occurred_at,id) appearances,
      sum(win::integer) over(partition by uid order by occurred_at,id rows unbounded preceding) wins,
      sum(win::integer) over(partition by uid,grp order by occurred_at,id rows unbounded preceding) streak
    from groups
  ), sessions as (
    select v.uid,v.series_id,min(v.occurred_at) earned_at
    from valid v join public.balance_session_series s on s.id=v.series_id and s.clan_id=p_clan_id
      join public.balance_rooms room on room.series_id=s.id and room.kind='regular'
    group by v.uid,v.series_id
  ), correct as (
    select p.user_id uid,s.id,coalesce(s.predictions_settled_at,s.closed_at) earned_at
    from public.balance_sessions s join public.balance_session_series ss on ss.id=s.series_id
      join public.balance_rooms room on room.series_id=ss.id and room.kind='regular'
      join public.balance_session_predictions p on p.session_id=s.id join public.users u on u.id=p.user_id
    where s.clan_id=p_clan_id and p.pool_settlement is distinct from 'refund'
      and s.match_outcome::text=case p.pick_team when 1 then 'team1' when 2 then 'team2' when 3 then 'draw' end
      and coalesce(s.predictions_settled_at,s.closed_at) is not null
  ), events(uid,family,progress,earned_at) as (
    select uid,'matches',appearances,occurred_at from counts
    union all select uid,'wins',wins,occurred_at from counts
    union all select uid,'streak',streak,occurred_at from counts
    union all select uid,'sessions',row_number() over(partition by uid order by earned_at,series_id),earned_at from sessions
    union all select uid,'prediction',row_number() over(partition by uid order by earned_at,id),earned_at from correct
  ), thresholds(family,stage,target) as (values
    ('sessions',1,10),('sessions',2,50),('sessions',3,100),('sessions',4,300),
    ('matches',1,10),('matches',2,50),('matches',3,100),('matches',4,500),
    ('wins',1,10),('wins',2,50),('wins',3,100),('wins',4,300),
    ('streak',1,3),('streak',2,5),('streak',3,7),('streak',4,10),
    ('prediction',1,10),('prediction',2,50),('prediction',3,100),('prediction',4,300)
  )
  insert into public.clan_personal_emblem_milestones(clan_id,user_id,emblem_key,family,stage,target,earned_at)
    select p_clan_id,e.uid,'milestone-'||t.family||'-'||t.stage,t.family,t.stage,t.target,min(e.earned_at)
    from events e join thresholds t on t.family=e.family and e.progress>=t.target
    group by e.uid,t.family,t.stage,t.target on conflict do nothing;
  get diagnostics inserted_count=row_count;
  return inserted_count;
end $$;
revoke all on function private.refresh_clan_personal_emblem_milestones(uuid) from public,anon,authenticated;
create function public.refresh_clan_personal_emblem_milestones(p_clan_id uuid)
returns integer language sql security invoker set search_path='' as $$
  select private.refresh_clan_personal_emblem_milestones(p_clan_id);
$$;
revoke all on function public.refresh_clan_personal_emblem_milestones(uuid) from public,anon,authenticated;
grant execute on function private.refresh_clan_personal_emblem_milestones(uuid),
  public.refresh_clan_personal_emblem_milestones(uuid) to service_role;

-- Both deferred result commits and participant-link refreshes use this entry point.
alter function private.refresh_clan_stats(uuid,text[]) rename to refresh_clan_stats_without_personal_emblems;
create function private.refresh_clan_stats(p_clan uuid,p_days text[]) returns void
language plpgsql security definer set search_path='' as $$
begin
  perform private.refresh_clan_stats_without_personal_emblems(p_clan,p_days);
  perform private.refresh_clan_personal_emblem_milestones(p_clan);
end $$;
revoke all on function private.refresh_clan_stats(uuid,text[]) from public,anon,authenticated;

create function public.read_clan_personal_emblem_award_source(p_clan_id uuid)
returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object('hof_config',(select hof_config from public.clan_settings where clan_id=p_clan_id),
    'nicknames',coalesce((select jsonb_agg(to_jsonb(n)) from (
      select distinct on (coalesce(p.user_id,p.id)) coalesce(p.user_id,p.id) user_id,
        (case when p.is_guest and p.user_id is not null then coalesce(u.nickname,p.nickname)||coalesce(' · '||p.alias,'')
          else private.participant_label(p.clan_id,p.id) end)::varchar nickname
      from public.clan_participants p left join public.users u on u.id=p.user_id where p.clan_id=p_clan_id
      order by coalesce(p.user_id,p.id),p.is_guest,p.created_at
    ) n),'[]'::jsonb),
    'user_ids',coalesce((select jsonb_agg(distinct u.id) from public.clan_participants p
      join public.users u on u.id=coalesce(p.user_id,p.id) where p.clan_id=p_clan_id),'[]'::jsonb));
$$;
revoke all on function public.read_clan_personal_emblem_award_source(uuid) from public,anon,authenticated;
grant execute on function public.read_clan_personal_emblem_award_source(uuid) to service_role;

create function public.pending_clan_personal_emblem_awards(p_limit integer default 20)
returns table(clan_id uuid) language sql stable security definer set search_path='' as $$
  with current_period as (select to_char(now() at time zone 'Asia/Seoul','YYYY-MM') month_key,
    to_char(now() at time zone 'Asia/Seoul','YYYY') year_key), candidates as (
    select p.clan_id,case when length(p.period)=4 then 'year' else 'month' end period_type,p.period period_key
      from private.clan_stats_periods p cross join current_period c
      where (p.period ~ '^[0-9]{4}$' and p.period<c.year_key)
        or (p.period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$' and p.period<c.month_key)
    union select c.id,'month',to_char((now() at time zone 'Asia/Seoul')-interval '1 month','YYYY-MM') from public.clans c
    union select c.id,'year',to_char((now() at time zone 'Asia/Seoul')-interval '1 year','YYYY') from public.clans c
  ) select distinct c.clan_id from candidates c where not exists(
    select 1 from public.clan_personal_emblem_award_periods a
    where a.clan_id=c.clan_id and a.period_type=c.period_type and a.period_key=c.period_key)
  order by c.clan_id limit greatest(1,least(100,coalesce(p_limit,20)));
$$;
revoke all on function public.pending_clan_personal_emblem_awards(integer) from public,anon,authenticated;
grant execute on function public.pending_clan_personal_emblem_awards(integer) to service_role;

do $$ declare clan uuid; begin
  for clan in select id from public.clans loop perform private.refresh_clan_personal_emblem_milestones(clan); end loop;
end $$;
