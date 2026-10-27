-- Additive, free QA-ready themes; preserve purchases, titles, symbols and selections.
insert into public.nameplate_options(game_id,category,code,name_ko,name_en,unlock_source,price_coins)
select g.id,v.category::public.nameplate_category,v.code,v.name_ko,v.name_en,'default'::public.nameplate_unlock_source,0
from public.games g cross join (values
  ('portrait','portrait-default','장식 없음','No portrait decoration'),
  ('portrait','theme-arcade-portrait','심야 아케이드','Midnight Arcade'),
  ('portrait','theme-tactical-portrait','전술 기록','Tactical Record'),
  ('portrait','theme-nebula-portrait','성운 항해','Nebula Voyage'),
  ('frame','theme-arcade-frame','심야 아케이드','Midnight Arcade'),
  ('frame','theme-tactical-frame','전술 기록','Tactical Record'),
  ('frame','theme-nebula-frame','성운 항해','Nebula Voyage'),
  ('namebar','theme-arcade-namebar','심야 아케이드','Midnight Arcade'),
  ('namebar','theme-tactical-namebar','전술 기록','Tactical Record'),
  ('namebar','theme-nebula-namebar','성운 항해','Nebula Voyage')
) v(category,code,name_ko,name_en)
where g.slug = 'overwatch'
on conflict (code) do nothing;

-- Keep the existing membership gate and public projection; add only the selected portrait code.
create or replace function private.get_clan_namecards(p_clan_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not exists(select 1 from public.clan_members
    where clan_id = p_clan_id and user_id = auth.uid() and status = 'active') then
    raise exception 'namecard_clan_member_required' using errcode = '42501';
  end if;
  return (select coalesce(jsonb_object_agg(m.user_id,jsonb_build_object(
    'displayName',case when g.slug = 'overwatch' then coalesce(nullif(gp.battle_tag,''),u.nickname)
      when g.slug in ('valorant','lol') then coalesce(nullif(gp.riot_id,''),u.nickname)
      else u.nickname end,
    'title',(select o.name_ko from public.user_namecard_selections s join public.nameplate_options o on o.id = s.option_id
      where s.user_id = u.id and s.category = 'sub' and o.code not like '%-sub-default'),
    'frame',(select o.code from public.user_namecard_selections s join public.nameplate_options o on o.id = s.option_id
      where s.user_id = u.id and s.category = 'frame'),
    'namebar',(select o.code from public.user_namecard_selections s join public.nameplate_options o on o.id = s.option_id
      where s.user_id = u.id and s.category = 'namebar'),
    'emblem',(select o.code from public.user_namecard_selections s join public.nameplate_options o on o.id = s.option_id
      where s.user_id = u.id and s.category = 'emblem'),
    'portrait',(select o.code from public.user_namecard_selections s join public.nameplate_options o on o.id = s.option_id
      where s.user_id = u.id and s.category = 'portrait')
  )),'{}'::jsonb)
  from public.clan_members m join public.users u on u.id = m.user_id
    join public.clans c on c.id = m.clan_id join public.games g on g.id = c.game_id
    left join public.user_game_profiles gp on gp.user_id = u.id and gp.game_id = g.id
  where m.clan_id = p_clan_id and m.status = 'active');
end $$;
