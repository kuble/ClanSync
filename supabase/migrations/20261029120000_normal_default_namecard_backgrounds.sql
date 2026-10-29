insert into public.nameplate_options(game_id,category,code,name_ko,name_en,unlock_source,price_coins)
select g.id,'namebar'::public.nameplate_category,'background-normal-'||v.id,v.ko,v.en,'default'::public.nameplate_unlock_source,0
from public.games g cross join (values
  ('rail','레일','Rail'),('wave','웨이브','Wave'),('fold','폴드','Fold'),
  ('step','스텝','Step'),('tile','타일','Tile')
) v(id,ko,en) where g.slug='overwatch'
on conflict(code) do update set name_ko=excluded.name_ko,name_en=excluded.name_en,
  unlock_source=excluded.unlock_source,price_coins=0,is_active=true;
