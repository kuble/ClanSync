-- The fallback subscriber and every prematch CAS share this revision. Run after
-- the formation guard so it can still distinguish a direct roster edit from a
-- trusted formation commit without granting revision writes to clients.
create function private.bump_balance_prematch_revision() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.formation_revision = old.formation_revision and (
    new.phase is distinct from old.phase or
    new.map_candidates is distinct from old.map_candidates or
    new.resolved_map_label is distinct from old.resolved_map_label or
    new.map_ban_deadline_at is distinct from old.map_ban_deadline_at or
    new.hero_ban_deadline_at is distinct from old.hero_ban_deadline_at or
    new.banned_heroes is distinct from old.banned_heroes
  ) then new.formation_revision := old.formation_revision + 1; end if;
  return new;
end $$;
revoke all on function private.bump_balance_prematch_revision() from public,anon,authenticated;
create trigger guard_balance_zz_prematch_revision before update on public.balance_sessions
for each row execute function private.bump_balance_prematch_revision();
