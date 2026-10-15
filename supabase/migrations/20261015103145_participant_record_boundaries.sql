-- Account links never make a player eligible to predict their own match.
create or replace function public.balance_roster_contains_user(p_roster jsonb,p_uid uuid)
returns boolean language sql stable security invoker set search_path='' as $$
 select coalesce(p_uid::text=any(array[p_roster#>>'{team1,tank}',p_roster#>>'{team1,dmg,0}',p_roster#>>'{team1,dmg,1}',p_roster#>>'{team1,sup,0}',p_roster#>>'{team1,sup,1}',
 p_roster#>>'{team2,tank}',p_roster#>>'{team2,dmg,0}',p_roster#>>'{team2,dmg,1}',p_roster#>>'{team2,sup,0}',p_roster#>>'{team2,sup,1}']),false)
 or exists(select 1 from public.clan_participants p where p.is_guest and p.user_id=p_uid and
  jsonb_path_exists(p_roster,'$.*.** ? (@ == $id)',jsonb_build_object('id',p.id::text)));
$$;
revoke all on function public.balance_roster_contains_user(jsonb,uuid) from public,anon;
grant execute on function public.balance_roster_contains_user(jsonb,uuid) to authenticated,service_role;

-- Keep a linked guest selectable until their current session ends, even if the
-- account joins the clan mid-session; use the member entry from the next session.
create function private.guest_in_open_series(p_clan uuid,p_id uuid) returns boolean
language sql stable set search_path='' as $$
 select exists(select 1 from public.balance_sessions s join public.balance_session_series ss on ss.id=s.series_id
 where s.clan_id=p_clan and ss.closed_at is null and jsonb_path_exists(s.roster,'$.*.** ? (@ == $id)',jsonb_build_object('id',p_id::text)));
$$;
revoke all on function private.guest_in_open_series(uuid,uuid) from public,anon,authenticated;
do $$
declare d text;
begin
 d:=pg_get_functiondef('public.list_balance_roster_pool(uuid)'::regprocedure);
 d:=replace(d,'not p.is_guest and exists','not p.is_guest and not exists(select 1 from public.clan_participants g where g.clan_id=p.clan_id and g.is_guest and g.user_id=p.id and private.guest_in_open_series(g.clan_id,g.id)) and exists');
 d:=replace(d,'p.is_guest and (p.user_id is null or not exists','p.is_guest and (p.user_id is null or private.guest_in_open_series(p.clan_id,p.id) or not exists');
 execute d;
 d:=pg_get_functiondef('private.guard_clan_participant_roster()'::regprocedure);
 d:=replace(d,'p.is_guest and (p.user_id is null or not exists','p.is_guest and (p.user_id is null or private.guest_in_open_series(p.clan_id,p.id) or not exists');
 d:=replace(d,'perform pg_advisory_xact_lock(hashtextextended(''clan-participants:''','perform pg_advisory_xact_lock(hashtextextended(''clan-stats:''||new.clan_id::text,0)); perform pg_advisory_xact_lock(hashtextextended(''clan-participants:''');
 execute d;
end $$;
