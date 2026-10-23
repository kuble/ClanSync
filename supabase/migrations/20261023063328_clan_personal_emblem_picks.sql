create table public.clan_personal_emblem_picks (
  clan_id uuid not null references public.clans(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  emblem_keys text[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key(clan_id,user_id),
  constraint clan_personal_emblem_picks_valid_keys check (
    cardinality(emblem_keys)<=3 and
    case when coalesce(array_ndims(emblem_keys),1)=1
      then array_position(emblem_keys,null) is null else false end
  )
);
create index clan_personal_emblem_picks_user_idx on public.clan_personal_emblem_picks(user_id);

alter table public.clan_personal_emblem_picks enable row level security;
revoke all on public.clan_personal_emblem_picks from public,anon,authenticated;
grant select,insert,update,delete on public.clan_personal_emblem_picks to service_role;
grant select on public.clan_personal_emblem_picks to authenticated;
create policy personal_emblem_picks_owner_read on public.clan_personal_emblem_picks
  for select to authenticated
  using(user_id=(select auth.uid()) and public.is_active_clan_member(clan_id));
