-- A concurrent captain action must report a stale snapshot before comparing the
-- proposed team state with the newer locked state. The server can then recompute
-- a still-pending item choice; a fresh unauthorized change remains an error.
do $$
declare v_definition text; v_before text;
begin
  v_definition := pg_get_functiondef('public.commit_balance_formation(uuid,uuid,integer,jsonb,jsonb,uuid,text)'::regprocedure);
  v_before := 'if not found then return false; end if;';
  if position(v_before in v_definition) = 0 then raise exception 'Formation CAS lock guard drift'; end if;
  v_definition := replace(v_definition,v_before,$replacement$
  if not found then return false; end if;
  if p_revision is null or v_round.formation_revision <> p_revision then return false; end if;
  $replacement$);
  execute v_definition;
end $$;
