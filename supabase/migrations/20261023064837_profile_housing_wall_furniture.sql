-- Walls use a 6x4 grid; y starts at the floor. Existing layouts stay on floor.
alter table public.housing_catalog
  add column mount text not null default 'floor' check (mount in ('floor','wall')),
  add column wall_layer text,
  add constraint housing_catalog_mount_layer check (
    (mount = 'floor' and wall_layer is null)
    or (mount = 'wall' and wall_layer in ('decor','window','curtain') and wall_layer is not null)
  );
alter table public.user_housing_inventory
  add column surface text not null default 'floor' check (surface in ('floor','wall-left','wall-right')),
  add constraint housing_wall_placement check (surface = 'floor' or (rotation = 0 and (y is null or y <= 3)));

insert into public.housing_catalog(id,name,description,category,price,width,depth,visual_key,is_starter,sort_order,mount,wall_layer) values
  ('wall-window','햇살 창문','햇살이 들어오는 창문. 원하는 벽으로 옮겨 보세요.','decor',0,2,2,'wall-window',true,17,'wall','window'),
  ('wall-curtains','린넨 커튼','창문 위에 겹쳐 걸 수 있는 부드러운 커튼.','decor',0,2,2,'wall-curtains',true,18,'wall','curtain'),
  ('wall-shelf','원목 벽 선반','책과 작은 소품을 올린 벽 선반.','storage',0,2,1,'wall-shelf',true,19,'wall','decor'),
  ('wall-clock','동그란 벽시계','방의 시간을 함께하는 작은 벽시계.','decor',0,1,1,'wall-clock',true,20,'wall','decor'),
  ('wall-art-botanical','초록 식물 액자','자연의 색을 담은 식물 그림.','decor',0,1,1,'wall-art-botanical',true,21,'wall','decor'),
  ('wall-art-sun','햇살 포스터','따뜻한 색감의 햇살 포스터.','decor',0,1,1,'wall-art-sun',true,22,'wall','decor'),
  ('wall-art-mini','작은 풍경 액자','좋아하는 순간을 떠올리는 작은 그림.','decor',0,1,1,'wall-art-mini',true,23,'wall','decor');

-- Newly granted wall furniture replaces the former fixed scenery. Conflict-free
-- defaults are inserted once; subsequent reads never re-place stored items.
insert into public.user_housing_inventory(user_id,catalog_id,acquired_price,x,y,surface)
select r.user_id,c.id,0,
  case c.id when 'wall-window' then 1 when 'wall-curtains' then 1 when 'wall-shelf' then 4
    when 'wall-clock' then 5 when 'wall-art-botanical' then 3 when 'wall-art-sun' then 2 when 'wall-art-mini' then 1 end,
  case c.id when 'wall-window' then 1 when 'wall-curtains' then 1 when 'wall-shelf' then 2
    when 'wall-clock' then 3 when 'wall-art-botanical' then 3 when 'wall-art-sun' then 2 when 'wall-art-mini' then 1 end,
  case when c.id in ('wall-window','wall-curtains','wall-shelf') then 'wall-right' else 'wall-left' end
from public.user_housing_rooms r cross join public.housing_catalog c where c.mount = 'wall' and c.is_starter
on conflict(user_id,catalog_id) do nothing;

create or replace function private.ensure_my_housing() returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); created_room uuid;
begin
  if uid is null then raise exception 'housing_auth_required' using errcode = '42501'; end if;
  perform 1 from public.users where id = uid for update;
  if not found then raise exception 'housing_auth_required' using errcode = '42501'; end if;
  insert into public.user_housing_rooms(user_id) values(uid) on conflict(user_id) do nothing
    returning user_id into created_room;
  insert into public.user_housing_inventory(user_id,catalog_id,acquired_price,x,y,surface)
    select uid,c.id,0,
      case c.id when 'wall-window' then 1 when 'wall-curtains' then 1 when 'wall-shelf' then 4
        when 'wall-clock' then 5 when 'wall-art-botanical' then 3 when 'wall-art-sun' then 2 when 'wall-art-mini' then 1 end,
      case c.id when 'wall-window' then 1 when 'wall-curtains' then 1 when 'wall-shelf' then 2
        when 'wall-clock' then 3 when 'wall-art-botanical' then 3 when 'wall-art-sun' then 2 when 'wall-art-mini' then 1 end,
      case when c.mount = 'floor' then 'floor'
        when c.id in ('wall-window','wall-curtains','wall-shelf') then 'wall-right' else 'wall-left' end
    from public.housing_catalog c where c.is_starter and c.is_active
    on conflict(user_id,catalog_id) do nothing;
  if created_room is not null then
    update public.user_housing_inventory set
      x = case catalog_id when 'mint-sofa' then 1 when 'low-table' then 1 when 'small-plant' then 4 end,
      y = case catalog_id when 'mint-sofa' then 1 when 'low-table' then 3 when 'small-plant' then 1 end
      where user_id = uid and catalog_id in ('mint-sofa','low-table','small-plant');
  end if;
  return uid;
end $$;

create or replace function private.my_housing_state() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); result jsonb;
begin
  if uid is null then raise exception 'housing_auth_required' using errcode = '42501'; end if;
  select jsonb_build_object(
    'catalog',(select coalesce(jsonb_agg(jsonb_build_object(
      'id',c.id,'name',c.name,'description',c.description,'category',c.category,'price',c.price,
      'width',c.width,'depth',c.depth,'visualKey',c.visual_key,'isStarter',c.is_starter,'mount',c.mount,'wallLayer',c.wall_layer
    ) order by c.sort_order),'[]'::jsonb) from public.housing_catalog c
      where c.is_active or exists(select 1 from public.user_housing_inventory i where i.user_id = uid and i.catalog_id = c.id)),
    'inventory',(select coalesce(jsonb_agg(jsonb_build_object(
      'id',i.id,'catalogId',i.catalog_id,'x',i.x,'y',i.y,'rotation',i.rotation,'surface',i.surface
    ) order by i.acquired_at,i.id),'[]'::jsonb) from public.user_housing_inventory i where i.user_id = uid),
    'room',jsonb_build_object('revision',r.revision,'wallpaper',r.wallpaper,'floor',r.floor),
    'coinBalance',u.coin_balance
  ) into result from public.user_housing_rooms r join public.users u on u.id = r.user_id where r.user_id = uid;
  return result;
end $$;

create or replace function private.purchase_housing_furniture(p_catalog_id text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid; item public.housing_catalog%rowtype; balance integer;
  inventory_id uuid := gen_random_uuid(); transaction_id uuid;
begin
  uid := private.ensure_my_housing();
  if exists(select 1 from public.user_housing_inventory where user_id = uid and catalog_id = p_catalog_id) then
    return private.my_housing_state();
  end if;
  select * into item from public.housing_catalog where id = p_catalog_id and is_active;
  if not found then raise exception 'housing_item_not_found' using errcode = '22023'; end if;
  update public.users set coin_balance = coin_balance - item.price where id = uid and coin_balance >= item.price
    returning coin_balance into balance;
  if not found then raise exception 'housing_insufficient_coins'; end if;
  if item.price > 0 then
    insert into public.coin_transactions(user_id,pool_type,amount,reason,reference_type,reference_id,sub_key,balance_after,created_by)
      values(uid,'personal',-item.price,'purchase_housing','housing_purchase',inventory_id,'',balance,uid)
      returning id into transaction_id;
  end if;
  insert into public.user_housing_inventory(id,user_id,catalog_id,acquired_price,coin_transaction_id,surface)
    values(inventory_id,uid,item.id,item.price,transaction_id,case when item.mount = 'wall' then 'wall-left' else 'floor' end);
  return private.my_housing_state();
end $$;

create or replace function private.save_my_housing_room(p_revision integer,p_wallpaper text,p_floor text,p_placements jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid; current_revision integer; entry jsonb; inventory_id uuid;
  px integer; py integer; rotation_value integer; item_width integer; item_depth integer; rotated_width integer; rotated_depth integer;
  surface_value text; item_mount text; item_layer text; dx integer; dy integer; cell text;
  occupied jsonb := '{}'::jsonb; seen uuid[] := '{}';
begin
  if p_revision is null or p_revision < 0 or p_wallpaper is null or p_wallpaper not in ('cream','sage','rose','midnight')
    or p_floor is null or p_floor not in ('oak','walnut','ivory')
    or p_placements is null or jsonb_typeof(p_placements) <> 'array' then
    raise exception 'housing_invalid_layout' using errcode = '22023';
  end if;
  if jsonb_array_length(p_placements) > 36 then raise exception 'housing_invalid_layout' using errcode = '22023'; end if;
  uid := private.ensure_my_housing();
  select revision into current_revision from public.user_housing_rooms where user_id = uid for update;
  if current_revision <> p_revision then raise exception 'housing_stale_revision'; end if;
  for entry in select value from jsonb_array_elements(p_placements) loop
    if jsonb_typeof(entry) <> 'object' or jsonb_typeof(entry->'inventoryId') is distinct from 'string'
      or coalesce(entry->>'inventoryId','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or jsonb_typeof(entry->'x') is distinct from 'number' or coalesce(entry->>'x','') !~ '^[0-5]$'
      or jsonb_typeof(entry->'y') is distinct from 'number' or coalesce(entry->>'y','') !~ '^[0-5]$'
      or jsonb_typeof(entry->'rotation') is distinct from 'number' or coalesce(entry->>'rotation','') !~ '^[0-3]$'
      or (entry ? 'surface' and (jsonb_typeof(entry->'surface') is distinct from 'string'
        or entry->>'surface' not in ('floor','wall-left','wall-right'))) then
      raise exception 'housing_invalid_layout' using errcode = '22023';
    end if;
    inventory_id := (entry->>'inventoryId')::uuid;
    if inventory_id = any(seen) then raise exception 'housing_invalid_layout' using errcode = '22023'; end if;
    seen := array_append(seen,inventory_id);
    px := (entry->>'x')::integer; py := (entry->>'y')::integer; rotation_value := (entry->>'rotation')::integer;
    surface_value := coalesce(entry->>'surface','floor');
    select c.width,c.depth,c.mount,coalesce(c.wall_layer,'decor') into item_width,item_depth,item_mount,item_layer
      from public.user_housing_inventory i join public.housing_catalog c on c.id = i.catalog_id
      where i.id = inventory_id and i.user_id = uid;
    if not found then raise exception 'housing_item_not_owned' using errcode = '22023'; end if;
    if (item_mount = 'floor' and surface_value <> 'floor') or (item_mount = 'wall' and surface_value = 'floor')
      or (surface_value <> 'floor' and rotation_value <> 0) then
      raise exception 'housing_invalid_surface' using errcode = '22023';
    end if;
    rotated_width := case when rotation_value % 2 = 0 then item_width else item_depth end;
    rotated_depth := case when rotation_value % 2 = 0 then item_depth else item_width end;
    if px + rotated_width > 6 or py + rotated_depth > (case when surface_value = 'floor' then 6 else 4 end) then
      raise exception 'housing_out_of_bounds' using errcode = '22023';
    end if;
    for dx in 0..rotated_width-1 loop
      for dy in 0..rotated_depth-1 loop
        cell := surface_value || ':' || ((py+dy)*6+px+dx)::text;
        if occupied ? cell and not (
          (item_layer = 'window' and occupied->cell = '["curtain"]'::jsonb)
          or (item_layer = 'curtain' and occupied->cell = '["window"]'::jsonb)
        ) then raise exception 'housing_overlap' using errcode = '22023'; end if;
        occupied := jsonb_set(occupied,array[cell],coalesce(occupied->cell,'[]'::jsonb) || jsonb_build_array(item_layer));
      end loop;
    end loop;
  end loop;
  update public.user_housing_inventory set x = null,y = null where user_id = uid and x is not null;
  for entry in select value from jsonb_array_elements(p_placements) loop
    update public.user_housing_inventory set x = (entry->>'x')::integer,y = (entry->>'y')::integer,
      rotation = (entry->>'rotation')::integer,surface = coalesce(entry->>'surface','floor')
      where user_id = uid and id = (entry->>'inventoryId')::uuid;
  end loop;
  update public.user_housing_rooms set revision = revision+1,wallpaper = p_wallpaper,floor = p_floor,updated_at = now()
    where user_id = uid;
  return private.my_housing_state();
end $$;

-- CREATE OR REPLACE preserves the existing private helpers' ACLs and invoker RPC
-- wrappers. Explicitly preserve the grant boundary for future maintenance.
revoke all on function private.ensure_my_housing(),private.my_housing_state() from public,anon,authenticated,service_role;
revoke all on function private.purchase_housing_furniture(text),private.save_my_housing_room(integer,text,text,jsonb) from public,anon,service_role;
grant execute on function private.purchase_housing_furniture(text),private.save_my_housing_room(integer,text,text,jsonb) to authenticated;

comment on column public.user_housing_inventory.surface is 'floor: 6x6; wall-left/right: 6x4, y=0 at bottom. Only window and curtain may overlap.';
