-- Free account-wide styles; retain existing purchases and saved selections.
insert into public.nameplate_options(game_id,category,code,name_ko,name_en,unlock_source,price_coins)
select g.id,v.category::public.nameplate_category,v.code,v.name_ko,v.name_en,'default'::public.nameplate_unlock_source,0
from public.games g cross join (values
  ('frame','starter-frame-silver','실버 라인','Silver line'),
  ('frame','starter-frame-gold','챔피언 골드','Champion gold'),
  ('frame','starter-frame-ice','아이스 블루','Ice blue'),
  ('frame','starter-frame-rose','로즈 쿼츠','Rose quartz'),
  ('frame','starter-frame-double','듀얼 라인','Double line'),
  ('frame','starter-frame-stitch','스티치','Stitch'),
  ('namebar','starter-namebar-midnight','미드나잇','Midnight'),
  ('namebar','starter-namebar-forest','포레스트','Forest'),
  ('namebar','starter-namebar-sunset','선셋','Sunset'),
  ('namebar','starter-namebar-aurora','오로라','Aurora'),
  ('namebar','starter-namebar-checker','체커보드','Checkerboard'),
  ('namebar','starter-namebar-blueprint','블루프린트','Blueprint'),
  ('sub','starter-title-casual','즐겜러','Casual player'),
  ('sub','starter-title-shield','팀의 방패','Team shield'),
  ('sub','starter-title-contender','승부사','Contender'),
  ('sub','starter-title-healer','힐링 담당','Team healer'),
  ('sub','starter-title-planner','전략 설계자','Strategy planner'),
  ('sub','starter-title-mood','분위기 메이커','Mood maker'),
  ('sub','starter-title-steady','꾸준한 플레이어','Steady player'),
  ('sub','starter-title-next','다음 판의 주인공','Next round star')
) v(category,code,name_ko,name_en)
where g.slug = 'overwatch'
on conflict (code) do nothing;

-- Only the explicit empty-title defaults are hidden; free titles have names too.
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
      where s.user_id = u.id and s.category = 'emblem')
  )),'{}'::jsonb)
  from public.clan_members m join public.users u on u.id = m.user_id
    join public.clans c on c.id = m.clan_id join public.games g on g.id = c.game_id
    left join public.user_game_profiles gp on gp.user_id = u.id and gp.game_id = g.id
  where m.clan_id = p_clan_id and m.status = 'active');
end $$;
