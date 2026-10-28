insert into public.store_items(slug,item_type,pool_source,name_ko,price_coins)
values ('clan_emoji_slots_10','clan_deco','clan','공용 이모티콘 10슬롯',200),
       ('clan_photo_frames','clan_deco','clan','추억 사진 프레임 팩',150),
       ('clan_photo_stickers','clan_deco','clan','추억 사진 스티커 팩',100);

-- Expose entitlement flags to active members, never buyer/ledger records.
create function public.clan_cosmetic_access(p_clan_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare v_slugs text[];
begin
  if auth.uid() is null or not public.is_active_clan_member(p_clan_id) then return '{}'::jsonb; end if;
  select array_agg(i.slug::text) into v_slugs from public.purchases p join public.store_items i on i.id=p.item_id
    where p.clan_id=p_clan_id and p.pool_source='clan' and p.voided_at is null;
  return jsonb_build_object('emojiSlots',case when 'clan_emoji_slots_10'=any(v_slugs) then 10 else 0 end,
    'frames',coalesce('clan_photo_frames'=any(v_slugs),false),'stickers',coalesce('clan_photo_stickers'=any(v_slugs),false));
end; $$;
revoke all on function public.clan_cosmetic_access(uuid) from public,anon;
grant execute on function public.clan_cosmetic_access(uuid) to authenticated;

create table public.clan_emojis(
  id uuid primary key,
  clan_id uuid not null references public.clans(id) on delete cascade,
  name text not null check(name ~ '^[a-zA-Z0-9가-힣_]{2,32}$'),
  image_path text not null check(image_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$' and split_part(image_path,'/',1)=clan_id::text and split_part(image_path,'/',2)=id::text),
  created_at timestamptz not null default now()
);
create unique index clan_emojis_name_idx on public.clan_emojis(clan_id,lower(name));
alter table public.clan_emojis enable row level security;
revoke all on public.clan_emojis from public,anon,authenticated;
grant all on public.clan_emojis to service_role;
grant select on public.clan_emojis to authenticated;
create policy clan_emoji_read on public.clan_emojis for select to authenticated
using(public.is_active_clan_member(clan_id) and (public.clan_cosmetic_access(clan_id)->>'emojiSlots')::int > 0);

create function public.add_clan_emoji(p_actor_id uuid,p_clan_id uuid,p_id uuid,p_name text,p_image_path text)
returns jsonb language plpgsql security invoker set search_path='' as $$
begin
  if not exists(select 1 from public.clan_members where clan_id=p_clan_id and user_id=p_actor_id and status='active' and role in ('leader','officer')) then
    return jsonb_build_object('ok',false,'error','officer_required'); end if;
  -- Serialize slot allocation and voiding against the purchase row.
  perform p.id from public.purchases p join public.store_items i on i.id=p.item_id where p.clan_id=p_clan_id
    and p.pool_source='clan' and p.voided_at is null and i.slug='clan_emoji_slots_10' for update of p;
  if not found then return jsonb_build_object('ok',false,'error','not_owned'); end if;
  if (select count(*) from public.clan_emojis where clan_id=p_clan_id)>=10 then return jsonb_build_object('ok',false,'error','slots_full'); end if;
  insert into public.clan_emojis(id,clan_id,name,image_path) values(p_id,p_clan_id,p_name,p_image_path);
  return jsonb_build_object('ok',true);
exception when unique_violation then return jsonb_build_object('ok',false,'error','duplicate_name');
end; $$;
revoke all on function public.add_clan_emoji(uuid,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.add_clan_emoji(uuid,uuid,uuid,text,text) to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('clan-emojis','clan-emojis',false,262144,array['image/webp']);

create table public.clan_emoji_reactions(
  post_id uuid not null references public.clan_board_posts(id) on delete cascade,
  emoji_id uuid not null references public.clan_emojis(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.users(id) on delete cascade,
  primary key(post_id,emoji_id,user_id)
);
create index clan_emoji_reactions_emoji_idx on public.clan_emoji_reactions(emoji_id);
create index clan_emoji_reactions_user_idx on public.clan_emoji_reactions(user_id);
alter table public.clan_emoji_reactions enable row level security;
revoke all on public.clan_emoji_reactions from public,anon,authenticated;
grant all on public.clan_emoji_reactions to service_role;
grant select,delete on public.clan_emoji_reactions to authenticated;
grant insert(post_id,emoji_id) on public.clan_emoji_reactions to authenticated;
create policy emoji_reaction_read on public.clan_emoji_reactions for select to authenticated
using(exists(select 1 from public.clan_board_posts p join public.clan_emojis e on e.clan_id=p.clan_id where p.id=post_id and e.id=emoji_id));
create policy emoji_reaction_insert on public.clan_emoji_reactions for insert to authenticated
with check(user_id=(select auth.uid()) and exists(select 1 from public.clan_board_posts p join public.clan_emojis e on e.clan_id=p.clan_id where p.id=post_id and e.id=emoji_id));
create policy emoji_reaction_delete on public.clan_emoji_reactions for delete to authenticated
using(user_id=(select auth.uid()) and exists(select 1 from public.clan_board_posts p where p.id=post_id));
create function public.clan_emoji_reaction_counts(p_post_id uuid) returns table(emoji_id uuid,total bigint,mine boolean)
language sql stable security invoker set search_path='' as $$
  select r.emoji_id,count(*),bool_or(r.user_id=auth.uid()) from public.clan_emoji_reactions r where r.post_id=p_post_id group by r.emoji_id;
$$;
revoke all on function public.clan_emoji_reaction_counts(uuid) from public,anon;
grant execute on function public.clan_emoji_reaction_counts(uuid) to authenticated;

-- Paid photo styles are also checked on direct authenticated PostgREST writes.
create function public.guard_memory_cosmetics() returns trigger language plpgsql security definer set search_path='' as $$
declare f text:=coalesce(new.details->>'photoFrame','classic'); s text:=coalesce(new.details->>'photoSticker','none');
begin
  if f not in ('classic','film','tape') or s not in ('none','sparkle','heart','gg') or (new.kind<>'memories' and (f<>'classic' or s<>'none')) then
    raise exception 'invalid_photo_style' using errcode='23514'; end if;
  if f<>'classic' and not exists(select 1 from public.purchases p join public.store_items i on i.id=p.item_id where p.clan_id=new.clan_id and p.pool_source='clan' and p.voided_at is null and i.slug='clan_photo_frames') then
    raise exception 'photo_frames_not_owned' using errcode='23514'; end if;
  if s<>'none' and not exists(select 1 from public.purchases p join public.store_items i on i.id=p.item_id where p.clan_id=new.clan_id and p.pool_source='clan' and p.voided_at is null and i.slug='clan_photo_stickers') then
    raise exception 'photo_stickers_not_owned' using errcode='23514'; end if;
  return new;
end; $$;
revoke all on function public.guard_memory_cosmetics() from public,anon,authenticated;
create trigger guard_memory_cosmetics before insert or update of details on public.clan_board_posts for each row execute function public.guard_memory_cosmetics();
