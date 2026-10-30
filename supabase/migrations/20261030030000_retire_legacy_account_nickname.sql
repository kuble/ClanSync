-- Account identity lives in game profiles. No names are copied or backfilled.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  byear int;
  g public.user_gender;
begin
  byear := coalesce((new.raw_user_meta_data->>'birth_year')::int, extract(year from now())::int - 15);
  if byear < 1950 or byear > extract(year from now())::int then
    byear := extract(year from now())::int - 15;
  end if;
  g := case when new.raw_user_meta_data->>'gender' in ('male', 'female', 'undisclosed')
    then (new.raw_user_meta_data->>'gender')::public.user_gender else 'undisclosed'::public.user_gender end;
  insert into public.users (id, email, birth_year, gender, auto_login)
  values (new.id, coalesce(new.email, ''), byear, g,
    coalesce((new.raw_user_meta_data->>'auto_login')::boolean, false));
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop trigger sync_battle_tag_display_name on public.user_game_profiles;
drop function private.sync_battle_tag_display_name();

-- user_game_profiles already has no nickname column. Historical participant
-- names, operator_name and match snapshots remain in their existing fields.
alter table public.users drop column nickname;
notify pgrst, 'reload schema';
