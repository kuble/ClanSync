alter table public.notification_log add column room_id uuid references public.balance_rooms(id) on delete cascade;
alter table public.notification_log add column notice_id uuid references public.clan_notices(id) on delete cascade;
alter table public.notification_log drop constraint notification_log_scope_exactly_one;
alter table public.notification_log add constraint notification_log_scope_exactly_one check (
  num_nonnulls(event_id,poll_id,lfg_post_id,room_id,notice_id)=1
);
alter table public.notification_log add constraint notification_log_discord_sources check (
  (room_id is null and notice_id is null) or channel='discord'
);
create unique index notification_log_room_discord_once on public.notification_log(room_id,slot_kind) where room_id is not null and channel='discord';
create unique index notification_log_notice_discord_once on public.notification_log(notice_id,slot_kind) where notice_id is not null and channel='discord';
create unique index notification_log_poll_discord_once on public.notification_log(poll_id,slot_kind)
  where poll_id is not null and channel='discord' and slot_kind in ('poll_created','poll_ended');

-- A route is resolved at claim/send time, so changing channels does not copy messages.
create function private.clan_discord_destination(p_clan_id uuid,p_kind text,p_stage text default null)
returns text language sql stable set search_path='' as $$
  select coalesce(nullif(s.event_notify->'discord_routes'->p_kind->>'channel_id',''),d.channel_id)
  from public.clan_settings s join public.clans c on c.id=s.clan_id join public.clan_discord_connections d on d.clan_id=c.id
  where c.id=p_clan_id and c.subscription_tier='premium'
    and s.event_notify->>'discord_transport'='bot' and s.event_notify->>'discord_enabled'='true'
    and coalesce(s.event_notify->'discord_routes'->p_kind->>'enabled','true')='true'
    and (p_stage is null or coalesce(s.event_notify->'discord_routes'->p_kind->>p_stage,'true')='true')
$$;
revoke all on function private.clan_discord_destination(uuid,text,text) from public,anon,authenticated;
grant execute on function private.clan_discord_destination(uuid,text,text) to service_role;

create function private.refresh_room_discord_notification(p_room_id uuid)
returns void language plpgsql set search_path='' as $$
declare r public.balance_rooms; due timestamptz;
begin
  select * into r from public.balance_rooms where id=p_room_id;
  if not found then return; end if;
  if r.status not in ('scheduled','open') or r.scheduled_at<now()-interval '5 minutes' then
    update public.notification_log set status='cancelled' where room_id=r.id and channel='discord' and status in ('scheduled','processing');
    return;
  end if;
  due:=greatest(r.created_at,r.scheduled_at-interval '10 minutes');
  insert into public.notification_log(room_id,slot_kind,channel,recipient_user_id,scheduled_at,dedup_key)
    values(r.id,'room_t_minus_10min','discord',r.created_by,due,r.id::text||'|room_t_minus_10min|discord')
    on conflict(room_id,slot_kind) where room_id is not null and channel='discord'
    do update set scheduled_at=excluded.scheduled_at,status='scheduled',attempt_count=0,last_error=null
      where notification_log.status in ('scheduled','cancelled') and notification_log.scheduled_at is distinct from excluded.scheduled_at;
end $$;
revoke all on function private.refresh_room_discord_notification(uuid) from public,anon,authenticated;
grant execute on function private.refresh_room_discord_notification(uuid) to service_role;

create function public.queue_room_discord_notification() returns trigger language plpgsql security definer set search_path='' as $$
begin
  perform private.refresh_room_discord_notification(new.id);
  return new;
end $$;
revoke all on function public.queue_room_discord_notification() from public,anon,authenticated;
create trigger queue_room_discord_notification after insert or update of scheduled_at,status on public.balance_rooms
  for each row execute function public.queue_room_discord_notification();

create function public.queue_notice_discord_notification() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.created_by is not null and private.clan_discord_destination(new.clan_id,'announcements') is not null then
    insert into public.notification_log(notice_id,slot_kind,channel,recipient_user_id,scheduled_at,dedup_key)
      values(new.id,'notice_created','discord',new.created_by,now(),new.id::text||'|notice_created|discord') on conflict do nothing;
  end if;
  return new;
end $$;
revoke all on function public.queue_notice_discord_notification() from public,anon,authenticated;
create trigger queue_notice_discord_notification after insert on public.clan_notices for each row execute function public.queue_notice_discord_notification();

create function private.refresh_poll_discord_notification(p_poll_id uuid,p_created boolean default false)
returns void language plpgsql set search_path='' as $$
declare p public.clan_polls; due timestamptz;
begin
  select * into p from public.clan_polls where id=p_poll_id;
  if not found then return; end if;
  if p_created and private.clan_discord_destination(p.clan_id,'polls','created') is not null then
    insert into public.notification_log(poll_id,slot_kind,channel,recipient_user_id,scheduled_at,dedup_key)
      values(p.id,'poll_created','discord',p.created_by,now(),p.id::text||'|poll_created|discord') on conflict do nothing;
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
create function public.queue_poll_discord_notification() returns trigger language plpgsql security definer set search_path='' as $$
begin
  perform private.refresh_poll_discord_notification(new.id,tg_op='INSERT');
  return new;
end $$;
revoke all on function public.queue_poll_discord_notification() from public,anon,authenticated;
create trigger queue_poll_discord_notification after insert or update of deadline_at,closed_at on public.clan_polls
  for each row execute function public.queue_poll_discord_notification();

-- Poll closure cancels reminders, but the completion message must survive.
create or replace function public.cancel_notification_log_on_poll_close() returns trigger language plpgsql set search_path='' as $$
begin
  if new.closed_at is not null and old.closed_at is distinct from new.closed_at then
    update public.notification_log set status='cancelled' where poll_id=new.id and status in ('scheduled','processing') and slot_kind<>'poll_ended';
  end if;
  return new;
end $$;
create or replace function public.maint_cancel_poll_notifications_past_deadline() returns void
language sql security definer set search_path='' as $$
  update public.notification_log n set status='cancelled' from public.clan_polls p
    where n.poll_id=p.id and n.status='scheduled' and p.deadline_at<=now() and n.slot_kind<>'poll_ended';
$$;
revoke all on function public.maint_cancel_poll_notifications_past_deadline() from public,anon,authenticated;
grant execute on function public.maint_cancel_poll_notifications_past_deadline() to service_role;

create function public.set_clan_discord_notification_preferences(p_clan_id uuid,p_actor_id uuid,p_guild_id text,
  p_channel_id text,p_channel_name text,p_enabled boolean,p_kakao boolean,p_routes jsonb)
returns void language plpgsql set search_path='' as $$
declare kind text; route jsonb; id uuid;
begin
  perform private.assert_discord_clan_leader(p_clan_id,p_actor_id);
  if jsonb_typeof(p_routes) is distinct from 'object' or p_routes - array['regular','flash','calendar','announcements','polls'] <> '{}'::jsonb then raise exception 'Invalid notification types'; end if;
  foreach kind in array array['regular','flash','calendar','announcements','polls'] loop
    route:=p_routes->kind;
    if jsonb_typeof(route) is distinct from 'object' or jsonb_typeof(route->'enabled') is distinct from 'boolean'
      or jsonb_typeof(route->'channel_id') is distinct from 'string'
      or (route->>'channel_id'<>'' and route->>'channel_id' !~ '^[0-9]{17,20}$')
      or jsonb_typeof(route->'created') is distinct from 'boolean' or jsonb_typeof(route->'ended') is distinct from 'boolean'
      or route - array['enabled','channel_id','created','ended'] <> '{}'::jsonb then raise exception 'Invalid notification route'; end if;
  end loop;
  perform public.set_clan_discord_bot_settings(p_clan_id,p_actor_id,p_guild_id,p_channel_id,p_channel_name,p_enabled,p_kakao);
  update public.clan_settings set event_notify=event_notify||jsonb_build_object('discord_routes',p_routes) where clan_id=p_clan_id;
  if not p_enabled then
    update public.notification_log n set status='cancelled' where n.channel='discord' and n.status in ('scheduled','processing')
      and (n.room_id in(select r.id from public.balance_rooms r where r.clan_id=p_clan_id)
        or n.notice_id in(select a.id from public.clan_notices a where a.clan_id=p_clan_id));
  else
    -- Only future reminders are restored; disabled-period announcements are never replayed.
    for id in select r.id from public.balance_rooms r where r.clan_id=p_clan_id and r.status='scheduled' and r.scheduled_at>now() loop
      perform private.refresh_room_discord_notification(id);
    end loop;
    for id in select p.id from public.clan_polls p where p.clan_id=p_clan_id and p.closed_at is null and p.deadline_at>now() loop
      perform private.refresh_poll_discord_notification(id);
    end loop;
    update public.notification_log n set status='scheduled',attempt_count=0,last_error=null where n.channel='discord' and n.status='cancelled' and n.scheduled_at>now()
      and (n.room_id in(select r.id from public.balance_rooms r where r.clan_id=p_clan_id and r.status='scheduled')
        or n.poll_id in(select p.id from public.clan_polls p where p.clan_id=p_clan_id and p.closed_at is null and n.slot_kind='poll_ended'));
  end if;
end $$;
revoke all on function public.set_clan_discord_notification_preferences(uuid,uuid,text,text,text,boolean,boolean,jsonb) from public,anon,authenticated;
grant execute on function public.set_clan_discord_notification_preferences(uuid,uuid,text,text,text,boolean,boolean,jsonb) to service_role;

-- This internal view is shared by claim and the last permission/source recheck.
create view private.discord_notification_targets as
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
        else p.closed_at is null and p.deadline_at>now() and n.slot_kind='poll_created' end
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

create or replace function public.claim_discord_bot_notification_batch(p_limit integer,p_event_id uuid default null)
returns jsonb language plpgsql set search_path='' as $$
declare result jsonb;
begin
  update public.notification_log set status='dlq',last_error='Dispatch lease expired after final attempt'
    where channel='discord' and status='processing' and attempt_count>=5 and updated_at<now()-interval '5 minutes'
      and (p_event_id is null or event_id=p_event_id);
  with picked as (
    select n.id from public.notification_log n join private.discord_notification_targets t on t.log_id=n.id
    where (p_event_id is null or n.event_id=p_event_id) and t.eligible and t.channel_id is not null
      and (n.status='scheduled' or n.status='processing' and n.updated_at<now()-interval '5 minutes')
      and n.scheduled_at<=now() and n.attempt_count<5
    order by n.scheduled_at,n.id limit greatest(1,least(coalesce(p_limit,25),100)) for update of n skip locked
  ), changed as (
    update public.notification_log n set status='processing',attempt_count=n.attempt_count+1 from picked where n.id=picked.id returning n.id
  ) select coalesce(jsonb_agg(to_jsonb(t)||jsonb_build_object('status','processing','attempt_count',t.attempt_count+1)), '[]') into result from changed n join private.discord_notification_targets t on t.log_id=n.id;
  return result;
end $$;
-- CTE view rows observe the pre-update snapshot; return lease fields explicitly below.
create function public.recheck_clan_discord_notification(p_log_id uuid,p_attempt integer)
returns jsonb language sql set search_path='' as $$
  select to_jsonb(t) from private.discord_notification_targets t where t.log_id=p_log_id
    and t.status='processing' and t.attempt_count=p_attempt and t.eligible and t.channel_id is not null;
$$;
revoke all on function public.recheck_clan_discord_notification(uuid,integer) from public,anon,authenticated;
grant execute on function public.recheck_clan_discord_notification(uuid,integer) to service_role;

create function public.reset_discord_routes_on_guild_change() returns trigger language plpgsql set search_path='' as $$
begin
  if old.guild_id is distinct from new.guild_id then
    update public.clan_settings set event_notify=event_notify-'discord_routes' where clan_id=new.clan_id;
    update public.notification_log n set status='cancelled' where n.channel='discord' and n.status in ('scheduled','processing')
      and (n.room_id in(select id from public.balance_rooms where clan_id=new.clan_id)
        or n.notice_id in(select id from public.clan_notices where clan_id=new.clan_id));
  end if;
  return new;
end $$;
revoke all on function public.reset_discord_routes_on_guild_change() from public,anon,authenticated;
create trigger reset_discord_routes_on_guild_change after update of guild_id on public.clan_discord_connections
  for each row execute function public.reset_discord_routes_on_guild_change();

-- Existing future sources receive reservations, without replaying old announcements.
do $$ declare id uuid; begin
  for id in select r.id from public.balance_rooms r where r.status='scheduled' and r.scheduled_at>now() loop perform private.refresh_room_discord_notification(id); end loop;
  for id in select p.id from public.clan_polls p where p.closed_at is null and p.deadline_at>now() loop perform private.refresh_poll_discord_notification(id); end loop;
end $$;
