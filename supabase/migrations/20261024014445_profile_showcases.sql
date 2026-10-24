-- Independent showcase storage: legacy housing ownership, layouts and coins are untouched.
create table public.showcase_catalog (
  id text primary key,
  name text not null,
  kind text not null check (kind in ('goods','edge','light','label')),
  sprite integer not null check (sprite between 0 and 8),
  width integer not null check (width between 6 and 30),
  starter boolean not null default false,
  available boolean not null default true
);
insert into public.showcase_catalog(id,name,kind,sprite,width,starter) values
('mountain-frame','산빛 액자','goods',0,24,true),
('fox-figure','작은 여우','goods',1,17,true),
('sage-keyboard','세이지 키보드','goods',2,24,true),
('potted-plant','초록 화분','goods',3,17,false),
('pastel-books','취향의 책','goods',4,19,false),
('star-mug','별빛 머그','goods',5,14,false),
('trailing-ivy','늘어진 이파리','edge',6,14,false),
('brass-light','황동 조명','light',7,12,false),
('wood-label','나무 주제 명패','label',8,22,false);

create table public.user_showcase_inventory (
  user_id uuid not null references public.users(id) on delete cascade,
  catalog_id text not null references public.showcase_catalog(id),
  acquired_at timestamptz not null default now(),
  primary key(user_id,catalog_id)
);
create table public.user_showcase_libraries (
  user_id uuid primary key references public.users(id) on delete cascade,
  revision integer not null default 0 check(revision >= 0),
  document jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.showcase_catalog enable row level security;
alter table public.user_showcase_inventory enable row level security;
alter table public.user_showcase_libraries enable row level security;
revoke all on public.showcase_catalog,public.user_showcase_inventory,public.user_showcase_libraries from anon,authenticated;
grant select on public.showcase_catalog to authenticated;
grant select,insert on public.user_showcase_inventory to authenticated;
grant select,insert,update on public.user_showcase_libraries to authenticated;
create policy showcase_catalog_read on public.showcase_catalog for select to authenticated using(true);
create policy showcase_inventory_read on public.user_showcase_inventory for select to authenticated using(user_id=(select auth.uid()));
-- QA collection is free to claim. Paid sales require a separate priced transaction migration.
create policy showcase_inventory_claim on public.user_showcase_inventory for insert to authenticated
with check(user_id=(select auth.uid()) and exists(select 1 from public.showcase_catalog c where c.id=catalog_id and c.available));
create policy showcase_library_read on public.user_showcase_libraries for select to authenticated using(true);
create policy showcase_library_insert on public.user_showcase_libraries for insert to authenticated with check(user_id=(select auth.uid()));
create policy showcase_library_update on public.user_showcase_libraries for update to authenticated
using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));

-- Trigger validates direct API writes as well as the revisioned RPC.
create function public.validate_showcase_library() returns trigger
language plpgsql security invoker set search_path='' as $$
declare cabinet jsonb; item jsonb; product public.showcase_catalog; seen text[]; ids text[] := '{}'; total integer;
begin
  if jsonb_typeof(new.document) is distinct from 'object'
    or jsonb_typeof(new.document->'cabinets') is distinct from 'array' then raise exception 'SHOWCASE_INVALID'; end if;
  total := jsonb_array_length(new.document->'cabinets');
  -- Technical safety caps for QA, not purchasable storage slots.
  if total < 1 or total > 12 or octet_length(new.document::text)>100000 then raise exception 'SHOWCASE_LIMIT'; end if;
  for cabinet in select value from jsonb_array_elements(new.document->'cabinets') loop
    if jsonb_typeof(cabinet) is distinct from 'object' or coalesce(cabinet->>'id','') !~ '^[a-zA-Z0-9-]{1,64}$'
      or cabinet->>'id'=any(ids) or length(btrim(coalesce(cabinet->>'name',''))) not between 1 and 30
      or coalesce(cabinet->>'template','') not in ('classic','focus')
      or coalesce(cabinet->>'background','') not in ('forest','cream','midnight')
      or jsonb_typeof(cabinet->'items') is distinct from 'array' then raise exception 'SHOWCASE_INVALID'; end if;
    ids := array_append(ids,cabinet->>'id'); seen := '{}';
    if jsonb_array_length(cabinet->'items')>60 then raise exception 'SHOWCASE_LIMIT'; end if;
    for item in select value from jsonb_array_elements(cabinet->'items') loop
      select * into product from public.showcase_catalog where id=item->>'catalogId';
      if not found or product.id=any(seen) or (not product.starter and not exists(
        select 1 from public.user_showcase_inventory where user_id=new.user_id and catalog_id=product.id
      )) then raise exception 'SHOWCASE_NOT_OWNED'; end if;
      seen := array_append(seen,product.id);
      if jsonb_typeof(item->'x') is distinct from 'number' or jsonb_typeof(item->'shelf') is distinct from 'number'
        or jsonb_typeof(item->'layer') is distinct from 'number' then raise exception 'SHOWCASE_INVALID'; end if;
      if (item->>'x')::numeric not between 0 and 100 or (item->>'shelf')::numeric not in (0,1,2)
        or (item->>'layer')::numeric not in (0,1,2,3,4,5,6,7,8)
        or length(coalesce(item->>'text',''))>20 then raise exception 'SHOWCASE_INVALID'; end if;
    end loop;
  end loop;
  if not coalesce(new.document->>'representative'=any(ids),false) then raise exception 'SHOWCASE_INVALID'; end if;
  if TG_OP='UPDATE' and new.revision<>old.revision+1 then raise exception 'SHOWCASE_CONFLICT'; end if;
  if TG_OP='INSERT' and new.revision<>0 then raise exception 'SHOWCASE_CONFLICT'; end if;
  new.updated_at := now();
  return new;
end $$;
create trigger validate_showcase_library before insert or update on public.user_showcase_libraries
for each row execute function public.validate_showcase_library();
revoke all on function public.validate_showcase_library() from public,anon,authenticated;

create function public.save_showcase_library(p_revision integer,p_document jsonb) returns integer
language plpgsql security invoker set search_path='' as $$
declare v_revision integer;
begin
  if auth.uid() is null then raise exception 'LOGIN_REQUIRED'; end if;
  if p_revision=-1 then
    insert into public.user_showcase_libraries(user_id,document) values(auth.uid(),p_document)
    on conflict(user_id) do nothing returning revision into v_revision;
  else
    update public.user_showcase_libraries set document=p_document,revision=revision+1
    where user_id=auth.uid() and revision=p_revision returning revision into v_revision;
  end if;
  if v_revision is null then raise exception 'SHOWCASE_CONFLICT'; end if;
  return v_revision;
end $$;
revoke all on function public.save_showcase_library(integer,jsonb) from public,anon;
grant execute on function public.save_showcase_library(integer,jsonb) to authenticated;
