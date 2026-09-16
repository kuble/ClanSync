-- Flash rooms keep live rounds only. Closing the series atomically removes
-- the room, rounds, preferences, votes and RSVPs through existing cascade FKs.
create function private.discard_closed_flash_series() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists(select 1 from public.balance_rooms where series_id = new.id and kind = 'flash') then
    delete from public.balance_session_series where id = new.id;
  end if;
  return new;
end $$;
revoke all on function private.discard_closed_flash_series() from public, anon, authenticated;
create trigger z_discard_closed_flash_series
after update of closed_at on public.balance_session_series
for each row when (old.closed_at is null and new.closed_at is not null)
execute function private.discard_closed_flash_series();

-- Flash results must not leave permanent reward/coin ledger entries.
-- Preserve the established outcome validation and regular-room settlement.
do $$
declare definition text; marker text := '  if p_outcome = ''team1''::public.balance_match_outcome then';
begin
  definition := pg_get_functiondef('public.set_balance_match_outcome(uuid,public.balance_match_outcome)'::regprocedure);
  if position(marker in definition) = 0 then raise exception 'Outcome patch drift'; end if;
  execute replace(definition, marker,
    '  if exists(select 1 from public.balance_rooms where series_id = v_sess.series_id and kind = ''flash'') then
    v_tier := null;
  end if;
' || marker);
end $$;

-- Only future closes are purged here; never touch an active QA room or roster.
