create table public.account_personal_emblem_picks (
  user_id uuid primary key references public.users(id) on delete cascade,
  emblem_keys text[] not null default '{}',
  updated_at timestamptz not null default now(),
  constraint account_personal_emblem_picks_valid_keys check (
    cardinality(emblem_keys) <= 3 and
    case when coalesce(array_ndims(emblem_keys), 1) = 1
      then array_position(emblem_keys, null) is null else false end
  )
);
alter table public.account_personal_emblem_picks enable row level security;
revoke all on public.account_personal_emblem_picks from public, anon, authenticated;
grant select, insert, update, delete on public.account_personal_emblem_picks to service_role;
grant select on public.account_personal_emblem_picks to authenticated;
create policy account_personal_emblem_picks_owner_read on public.account_personal_emblem_picks
  for select to authenticated using (user_id = (select auth.uid()));

-- Keep the latest existing choices, including an explicitly empty selection.
with candidates as (
  select distinct on (p.user_id, p.clan_id, k.key)
    p.user_id, p.clan_id, p.clan_id::text || ':' || k.key as reference, p.updated_at, k.ordinality
  from public.clan_personal_emblem_picks p
  cross join lateral unnest(p.emblem_keys) with ordinality k(key, ordinality)
  where exists (select 1 from public.clan_personal_emblem_awards a
    where a.user_id = p.user_id and a.clan_id = p.clan_id and a.emblem_key = k.key)
    or exists (select 1 from public.clan_personal_emblem_milestones m
      where m.user_id = p.user_id and m.clan_id = p.clan_id and m.emblem_key = k.key)
  order by p.user_id, p.clan_id, k.key, k.ordinality
)
insert into public.account_personal_emblem_picks(user_id, emblem_keys, updated_at)
select owner.user_id, array(
  select c.reference from candidates c where c.user_id = owner.user_id
  order by c.updated_at desc, c.clan_id, c.ordinality limit 3
), owner.updated_at
from (select user_id, max(updated_at) as updated_at from public.clan_personal_emblem_picks group by user_id) owner;
