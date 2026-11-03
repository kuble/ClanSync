-- Keep existing coaching content and introduction intact; old profiles cover all roles/tiers.
alter table public.clan_board_coaches
  add column role text not null default 'all'
    check (role in ('all', 'tank', 'dmg', 'sup')),
  add column tier text not null default 'all'
    check (tier in ('all', 'iron', 'bronze', 'silver', 'gold', 'plat', 'diamond',
      'master', 'gm', 'champion', 'ascendant', 'immortal', 'radiant', 'emerald',
      'challenger', 'crystal', 'survivor'));

-- Existing self-enrollment/edit RLS and immutable clan/user identity still apply.
grant insert(role, tier), update(role, tier) on public.clan_board_coaches to authenticated;
