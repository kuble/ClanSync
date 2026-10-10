-- Preserve reminders across temporary disconnects; durable announcements share the outbox.
create function public.queue_event_discord_announcement() returns trigger language plpgsql security definer set search_path='' as $$
declare slot public.notification_slot_kind; occurrence bigint;
begin
  if new.cancelled_at is not null or new.discord_notify->>'enabled' is distinct from 'true' or new.discord_notify->>'announce' is distinct from 'true' then return new; end if;
  if tg_op='UPDATE' and (old.title,old.kind,old.start_at,old.place,old.repeat,old.repeat_weekdays,old.repeat_time)
    is not distinct from (new.title,new.kind,new.start_at,new.place,new.repeat,new.repeat_weekdays,new.repeat_time) then return new; end if;
  if not exists(select 1 from public.clans c join public.clan_settings s on s.clan_id=c.id join public.clan_discord_connections d on d.clan_id=c.id
    where c.id=new.clan_id and c.subscription_tier='premium' and s.event_notify->>'discord_transport'='bot' and s.event_notify->>'discord_enabled'='true' and d.channel_id is not null) then return new; end if;
  slot:=case when tg_op='INSERT' then 'event_created'::public.notification_slot_kind else 'event_updated'::public.notification_slot_kind end;
  occurrence:=-txid_current();
  insert into public.notification_log(event_id,instance_idx,slot_kind,channel,recipient_user_id,scheduled_at,dedup_key)
    values(new.id,occurrence,slot,'discord',new.created_by,now(),new.id::text||'|'||occurrence::text||'|'||slot::text||'|discord') on conflict do nothing;
  return new;
end $$;
revoke all on function public.queue_event_discord_announcement() from public,anon,authenticated;
create trigger queue_event_discord_announcement after insert or update on public.clan_events for each row execute function public.queue_event_discord_announcement();
create index clan_discord_connections_guild_idx on public.clan_discord_connections(guild_id);
-- Retire executable webhook APIs; previous private credentials remain inaccessible.
revoke execute on function public.set_clan_notification_settings(uuid,boolean,boolean,text) from authenticated;
drop function public.claim_discord_bot_notification_batch(integer);
create or replace function public.set_clan_discord_bot_settings(p_clan_id uuid,p_actor_id uuid,p_guild_id text,p_channel_id text,p_channel_name text,p_enabled boolean,p_kakao boolean)
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
  update public.clan_settings set event_notify=coalesce(event_notify,'{}')||jsonb_build_object('discord_transport','bot','discord_enabled',p_enabled,'discord_configured',connection.clan_id is not null and p_channel_id is not null,'kakao_notifications_opt_in',p_kakao),updated_by=p_actor_id where clan_id=p_clan_id;
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
revoke all on function public.set_clan_discord_bot_settings(uuid,uuid,text,text,text,boolean,boolean) from public,anon,authenticated;
grant execute on function public.set_clan_discord_bot_settings(uuid,uuid,text,text,text,boolean,boolean) to service_role;

create or replace function public.replace_event_discord_notifications(p_event_id uuid,p_actor_id uuid,p_schedule jsonb)
returns void language plpgsql set search_path='' as $$
declare e public.clan_events%rowtype;
begin
  select * into e from public.clan_events where id=p_event_id for update;
  update public.notification_log set status='cancelled',updated_at=now() where event_id=e.id and channel='discord' and status in ('scheduled','processing')
    and (slot_kind not in ('event_created','event_updated') or e.discord_notify->>'enabled' is distinct from 'true');
  if e.cancelled_at is not null or e.discord_notify->>'enabled' is distinct from 'true' then return; end if;
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

create or replace function public.claim_discord_bot_notification_batch(p_limit integer,p_event_id uuid default null) returns jsonb language plpgsql set search_path='' as $$
declare result jsonb;
begin
  update public.notification_log set status='dlq',last_error='Dispatch lease expired after final attempt',updated_at=now()
    where channel='discord' and status='processing' and attempt_count>=5 and updated_at<now()-interval '5 minutes'
      and (p_event_id is null or event_id=p_event_id);
  with picked as (
    select n.id from public.notification_log n
    left join public.clan_events e on e.id=n.event_id left join public.clan_polls p on p.id=n.poll_id
    join public.clan_settings s on s.clan_id=coalesce(e.clan_id,p.clan_id)
    join public.clans c on c.id=s.clan_id join public.clan_discord_connections d on d.clan_id=c.id
    where (p_event_id is null or n.event_id=p_event_id) and n.channel='discord' and (n.status='scheduled' or n.status='processing' and n.updated_at<now()-interval '5 minutes')
      and n.scheduled_at<=now() and n.attempt_count<5 and c.subscription_tier='premium'
      and s.event_notify->>'discord_enabled'='true' and s.event_notify->>'discord_transport'='bot' and d.channel_id is not null
      and (e.id is not null and e.cancelled_at is null and e.discord_notify->>'enabled'='true' or p.id is not null and p.closed_at is null and p.deadline_at>now())
      and (e.id is not null or p.id is not null)
    order by n.scheduled_at,n.id limit greatest(1,least(coalesce(p_limit,25),100)) for update of n skip locked
  ), changed as (
    update public.notification_log n set status='processing',updated_at=now(),attempt_count=n.attempt_count+1 from picked where n.id=picked.id returning n.*
  ) select coalesce(jsonb_agg(jsonb_build_object('log_id',n.id,'slot_kind',n.slot_kind,'title',coalesce(e.title,p.title),
    'event_id',e.id,'poll_id',p.id,'start_at',case when e.repeat<>'none' and n.instance_idx>0 then to_timestamp(n.instance_idx/1000.0) else e.start_at end,'deadline_at',p.deadline_at,'clan_id',c.id,'game_slug',g.slug,'channel_id',d.channel_id)), '[]') into result
    from changed n left join public.clan_events e on e.id=n.event_id left join public.clan_polls p on p.id=n.poll_id
    join public.clans c on c.id=coalesce(e.clan_id,p.clan_id) join public.games g on g.id=c.game_id join public.clan_discord_connections d on d.clan_id=c.id;
  return result;
end $$;
revoke all on function public.claim_discord_bot_notification_batch(integer,uuid) from public,anon,authenticated;
grant execute on function public.claim_discord_bot_notification_batch(integer,uuid) to service_role;

create or replace function public.finalize_discord_bot_notification(p_log_id uuid,p_ok boolean,p_error text) returns void language plpgsql set search_path='' as $$
begin
  update public.notification_log set status=case when p_ok then 'sent'::public.notification_status when attempt_count<5 then 'scheduled'::public.notification_status else 'dlq'::public.notification_status end,
    effective_at=case when p_ok then now() else null end,
    scheduled_at=case when not p_ok and attempt_count<5 then now()+make_interval(secs=>30*power(2,attempt_count)::integer) else scheduled_at end,
    last_error=case when p_ok then null else left(p_error,100) end,updated_at=now() where id=p_log_id and status='processing';
end $$;
revoke all on function public.finalize_discord_bot_notification(uuid,boolean,text) from public,anon,authenticated;
grant execute on function public.finalize_discord_bot_notification(uuid,boolean,text) to service_role;
