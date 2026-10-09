-- Keep the role draw visible until an operator confirms the adjusted teams.
-- Reuse the existing service-only, manager-authorized revision CAS.
do $$
declare v_definition text; v_before text;
begin
  v_definition := pg_get_functiondef('public.commit_balance_formation(uuid,uuid,integer,jsonb,jsonb,uuid,text)'::regprocedure);
  v_before := $needle$'tick','choose-item')$needle$;
  if position(v_before in v_definition) = 0 then raise exception 'Formation command list drift'; end if;
  v_definition := replace(v_definition,v_before,$replacement$'tick','choose-item','adjust')$replacement$);
  v_before := $needle$if p_command = 'start' and v_round.formation_state is not null then return false; end if;$needle$;
  if position(v_before in v_definition) = 0 then raise exception 'Formation start guard drift'; end if;
  v_definition := replace(v_definition,v_before,$replacement$
  if p_command = 'adjust' and (
    v_round.formation_state->>'stage' is distinct from 'review' or
    (p_state - 'roster') is distinct from (v_round.formation_state - 'roster') or
    p_state->'roster' is distinct from p_roster
  ) then raise exception '팀 배치 조정 단계가 아닙니다.' using errcode = '22023'; end if;
  if p_command = 'start' and v_round.formation_state is not null then return false; end if;
  $replacement$);
  execute v_definition;
end $$;
