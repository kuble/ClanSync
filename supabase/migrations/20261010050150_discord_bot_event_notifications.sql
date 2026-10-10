-- Shared bot credentials stay in server environment variables. Guild ownership is verified by OAuth.
create table public.clan_discord_connections (
  clan_id uuid primary key references public.clans(id) on delete cascade,
  guild_id text not null check (guild_id ~ '^[0-9]{17,20}$'),
  guild_name text not null,
  channel_id text check (channel_id ~ '^[0-9]{17,20}$'),
  channel_name text,
  updated_at timestamptz not null default now()
);
alter table public.clan_discord_connections enable row level security;
revoke all on public.clan_discord_connections from public,anon,authenticated;
grant all on public.clan_discord_connections to service_role;
alter table public.clan_events add column discord_notify jsonb not null default '{"enabled":false,"announce":false,"slots":[]}'::jsonb;

create function private.assert_discord_clan_leader(p_clan_id uuid,p_actor_id uuid)
returns void language plpgsql set search_path='' as $$
begin
  perform 1 from public.clan_members where clan_id=p_clan_id and user_id=p_actor_id and status='active' and role='leader' for share;
  if not found then raise exception 'Leader required' using errcode='42501'; end if;
  perform 1 from public.clans where id=p_clan_id and subscription_tier='premium' for share;
  if not found then raise exception 'Premium required' using errcode='42501'; end if;
end $$;
revoke all on function private.assert_discord_clan_leader(uuid,uuid) from public,anon,authenticated;
grant execute on function private.assert_discord_clan_leader(uuid,uuid) to service_role;

create function public.connect_clan_discord_bot(p_clan_id uuid,p_actor_id uuid,p_guild_id text,p_guild_name text)
returns void language plpgsql set search_path='' as $$
begin
  perform private.assert_discord_clan_leader(p_clan_id,p_actor_id);
  perform 1 from public.clan_settings where clan_id=p_clan_id for update;
  insert into public.clan_discord_connections(clan_id,guild_id,guild_name) values(p_clan_id,p_guild_id,left(p_guild_name,100))
    on conflict(clan_id) do update set guild_id=excluded.guild_id,guild_name=excluded.guild_name,channel_id=null,channel_name=null,updated_at=now();
  update public.clan_settings set event_notify=coalesce(event_notify,'{}')||'{"discord_transport":"bot","discord_enabled":false,"discord_configured":false}'::jsonb,updated_by=p_actor_id where clan_id=p_clan_id;
  update public.notification_log set status='cancelled',updated_at=now() where channel='discord' and status in ('scheduled','processing') and
    (event_id in(select id from public.clan_events where clan_id=p_clan_id) or poll_id in(select id from public.clan_polls where clan_id=p_clan_id));
end $$;
revoke all on function public.connect_clan_discord_bot(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.connect_clan_discord_bot(uuid,uuid,text,text) to service_role;

create function public.set_clan_discord_bot_settings(p_clan_id uuid,p_actor_id uuid,p_guild_id text,p_channel_id text,p_channel_name text,p_enabled boolean,p_kakao boolean)
returns void language plpgsql set search_path='' as $$
declare connection public.clan_discord_connections%rowtype;
begin
  perform private.assert_discord_clan_leader(p_clan_id,p_actor_id);
  perform 1 from public.clan_settings where clan_id=p_clan_id for update;
  select * into connection from public.clan_discord_connections where clan_id=p_clan_id for update;
  if p_enabled is null or p_kakao is null then raise exception 'Invalid settings'; end if;
  if p_enabled and (connection.guild_id is distinct from p_guild_id or p_channel_id is null) then raise exception 'Verified Discord connection required'; end if;
  if connection.clan_id is not null then
    if connection.guild_id is distinct from p_guild_id then raise exception 'Discord connection changed'; end if;
    update public.clan_discord_connections set channel_id=p_channel_id,channel_name=left(p_channel_name,100),updated_at=now() where clan_id=p_clan_id;
  end if;
  update public.clan_settings set event_notify=coalesce(event_notify,'{}')||jsonb_build_object('discord_transport','bot','discord_enabled',p_enabled,'discord_configured',p_channel_id is not null,'kakao_notifications_opt_in',p_kakao),updated_by=p_actor_id where clan_id=p_clan_id;
  if not p_enabled or connection.channel_id is distinct from p_channel_id then
    update public.notification_log set status='cancelled',updated_at=now() where channel='discord' and status in ('scheduled','processing') and
      (event_id in(select id from public.clan_events where clan_id=p_clan_id) or poll_id in(select id from public.clan_polls where clan_id=p_clan_id));
  end if;
end $$;
revoke all on function public.set_clan_discord_bot_settings(uuid,uuid,text,text,text,boolean,boolean) from public,anon,authenticated;
grant execute on function public.set_clan_discord_bot_settings(uuid,uuid,text,text,text,boolean,boolean) to service_role;

create function public.replace_event_discord_notifications(p_event_id uuid,p_actor_id uuid,p_schedule jsonb)
returns void language plpgsql set search_path='' as $$
declare e public.clan_events%rowtype;
begin
  select * into e from public.clan_events where id=p_event_id for update;
  update public.notification_log set status='cancelled',updated_at=now() where event_id=e.id and channel='discord' and status in ('scheduled','processing');
  if e.cancelled_at is not null or e.discord_notify->>'enabled' is distinct from 'true' or not exists(
    select 1 from public.clan_settings s join public.clans c on c.id=s.clan_id join public.clan_discord_connections d on d.clan_id=s.clan_id
      where s.clan_id=e.clan_id and c.subscription_tier='premium' and s.event_notify->>'discord_enabled'='true' and s.event_notify->>'discord_transport'='bot' and d.channel_id is not null) then return; end if;
  insert into public.notification_log(event_id,instance_idx,slot_kind,channel,recipient_user_id,scheduled_at,dedup_key,status)
    select e.id,s.instance_idx,s.slot_kind::public.notification_slot_kind,'discord',e.created_by,s.scheduled_at,
      e.id::text||'|'||s.instance_idx::text||'|'||s.slot_kind||'|'||e.created_by::text||'|discord','scheduled'
    from jsonb_to_recordset(p_schedule) as s(instance_idx bigint,slot_kind text,scheduled_at timestamptz)
    where (e.discord_notify->'slots') ? s.slot_kind
    on conflict(event_id,instance_idx,slot_kind,channel,recipient_user_id) where event_id is not null
    do update set scheduled_at=excluded.scheduled_at,status='scheduled',updated_at=now(),last_error=null,attempt_count=0
    where notification_log.status in ('scheduled','cancelled','failed');
end $$;
revoke all on function public.replace_event_discord_notifications(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.replace_event_discord_notifications(uuid,uuid,jsonb) to service_role;

-- Cancel bot reservations atomically with either manual or automatic event cancellation.
create function public.cancel_event_discord_notifications() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.cancelled_at is not null then
    update public.notification_log set status='cancelled',updated_at=now() where event_id=new.id and channel='discord' and status in ('scheduled','processing');
  end if;
  return new;
end $$;
create trigger cancel_event_discord_notifications after update of cancelled_at on public.clan_events for each row execute function public.cancel_event_discord_notifications();
revoke all on function public.cancel_event_discord_notifications() from public,anon,authenticated;

create function public.claim_discord_bot_notification_batch(p_limit integer) returns jsonb language plpgsql set search_path='' as $$
declare result jsonb;
begin
  with picked as (
    select n.id from public.notification_log n
    left join public.clan_events e on e.id=n.event_id left join public.clan_polls p on p.id=n.poll_id
    join public.clan_settings s on s.clan_id=coalesce(e.clan_id,p.clan_id)
    join public.clans c on c.id=s.clan_id join public.clan_discord_connections d on d.clan_id=c.id
    where n.channel='discord' and (n.status='scheduled' or n.status='processing' and n.updated_at<now()-interval '5 minutes')
      and n.scheduled_at<=now() and n.attempt_count<5 and c.subscription_tier='premium'
      and s.event_notify->>'discord_enabled'='true' and s.event_notify->>'discord_transport'='bot' and d.channel_id is not null
      and (e.id is not null and e.cancelled_at is null and e.discord_notify->>'enabled'='true' or p.id is not null and p.closed_at is null and p.deadline_at>now())
      and (e.id is not null or p.id is not null)
    order by n.scheduled_at,n.id limit greatest(1,least(coalesce(p_limit,25),100)) for update of n skip locked
  ), changed as (
    update public.notification_log n set status='processing',updated_at=now(),attempt_count=n.attempt_count+1 from picked where n.id=picked.id returning n.*
  ) select coalesce(jsonb_agg(jsonb_build_object('log_id',n.id,'slot_kind',n.slot_kind,'title',coalesce(e.title,p.title),
    'event_id',e.id,'poll_id',p.id,'start_at',e.start_at,'deadline_at',p.deadline_at,'clan_id',c.id,'game_slug',g.slug,'channel_id',d.channel_id)), '[]') into result
    from changed n left join public.clan_events e on e.id=n.event_id left join public.clan_polls p on p.id=n.poll_id
    join public.clans c on c.id=coalesce(e.clan_id,p.clan_id) join public.games g on g.id=c.game_id join public.clan_discord_connections d on d.clan_id=c.id;
  return result;
end $$;
revoke all on function public.claim_discord_bot_notification_batch(integer) from public,anon,authenticated;
grant execute on function public.claim_discord_bot_notification_batch(integer) to service_role;

create function public.finalize_discord_bot_notification(p_log_id uuid,p_ok boolean,p_error text) returns void language plpgsql set search_path='' as $$
begin
  update public.notification_log set status=case when p_ok then 'sent'::public.notification_status when attempt_count<5 then 'scheduled'::public.notification_status else 'failed'::public.notification_status end,
    effective_at=case when p_ok then now() else null end,
    scheduled_at=case when not p_ok and attempt_count<5 then now()+make_interval(secs=>30*power(2,attempt_count)::integer) else scheduled_at end,
    last_error=case when p_ok then null else left(p_error,100) end,updated_at=now() where id=p_log_id and status='processing';
end $$;
revoke all on function public.finalize_discord_bot_notification(uuid,boolean,text) from public,anon,authenticated;
grant execute on function public.finalize_discord_bot_notification(uuid,boolean,text) to service_role;

CREATE OR REPLACE FUNCTION public.save_manual_clan_event(
  p_clan_id uuid, p_actor_id uuid, p_event_id uuid, p_event jsonb, p_schedule jsonb, p_create boolean DEFAULT false
) RETURNS uuid LANGUAGE plpgsql SET search_path = ''
AS $$
DECLARE e public.clan_events%rowtype; notice jsonb; actor_role text; settings jsonb;
BEGIN
  IF p_actor_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.clan_members
    WHERE clan_id = p_clan_id AND user_id = p_actor_id AND status = 'active') THEN
    RAISE EXCEPTION '클랜 구성원이 아닙니다.' USING ERRCODE = '42501';
  END IF;
  IF p_event->>'kind' NOT IN ('intra', 'event') OR length(trim(p_event->>'title')) NOT BETWEEN 1 AND 120 THEN
    RAISE EXCEPTION '일정 내용이 올바르지 않습니다.';
  END IF;
  SELECT role::text INTO actor_role FROM public.clan_members WHERE clan_id=p_clan_id AND user_id=p_actor_id AND status='active' FOR SHARE;
  SELECT permissions INTO settings FROM public.clan_settings WHERE clan_id=p_clan_id FOR SHARE;
  IF jsonb_typeof(settings) IS DISTINCT FROM 'object' OR NOT coalesce(CASE WHEN settings ? 'manage_clan_events' THEN
    jsonb_typeof(settings->'manage_clan_events')='array' AND (settings->'manage_clan_events') ? actor_role
    ELSE actor_role IN ('leader','officer') END,false) THEN
    RAISE EXCEPTION 'Event permission denied' USING ERRCODE='42501';
  END IF;
  notice:=p_event->'discord_notify';
  IF notice IS NOT NULL AND (jsonb_typeof(notice) IS DISTINCT FROM 'object'
    OR jsonb_typeof(notice->'enabled') IS DISTINCT FROM 'boolean' OR jsonb_typeof(notice->'announce') IS DISTINCT FROM 'boolean'
    OR jsonb_typeof(notice->'slots') IS DISTINCT FROM 'array'
    OR notice->'slots' - ARRAY['event_t_minus_24h','event_t_minus_1h','event_t_minus_10min','event_t_0'] <> '[]'::jsonb) THEN
    RAISE EXCEPTION 'Invalid Discord notification settings';
  END IF;
  IF p_create THEN
    INSERT INTO public.clan_events(id, clan_id, title, kind, start_at, place, source,
      created_by, repeat, repeat_weekdays, repeat_time, discord_notify)
    VALUES(p_event_id, p_clan_id, p_event->>'title', (p_event->>'kind')::public.clan_event_kind,
      (p_event->>'start_at')::timestamptz, p_event->>'place', 'manual', p_actor_id,
      (p_event->>'repeat')::public.clan_event_repeat,
      CASE WHEN jsonb_typeof(p_event->'repeat_weekdays') = 'array'
        THEN ARRAY(SELECT jsonb_array_elements_text(p_event->'repeat_weekdays')::integer) END,
      (p_event->>'repeat_time')::time, coalesce(notice,'{"enabled":false,"announce":false,"slots":[]}'::jsonb));
  ELSE
    SELECT * INTO e FROM public.clan_events WHERE id = p_event_id AND clan_id = p_clan_id FOR UPDATE;
    IF NOT FOUND OR e.source <> 'manual' OR e.cancelled_at IS NOT NULL THEN
      RAISE EXCEPTION '수정할 수 없는 일정입니다.';
    END IF;
    UPDATE public.clan_events SET title = p_event->>'title', kind = (p_event->>'kind')::public.clan_event_kind,
      start_at = (p_event->>'start_at')::timestamptz, place = p_event->>'place',
      repeat = (p_event->>'repeat')::public.clan_event_repeat,
      repeat_weekdays = CASE WHEN jsonb_typeof(p_event->'repeat_weekdays') = 'array'
        THEN ARRAY(SELECT jsonb_array_elements_text(p_event->'repeat_weekdays')::integer) END,
      discord_notify=coalesce(notice,e.discord_notify), repeat_time = (p_event->>'repeat_time')::time
      WHERE id = e.id;
  END IF;
  PERFORM public.replace_event_inapp_notifications(p_event_id, p_schedule);
  PERFORM public.replace_event_discord_notifications(p_event_id,p_actor_id,p_schedule);
  RETURN p_event_id;
END;
$$;
REVOKE ALL ON FUNCTION public.save_manual_clan_event(uuid, uuid, uuid, jsonb, jsonb, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_manual_clan_event(uuid, uuid, uuid, jsonb, jsonb, boolean) TO service_role;
