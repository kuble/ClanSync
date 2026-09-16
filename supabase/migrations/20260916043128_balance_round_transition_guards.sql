create or replace function private.guard_balance_formation() returns trigger
language plpgsql set search_path = '' as $$
declare ids text[];
begin
  if new.phase is distinct from old.phase then
    if old.closed_at is not null or old.match_outcome <> 'pending' or not (
      (old.phase = 'editing' and new.phase in ('map_ban','hero_ban','match_live')) or
      (old.phase = 'map_ban' and new.phase in ('hero_ban','match_live')) or
      (old.phase = 'hero_ban' and new.phase = 'match_live')
    ) then raise exception '라운드를 이전 단계로 되돌릴 수 없습니다.'; end if;
  end if;
  if old.phase = 'editing' and new.phase <> 'editing' then
    if old.formation_state is not null and old.formation_state->>'stage' <> 'complete' then
      raise exception '팀 편성을 먼저 완료하세요.';
    end if;
    ids := array[new.roster#>>'{team1,tank}',new.roster#>>'{team1,dmg,0}',new.roster#>>'{team1,dmg,1}',new.roster#>>'{team1,sup,0}',new.roster#>>'{team1,sup,1}',
      new.roster#>>'{team2,tank}',new.roster#>>'{team2,dmg,0}',new.roster#>>'{team2,dmg,1}',new.roster#>>'{team2,sup,0}',new.roster#>>'{team2,sup,1}'];
    if (select count(distinct v) from unnest(ids) v where v is not null) <> 10 then
      raise exception '서로 다른 출전자 10명을 먼저 저장하세요.';
    end if;
    if (select count(*) from public.clan_members where clan_id = new.clan_id and status = 'active' and user_id = any(ids::uuid[])) <> 10 then
      raise exception '현재 활동 중인 클랜원만 출전할 수 있습니다.';
    end if;
  end if;
  if new.roster is distinct from old.roster then
    if old.phase <> 'editing' or old.closed_at is not null or old.match_outcome <> 'pending' then
      raise exception '출전 명단은 편성 단계에서만 변경할 수 있습니다.';
    end if;
    if new.formation_revision = old.formation_revision then
      if old.formation_state is not null and old.formation_state->>'stage' <> 'complete' then
        raise exception '진행 중인 팀 편성을 초기화한 뒤 명단을 변경하세요.';
      end if;
      new.formation_state := null;
      new.formation_revision := old.formation_revision + 1;
    end if;
  end if;
  return new;
end $$;

drop function public.commit_balance_formation(uuid,uuid,integer,jsonb,jsonb);
create function public.commit_balance_formation(
  p_round_id uuid, p_clan_id uuid, p_revision integer, p_state jsonb, p_roster jsonb,
  p_actor_id uuid, p_command text
) returns boolean language plpgsql security invoker set search_path = '' as $$
declare v_role public.clan_member_role; v_id uuid; v_round public.balance_sessions;
begin
  select role into v_role from public.clan_members
    where clan_id = p_clan_id and user_id = p_actor_id and status = 'active' for share;
  if v_role is null then raise exception '활동 중인 클랜원만 참여할 수 있습니다.' using errcode = '42501'; end if;
  select * into v_round from public.balance_sessions where id = p_round_id and clan_id = p_clan_id for update;
  if not found then return false; end if;
  if v_role not in ('leader','officer') and (
    p_command not in ('pick','bid') or not coalesce(v_round.formation_state->'captains' @> to_jsonb(array[p_actor_id::text]),false)
  ) then raise exception '현재 조작 권한이 없습니다.' using errcode = '42501'; end if;
  update public.balance_sessions
  set formation_state = p_state, roster = p_roster, formation_revision = formation_revision + 1
  where id = p_round_id and formation_revision = p_revision and closed_at is null and phase = 'editing'
    and exists (select 1 from public.balance_session_series s where s.id = series_id and s.closed_at is null)
  returning id into v_id;
  return v_id is not null;
end $$;
revoke all on function public.commit_balance_formation(uuid,uuid,integer,jsonb,jsonb,uuid,text) from public,anon,authenticated;
grant execute on function public.commit_balance_formation(uuid,uuid,integer,jsonb,jsonb,uuid,text) to service_role;
