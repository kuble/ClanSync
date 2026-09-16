-- Only authenticated server actions may commit a validated formation transition.
create function public.commit_balance_formation(
  p_round_id uuid, p_clan_id uuid, p_revision integer, p_state jsonb, p_roster jsonb
) returns boolean language plpgsql security invoker set search_path = '' as $$
declare v_id uuid;
begin
  update public.balance_sessions
  set formation_state = p_state, roster = p_roster, formation_revision = formation_revision + 1
  where id = p_round_id and clan_id = p_clan_id and formation_revision = p_revision
    and closed_at is null and phase = 'editing'
    and exists (select 1 from public.balance_session_series s where s.id = series_id and s.closed_at is null)
  returning id into v_id;
  return v_id is not null;
end $$;
revoke all on function public.commit_balance_formation(uuid,uuid,integer,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.commit_balance_formation(uuid,uuid,integer,jsonb,jsonb) to service_role;

create function private.guard_balance_formation() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.phase = 'editing' and new.phase <> 'editing' then
    if old.formation_state is not null and old.formation_state->>'stage' <> 'complete' then
      raise exception '팀 편성을 먼저 완료하세요.';
    end if;
    if (select count(distinct v) from jsonb_path_query(new.roster, '$.*.** ? (@.type() == "string")') as q(v)) <> 10 then
      raise exception '출전자 10명을 먼저 저장하세요.';
    end if;
  end if;
  if new.roster is distinct from old.roster and new.formation_revision = old.formation_revision then
    if old.formation_state is not null and old.formation_state->>'stage' <> 'complete' then
      raise exception '진행 중인 팀 편성을 초기화한 뒤 명단을 변경하세요.';
    end if;
    new.formation_state := null;
    new.formation_revision := old.formation_revision + 1;
  end if;
  return new;
end $$;
revoke all on function private.guard_balance_formation() from public, anon, authenticated;
create trigger guard_balance_formation before update on public.balance_sessions
for each row execute function private.guard_balance_formation();
