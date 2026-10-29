alter table public.user_namecard_selections drop constraint namecard_palette_valid;
alter table public.user_namecard_selections add constraint namecard_palette_valid check
  (palette_id is null or (category in ('namebar','emblem','portrait','frame') and palette_id in ('graphite','blue','green','purple','rose','amber')));

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
    'backgroundPalette',(select s.palette_id from public.user_namecard_selections s where s.user_id = u.id and s.category = 'namebar'),
    'symbolPalette',(select s.palette_id from public.user_namecard_selections s where s.user_id = u.id and s.category = 'emblem'),
    'portraitPalette',(select s.palette_id from public.user_namecard_selections s where s.user_id = u.id and s.category = 'portrait'),
    'framePalette',(select s.palette_id from public.user_namecard_selections s where s.user_id = u.id and s.category = 'frame'),
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
