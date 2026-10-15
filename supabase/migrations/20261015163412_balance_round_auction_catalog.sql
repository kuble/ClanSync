-- Room-only items live with formation rules and follow the existing revision/phase lock.
-- No catalog or active QA rows are rewritten.
create function private.valid_round_auction_catalog(p_catalog jsonb)
returns boolean language plpgsql immutable security invoker set search_path = '' as $$
declare v_item jsonb; v_id jsonb; v_ids text[] := '{}'; v_names text[] := '{}'; v_excluded text[] := '{}';
begin
  if p_catalog is null then return true; end if;
  if jsonb_typeof(p_catalog) <> 'object' or p_catalog - array['items','excludedItemIds']::text[] <> '{}'::jsonb or
    jsonb_typeof(p_catalog->'items') is distinct from 'array' or jsonb_typeof(p_catalog->'excludedItemIds') is distinct from 'array' then return false; end if;
  if jsonb_array_length(p_catalog->'items') > 30 or jsonb_array_length(p_catalog->'excludedItemIds') > 100 then return false; end if;
  for v_id in select value from jsonb_array_elements(p_catalog->'excludedItemIds') loop
    if jsonb_typeof(v_id) <> 'string' or (v_id #>> '{}') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' or
      lower(v_id #>> '{}') = any(v_excluded) then return false; end if;
    v_excluded := array_append(v_excluded,lower(v_id #>> '{}'));
  end loop;
  for v_item in select value from jsonb_array_elements(p_catalog->'items') loop
    if jsonb_typeof(v_item) <> 'object' or v_item - array['id','name','description','cost','enabled']::text[] <> '{}'::jsonb or
      jsonb_typeof(v_item->'id') is distinct from 'string' or (v_item->>'id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' or
      jsonb_typeof(v_item->'name') is distinct from 'string' or char_length(btrim(v_item->>'name')) not between 1 and 80 or
      jsonb_typeof(v_item->'description') is distinct from 'string' or char_length(btrim(v_item->>'description')) > 500 or
      jsonb_typeof(v_item->'enabled') is distinct from 'boolean' or jsonb_typeof(v_item->'cost') is distinct from 'number' then return false; end if;
    if (v_item->>'cost')::numeric not between 0 and 100000 or (v_item->>'cost')::numeric % 10 <> 0 or
      lower(v_item->>'id') = any(v_ids) or lower(btrim(v_item->>'name')) = any(v_names) then return false; end if;
    v_ids := array_append(v_ids,lower(v_item->>'id'));
    v_names := array_append(v_names,lower(btrim(v_item->>'name')));
  end loop;
  return true;
end $$;
revoke all on function private.valid_round_auction_catalog(jsonb) from public,anon,authenticated;

do $$
declare v_definition text; v_before text := $needle$'auctionItemsEnabled','strategySeconds'$needle$;
begin
  v_definition := pg_get_functiondef('private.set_balance_prematch_settings(uuid,uuid,integer,jsonb,boolean,boolean,integer,integer,text[],integer)'::regprocedure);
  if position(v_before in v_definition) = 0 then raise exception 'Auction catalog allowed fields drift'; end if;
  execute replace(v_definition,v_before,$replacement$'auctionItemsEnabled','strategySeconds','auctionCatalog'$replacement$);
end $$;

create function private.guard_round_auction_catalog() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_catalog jsonb := new.formation_settings->'auctionCatalog';
begin
  if not private.valid_round_auction_catalog(v_catalog) then
    raise exception '전략 아이템 목록과 가격을 확인하세요.' using errcode = '22023';
  end if;
  if v_catalog is not null and jsonb_array_length(v_catalog->'items') > 0 then
    if not exists(select 1 from public.balance_rooms where id = new.series_id and clan_id = new.clan_id and kind = 'flash') then
      raise exception '내전 전용 아이템은 깜짝 내전에서만 추가할 수 있습니다.' using errcode = '42501';
    end if;
    if exists(select 1 from jsonb_array_elements(v_catalog->'items') i
      join public.clan_auction_items c on c.id = (i->>'id')::uuid and c.clan_id = new.clan_id) then
      raise exception '클랜 기본 아이템을 덮어쓸 수 없습니다.' using errcode = '22023';
    end if;
  end if;
  return new;
end $$;
revoke all on function private.guard_round_auction_catalog() from public,anon,authenticated;
create trigger guard_balance_01_auction_catalog before insert or update of formation_settings on public.balance_sessions
for each row execute function private.guard_round_auction_catalog();
