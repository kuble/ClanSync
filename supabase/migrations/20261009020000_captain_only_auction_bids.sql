-- Preserve existing CAS, audit, timing settings and operator clock controls.
do $$
declare definition text;
begin
 definition := pg_get_functiondef('public.commit_balance_formation(uuid,uuid,integer,jsonb,jsonb,uuid,text)'::regprocedure);
 definition := replace(definition,
 $needle$  if p_command = 'start' and v_round.formation_state is not null then return false; end if;$needle$,
 $replacement$  if p_command = 'bid' then
   if not coalesce(v_round.formation_state->'captains' @> to_jsonb(array[p_actor_id::text]),false) then
     raise exception '해당 팀 주장만 입찰할 수 있습니다.' using errcode = '42501';
   end if;
   if p_state#>>'{auction,team}' is not distinct from v_round.formation_state#>>'{auction,team}' then
     raise exception '최고 입찰 중입니다. 상대 팀의 입찰을 기다리세요.';
   end if;
 end if;
 if p_command = 'start' and v_round.formation_state is not null then return false; end if;$replacement$);
 execute definition;
end $$;
