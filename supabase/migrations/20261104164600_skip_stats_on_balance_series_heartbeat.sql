-- Roster, map and ballot writes touch the parent series for idle-room expiry.
-- A heartbeat changes neither the historical records nor their reporting period.
do $migration$
declare
  definition text := pg_get_functiondef('private.clan_stats_changed()'::regprocedure);
  anchor text := '  if TG_OP=''INSERT'' then';
  guard text := $guard$
  if TG_TABLE_NAME='balance_session_series' and TG_OP='UPDATE' then
    if not exists (
      select 1 from old_rows o full join new_rows n using (id)
      where (to_jsonb(o) - 'last_activity_at') is distinct from (to_jsonb(n) - 'last_activity_at')
    ) then return null; end if;
  end if;
$guard$;
begin
  if strpos(definition, anchor)=0 then
    raise exception 'Unexpected clan stats trigger definition';
  end if;
  execute replace(definition, anchor, guard || anchor);
end
$migration$;
