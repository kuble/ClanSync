-- Older rounds store only gameplay rules. Passing their saved rules back while
-- editing bans must gain the same defaults that the application parser supplies.
do $$
declare v_definition text; v_before text;
begin
  v_definition := pg_get_functiondef('private.set_balance_prematch_settings(uuid,uuid,integer,jsonb,boolean,boolean,integer,integer,text[],integer)'::regprocedure);
  v_before := 'v_formation_changed :=';
  if position(v_before in v_definition) = 0 then raise exception 'Formation defaults normalization drift'; end if;
  v_definition := replace(v_definition,v_before,$replacement$
  p_settings := '{"showPlayerCardScore":true,"showPlayerCardInfo":true,"showTeamComparisonSummary":true,"showPlayerSessionSummary":true,"playerCardInfo":"record","auctionItemsEnabled":false,"strategySeconds":30}'::jsonb || p_settings;
  v_formation_changed :=
  $replacement$);
  execute v_definition;

  v_definition := pg_get_functiondef('public.commit_balance_formation(uuid,uuid,integer,jsonb,jsonb,uuid,text)'::regprocedure);
  v_before := $needle$'auctionItemsEnabled',p_state#>'{settings,auctionItemsEnabled}','strategySeconds',p_state#>'{settings,strategySeconds}'$needle$;
  if position(v_before in v_definition) = 0 then raise exception 'Formation audit defaults drift'; end if;
  v_definition := replace(v_definition,v_before,$replacement$'auctionItemsEnabled',coalesce(p_state#>'{settings,auctionItemsEnabled}','false'::jsonb),'strategySeconds',coalesce(p_state#>'{settings,strategySeconds}','30'::jsonb)$replacement$);
  execute v_definition;
end $$;
