-- Convert a previous single tier to a one-tier range; unrestricted remains unrestricted.
alter table public.clan_board_coaches
  drop constraint clan_board_coaches_tier_check,
  alter column tier drop default,
  alter column tier type text[] using case when tier = 'all' then '{}'::text[] else array[tier] end,
  alter column tier set default '{}'::text[];

alter table public.clan_board_coaches add constraint clan_board_coaches_tier_check check (
  coalesce(array_ndims(tier), 1) = 1 and cardinality(tier) <= 10
  and array_position(tier, null) is null
  and tier <@ array['iron', 'bronze', 'silver', 'gold', 'plat', 'diamond', 'master',
    'gm', 'champion', 'ascendant', 'immortal', 'radiant', 'emerald', 'challenger',
    'crystal', 'survivor']::text[]
);
