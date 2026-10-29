-- Stop if a client repopulated the retired feature after cleanup.
do $$
begin
  if exists (select 1 from public.account_profile_photos) then
    raise exception 'Clean up account profile photo records before retiring the table';
  end if;
end;
$$;

-- No CASCADE: unexpected dependencies must fail instead of being removed.
drop table public.account_profile_photos;
-- The empty profile-photos bucket is retired through the Storage API.
