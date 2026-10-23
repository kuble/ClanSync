-- A single saved appearance per account. Keep legacy game selections/inventory intact.
alter table public.nameplate_options add column price_coins integer not null default 0 check (price_coins >= 0);
create table public.user_namecard_selections (
  user_id uuid not null references public.users(id) on delete cascade,
  category public.nameplate_category not null,
  option_id uuid not null references public.nameplate_options(id) on delete restrict,
  updated_at timestamptz not null default now(),
  primary key(user_id,category)
);
create index user_namecard_selections_option_idx on public.user_namecard_selections(option_id);
alter table public.user_namecard_selections enable row level security;
create policy namecard_owner on public.user_namecard_selections for all to authenticated
  using(user_id = (select auth.uid())) with check(user_id = (select auth.uid()));
revoke all on public.user_namecard_selections from public,anon,authenticated;
grant select,insert,update on public.user_namecard_selections to authenticated;
grant all on public.user_namecard_selections to service_role;

-- Resolve conflicting legacy appearances by most recently saved category, deterministically.
insert into public.user_namecard_selections(user_id,category,option_id,updated_at)
select distinct on(user_id,category) user_id,category,option_id,updated_at
from public.user_nameplate_selections order by user_id,category,updated_at desc,game_id;

create function private.enforce_account_namecard() returns trigger
language plpgsql security definer set search_path = '' as $$
declare opt public.nameplate_options%rowtype;
begin
  if new.user_id is distinct from auth.uid() then raise exception 'namecard_owner_required' using errcode = '42501'; end if;
  select * into opt from public.nameplate_options where id = new.option_id and is_active;
  if not found or opt.category <> new.category then raise exception 'namecard_invalid_option'; end if;
  if opt.unlock_source <> 'default' and not exists(
    select 1 from public.user_nameplate_inventory where user_id = new.user_id and option_id = opt.id
  ) then raise exception 'namecard_not_owned' using errcode = '42501'; end if;
  new.updated_at := now();
  return new;
end $$;
revoke all on function private.enforce_account_namecard() from public,anon,authenticated;
create trigger enforce_account_namecard before insert or update on public.user_namecard_selections
  for each row execute function private.enforce_account_namecard();

-- Catalog FK is retained for legacy store compatibility; titles and selection are account-wide.
insert into public.nameplate_options(game_id,category,code,name_ko,unlock_source,price_coins)
select g.id,'sub'::public.nameplate_category,v.code,v.title,'store'::public.nameplate_unlock_source,v.price
from public.games g cross join (values
  ('title-team-player','함께하는 플레이어',90),
  ('title-dawn-strategist','새벽의 전략가',180),
  ('title-clan-companion','클랜의 단짝',240)
) v(code,title,price) where g.slug = 'overwatch';

create function private.purchase_profile_title(p_option_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); opt public.nameplate_options%rowtype; balance integer;
begin
  if uid is null then raise exception 'title_auth_required' using errcode = '42501'; end if;
  select coin_balance into balance from public.users where id = uid for update;
  if not found then raise exception 'title_auth_required' using errcode = '42501'; end if;
  select * into opt from public.nameplate_options where id = p_option_id
    and is_active and category = 'sub' and unlock_source = 'store' and price_coins > 0;
  if not found then raise exception 'title_invalid_item'; end if;
  if exists(select 1 from public.user_nameplate_inventory where user_id = uid and option_id = opt.id) then
    return jsonb_build_object('optionId',opt.id,'coinBalance',balance);
  end if;
  if balance < opt.price_coins then raise exception 'title_insufficient_coins'; end if;
  update public.users set coin_balance = coin_balance-opt.price_coins where id = uid returning coin_balance into balance;
  insert into public.coin_transactions(user_id,pool_type,amount,reason,reference_type,reference_id,sub_key,balance_after,created_by)
    values(uid,'personal',-opt.price_coins,'purchase_title','profile_title',gen_random_uuid(),'',balance,uid);
  insert into public.user_nameplate_inventory(user_id,option_id) values(uid,opt.id);
  return jsonb_build_object('optionId',opt.id,'coinBalance',balance);
end $$;
create function public.purchase_profile_title(p_option_id uuid) returns jsonb
language sql security invoker set search_path = '' as $$ select private.purchase_profile_title(p_option_id); $$;
revoke all on function private.purchase_profile_title(uuid),public.purchase_profile_title(uuid) from public,anon,authenticated;
grant execute on function private.purchase_profile_title(uuid),public.purchase_profile_title(uuid) to authenticated;

-- The clan projection is independent of miniroom sharing and exposes no account/demographic data.
create function private.get_clan_namecards(p_clan_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not exists(select 1 from public.clan_members
    where clan_id = p_clan_id and user_id = auth.uid() and status = 'active') then
    raise exception 'namecard_clan_member_required' using errcode = '42501';
  end if;
  return (select coalesce(jsonb_object_agg(m.user_id,jsonb_build_object(
    'displayName',case when g.slug = 'overwatch' then coalesce(nullif(gp.battle_tag,''),u.nickname)
      else coalesce(nullif(gp.game_uid,''),u.nickname) end,
    'title',(select o.name_ko from public.user_namecard_selections s join public.nameplate_options o on o.id = s.option_id
      where s.user_id = u.id and s.category = 'sub' and o.unlock_source <> 'default'),
    'frame',(select o.code from public.user_namecard_selections s join public.nameplate_options o on o.id = s.option_id
      where s.user_id = u.id and s.category = 'frame'),
    'namebar',(select o.code from public.user_namecard_selections s join public.nameplate_options o on o.id = s.option_id
      where s.user_id = u.id and s.category = 'namebar'),
    'emblem',(select o.code from public.user_namecard_selections s join public.nameplate_options o on o.id = s.option_id
      where s.user_id = u.id and s.category = 'emblem')
  )),'{}'::jsonb)
  from public.clan_members m join public.users u on u.id = m.user_id
    join public.clans c on c.id = m.clan_id join public.games g on g.id = c.game_id
    left join public.user_game_profiles gp on gp.user_id = u.id and gp.game_id = g.id
  where m.clan_id = p_clan_id and m.status = 'active');
end $$;
create function public.get_clan_namecards(p_clan_id uuid) returns jsonb
language sql stable security invoker set search_path = '' as $$ select private.get_clan_namecards(p_clan_id); $$;
revoke all on function private.get_clan_namecards(uuid),public.get_clan_namecards(uuid) from public,anon,authenticated;
grant execute on function private.get_clan_namecards(uuid),public.get_clan_namecards(uuid) to authenticated;
comment on table public.user_namecard_selections is 'Account-wide namecard; sub is a selected title. Legacy purchases remain owned.';
