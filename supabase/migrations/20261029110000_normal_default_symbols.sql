-- Free account-wide symbols; preserve inventories and wallets.
insert into public.nameplate_options(game_id,category,code,name_ko,name_en,unlock_source,price_coins)
select g.id,'emblem'::public.nameplate_category,'symbol-normal-'||v.id,v.ko,v.en,'default'::public.nameplate_unlock_source,0
from public.games g cross join (values
  ('orbit','오비트','Orbit'),('shift','시프트','Shift'),('node','노드','Node'),
  ('beacon','비콘','Beacon'),('spark','스파크','Spark')
) v(id,ko,en) where g.slug='overwatch'
on conflict(code) do update set name_ko=excluded.name_ko,name_en=excluded.name_en,
  unlock_source=excluded.unlock_source,price_coins=0,is_active=true;

update public.nameplate_options set is_active=false
where category='emblem' and code like '%-emblem-default';
