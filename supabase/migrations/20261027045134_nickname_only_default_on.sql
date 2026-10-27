-- Change only the fallback; preserve existing explicit display choices.
do $$
declare definition text; needle text := '"nicknameOnly":false';
begin
  definition := pg_get_functiondef('private.set_balance_prematch_settings(uuid,uuid,integer,jsonb,boolean,boolean,integer,integer,text[],integer)'::regprocedure);
  if position(needle in definition) = 0 then raise exception 'Nickname display default drift'; end if;
  execute replace(definition,needle,'"nicknameOnly":true');
end $$;
