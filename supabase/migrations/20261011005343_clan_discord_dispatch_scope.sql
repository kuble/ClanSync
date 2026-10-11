drop function public.claim_discord_bot_notification_batch(integer,uuid);
create function public.claim_discord_bot_notification_batch(p_limit integer,p_event_id uuid default null,p_clan_id uuid default null)
returns jsonb language plpgsql set search_path='' as $$
declare result jsonb;
begin
  update public.notification_log set status='dlq',last_error='Dispatch lease expired after final attempt'
    where channel='discord' and status='processing' and attempt_count>=5 and updated_at<now()-interval '5 minutes'
      and (p_event_id is null or event_id=p_event_id) and (p_clan_id is null or id in(select log_id from private.discord_notification_targets where clan_id=p_clan_id));
  with picked as (
    select n.id from public.notification_log n join private.discord_notification_targets t on t.log_id=n.id
    where (p_event_id is null or n.event_id=p_event_id) and (p_clan_id is null or t.clan_id=p_clan_id) and t.eligible and t.channel_id is not null
      and (n.status='scheduled' or n.status='processing' and n.updated_at<now()-interval '5 minutes')
      and n.scheduled_at<=now() and n.attempt_count<5
    order by n.scheduled_at,n.id limit greatest(1,least(coalesce(p_limit,25),100)) for update of n skip locked
  ), changed as (
    update public.notification_log n set status='processing',attempt_count=n.attempt_count+1 from picked where n.id=picked.id returning n.id
  ) select coalesce(jsonb_agg(to_jsonb(t)||jsonb_build_object('status','processing','attempt_count',t.attempt_count+1)), '[]') into result from changed n join private.discord_notification_targets t on t.log_id=n.id;
  return result;
end $$;
revoke all on function public.claim_discord_bot_notification_batch(integer,uuid,uuid) from public,anon,authenticated;
grant execute on function public.claim_discord_bot_notification_batch(integer,uuid,uuid) to service_role;

create or replace function public.set_clan_discord_notification_preferences(p_clan_id uuid,p_actor_id uuid,p_guild_id text,
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
  update public.notification_log n set status='cancelled' from private.discord_notification_targets t where n.id=t.log_id and t.clan_id=p_clan_id and t.channel_id is null and n.status in ('scheduled','processing') and n.scheduled_at<=now();
  perform public.set_clan_discord_bot_settings(p_clan_id,p_actor_id,p_guild_id,nullif(p_channel_id,''),p_channel_name,p_enabled,p_kakao);
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
