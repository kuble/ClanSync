-- Public minirooms identify players by opted-in clan/game identities, never account nicknames.
-- Keep the existing authentication, room visibility, and restricted emblem audience.
create or replace function private.read_player_profile(p_user_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare viewer uuid := auth.uid(); visibility public.profile_visibility%rowtype; result jsonb;
begin
  if viewer is null or not exists(select 1 from public.users where id = viewer) then
    raise exception 'profile_auth_required' using errcode = '42501';
  end if;
  select * into visibility from public.profile_visibility where user_id = p_user_id;
  if not coalesce(visibility.room_public, true) then return null; end if;
  select jsonb_build_object(
    'userId',u.id,
    'intro',case when visibility.show_intro then left(a.raw_user_meta_data->>'profile_intro',120) else null end,
    'games',case when visibility.show_games then (
      select coalesce(jsonb_agg(jsonb_build_object('slug',g.slug,'nameKo',g.name_ko) order by g.slug),'[]'::jsonb)
      from public.user_game_profiles gp join public.games g on g.id = gp.game_id where gp.user_id = u.id
    ) else '[]'::jsonb end,
    'memberships',case when visibility.show_clan then (
      select coalesce(jsonb_agg(jsonb_build_object(
        'clanId',c.id,'clanName',c.name,'gameSlug',g.slug,'gameName',g.name_ko,'role',m.role,
        'accountId',case when g.slug = 'overwatch' then coalesce(nullif(gp.battle_tag,''),
          case when gp.game_uid ~ '^[^#[:space:][:cntrl:]]+#[0-9]{4,10}$' then gp.game_uid end)
          when g.slug in ('valorant','lol') then nullif(gp.riot_id,'') else null end,
        'showEmblems',coalesce(visibility.show_emblems,false) and exists(
          select 1 from public.clan_members vm where vm.user_id = viewer and vm.clan_id = c.id and vm.status = 'active'
        )
      ) order by c.id),'[]'::jsonb)
      from public.clan_members m join public.clans c on c.id = m.clan_id join public.games g on g.id = c.game_id
      left join public.user_game_profiles gp on gp.user_id = u.id and gp.game_id = c.game_id and gp.is_verified
      where m.user_id = u.id and m.status = 'active'
    ) else '[]'::jsonb end,
    'housing',jsonb_build_object(
      'room',jsonb_build_object('wallpaper',coalesce(r.wallpaper,'cream'),'floor',coalesce(r.floor,'oak')),
      'catalog',(select coalesce(jsonb_agg(jsonb_build_object(
        'id',c.id,'name',c.name,'description',c.description,'category',c.category,'price',c.price,
        'width',c.width,'depth',c.depth,'visualKey',c.visual_key,'isStarter',c.is_starter,'mount',c.mount,'wallLayer',c.wall_layer
      ) order by c.sort_order),'[]'::jsonb) from public.housing_catalog c where exists(
        select 1 from public.user_housing_inventory i where i.user_id = u.id and i.catalog_id = c.id and i.x is not null and i.y is not null
      )),
      'inventory',(select coalesce(jsonb_agg(jsonb_build_object(
        'id',i.id,'catalogId',i.catalog_id,'x',i.x,'y',i.y,'rotation',i.rotation,'surface',i.surface
      ) order by i.id),'[]'::jsonb) from public.user_housing_inventory i where i.user_id = u.id and i.x is not null and i.y is not null)
    )
  ) into result from public.users u join auth.users a on a.id = u.id
    left join public.user_housing_rooms r on r.user_id = u.id where u.id = p_user_id;
  return result;
end $$;
revoke all on function private.read_player_profile(uuid) from public,anon,authenticated;
grant execute on function private.read_player_profile(uuid) to authenticated;
