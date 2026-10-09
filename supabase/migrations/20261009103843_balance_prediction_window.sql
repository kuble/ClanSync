-- Prediction duration is independent of formation and defaults on read/save.
-- Existing active deadlines and QA round data are not rewritten.
create or replace function private.balance_formation_rules(p_settings jsonb)
returns jsonb language sql immutable security invoker set search_path = '' as $$
  select ('{"auctionItemsEnabled":false,"strategySeconds":30,"auctionPreparationSeconds":5,"bidExtensionSeconds":5}'::jsonb || coalesce(p_settings,'{}'::jsonb))
    - array['showPlayerCardScore','showPlayerCardInfo','showTeamComparisonSummary','teamComparisonMode','showPlayerSessionSummary','playerCardInfo','predictionEnabled','predictionMinutes']::text[];
$$;

create function private.valid_balance_prediction_minutes(p_settings jsonb)
returns boolean language sql immutable security invoker set search_path = '' as $$
  select case
    when not (p_settings ? 'predictionMinutes') then true
    when jsonb_typeof(p_settings->'predictionMinutes') = 'number' then
      (p_settings->>'predictionMinutes')::numeric between 1 and 10
      and (p_settings->>'predictionMinutes')::numeric = trunc((p_settings->>'predictionMinutes')::numeric)
    else false end;
$$;
revoke all on function private.valid_balance_prediction_minutes(jsonb) from public,anon,authenticated;

do $$
declare v_definition text; v_before text;
begin
  v_definition := pg_get_functiondef('private.set_balance_prematch_settings(uuid,uuid,integer,jsonb,boolean,boolean,integer,integer,text[],integer)'::regprocedure);
  v_before := $needle$"predictionEnabled":true$needle$;
  if position(v_before in v_definition) = 0 then raise exception 'Prediction duration defaults drift'; end if;
  v_definition := replace(v_definition,v_before,$replacement$"predictionEnabled":true,"predictionMinutes":2$replacement$);
  v_before := $needle$'playerCardInfo','predictionEnabled'$needle$;
  if position(v_before in v_definition) = 0 then raise exception 'Prediction duration allowed fields drift'; end if;
  v_definition := replace(v_definition,v_before,$replacement$'playerCardInfo','predictionEnabled','predictionMinutes'$replacement$);
  v_before := $needle$jsonb_typeof(p_settings->'predictionEnabled') is distinct from 'boolean' or$needle$;
  if position(v_before in v_definition) = 0 then raise exception 'Prediction duration validation drift'; end if;
  v_definition := replace(v_definition,v_before,v_before || ' not private.valid_balance_prediction_minutes(p_settings) or');
  execute v_definition;
end $$;

-- Protect RPC and direct table writes; inherited values remain saveable on Free.
create function private.guard_balance_prediction_window() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_tier public.clan_subscription_tier;
begin
  if not private.valid_balance_prediction_minutes(new.formation_settings) then
    raise exception '승부예측 마감 시간은 1~10분 사이 정수로 입력하세요.' using errcode = '22023';
  end if;
  if tg_op = 'UPDATE' and coalesce(new.formation_settings->'predictionMinutes','2'::jsonb)
    is distinct from coalesce(old.formation_settings->'predictionMinutes','2'::jsonb) then
    if old.phase = 'match_live' or old.closed_at is not null or old.match_outcome <> 'pending' then
      raise exception '승부예측 마감 시간은 경기 시작 전에만 설정할 수 있습니다.';
    end if;
    select subscription_tier into v_tier from public.clans where id = new.clan_id for share;
    if v_tier is distinct from 'premium'::public.clan_subscription_tier then
      raise exception '승부예측 설정은 Premium 클랜에서만 변경할 수 있습니다.' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
revoke all on function private.guard_balance_prediction_window() from public,anon,authenticated;
create trigger guard_balance_01_prediction_window before insert or update of formation_settings on public.balance_sessions
for each row execute function private.guard_balance_prediction_window();

-- One database clock starts only when entering the match screen. Later writes
-- and refreshes keep the saved deadline, including already-started legacy rounds.
create or replace function private.guard_balance_prediction_pool_clock() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.prediction_pool_enabled and new.phase = 'match_live' and old.phase <> 'match_live' then
    new.prediction_deadline_at := clock_timestamp() + make_interval(mins => coalesce((new.formation_settings->>'predictionMinutes')::integer,2));
  end if;
  if new.prediction_pool_enabled is distinct from old.prediction_pool_enabled then
    raise exception '예측 정산 방식은 변경할 수 없습니다.';
  end if;
  return new;
end $$;
revoke all on function private.guard_balance_prediction_pool_clock() from public,anon,authenticated;
