alter table public.clan_polls add column starts_at timestamptz;
update public.clan_polls set starts_at=created_at;
alter table public.clan_polls alter column starts_at set default now(), alter column starts_at set not null;
alter table public.clan_polls add constraint clan_poll_start_before_deadline check(starts_at<deadline_at);

create or replace function public.submit_clan_poll_vote(p_clan_id uuid,p_poll_id uuid,p_option_ids uuid[])
returns void language plpgsql security definer set search_path='' as $$
declare p public.clan_polls%rowtype; n integer;
begin
 if auth.uid() is null or not public.is_active_clan_member(p_clan_id) then raise exception 'forbidden' using errcode='42501'; end if;
 select * into p from public.clan_polls where id=p_poll_id and clan_id=p_clan_id for update;
 if not found or p.closed_at is not null or p.deadline_at<=clock_timestamp() then raise exception '종료된 투표입니다.'; end if;
 if p.starts_at>clock_timestamp() then raise exception '아직 시작하지 않은 투표입니다.'; end if;
 n:=cardinality(p_option_ids);
 if n is null or n<1 or (not p.multiple_choice and n<>1) or n<>(select count(distinct x) from unnest(p_option_ids) x)
 or n<>(select count(*) from public.poll_options where poll_id=p_poll_id and id=any(p_option_ids)) then raise exception '선택지가 올바르지 않습니다.'; end if;
 delete from public.poll_votes where poll_id=p_poll_id and user_id=auth.uid();
 insert into public.poll_votes(poll_id,option_id,user_id) select p_poll_id,x,auth.uid() from unnest(p_option_ids) x;
end $$;
revoke all on function public.submit_clan_poll_vote(uuid,uuid,uuid[]) from public,anon;
grant execute on function public.submit_clan_poll_vote(uuid,uuid,uuid[]) to authenticated;

create or replace function private.refresh_poll_discord_notification(p_poll_id uuid,p_created boolean default false)
returns void language plpgsql set search_path='' as $$
declare p public.clan_polls; due timestamptz;
begin
  select * into p from public.clan_polls where id=p_poll_id;
  if not found then return; end if;
  if p_created and p.closed_at is null and private.clan_discord_destination(p.clan_id,'polls','created') is not null then
    insert into public.notification_log(poll_id,slot_kind,channel,recipient_user_id,scheduled_at,dedup_key)
      values(p.id,'poll_created','discord',p.created_by,greatest(now(),p.starts_at),p.id::text||'|poll_created|discord') on conflict do nothing;
  end if;
  due:=least(p.deadline_at,coalesce(p.closed_at,p.deadline_at));
  insert into public.notification_log(poll_id,slot_kind,channel,recipient_user_id,scheduled_at,dedup_key)
    values(p.id,'poll_ended','discord',p.created_by,due,p.id::text||'|poll_ended|discord')
    on conflict(poll_id,slot_kind) where poll_id is not null and channel='discord' and slot_kind in ('poll_created','poll_ended')
    do update set scheduled_at=excluded.scheduled_at,status='scheduled',attempt_count=0,last_error=null
      where notification_log.status in ('scheduled','cancelled') and notification_log.scheduled_at is distinct from excluded.scheduled_at;
end $$;
revoke all on function private.refresh_poll_discord_notification(uuid,boolean) from public,anon,authenticated;
grant execute on function private.refresh_poll_discord_notification(uuid,boolean) to service_role;
drop trigger queue_poll_discord_notification on public.clan_polls;
create trigger queue_poll_discord_notification after insert or update of starts_at,deadline_at,closed_at on public.clan_polls
  for each row execute function public.queue_poll_discord_notification();

create or replace view private.discord_notification_targets as
select n.id as log_id,n.status,n.attempt_count,n.updated_at,n.scheduled_at,n.slot_kind,
  e.id as event_id,p.id as poll_id,r.id as room_id,a.id as notice_id,
  coalesce(e.title,p.title,r.title,a.title) as title,
  case when e.repeat<>'none' and n.instance_idx>0 then to_timestamp(n.instance_idx/1000.0) else coalesce(e.start_at,r.scheduled_at) end as start_at,
  p.deadline_at,c.id as clan_id,g.slug as game_slug,
  private.clan_discord_destination(c.id,case when r.id is not null then r.kind when a.id is not null then 'announcements' when p.id is not null then 'polls' else 'calendar' end,
    case when n.slot_kind='poll_ended' then 'ended' when p.id is not null then 'created' end) as channel_id,
  case
    when r.id is not null then r.status in ('scheduled','open') and r.scheduled_at>=now()-interval '5 minutes'
    when a.id is not null then true
    when p.id is not null then (select count(*) from public.poll_options o where o.poll_id=p.id)>=2 and
      case when n.slot_kind='poll_ended' then p.closed_at is not null or p.deadline_at<=now()
        else p.closed_at is null and p.starts_at<=now() and p.deadline_at>now() and n.slot_kind='poll_created' end
    when e.id is not null then e.cancelled_at is null and e.discord_notify->>'enabled'='true' and
      (n.slot_kind in ('event_created','event_updated') and e.discord_notify->>'announce'='true' or (e.discord_notify->'slots') ? n.slot_kind::text)
      and not (n.slot_kind='event_t_minus_10min' and e.kind='intra' and exists(
        select 1 from public.balance_rooms br where br.clan_id=e.clan_id and br.status in ('scheduled','open')
          and btrim(br.title)=btrim(e.title) and br.scheduled_at=case when e.repeat<>'none' and n.instance_idx>0 then to_timestamp(n.instance_idx/1000.0) else e.start_at end
          and private.clan_discord_destination(br.clan_id,br.kind) is not null))
    else false end as eligible
from public.notification_log n
left join public.clan_events e on e.id=n.event_id left join public.clan_polls p on p.id=n.poll_id
left join public.balance_rooms r on r.id=n.room_id left join public.clan_notices a on a.id=n.notice_id
join public.clans c on c.id=coalesce(e.clan_id,p.clan_id,r.clan_id,a.clan_id) join public.games g on g.id=c.game_id
where n.channel='discord';
revoke all on private.discord_notification_targets from public,anon,authenticated;
grant select on private.discord_notification_targets to service_role;

