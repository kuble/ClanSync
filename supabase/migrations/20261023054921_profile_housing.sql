-- Account-wide, owner-private housing. Furniture purchases spend personal coins only.
create table public.housing_catalog (
  id text primary key check (id ~ '^[a-z][a-z0-9-]{0,63}$'),
  name text not null,
  description text not null,
  category text not null check (category in ('seating','table','storage','decor','lighting')),
  price integer not null check (price >= 0),
  width integer not null check (width between 1 and 6),
  depth integer not null check (depth between 1 and 6),
  visual_key text not null,
  is_starter boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null,
  constraint housing_starter_price check ((is_starter and price = 0) or (not is_starter and price > 0))
);

create table public.user_housing_rooms (
  user_id uuid primary key references public.users(id) on delete cascade,
  revision integer not null default 0 check (revision >= 0),
  wallpaper text not null default 'cream' check (wallpaper in ('cream','sage','rose','midnight')),
  floor text not null default 'oak' check (floor in ('oak','walnut','ivory')),
  updated_at timestamptz not null default now()
);

create table public.user_housing_inventory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  catalog_id text not null references public.housing_catalog(id) on delete restrict,
  acquired_price integer not null check (acquired_price >= 0),
  coin_transaction_id uuid references public.coin_transactions(id) on delete set null,
  x integer check (x between 0 and 5),
  y integer check (y between 0 and 5),
  rotation integer not null default 0 check (rotation between 0 and 3),
  acquired_at timestamptz not null default now(),
  constraint housing_one_of_each unique(user_id,catalog_id),
  constraint housing_placement_pair check ((x is null) = (y is null))
);
create index user_housing_inventory_catalog_idx on public.user_housing_inventory(catalog_id);
create index user_housing_inventory_transaction_idx on public.user_housing_inventory(coin_transaction_id)
  where coin_transaction_id is not null;

alter table public.housing_catalog enable row level security;
alter table public.user_housing_rooms enable row level security;
alter table public.user_housing_inventory enable row level security;
create policy housing_catalog_read on public.housing_catalog for select to authenticated using (true);
create policy housing_room_owner_read on public.user_housing_rooms for select to authenticated
  using (user_id = (select auth.uid()));
create policy housing_inventory_owner_read on public.user_housing_inventory for select to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.housing_catalog,public.user_housing_rooms,public.user_housing_inventory from public,anon,authenticated;
grant select on public.housing_catalog,public.user_housing_rooms,public.user_housing_inventory to authenticated;
grant all on public.housing_catalog,public.user_housing_rooms,public.user_housing_inventory to service_role;

insert into public.housing_catalog(id,name,description,category,price,width,depth,visual_key,is_starter,sort_order) values
  ('mint-sofa','민트 소파','방의 중심이 되는 포근한 2인 소파.','seating',0,2,1,'mint-sofa',true,1),
  ('low-table','낮은 원목 테이블','작은 모임과 휴식을 위한 기본 테이블.','table',0,1,1,'low-table',true,2),
  ('small-plant','작은 화분','초록 잎으로 방에 생기를 더해요.','decor',0,1,1,'small-plant',true,3),
  ('oak-desk','오크 책상','취향을 채워 갈 넉넉한 작업 공간.','table',180,2,1,'oak-desk',false,4),
  ('reading-lamp','독서 스탠드','늦은 밤에도 따뜻한 빛을 더해요.','lighting',90,1,1,'reading-lamp',false,5),
  ('bookcase','책장','좋아하는 이야기로 채우는 원목 책장.','storage',150,2,1,'bookcase',false,6),
  ('single-bed','싱글 침대','한 판을 마치고 편히 쉬는 자리.','seating',260,2,3,'single-bed',false,7),
  ('gaming-chair','게이밍 의자','승부를 준비하는 나만의 좌석.','seating',120,1,1,'gaming-chair',false,8),
  ('dual-monitor','듀얼 모니터','게임과 클랜 소식을 함께 확인해요.','table',280,2,1,'dual-monitor',false,9),
  ('trophy-cabinet','트로피 진열장','함께 만든 승리를 기억하는 진열장.','storage',240,2,1,'trophy-cabinet',false,10),
  ('cat-cushion','고양이 쿠션','보기만 해도 기분이 좋아지는 말랑한 친구.','decor',70,1,1,'cat-cushion',false,11),
  ('arcade-machine','아케이드 게임기','내 방에서 즐기는 작은 오락실.','decor',220,1,1,'arcade-machine',false,12),
  ('speaker','스피커','좋아하는 음악으로 쉬어 가는 시간.','decor',100,1,1,'speaker',false,13),
  ('coffee-cart','커피 카트','다음 경기를 기다리며 마시는 커피 한 잔.','table',160,2,1,'coffee-cart',false,14),
  ('record-player','레코드 플레이어','차분한 분위기를 더하는 빈티지 소품.','decor',140,1,1,'record-player',false,15),
  ('star-sculpture','별 조형물','방 안에서 빛나는 나만의 작은 별.','decor',200,1,1,'star-sculpture',false,16);

-- Every entry point locks the same user row first. Duplicate purchases, first-load
-- initialization and room saves therefore cannot race against one another.
create function private.ensure_my_housing() returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); created_room uuid;
begin
  if uid is null then raise exception 'housing_auth_required' using errcode = '42501'; end if;
  perform 1 from public.users where id = uid for update;
  if not found then raise exception 'housing_auth_required' using errcode = '42501'; end if;
  insert into public.user_housing_rooms(user_id) values(uid) on conflict(user_id) do nothing
    returning user_id into created_room;
  insert into public.user_housing_inventory(user_id,catalog_id,acquired_price)
    select uid,c.id,0 from public.housing_catalog c where c.is_starter and c.is_active
    on conflict(user_id,catalog_id) do nothing;
  if created_room is not null then
    update public.user_housing_inventory set
      x = case catalog_id when 'mint-sofa' then 1 when 'low-table' then 1 when 'small-plant' then 4 end,
      y = case catalog_id when 'mint-sofa' then 1 when 'low-table' then 3 when 'small-plant' then 1 end
      where user_id = uid and catalog_id in ('mint-sofa','low-table','small-plant');
  end if;
  return uid;
end $$;

create function private.my_housing_state() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); result jsonb;
begin
  if uid is null then raise exception 'housing_auth_required' using errcode = '42501'; end if;
  select jsonb_build_object(
    'catalog',(select coalesce(jsonb_agg(jsonb_build_object(
      'id',c.id,'name',c.name,'description',c.description,'category',c.category,'price',c.price,
      'width',c.width,'depth',c.depth,'visualKey',c.visual_key,'isStarter',c.is_starter
    ) order by c.sort_order),'[]'::jsonb) from public.housing_catalog c
      where c.is_active or exists(select 1 from public.user_housing_inventory i where i.user_id = uid and i.catalog_id = c.id)),
    'inventory',(select coalesce(jsonb_agg(jsonb_build_object(
      'id',i.id,'catalogId',i.catalog_id,'x',i.x,'y',i.y,'rotation',i.rotation
    ) order by i.acquired_at,i.id),'[]'::jsonb) from public.user_housing_inventory i where i.user_id = uid),
    'room',jsonb_build_object('revision',r.revision,'wallpaper',r.wallpaper,'floor',r.floor),
    'coinBalance',u.coin_balance
  ) into result from public.user_housing_rooms r join public.users u on u.id = r.user_id where r.user_id = uid;
  return result;
end $$;

create function private.get_my_housing() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform private.ensure_my_housing();
  return private.my_housing_state();
end $$;

create function private.purchase_housing_furniture(p_catalog_id text) returns jsonb
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
  insert into public.user_housing_inventory(id,user_id,catalog_id,acquired_price,coin_transaction_id)
    values(inventory_id,uid,item.id,item.price,transaction_id);
  return private.my_housing_state();
end $$;

create function private.save_my_housing_room(p_revision integer,p_wallpaper text,p_floor text,p_placements jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid; current_revision integer; entry jsonb; inventory_id uuid;
  px integer; py integer; rotation_value integer; item_width integer; item_depth integer; rotated_width integer; rotated_depth integer;
  dx integer; dy integer; cell integer; occupied integer[] := '{}'; seen uuid[] := '{}';
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

  -- Validate all entries before replacing any positions. Raising an exception also
  -- rolls back initialization and every preceding change in this RPC transaction.
  for entry in select value from jsonb_array_elements(p_placements) loop
    if jsonb_typeof(entry) <> 'object' or jsonb_typeof(entry->'inventoryId') is distinct from 'string'
      or coalesce(entry->>'inventoryId','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or jsonb_typeof(entry->'x') is distinct from 'number' or coalesce(entry->>'x','') !~ '^[0-5]$'
      or jsonb_typeof(entry->'y') is distinct from 'number' or coalesce(entry->>'y','') !~ '^[0-5]$'
      or jsonb_typeof(entry->'rotation') is distinct from 'number' or coalesce(entry->>'rotation','') !~ '^[0-3]$' then
      raise exception 'housing_invalid_layout' using errcode = '22023';
    end if;
    inventory_id := (entry->>'inventoryId')::uuid;
    if inventory_id = any(seen) then raise exception 'housing_invalid_layout' using errcode = '22023'; end if;
    seen := array_append(seen,inventory_id);
    px := (entry->>'x')::integer; py := (entry->>'y')::integer; rotation_value := (entry->>'rotation')::integer;
    select c.width,c.depth into item_width,item_depth from public.user_housing_inventory i
      join public.housing_catalog c on c.id = i.catalog_id where i.id = inventory_id and i.user_id = uid;
    if not found then raise exception 'housing_item_not_owned' using errcode = '22023'; end if;
    rotated_width := case when rotation_value % 2 = 0 then item_width else item_depth end;
    rotated_depth := case when rotation_value % 2 = 0 then item_depth else item_width end;
    if px + rotated_width > 6 or py + rotated_depth > 6 then
      raise exception 'housing_out_of_bounds' using errcode = '22023';
    end if;
    for dx in 0..rotated_width-1 loop
      for dy in 0..rotated_depth-1 loop
        cell := (py+dy)*6+px+dx;
        if cell = any(occupied) then raise exception 'housing_overlap' using errcode = '22023'; end if;
        occupied := array_append(occupied,cell);
      end loop;
    end loop;
  end loop;
  update public.user_housing_inventory set x = null,y = null where user_id = uid and x is not null;
  for entry in select value from jsonb_array_elements(p_placements) loop
    update public.user_housing_inventory set x = (entry->>'x')::integer,y = (entry->>'y')::integer,
      rotation = (entry->>'rotation')::integer where user_id = uid and id = (entry->>'inventoryId')::uuid;
  end loop;
  update public.user_housing_rooms set revision = revision+1,wallpaper = p_wallpaper,floor = p_floor,updated_at = now()
    where user_id = uid;
  return private.my_housing_state();
end $$;

create function public.get_my_housing() returns jsonb
language sql security invoker set search_path = '' as $$ select private.get_my_housing(); $$;
create function public.purchase_housing_furniture(p_catalog_id text) returns jsonb
language sql security invoker set search_path = '' as $$ select private.purchase_housing_furniture(p_catalog_id); $$;
create function public.save_my_housing_room(p_revision integer,p_wallpaper text,p_floor text,p_placements jsonb) returns jsonb
language sql security invoker set search_path = '' as $$
  select private.save_my_housing_room(p_revision,p_wallpaper,p_floor,p_placements);
$$;

revoke all on function private.ensure_my_housing(),private.my_housing_state(),private.get_my_housing(),
  private.purchase_housing_furniture(text),private.save_my_housing_room(integer,text,text,jsonb),
  public.get_my_housing(),public.purchase_housing_furniture(text),public.save_my_housing_room(integer,text,text,jsonb)
  from public,anon,authenticated,service_role;
grant execute on function private.get_my_housing(),private.purchase_housing_furniture(text),private.save_my_housing_room(integer,text,text,jsonb),
  public.get_my_housing(),public.purchase_housing_furniture(text),public.save_my_housing_room(integer,text,text,jsonb) to authenticated;

comment on table public.user_housing_rooms is '개인 글로벌 하우징. 본인만 열람하며 revision으로 오래된 탭의 저장을 거부한다.';
comment on table public.user_housing_inventory is '가구별 영구 1개 보유. null x/y는 보관 중이며 구매는 개인 코인 원장과 원자적으로 처리한다.';
