-- Timing rules are independent of the optional strategy-item preparation stage.
-- Legacy rounds gain defaults at read/save time without rewriting active QA data.
create or replace function private.balance_formation_rules(p_settings jsonb)
returns jsonb language sql immutable security invoker set search_path = '' as $$
  select ('{"auctionItemsEnabled":false,"strategySeconds":30,"auctionPreparationSeconds":5,"bidExtensionSeconds":5}'::jsonb || coalesce(p_settings,'{}'::jsonb))
    - array['showPlayerCardScore','showPlayerCardInfo','showTeamComparisonSummary','showPlayerSessionSummary','playerCardInfo','predictionEnabled']::text[];
$$;

create function private.valid_auction_timing(p_settings jsonb)
returns boolean language sql immutable security invoker set search_path = '' as $$
  select coalesce(bool_and(case
    when not (p_settings ? rule.key) then true
    when jsonb_typeof(p_settings->rule.key) = 'number' then
      (p_settings->>rule.key)::numeric between 0 and rule.maximum
      and (p_settings->>rule.key)::numeric = trunc((p_settings->>rule.key)::numeric)
    else false end), true)
  from (values ('auctionPreparationSeconds',60),('bidExtensionSeconds',30)) as rule(key,maximum);
$$;
revoke all on function private.valid_auction_timing(jsonb) from public,anon,authenticated;

do $$
declare v_definition text; v_before text;
begin
  v_definition := pg_get_functiondef('private.set_balance_prematch_settings(uuid,uuid,integer,jsonb,boolean,boolean,integer,integer,text[],integer)'::regprocedure);
  v_before := $needle$"auctionItemsEnabled":false,"strategySeconds":30$needle$;
  if position(v_before in v_definition) = 0 then raise exception 'Auction timing defaults drift'; end if;
  v_definition := replace(v_definition,v_before,$replacement$"auctionItemsEnabled":false,"strategySeconds":30,"auctionPreparationSeconds":5,"bidExtensionSeconds":5$replacement$);
  v_before := $needle$'durationSeconds','auctionItemsEnabled'$needle$;
  if position(v_before in v_definition) = 0 then raise exception 'Auction timing allowed fields drift'; end if;
  v_definition := replace(v_definition,v_before,$replacement$'durationSeconds','auctionPreparationSeconds','bidExtensionSeconds','auctionItemsEnabled'$replacement$);
  v_before := $needle$v_seconds is null or v_seconds < 10 or v_seconds > 60 or$needle$;
  if position(v_before in v_definition) = 0 then raise exception 'Auction timing validation drift'; end if;
  v_definition := replace(v_definition,v_before,v_before || ' not private.valid_auction_timing(p_settings) or');
  execute v_definition;

  v_definition := pg_get_functiondef('public.commit_balance_formation(uuid,uuid,integer,jsonb,jsonb,uuid,text)'::regprocedure);
  v_before := $needle$'durationSeconds',p_state#>'{settings,durationSeconds}'$needle$;
  if position(v_before in v_definition) = 0 then raise exception 'Auction timing audit drift'; end if;
  v_definition := replace(v_definition,v_before,v_before || $replacement$,
    'auctionPreparationSeconds',coalesce(p_state#>'{settings,auctionPreparationSeconds}','5'::jsonb),
    'bidExtensionSeconds',coalesce(p_state#>'{settings,bidExtensionSeconds}','5'::jsonb)$replacement$);
  execute v_definition;
end $$;

create function private.guard_auction_timing() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not private.valid_auction_timing(new.formation_settings) then
    raise exception '낙찰 후 준비·입찰 연장 시간을 확인하세요.' using errcode = '22023';
  end if;
  return new;
end $$;
revoke all on function private.guard_auction_timing() from public,anon,authenticated;
create trigger guard_auction_timing before insert or update of formation_settings on public.balance_sessions
for each row execute function private.guard_auction_timing();
