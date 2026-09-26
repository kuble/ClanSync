-- Add the missing mode without rewriting any existing rounds or formation rules.
alter table public.balance_sessions
  drop constraint balance_sessions_map_types_check,
  add constraint balance_sessions_map_types_check
    check (map_types <@ array['control','push','escort','hybrid','flashpoint']::text[]
      and array_position(map_types,null) is null);

-- Preserve all intervening formation/prediction changes, authorization and grants.
do $$
declare v_definition text; v_before text;
begin
  v_definition := pg_get_functiondef('private.set_balance_prematch_settings(uuid,uuid,integer,jsonb,boolean,boolean,integer,integer,text[],integer)'::regprocedure);
  v_before := $needle$array['control','push','escort','hybrid']::text[]$needle$;
  if position(v_before in v_definition) = 0 then raise exception 'Map type validation drift'; end if;
  execute replace(v_definition,v_before,$replacement$array['control','push','escort','hybrid','flashpoint']::text[]$replacement$);
end $$;
