-- August 2026 competitive ladder: Emerald sits between Platinum and Diamond.
create or replace function private.recruitment_tier_ids(p_game_slug text) returns text[]
language sql immutable set search_path='' as $$
  select case p_game_slug
    when 'overwatch' then array['bronze','silver','gold','plat','emerald','diamond','master','gm','champion']
    when 'valorant' then array['iron','bronze','silver','gold','plat','diamond','ascendant','immortal','radiant']
    when 'lol' then array['iron','bronze','silver','gold','plat','emerald','diamond','master','gm','challenger']
    when 'pubg' then array['bronze','silver','gold','plat','crystal','diamond','master','survivor']
    else array[]::text[] end;
$$;
revoke all on function private.recruitment_tier_ids(text) from public,anon,authenticated;

-- Keep existing ranges continuous when their endpoints span the new tier.
-- Empty (unrestricted), single-tier and ranges on either side stay unchanged.
update public.clans c set tier_range=array_append(c.tier_range,'emerald')
from public.games g where c.game_id=g.id and g.slug='overwatch'
  and c.tier_range @> array['plat','diamond'] and not 'emerald'=any(c.tier_range);

update public.clan_board_coaches c set tier=array(
  select tier from unnest(private.recruitment_tier_ids('overwatch')) tier
  where tier=any(array_append(c.tier,'emerald'))
) from public.clans clan join public.games g on g.id=clan.game_id
where c.clan_id=clan.id and g.slug='overwatch'
  and c.tier @> array['plat','diamond'] and not 'emerald'=any(c.tier);
