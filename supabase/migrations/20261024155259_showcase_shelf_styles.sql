-- Shelf styles unlock once for all saved cabinets; goods still consume individual units.
-- QA free claims only. No coin transaction or legacy housing changes.
alter table public.showcase_catalog drop constraint showcase_catalog_kind_check;
alter table public.showcase_catalog add constraint showcase_catalog_kind_check check(kind in ('goods','edge','light','label','template'));
insert into public.showcase_catalog(id,name,kind,sprite,width) values
('shelf-offset','엇갈림형 선반','template',0,24),
('shelf-steps','계단형 선반','template',0,24);

create or replace function public.claim_showcase_product(p_catalog_id text) returns integer
language plpgsql security invoker set search_path='' as $$
declare amount integer; is_template boolean;
begin
  if auth.uid() is null then raise exception 'LOGIN_REQUIRED'; end if;
  if not exists(select 1 from public.showcase_catalog where id=p_catalog_id and available) then raise exception 'NOT_AVAILABLE'; end if;
  select kind='template' into is_template from public.showcase_catalog where id=p_catalog_id;
  insert into public.user_showcase_inventory(user_id,catalog_id) values(auth.uid(),p_catalog_id)
  on conflict(user_id,catalog_id) do update set quantity=case when is_template then 1 else public.user_showcase_inventory.quantity+1 end
  returning quantity into amount;
  return amount;
end $$;

create or replace function public.validate_showcase_library() returns trigger
language plpgsql security invoker set search_path='' as $$
declare cabinet jsonb; item jsonb; product public.showcase_catalog; ids text[] := '{}'; item_ids text[] := '{}'; counts jsonb := '{}'; amount integer; used integer;
begin
  if jsonb_typeof(new.document) is distinct from 'object'
    or jsonb_typeof(new.document->'cabinets') is distinct from 'array' then raise exception 'SHOWCASE_INVALID'; end if;
  if jsonb_array_length(new.document->'cabinets') not between 1 and 12 or octet_length(new.document::text)>100000 then raise exception 'SHOWCASE_LIMIT'; end if;
  for cabinet in select value from jsonb_array_elements(new.document->'cabinets') loop
    if jsonb_typeof(cabinet) is distinct from 'object' or coalesce(cabinet->>'id','') !~ '^[a-zA-Z0-9-]{1,64}$'
      or cabinet->>'id'=any(ids) or jsonb_typeof(cabinet->'name') is distinct from 'string'
      or length(btrim(cabinet->>'name')) not between 1 and 30
      or coalesce(cabinet->>'template','') not in ('classic','focus','offset','steps')
      or coalesce(cabinet->>'background','') not in ('forest','cream','midnight')
      or jsonb_typeof(cabinet->'items') is distinct from 'array' then raise exception 'SHOWCASE_INVALID'; end if;
    if cabinet->>'template' not in ('classic','focus') and not exists(
      select 1 from public.user_showcase_inventory i join public.showcase_catalog c on c.id=i.catalog_id
      where i.user_id=new.user_id and c.kind='template' and c.id='shelf-'||(cabinet->>'template') and i.quantity>0
    ) then raise exception 'SHOWCASE_TEMPLATE_NOT_OWNED'; end if;
    ids := array_append(ids,cabinet->>'id');
    if jsonb_array_length(cabinet->'items')>60 then raise exception 'SHOWCASE_LIMIT'; end if;
    for item in select value from jsonb_array_elements(cabinet->'items') loop
      if coalesce(item->>'id','') !~ '^[a-zA-Z0-9-]{1,64}$' or item->>'id'=any(item_ids) then raise exception 'SHOWCASE_INVALID'; end if;
      item_ids := array_append(item_ids,item->>'id');
      select * into product from public.showcase_catalog where id=item->>'catalogId';
      if not found or product.kind='template' then raise exception 'SHOWCASE_INVALID'; end if;
      select coalesce(sum(quantity),0) into amount from public.user_showcase_inventory where user_id=new.user_id and catalog_id=product.id;
      amount := amount + case when product.starter then 1 else 0 end;
      used := coalesce((counts->>product.id)::integer,0)+1;
      if used>amount then raise exception 'SHOWCASE_NOT_OWNED'; end if;
      counts := jsonb_set(counts,array[product.id],to_jsonb(used));
      if jsonb_typeof(item->'x') is distinct from 'number' or jsonb_typeof(item->'shelf') is distinct from 'number'
        or jsonb_typeof(item->'layer') is distinct from 'number' then raise exception 'SHOWCASE_INVALID'; end if;
      if (item->>'x')::numeric not between 0 and 100 or (item->>'shelf')::numeric not in (0,1,2)
        or (item->>'layer')::numeric not in (0,1,2,3,4,5,6,7,8)
        or (item ? 'text' and jsonb_typeof(item->'text') is distinct from 'string')
        or length(coalesce(item->>'text',''))>20 then raise exception 'SHOWCASE_INVALID'; end if;
    end loop;
  end loop;
  if not coalesce(new.document->>'representative'=any(ids),false) then raise exception 'SHOWCASE_INVALID'; end if;
  if TG_OP='UPDATE' and new.revision<>old.revision+1 then raise exception 'SHOWCASE_CONFLICT'; end if;
  if TG_OP='INSERT' and new.revision<>0 then raise exception 'SHOWCASE_CONFLICT'; end if;
  new.updated_at := now(); return new;
end $$;
