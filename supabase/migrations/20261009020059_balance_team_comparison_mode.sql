-- This is presentation only: changing the graph never invalidates formation.
-- Default normalization preserves existing rounds without updating QA records.
create or replace function private.balance_formation_rules(p_settings jsonb)
returns jsonb language sql immutable security invoker set search_path = '' as $$
  select ('{"auctionItemsEnabled":false,"strategySeconds":30,"auctionPreparationSeconds":5,"bidExtensionSeconds":5}'::jsonb || coalesce(p_settings,'{}'::jsonb))
    - array['showPlayerCardScore','showPlayerCardInfo','showTeamComparisonSummary','teamComparisonMode','showPlayerSessionSummary','playerCardInfo','predictionEnabled']::text[];
$$;

do $$
declare v_definition text; v_before text;
begin
  v_definition := pg_get_functiondef('private.set_balance_prematch_settings(uuid,uuid,integer,jsonb,boolean,boolean,integer,integer,text[],integer)'::regprocedure);
  v_before := $needle$"playerCardInfo":"record"$needle$;
  if position(v_before in v_definition) = 0 then raise exception 'Team comparison defaults drift'; end if;
  v_definition := replace(v_definition,v_before,$replacement$"playerCardInfo":"record","teamComparisonMode":"score"$replacement$);
  v_before := $needle$'showTeamComparisonSummary','showPlayerSessionSummary'$needle$;
  if position(v_before in v_definition) = 0 then raise exception 'Team comparison allowed fields drift'; end if;
  v_definition := replace(v_definition,v_before,$replacement$'showTeamComparisonSummary','teamComparisonMode','showPlayerSessionSummary'$replacement$);
  v_before := $needle$jsonb_typeof(p_settings->'showTeamComparisonSummary') <> 'boolean' or$needle$;
  if position(v_before in v_definition) = 0 then raise exception 'Team comparison validation drift'; end if;
  v_definition := replace(v_definition,v_before,v_before || $replacement$
    not coalesce(p_settings->>'teamComparisonMode' in ('score','prediction'),false) or$replacement$);
  execute v_definition;
end $$;
