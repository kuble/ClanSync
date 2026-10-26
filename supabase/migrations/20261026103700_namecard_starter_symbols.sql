-- Account-wide starter symbols use the existing default-item entitlement.
insert into public.nameplate_options(game_id,category,code,name_ko,name_en,unlock_source,price_coins)
select g.id,'emblem'::public.nameplate_category,v.code,v.name_ko,v.name_en,'default'::public.nameplate_unlock_source,0
from public.games g cross join (values
  ('symbol-crown','왕관','Crown'),
  ('symbol-flame','불꽃','Flame'),
  ('symbol-bolt','번개','Lightning'),
  ('symbol-star','별','Star'),
  ('symbol-gamepad','게임패드','Gamepad')
) v(code,name_ko,name_en)
where g.slug = 'overwatch'
on conflict (code) do nothing;
