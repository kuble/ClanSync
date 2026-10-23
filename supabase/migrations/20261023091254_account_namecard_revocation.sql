-- Existing purchase voids revoke inventory; clear the account-wide appearance too.
create function private.revoke_account_namecard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.user_namecard_selections where user_id = old.user_id and option_id = old.option_id;
  return old;
end $$;
revoke all on function private.revoke_account_namecard() from public,anon,authenticated;
create trigger revoke_account_namecard after delete on public.user_nameplate_inventory
  for each row execute function private.revoke_account_namecard();
create unique index user_game_profiles_verified_riot_id_key on public.user_game_profiles(game_id,lower(riot_id))
  where is_verified and riot_id is not null;
