-- Textual auction rewards are configured per clan and snapshotted by each round.
create table public.clan_auction_items (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans(id) on delete cascade,
  name text not null check (name = btrim(name) and char_length(name) between 1 and 80),
  description text not null default '' check (char_length(description) <= 500),
  cost integer not null check (cost between 0 and 100000 and cost % 10 = 0),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clan_id, name)
);

alter table public.clan_auction_items enable row level security;
revoke all on public.clan_auction_items from public, anon, authenticated;
grant select, delete on public.clan_auction_items to authenticated;
grant insert (clan_id, name, description, cost, enabled)
  on public.clan_auction_items to authenticated;
grant update (name, description, cost, enabled)
  on public.clan_auction_items to authenticated;
grant all on public.clan_auction_items to service_role;

create policy clan_auction_items_member_read on public.clan_auction_items
  for select to authenticated using (public.is_active_clan_member(clan_id));
create policy clan_auction_items_officer_insert on public.clan_auction_items
  for insert to authenticated with check (public.is_clan_officer_plus(clan_id));
create policy clan_auction_items_officer_update on public.clan_auction_items
  for update to authenticated using (public.is_clan_officer_plus(clan_id))
  with check (public.is_clan_officer_plus(clan_id));
create policy clan_auction_items_officer_delete on public.clan_auction_items
  for delete to authenticated using (public.is_clan_officer_plus(clan_id));

create trigger clan_auction_items_updated_at
  before update on public.clan_auction_items
  for each row execute function public.set_updated_at();
