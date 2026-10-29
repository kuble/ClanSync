-- Keep the existing purchase guard on both legacy photos and independently placed stickers.
create or replace function public.guard_memory_cosmetics() returns trigger
language plpgsql security definer set search_path='' as $$
declare
  f text:=coalesce(new.details->>'photoFrame','classic');
  s text:=coalesce(new.details->>'photoSticker','none');
  stickers jsonb:=new.details->'photoStickers';
  item jsonb;
  placement jsonb;
  seen text[]:='{}';
  key text;
  needs_stickers boolean:=s<>'none';
begin
  if f not in ('classic','film','tape') or s not in ('none','sparkle','heart','gg') or (new.kind<>'memories' and (f<>'classic' or s<>'none')) then
    raise exception 'invalid_photo_style' using errcode='23514';
  end if;
  if stickers is not null then
    if new.kind<>'memories' or jsonb_typeof(stickers) is distinct from 'array' or s<>'none' or new.details ? 'photoStickerPlacement' then
      raise exception 'invalid_photo_stickers' using errcode='23514';
    end if;
    if jsonb_array_length(stickers)>20 then raise exception 'invalid_photo_stickers' using errcode='23514'; end if;
    needs_stickers:=jsonb_array_length(stickers)>0;
    for item in select value from jsonb_array_elements(stickers) loop
      if jsonb_typeof(item) is distinct from 'object' then raise exception 'invalid_photo_stickers' using errcode='23514'; end if;
      if exists(select 1 from jsonb_object_keys(item) k where k not in ('id','sticker','placement'))
        or jsonb_typeof(item->'id') is distinct from 'string'
        or (item->>'id') !~* '^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$'
        or item->>'id'=any(seen)
        or jsonb_typeof(item->'sticker') is distinct from 'string'
        or item->>'sticker' not in ('sparkle','heart','gg') then
        raise exception 'invalid_photo_stickers' using errcode='23514';
      end if;
      seen:=array_append(seen,item->>'id');
      placement:=item->'placement';
      if jsonb_typeof(placement) is distinct from 'object' then raise exception 'invalid_photo_stickers' using errcode='23514'; end if;
      if exists(select 1 from jsonb_object_keys(placement) k where k not in ('x','y','rotation','flipX','flipY','scale'))
        or jsonb_typeof(placement->'flipX') is distinct from 'boolean'
        or jsonb_typeof(placement->'flipY') is distinct from 'boolean' then
        raise exception 'invalid_photo_stickers' using errcode='23514';
      end if;
      foreach key in array array['x','y','rotation'] loop
        if jsonb_typeof(placement->key) is distinct from 'number' then raise exception 'invalid_photo_stickers' using errcode='23514'; end if;
      end loop;
      if (placement->>'x')::numeric not between 0 and 100 or (placement->>'y')::numeric not between 0 and 100
        or (placement->>'rotation')::numeric not between -180 and 180 then
        raise exception 'invalid_photo_stickers' using errcode='23514';
      end if;
      if placement ? 'scale' then
        if jsonb_typeof(placement->'scale') is distinct from 'number' then raise exception 'invalid_photo_stickers' using errcode='23514'; end if;
        if (placement->>'scale')::numeric not between 0.5 and 3 then raise exception 'invalid_photo_stickers' using errcode='23514'; end if;
      end if;
    end loop;
  end if;
  if f<>'classic' and not exists(select 1 from public.purchases p join public.store_items i on i.id=p.item_id where p.clan_id=new.clan_id and p.pool_source='clan' and p.voided_at is null and i.slug='clan_photo_frames') then
    raise exception 'photo_frames_not_owned' using errcode='23514';
  end if;
  if needs_stickers and not exists(select 1 from public.purchases p join public.store_items i on i.id=p.item_id where p.clan_id=new.clan_id and p.pool_source='clan' and p.voided_at is null and i.slug='clan_photo_stickers') then
    raise exception 'photo_stickers_not_owned' using errcode='23514';
  end if;
  return new;
end; $$;
revoke all on function public.guard_memory_cosmetics() from public,anon,authenticated;
drop trigger guard_memory_cosmetics on public.clan_board_posts;
create trigger guard_memory_cosmetics before insert or update of details,kind,clan_id on public.clan_board_posts
for each row execute function public.guard_memory_cosmetics();
