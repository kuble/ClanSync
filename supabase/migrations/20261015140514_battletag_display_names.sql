-- Names may repeat. Provider ID, full BattleTag, and participant UUID have different jobs.
drop index public.users_nickname_key;
alter table public.user_game_profiles add column battle_tag text;
alter table public.user_game_profiles add constraint user_game_profiles_battle_tag_format
  check (battle_tag is null or (
    char_length(split_part(battle_tag, '#', 1)) between 2 and 20
    and battle_tag ~ '^[^#[:space:][:cntrl:]]+#[0-9]{4,10}$'
  ));
create unique index user_game_profiles_verified_battle_tag_key
  on public.user_game_profiles (game_id, lower(battle_tag))
  where is_verified and battle_tag is not null;
comment on column public.user_game_profiles.battle_tag is
  'Provider display tag, e.g. AimZero#12345. Server-written; never replaces stable game_uid. NULL preserves legacy profiles.';

-- No backfill: existing QA users and game profiles remain unchanged.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  nick text;
  byear int;
  g public.user_gender;
begin
  nick := coalesce(nullif(left(trim(new.raw_user_meta_data->>'nickname'), 20), ''), '새 회원');
  byear := coalesce((new.raw_user_meta_data->>'birth_year')::int, extract(year from now())::int - 15);
  if byear < 1950 or byear > extract(year from now())::int then
    byear := extract(year from now())::int - 15;
  end if;
  g := case when new.raw_user_meta_data->>'gender' in ('male', 'female', 'undisclosed')
    then (new.raw_user_meta_data->>'gender')::public.user_gender else 'undisclosed'::public.user_gender end;
  insert into public.users (id, nickname, email, birth_year, gender, auto_login)
  values (new.id, nick, coalesce(new.email, ''), byear, g,
    coalesce((new.raw_user_meta_data->>'auto_login')::boolean, false));
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Provider proof is already server-only. Sync display name in the same transaction.
create function private.sync_battle_tag_display_name()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.is_verified and new.battle_tag is not null
    and exists (select 1 from public.games where id = new.game_id and slug = 'overwatch') then
    update public.users set nickname = split_part(new.battle_tag, '#', 1)
    where id = new.user_id and nickname is distinct from split_part(new.battle_tag, '#', 1);
  end if;
  return new;
end;
$$;
revoke all on function private.sync_battle_tag_display_name() from public, anon, authenticated;
create trigger sync_battle_tag_display_name
  after insert or update of battle_tag, is_verified on public.user_game_profiles
  for each row execute function private.sync_battle_tag_display_name();

-- Public display names now come from the verified game account, not a profile edit.
revoke update (nickname) on public.users from authenticated;
