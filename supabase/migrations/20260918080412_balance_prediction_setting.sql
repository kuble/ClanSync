-- Prediction is a round option. Legacy rounds keep their previous enabled
-- behavior; Premium, regular-room and spectator policies still apply separately.
create or replace function private.balance_formation_rules(p_settings jsonb)
returns jsonb language sql immutable security invoker set search_path = '' as $$
  select ('{"auctionItemsEnabled":false,"strategySeconds":30}'::jsonb || coalesce(p_settings,'{}'::jsonb))
    - array['showPlayerCardScore','showPlayerCardInfo','showTeamComparisonSummary','showPlayerSessionSummary','playerCardInfo','predictionEnabled']::text[];
$$;

do $$
declare v_definition text; v_before text;
begin
  v_definition := pg_get_functiondef('private.set_balance_prematch_settings(uuid,uuid,integer,jsonb,boolean,boolean,integer,integer,text[],integer)'::regprocedure);
  v_before := $needle$"auctionItemsEnabled":false,"strategySeconds":30$needle$;
  if position(v_before in v_definition) = 0 then raise exception 'Prediction defaults normalization drift'; end if;
  v_definition := replace(v_definition,v_before,$replacement$"auctionItemsEnabled":false,"strategySeconds":30,"predictionEnabled":true$replacement$);
  v_before := $needle$'showPlayerSessionSummary','playerCardInfo'$needle$;
  if position(v_before in v_definition) = 0 then raise exception 'Prediction allowed fields drift'; end if;
  v_definition := replace(v_definition,v_before,$replacement$'showPlayerSessionSummary','playerCardInfo','predictionEnabled'$replacement$);
  v_before := $needle$jsonb_typeof(p_settings->'showPlayerSessionSummary') <> 'boolean' or$needle$;
  if position(v_before in v_definition) = 0 then raise exception 'Prediction validation drift'; end if;
  v_definition := replace(v_definition,v_before,$replacement$jsonb_typeof(p_settings->'showPlayerSessionSummary') <> 'boolean' or
    jsonb_typeof(p_settings->'predictionEnabled') is distinct from 'boolean' or$replacement$);
  execute v_definition;
end $$;

-- Enforce the entitlement for every write path, including legacy RPCs and direct
-- table requests. An unchanged inherited value remains saveable on Free clans.
create function private.guard_balance_prediction_setting() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_tier public.clan_subscription_tier;
begin
  if new.formation_settings ? 'predictionEnabled' and
    jsonb_typeof(new.formation_settings->'predictionEnabled') is distinct from 'boolean' then
    raise exception '승부예측 설정을 확인하세요.' using errcode = '22023';
  end if;
  if coalesce(new.formation_settings->'predictionEnabled','true'::jsonb)
    is distinct from coalesce(old.formation_settings->'predictionEnabled','true'::jsonb) then
    if old.phase = 'match_live' or old.closed_at is not null or old.match_outcome <> 'pending' then
      raise exception '승부예측은 경기 시작 전에만 설정할 수 있습니다.';
    end if;
    select subscription_tier into v_tier from public.clans where id = new.clan_id for share;
    if v_tier is distinct from 'premium'::public.clan_subscription_tier then
      raise exception '승부예측 설정은 Premium 클랜에서만 변경할 수 있습니다.' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
revoke all on function private.guard_balance_prediction_setting() from public,anon,authenticated;
create trigger guard_balance_01_prediction_setting before update of formation_settings on public.balance_sessions
for each row execute function private.guard_balance_prediction_setting();

create policy balance_predictions_enabled_insert
on public.balance_session_predictions as restrictive for insert to authenticated
with check (exists (
  select 1 from public.balance_sessions s
  where s.id = balance_session_predictions.session_id
    and coalesce(s.formation_settings->'predictionEnabled','true'::jsonb) = 'true'::jsonb
));

create policy balance_predictions_enabled_update
on public.balance_session_predictions as restrictive for update to authenticated
using (exists (
  select 1 from public.balance_sessions s
  where s.id = balance_session_predictions.session_id
    and coalesce(s.formation_settings->'predictionEnabled','true'::jsonb) = 'true'::jsonb
))
with check (exists (
  select 1 from public.balance_sessions s
  where s.id = balance_session_predictions.session_id
    and coalesce(s.formation_settings->'predictionEnabled','true'::jsonb) = 'true'::jsonb
));
