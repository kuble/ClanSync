-- A browser submits the deadline of the ballot it displayed. Lock the round and
-- compare that identity before writing so a delayed vote cannot cross a reset.
create function private.submit_balance_ban_vote(
  p_round_id uuid,p_clan_id uuid,p_kind text,p_expected_deadline timestamptz,
  p_choice_idx integer,p_picks text[]
) returns boolean language plpgsql security definer set search_path = '' as $$
declare v_round public.balance_sessions; v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception '로그인이 필요합니다.' using errcode = '42501'; end if;
  perform 1 from public.clan_members where clan_id = p_clan_id and user_id = v_user_id and status = 'active' for share;
  if not found then raise exception '활동 중인 클랜원만 투표할 수 있습니다.' using errcode = '42501'; end if;
  select * into v_round from public.balance_sessions where id = p_round_id and clan_id = p_clan_id for update;
  if not found then raise exception '라운드를 찾을 수 없습니다.' using errcode = '42501'; end if;
  if v_round.closed_at is not null or v_round.match_outcome <> 'pending' or p_expected_deadline is null then
    raise exception '투표가 종료되거나 변경되었습니다. 최신 화면을 확인하세요.';
  end if;
  if p_kind = 'map' then
    if v_round.phase <> 'map_ban' or not v_round.map_ban_enabled or v_round.resolved_map_label is not null or
      v_round.map_ban_deadline_at is distinct from p_expected_deadline or p_expected_deadline <= clock_timestamp() then
      raise exception '맵 투표가 종료되거나 변경되었습니다. 최신 화면을 확인하세요.';
    end if;
    if p_choice_idx is null or p_choice_idx not between 0 and 2 then raise exception '잘못된 맵 선택입니다.'; end if;
    insert into public.balance_session_map_votes(session_id,user_id,choice_idx)
      values(p_round_id,v_user_id,p_choice_idx)
      on conflict(session_id,user_id) do update set choice_idx = excluded.choice_idx;
  elsif p_kind = 'hero' then
    if v_round.phase <> 'hero_ban' or not v_round.hero_ban_enabled or v_round.banned_heroes is not null or
      v_round.hero_ban_deadline_at is distinct from p_expected_deadline or p_expected_deadline <= clock_timestamp() then
      raise exception '영웅 밴 투표가 종료되거나 변경되었습니다. 최신 화면을 확인하세요.';
    end if;
    if not jsonb_path_exists(v_round.roster,'$.*.** ? (@ == $id)',jsonb_build_object('id',v_user_id::text)) then
      raise exception '출전 라인업에 포함된 멤버만 투표할 수 있습니다.' using errcode = '42501';
    end if;
    if cardinality(p_picks) is distinct from 3 or
      (select count(distinct hero) from unnest(p_picks) hero where nullif(btrim(hero),'') is not null) <> 3 then
      raise exception '서로 다른 영웅 3명을 선택하세요.';
    end if;
    insert into public.balance_session_hero_votes(session_id,user_id,pick_1,pick_2,pick_3)
      values(p_round_id,v_user_id,p_picks[1],p_picks[2],p_picks[3])
      on conflict(session_id,user_id) do update set pick_1 = excluded.pick_1,pick_2 = excluded.pick_2,pick_3 = excluded.pick_3;
  else
    raise exception '잘못된 투표 종류입니다.';
  end if;
  return true;
end $$;
create function public.submit_balance_ban_vote(
  p_round_id uuid,p_clan_id uuid,p_kind text,p_expected_deadline timestamptz,
  p_choice_idx integer default null,p_picks text[] default null
) returns boolean language sql security invoker set search_path = '' as $$
  select private.submit_balance_ban_vote(p_round_id,p_clan_id,p_kind,p_expected_deadline,p_choice_idx,p_picks);
$$;
revoke all on function private.submit_balance_ban_vote(uuid,uuid,text,timestamptz,integer,text[]),
  public.submit_balance_ban_vote(uuid,uuid,text,timestamptz,integer,text[]) from public,anon;
grant execute on function private.submit_balance_ban_vote(uuid,uuid,text,timestamptz,integer,text[]),
  public.submit_balance_ban_vote(uuid,uuid,text,timestamptz,integer,text[]) to authenticated;
-- Reads retain member RLS; callers cannot bypass the ballot identity check.
revoke insert,update on public.balance_session_map_votes,public.balance_session_hero_votes from public,anon,authenticated;
