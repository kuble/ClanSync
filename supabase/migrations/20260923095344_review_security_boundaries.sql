-- Keep Discord capability URLs out of member-readable JSON and client props.
create table public.clan_notification_secrets (
  clan_id uuid primary key references public.clans(id) on delete cascade,
  discord_webhook_url text not null check (length(discord_webhook_url) <= 2048 and discord_webhook_url ~ '^https://discord[.]com/api/webhooks/[0-9]+/[A-Za-z0-9_-]+$')
);
alter table public.clan_notification_secrets enable row level security;
revoke all on public.clan_notification_secrets from public, anon, authenticated;
grant all on public.clan_notification_secrets to service_role;
insert into public.clan_notification_secrets
select clan_id, event_notify->>'discord_webhook_url' from public.clan_settings
where length(event_notify->>'discord_webhook_url') <= 2048 and event_notify->>'discord_webhook_url' ~ '^https://discord[.]com/api/webhooks/[0-9]+/[A-Za-z0-9_-]+$';
update public.clan_settings s set event_notify = (coalesce(event_notify,'{}'::jsonb) - 'discord_webhook_url') || jsonb_build_object('discord_configured', exists(select 1 from public.clan_notification_secrets n where n.clan_id=s.clan_id));
alter table public.clan_settings add constraint event_notify_no_secret check (not (event_notify ? 'discord_webhook_url'));

create function public.set_clan_notification_settings(p_clan_id uuid, p_enabled boolean, p_kakao boolean, p_url text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not exists(select 1 from public.clan_members where clan_id=p_clan_id and user_id=auth.uid() and status='active' and role='leader') then
    raise exception '알림 설정은 클랜장만 저장할 수 있습니다.' using errcode='42501';
  end if;
  perform 1 from public.clan_settings where clan_id=p_clan_id for update;
  if not found then raise exception '클랜 설정을 찾을 수 없습니다.'; end if;
  if p_enabled is null or p_kakao is null then raise exception 'invalid_settings'; end if;
  if p_url is not null then
    insert into public.clan_notification_secrets values(p_clan_id,p_url)
    on conflict(clan_id) do update set discord_webhook_url=excluded.discord_webhook_url;
  end if;
  if not p_enabled then delete from public.clan_notification_secrets where clan_id=p_clan_id; end if;
  if p_enabled and not exists(select 1 from public.clan_notification_secrets where clan_id=p_clan_id) then
    raise exception 'Discord 알림을 켜려면 웹훅 URL을 입력해 주세요.';
  end if;
  update public.clan_settings set event_notify=coalesce(event_notify,'{}'::jsonb) || jsonb_build_object('discord_enabled',p_enabled,'discord_configured',p_enabled,'kakao_notifications_opt_in',p_kakao), updated_by=auth.uid() where clan_id=p_clan_id;
end $$;
revoke all on function public.set_clan_notification_settings(uuid,boolean,boolean,text) from public,anon;
grant execute on function public.set_clan_notification_settings(uuid,boolean,boolean,text) to authenticated;
do $$
declare d text;
begin
 d:=pg_get_functiondef('public.claim_discord_poll_notification_batch(integer)'::regprocedure);
 if position('cs.event_notify ->> ''discord_webhook_url''' in d)=0 then raise exception 'Discord claim definition drift'; end if;
 d:=replace(d,'cs.event_notify ->> ''discord_webhook_url''','(select n.discord_webhook_url from public.clan_notification_secrets n where n.clan_id=cp.clan_id)');
 execute d;
end $$;

-- Shared-clan access must also share the alternate account's game.
drop policy user_alt_accounts_select_clan_peer on public.user_alt_accounts;
create policy user_alt_accounts_select_clan_peer on public.user_alt_accounts for select to authenticated using (
 auth.uid() <> user_id and exists (
 select 1 from public.clan_members cm_o
 join public.clan_members cm_v on cm_o.clan_id=cm_v.clan_id
 join public.clans c on c.id=cm_v.clan_id and c.game_id=user_alt_accounts.game_id
 where cm_o.user_id=user_alt_accounts.user_id and cm_v.user_id=auth.uid()
 and cm_o.status='active' and cm_v.status='active'
 and cm_v.role::text=any(public.effective_view_alt_account_roles(cm_v.clan_id))));

-- Match the history action's staff / own-open-flash boundary at the database.
create function private.can_read_balance_history(p_series_id uuid,p_clan_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select public.is_active_clan_member(p_clan_id) and (public.is_clan_officer_plus(p_clan_id) or exists (
 select 1 from public.balance_rooms r where r.series_id=p_series_id and r.clan_id=p_clan_id
 and r.kind='flash' and r.status='open' and r.created_by=auth.uid()));
$$;
revoke all on function private.can_read_balance_history(uuid,uuid) from public,anon;
grant execute on function private.can_read_balance_history(uuid,uuid) to authenticated;
drop policy balance_sessions_select_member on public.balance_sessions;
create policy balance_sessions_select_member on public.balance_sessions for select to authenticated using (
 private.can_read_balance_history(series_id,clan_id) or
 (closed_at is null and public.is_active_clan_member(clan_id) and exists(select 1 from public.balance_session_series s where s.id=series_id and s.closed_at is null)));
drop policy balance_session_series_select_member on public.balance_session_series;
create policy balance_session_series_select_member on public.balance_session_series for select to authenticated using (
 public.is_active_clan_member(clan_id) and (closed_at is null or public.is_clan_officer_plus(clan_id)));

-- Serialize each ballot replacement with poll closing and other votes.
create function public.submit_clan_poll_vote(p_clan_id uuid,p_poll_id uuid,p_option_ids uuid[])
returns void language plpgsql security definer set search_path='' as $$
declare p public.clan_polls%rowtype; n integer;
begin
 if auth.uid() is null or not public.is_active_clan_member(p_clan_id) then raise exception 'forbidden' using errcode='42501'; end if;
 select * into p from public.clan_polls where id=p_poll_id and clan_id=p_clan_id for update;
 if not found or p.closed_at is not null or p.deadline_at<=clock_timestamp() then raise exception '종료된 투표입니다.'; end if;
 n:=cardinality(p_option_ids);
 if n is null or n<1 or (not p.multiple_choice and n<>1) or n<>(select count(distinct x) from unnest(p_option_ids) x)
 or n<>(select count(*) from public.poll_options where poll_id=p_poll_id and id=any(p_option_ids)) then raise exception '선택지가 올바르지 않습니다.'; end if;
 delete from public.poll_votes where poll_id=p_poll_id and user_id=auth.uid();
 insert into public.poll_votes(poll_id,option_id,user_id) select p_poll_id,x,auth.uid() from unnest(p_option_ids) x;
end $$;
revoke all on function public.submit_clan_poll_vote(uuid,uuid,uuid[]) from public,anon;
grant execute on function public.submit_clan_poll_vote(uuid,uuid,uuid[]) to authenticated;

-- All prediction writes lock the same round before the series activity trigger.
-- Outcome settlement already locks this row before counting or paying winners.
create function private.lock_prediction_round() returns trigger
language plpgsql security definer set search_path='' as $$
declare s public.balance_sessions%rowtype;
begin
 if tg_op='UPDATE' and (new.session_id is distinct from old.session_id or new.user_id is distinct from old.user_id) then raise exception 'immutable_prediction_identity'; end if;
 select * into s from public.balance_sessions where id=new.session_id for update;
 if auth.uid() is not null and (not found or new.user_id<>auth.uid() or s.closed_at is not null or s.phase<>'match_live' or s.match_outcome<>'pending'
 or (s.prediction_deadline_at is not null and s.prediction_deadline_at<=clock_timestamp())
 or not public.is_active_clan_member(s.clan_id) or public.balance_roster_contains_user(s.roster,auth.uid())) then
 raise exception '예측 투표가 종료되었거나 투표할 수 없습니다.' using errcode='42501'; end if;
 return new;
end $$;
revoke all on function private.lock_prediction_round() from public,anon,authenticated;
create trigger aaa_lock_prediction_round before insert or update on public.balance_session_predictions for each row execute function private.lock_prediction_round();
