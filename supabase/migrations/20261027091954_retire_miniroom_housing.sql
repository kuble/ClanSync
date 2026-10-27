-- Retire miniroom data and APIs. Public profile identity and coin history are preserved.
create or replace function private.read_player_profile(p_user_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare viewer uuid := auth.uid(); result jsonb;
begin
  if viewer is null or not exists(select 1 from public.users where id = viewer) then
    raise exception 'profile_auth_required' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'userId',u.id,
    'intro',left(a.raw_user_meta_data->>'profile_intro',120),
    'games',(
      select coalesce(jsonb_agg(jsonb_build_object('slug',g.slug,'nameKo',g.name_ko) order by g.slug),'[]'::jsonb)
      from public.user_game_profiles gp join public.games g on g.id = gp.game_id where gp.user_id = u.id
    ),
    'memberships',(
      select coalesce(jsonb_agg(jsonb_build_object(
        'clanId',c.id,'clanName',c.name,'gameSlug',g.slug,'gameName',g.name_ko,'role',m.role,
        'accountId',case when g.slug = 'overwatch' then coalesce(nullif(gp.battle_tag,''),
          case when gp.game_uid ~ '^[^#[:space:][:cntrl:]]+#[0-9]{4,10}$' then gp.game_uid end)
          when g.slug in ('valorant','lol') then nullif(gp.riot_id,'') else null end
      ) order by c.id),'[]'::jsonb)
      from public.clan_members m join public.clans c on c.id = m.clan_id join public.games g on g.id = c.game_id
      left join public.user_game_profiles gp on gp.user_id = u.id and gp.game_id = c.game_id and gp.is_verified
      where m.user_id = u.id and m.status = 'active'
    )
  ) into result from public.users u join auth.users a on a.id = u.id
    where u.id = p_user_id;
  return result;
end $$;
revoke all on function private.read_player_profile(uuid) from public,anon,authenticated;
grant execute on function private.read_player_profile(uuid) to authenticated;

-- Drop entry points first; never cascade into shared profile/currency storage.
drop function public.get_my_housing();
drop function public.purchase_housing_furniture(text);
drop function public.save_my_housing_room(integer,text,text,jsonb);
drop function private.get_my_housing();
drop function private.purchase_housing_furniture(text);
drop function private.save_my_housing_room(integer,text,text,jsonb);
drop function private.my_housing_state();
drop function private.ensure_my_housing();
drop table public.user_housing_inventory;
drop table public.user_housing_rooms;
drop table public.housing_catalog;

-- This entitlement renders a card frame, not an entrance animation. Keep its SKU and price.
update public.store_items set name_ko = '프리미엄 골드 프레임' where slug = 'profile_entrance_fx';
update public.nameplate_options set name_ko = '프리미엄 골드 프레임' where code like 'pf_entrance_store:%';
