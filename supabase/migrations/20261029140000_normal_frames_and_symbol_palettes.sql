alter table public.user_namecard_selections drop constraint namecard_palette_valid;
alter table public.user_namecard_selections add constraint namecard_palette_valid check
  (palette_id is null or (category in ('namebar','emblem') and palette_id in ('graphite','blue','green','purple','rose','amber')));

insert into public.nameplate_options(game_id,category,code,name_ko,name_en,unlock_source,price_coins)
select g.id,v.category::public.nameplate_category,v.category||'-normal-'||v.id,v.ko,v.en,'default'::public.nameplate_unlock_source,0
from public.games g cross join (values
  ('portrait','ring','링','Ring'),
  ('portrait','orbit','듀얼','Dual'),
  ('portrait','bracket','브래킷','Bracket'),
  ('portrait','diamond','다이아','Diamond'),
  ('portrait','capsule','캡슐','Capsule'),
  ('frame','line','라인','Line'),
  ('frame','double','더블','Double'),
  ('frame','corner','코너','Corner'),
  ('frame','rail','레일','Rail'),
  ('frame','tab','탭','Tab')
) v(category,id,ko,en) where g.slug='overwatch'
on conflict(code) do update set name_ko=excluded.name_ko,name_en=excluded.name_en,
 unlock_source=excluded.unlock_source,price_coins=0,is_active=true;

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
