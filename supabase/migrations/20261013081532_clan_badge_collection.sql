create table public.clan_badge_awards (
  clan_id uuid not null references public.clans(id) on delete cascade,
  badge_key text not null check(badge_key ~ '^[a-z0-9_-]{1,60}$'),
  earned_at timestamptz,
  created_at timestamptz not null default now(),
  primary key(clan_id,badge_key)
);
alter table public.clan_badge_awards enable row level security;
revoke all on public.clan_badge_awards from public,anon,authenticated;
grant all on public.clan_badge_awards to service_role;
grant select on public.clan_badge_awards to authenticated;
create policy badge_member_read on public.clan_badge_awards for select to authenticated
  using(public.is_active_clan_member(clan_id));

create table public.clan_badge_featured (
  clan_id uuid primary key references public.clans(id) on delete cascade,
  badge_keys text[] not null default '{}' check(cardinality(badge_keys)<=3)
);
alter table public.clan_badge_featured enable row level security;
revoke all on public.clan_badge_featured from public,anon,authenticated;
grant all on public.clan_badge_featured to service_role;
grant select,insert on public.clan_badge_featured to authenticated;
grant update(badge_keys) on public.clan_badge_featured to authenticated;
create policy badge_featured_read on public.clan_badge_featured for select to authenticated using(public.is_active_clan_member(clan_id));
create policy badge_featured_insert on public.clan_badge_featured for insert to authenticated with check(public.is_clan_officer_plus(clan_id));
create policy badge_featured_update on public.clan_badge_featured for update to authenticated
  using(public.is_clan_officer_plus(clan_id)) with check(public.is_clan_officer_plus(clan_id));
create function public.validate_clan_badge_featured() returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if exists(select 1 from unnest(new.badge_keys) k where not exists(select 1 from public.clan_badge_awards a where a.clan_id=new.clan_id and a.badge_key=k))
    or (select count(distinct k) from unnest(new.badge_keys) k) <> cardinality(new.badge_keys) then
    raise exception '획득한 배지를 중복 없이 최대 3개 선택해 주세요.' using errcode='22023';
  end if;
  return new;
end; $$;
revoke all on function public.validate_clan_badge_featured() from public,anon;
create trigger validate_clan_badge_featured before insert or update on public.clan_badge_featured
  for each row execute function public.validate_clan_badge_featured();

create table public.clan_badge_seen (
  clan_id uuid not null references public.clans(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.users(id) on delete cascade,
  seen_at timestamptz not null default now(),
  primary key(clan_id,user_id)
);
create index clan_badge_seen_user_idx on public.clan_badge_seen(user_id);
alter table public.clan_badge_seen enable row level security;
revoke all on public.clan_badge_seen from public,anon,authenticated;
grant all on public.clan_badge_seen to service_role;
grant select on public.clan_badge_seen to authenticated;
grant insert(clan_id,user_id,seen_at),update(seen_at) on public.clan_badge_seen to authenticated;
create policy badge_seen_read on public.clan_badge_seen for select to authenticated
  using(user_id=(select auth.uid()) and public.is_active_clan_member(clan_id));
create policy badge_seen_insert on public.clan_badge_seen for insert to authenticated
  with check(user_id=(select auth.uid()) and public.is_active_clan_member(clan_id));
create policy badge_seen_update on public.clan_badge_seen for update to authenticated
  using(user_id=(select auth.uid()) and public.is_active_clan_member(clan_id))
  with check(user_id=(select auth.uid()) and public.is_active_clan_member(clan_id));
