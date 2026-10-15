create or replace function private.guard_clan_participant_roster() returns trigger language plpgsql security definer set search_path='' as $$
declare participant_key text; ids text[];
begin
 perform pg_advisory_xact_lock(hashtextextended('clan-participants:'||new.clan_id::text,0));
 ids:=array_remove(array[new.roster#>>'{team1,tank}',new.roster#>>'{team1,dmg,0}',new.roster#>>'{team1,dmg,1}',new.roster#>>'{team1,sup,0}',new.roster#>>'{team1,sup,1}',
 new.roster#>>'{team2,tank}',new.roster#>>'{team2,dmg,0}',new.roster#>>'{team2,dmg,1}',new.roster#>>'{team2,sup,0}',new.roster#>>'{team2,sup,1}'],null);
 if cardinality(ids)<>(select count(distinct private.participant_account(new.clan_id,u::uuid)) from unnest(ids) u) then raise exception '같은 참가자를 두 자리에 배치할 수 없습니다.'; end if;
 foreach participant_key in array ids loop
  if not exists(select 1 from public.clan_participants p where p.clan_id=new.clan_id and p.id=participant_key::uuid and
   ((not p.is_guest and exists(select 1 from public.clan_members cm where cm.clan_id=p.clan_id and cm.user_id=p.id and cm.status='active'))
    or (p.is_guest and (p.user_id is null or not exists(select 1 from public.clan_members cm where cm.clan_id=p.clan_id and cm.user_id=p.user_id and cm.status='active')))))
  then raise exception '참가자 명부가 변경되었습니다. 최신 명부를 확인하세요.'; end if;
 end loop;
 return new;
end $$;

-- Linked records remain reversible even after account deletion or another import.
create function private.refresh_participant_identity() returns trigger language plpgsql security definer set search_path='' as $$
declare ids uuid[]; days text[];
begin
 if new.user_id is not distinct from old.user_id then return new; end if;
 perform pg_advisory_xact_lock(hashtextextended('clan-stats:'||new.clan_id::text,0));
 select array_agg(id),array_agg(distinct day) into ids,days from private.clan_stats_records where clan_id=new.clan_id;
 perform private.sync_clan_stats_records(coalesce(ids,'{}'));
 perform private.refresh_clan_stats(new.clan_id,coalesce(days,'{}'));
 return new;
end $$;
revoke all on function private.refresh_participant_identity() from public,anon,authenticated;
create trigger participant_identity_refresh after update of user_id on public.clan_participants
 for each row when(old.user_id is distinct from new.user_id) execute function private.refresh_participant_identity();
do $$
declare d text;
begin
 d:=pg_get_functiondef('private.review_clan_participant_link(uuid,text,text)'::regprocedure);
 d:=replace(d,'perform private.sync_clan_stats_records(coalesce(ids,''{}''));','');
 d:=replace(d,'perform private.refresh_clan_stats(l.clan_id,coalesce(days,''{}''));','');
 execute d;
 d:=pg_get_functiondef('private.edit_clan_match_record(uuid,uuid,uuid,text,text,jsonb)'::regprocedure);
 d:=replace(d,'count(distinct p->>''userId'')','count(distinct private.participant_account(p_clan_id,(p->>''userId'')::uuid))');
 execute d;
 -- Analysis follows approved identities too; the observation source is unchanged.
 d:=pg_get_functiondef('private.balance_analysis_context(uuid,timestamp with time zone)'::regprocedure);
 d:=replace(d,'select slot.user_id, slot.role','select private.participant_account(p_clan_id,slot.user_id::uuid)::text as user_id, slot.role');
 execute d;
end $$;
