-- Alimtalk is no longer a supported notification channel. Preserve historical logs.
drop function public.set_clan_notification_settings(uuid,boolean,boolean,text);
drop function public.set_clan_discord_notification_preferences(uuid,uuid,text,text,text,boolean,boolean,jsonb);
drop function public.set_clan_discord_bot_settings(uuid,uuid,text,text,text,boolean,boolean);

update public.clan_settings set event_notify=event_notify-'kakao_notifications_opt_in'
where event_notify ? 'kakao_notifications_opt_in';
alter table public.clan_settings add constraint event_notify_no_kakao
  check (not (event_notify ? 'kakao_notifications_opt_in'));

update public.notification_log set status='cancelled',updated_at=now()
where channel='kakao' and status in ('scheduled','processing');
alter table public.notification_log add constraint notification_log_no_active_kakao
  check (channel<>'kakao' or status not in ('scheduled','processing'));

create function public.set_clan_discord_bot_settings(p_clan_id uuid,p_actor_id uuid,p_guild_id text,
  p_channel_id text,p_channel_name text,p_enabled boolean)
returns void language plpgsql set search_path='' as $$
declare connection public.clan_discord_connections%rowtype;
begin
  perform private.assert_discord_clan_leader(p_clan_id,p_actor_id);
  perform 1 from public.clan_settings where clan_id=p_clan_id for update;
  select * into connection from public.clan_discord_connections where clan_id=p_clan_id for update;
  if p_enabled is null then raise exception 'Invalid settings'; end if;
  if p_enabled and (connection.guild_id is distinct from p_guild_id or p_channel_id is null) then raise exception 'Verified Discord connection required'; end if;
  if connection.clan_id is not null then
    if connection.guild_id is distinct from p_guild_id then raise exception 'Discord connection changed'; end if;
    update public.clan_discord_connections set channel_id=p_channel_id,channel_name=left(p_channel_name,100),updated_at=now() where clan_id=p_clan_id;
  end if;
  update public.clan_settings set event_notify=coalesce(event_notify,'{}')||jsonb_build_object('discord_transport','bot','discord_enabled',p_enabled,'discord_configured',connection.clan_id is not null and p_channel_id is not null),updated_by=p_actor_id where clan_id=p_clan_id;
  if not p_enabled then
    update public.notification_log set status='cancelled',updated_at=now() where channel='discord' and status in ('scheduled','processing') and
      (event_id in(select id from public.clan_events where clan_id=p_clan_id) or poll_id in(select id from public.clan_polls where clan_id=p_clan_id));
  else
    update public.notification_log n set status='scheduled',attempt_count=0,last_error=null,updated_at=now()
    where n.channel='discord' and n.status='cancelled' and n.scheduled_at>now()
      and (exists(select 1 from public.clan_events e where e.id=n.event_id and e.clan_id=p_clan_id and e.cancelled_at is null
        and e.discord_notify->>'enabled'='true' and (e.discord_notify->'slots') ? n.slot_kind::text)
        or exists(select 1 from public.clan_polls p where p.id=n.poll_id and p.clan_id=p_clan_id and p.closed_at is null and p.deadline_at>now()));
  end if;
end $$;
revoke all on function public.set_clan_discord_bot_settings(uuid,uuid,text,text,text,boolean) from public,anon,authenticated;
grant execute on function public.set_clan_discord_bot_settings(uuid,uuid,text,text,text,boolean) to service_role;

create function public.set_clan_discord_notification_preferences(p_clan_id uuid,p_actor_id uuid,p_guild_id text,
  p_channel_id text,p_channel_name text,p_enabled boolean,p_routes jsonb)
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
  update public.notification_log n set status='cancelled' from private.discord_notification_targets t where n.id=t.log_id and t.clan_id=p_clan_id and t.channel_id is null and n.status in ('scheduled','processing') and n.scheduled_at<=now();
  perform public.set_clan_discord_bot_settings(p_clan_id,p_actor_id,p_guild_id,nullif(p_channel_id,''),p_channel_name,p_enabled);
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
revoke all on function public.set_clan_discord_notification_preferences(uuid,uuid,text,text,text,boolean,jsonb) from public,anon,authenticated;
grant execute on function public.set_clan_discord_notification_preferences(uuid,uuid,text,text,text,boolean,jsonb) to service_role;
