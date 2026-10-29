alter table public.clan_members
  add column participation_status text not null default 'active'
    check (participation_status in ('active','inactive','dormant')),
  add column participation_checked_on date;

create function private.refresh_clan_member_participation(p_clan_id uuid default null,p_at timestamptz default now())
returns integer language plpgsql security definer set search_path='' as $$
declare cutoff timestamptz; changed integer;
begin
  if p_at is null then raise exception '판정 시각이 필요합니다.'; end if;
  cutoff := date_trunc('day',p_at at time zone 'Asia/Seoul') at time zone 'Asia/Seoul';
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('clan-member-participation-daily'));
  with members as materialized (
    select id,clan_id,user_id,joined_at from public.clan_members
    where status='active' and (p_clan_id is null or clan_id=p_clan_id)
  ), appearances as (
    -- This projection already honors corrections, deletions and linked guest identities.
    select r.clan_id,u.user_id,r.occurred_at
    from private.clan_stats_records r cross join lateral unnest(r.user_ids) u(user_id)
    where r.match_type='intra' and r.outcome in ('team1','team2','draw') and r.occurred_at<cutoff
      and (p_clan_id is null or r.clan_id=p_clan_id)
    union all
    -- Flash rooms intentionally do not contribute to the regular statistics projection.
    select s.clan_id,coalesce(p.user_id::text,slot.uid),coalesce(s.predictions_settled_at,s.closed_at,s.opened_at)
    from public.balance_sessions s join public.balance_rooms room on room.series_id=s.series_id and room.kind='flash'
    cross join lateral (values
      (s.roster#>>'{team1,tank}'),(s.roster#>>'{team1,dmg,0}'),(s.roster#>>'{team1,dmg,1}'),(s.roster#>>'{team1,sup,0}'),(s.roster#>>'{team1,sup,1}'),
      (s.roster#>>'{team2,tank}'),(s.roster#>>'{team2,dmg,0}'),(s.roster#>>'{team2,dmg,1}'),(s.roster#>>'{team2,sup,0}'),(s.roster#>>'{team2,sup,1}')
    ) slot(uid)
    left join public.clan_participants p on p.clan_id=s.clan_id and p.id::text=slot.uid
    where s.match_outcome in ('team1','team2','draw') and nullif(slot.uid,'') is not null
      and coalesce(s.predictions_settled_at,s.closed_at,s.opened_at)<cutoff
      and (p_clan_id is null or s.clan_id=p_clan_id)
      and not exists(select 1 from public.matches m where m.id=s.id and m.clan_id=s.clan_id)
  ), latest as (
    select m.id,m.joined_at,max(a.occurred_at) last_played
    from members m left join appearances a on a.clan_id=m.clan_id and a.user_id=m.user_id::text and a.occurred_at>=m.joined_at
    group by m.id,m.joined_at
  ), classified as (
    select id,joined_at,last_played,case
      when cutoff-coalesce(last_played,joined_at)>=interval '56 days' then 'dormant'
      when cutoff-coalesce(last_played,joined_at)>=interval '28 days' then 'inactive'
      else 'active' end state from latest
  )
  update public.clan_members m set last_participated_at=c.last_played,participation_status=c.state,
    participation_checked_on=(cutoff at time zone 'Asia/Seoul')::date
  from classified c where m.id=c.id and m.status='active' and m.joined_at=c.joined_at
    and (m.last_participated_at,m.participation_status,m.participation_checked_on) is distinct from
      (c.last_played,c.state,(cutoff at time zone 'Asia/Seoul')::date);
  get diagnostics changed=row_count;
  return changed;
end $$;

create function private.reset_member_participation() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if new.status='active' and old.status is distinct from 'active' then
    new.last_participated_at:=null;
    new.participation_status:='active';
    new.participation_checked_on:=null;
  end if;
  return new;
end $$;
revoke all on function private.reset_member_participation() from public,anon,authenticated;
create trigger reset_member_participation before update of status on public.clan_members
for each row execute function private.reset_member_participation();

create function public.refresh_clan_member_participation(p_clan_id uuid,p_at timestamptz default now())
returns integer language sql security invoker set search_path='' as $$
  select private.refresh_clan_member_participation(p_clan_id,p_at);
$$;
revoke all on function private.refresh_clan_member_participation(uuid,timestamptz),public.refresh_clan_member_participation(uuid,timestamptz) from public,anon,authenticated;
grant execute on function private.refresh_clan_member_participation(uuid,timestamptz),public.refresh_clan_member_participation(uuid,timestamptz) to service_role;

-- pg_cron runs in UTC: 15:00 UTC is the next day's 00:00 in Korea.
select cron.schedule('clan-member-participation-daily','0 15 * * *','select private.refresh_clan_member_participation();');
select private.refresh_clan_member_participation();
comment on column public.clan_members.last_activity_at is '마지막 클랜 페이지 방문. 방문 시 최소 5분 간격으로 갱신하며 내전 참여 상태와 별개다.';
comment on column public.clan_members.participation_status is 'KST 매일 00:00 내전 출전 판정. 28일 이상 비활성, 56일 이상 휴면. 이력 없으면 가입일 기준.';
