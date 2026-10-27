-- Display-only addition: retain active rounds and defaults without rewriting data.
create or replace function private.balance_formation_rules(p_settings jsonb)
returns jsonb language sql immutable security invoker set search_path = '' as $$
  select ('{"auctionItemsEnabled":false,"strategySeconds":30,"auctionPreparationSeconds":5,"bidExtensionSeconds":5}'::jsonb || coalesce(p_settings,'{}'::jsonb))
    - array['showPlayerCardScore','showPlayerCardInfo','nicknameOnly','showTeamComparisonSummary','teamComparisonMode','showPlayerSessionSummary','playerCardInfo','predictionEnabled','predictionMinutes']::text[];
$$;

do $$
declare definition text; needle text;
begin
  definition := pg_get_functiondef('private.set_balance_prematch_settings(uuid,uuid,integer,jsonb,boolean,boolean,integer,integer,text[],integer)'::regprocedure);
  needle := '"showPlayerCardInfo":true';
  if position(needle in definition) = 0 then raise exception 'Nickname display defaults drift'; end if;
  definition := replace(definition,needle,'"showPlayerCardInfo":true,"nicknameOnly":false');
  needle := $search$'showPlayerCardInfo','showTeamComparisonSummary'$search$;
  if position(needle in definition) = 0 then raise exception 'Nickname display allowed fields drift'; end if;
  definition := replace(definition,needle,$replacement$'showPlayerCardInfo','nicknameOnly','showTeamComparisonSummary'$replacement$);
  needle := $search$jsonb_typeof(p_settings->'showPlayerCardInfo') <> 'boolean' or$search$;
  if position(needle in definition) = 0 then raise exception 'Nickname display validation drift'; end if;
  definition := replace(definition,needle,needle || $replacement$ jsonb_typeof(p_settings->'nicknameOnly') is distinct from 'boolean' or$replacement$);
  execute definition;
end $$;
