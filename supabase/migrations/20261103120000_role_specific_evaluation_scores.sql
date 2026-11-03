-- Keep existing history unchanged; future snapshots inherit only the assigned role.
create function private.balance_roster_role(p_roster jsonb,p_user text)
returns text language sql immutable set search_path='' as $$
 select role from (values
 (p_roster#>>'{team1,tank}','tank'),(p_roster#>>'{team2,tank}','tank'),
 (p_roster#>>'{team1,dmg,0}','dmg'),(p_roster#>>'{team1,dmg,1}','dmg'),
 (p_roster#>>'{team2,dmg,0}','dmg'),(p_roster#>>'{team2,dmg,1}','dmg'),
 (p_roster#>>'{team1,sup,0}','sup'),(p_roster#>>'{team1,sup,1}','sup'),
 (p_roster#>>'{team2,sup,0}','sup'),(p_roster#>>'{team2,sup,1}','sup')
 ) slots(user_id,role) where user_id=p_user limit 1;
$$;
revoke all on function private.balance_roster_role(jsonb,text) from public,anon,authenticated;

create or replace function private.refresh_balance_analysis() returns trigger
language plpgsql security definer set search_path='' as $$
declare context jsonb; snapshot jsonb := '{}'::jsonb; slot record; premium boolean;
begin
 if new.roster is not distinct from old.roster and new.resolved_map_label is not distinct from old.resolved_map_label
   and not (new.phase='match_live' and old.phase<>'match_live') then return new; end if;
 if old.closed_at is not null or old.match_outcome<>'pending' then return new; end if;
 premium := exists(select 1 from public.clans c where c.id=new.clan_id and c.subscription_tier='premium')
   and exists(select 1 from public.balance_rooms r where r.series_id=new.series_id and r.kind='regular');
 context := case when premium then private.balance_analysis_context(new.clan_id,new.opened_at) else '[]'::jsonb end;
 for slot in select * from (values
   (new.roster#>>'{team1,tank}','tank'),(new.roster#>>'{team1,dmg,0}','dmg'),(new.roster#>>'{team1,dmg,1}','dmg'),
   (new.roster#>>'{team1,sup,0}','sup'),(new.roster#>>'{team1,sup,1}','sup'),(new.roster#>>'{team2,tank}','tank'),
   (new.roster#>>'{team2,dmg,0}','dmg'),(new.roster#>>'{team2,dmg,1}','dmg'),
   (new.roster#>>'{team2,sup,0}','sup'),(new.roster#>>'{team2,sup,1}','sup')
 ) players(user_id,role) where user_id is not null loop
   snapshot := snapshot || jsonb_build_object(slot.user_id,jsonb_build_object(
     'm',coalesce(case when private.balance_roster_role(old.roster,slot.user_id)=slot.role then new.ma_snapshot->slot.user_id->'m' end,
       (select prior.ma_snapshot->slot.user_id->'m' from public.balance_sessions prior
        where prior.clan_id=new.clan_id and prior.opened_at<new.opened_at and prior.ma_snapshot ? slot.user_id
          and prior.match_outcome in ('team1','team2','draw')
          and private.balance_roster_role(prior.roster,slot.user_id)=slot.role
          and exists(select 1 from public.balance_rooms r where r.series_id=prior.series_id and r.kind='regular')
        order by prior.opened_at desc,prior.id desc limit 1),'0'::jsonb),
     'a',private.balance_analysis_value(context,slot.user_id,slot.role,new.resolved_map_label)));
 end loop;
 new.ma_snapshot := snapshot;
 return new;
end $$;
revoke all on function private.refresh_balance_analysis() from public,anon,authenticated;
