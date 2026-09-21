-- A newly opened room starts with the last settings used by this clan in a
-- regular room. Flash rooms may consume those defaults, but never become the
-- source for later rooms. Runtime state and roster-bound captains stay local.
create or replace function private.copy_balance_formation_settings() returns trigger
language plpgsql set search_path = '' as $$
declare
  v_previous public.balance_sessions%rowtype;
begin
  if new.round_number > 1 then
    select * into v_previous
      from public.balance_sessions
      where series_id = new.series_id and round_number = new.round_number - 1;
  elsif exists (
    select 1 from public.balance_rooms where id = new.series_id
  ) then
    select s.* into v_previous
      from public.balance_sessions s
      join public.balance_rooms r on r.id = s.series_id
      where s.clan_id = new.clan_id
        and s.game_id = new.game_id
        and s.series_id <> new.series_id
        and r.kind = 'regular'
      order by s.opened_at desc, s.round_number desc, s.id desc
      limit 1;
  end if;

  if found then
    new.formation_settings := coalesce(v_previous.formation_settings, '{}'::jsonb) - 'captains';
    new.map_ban_enabled := v_previous.map_ban_enabled;
    new.hero_ban_enabled := v_previous.hero_ban_enabled;
    new.map_ban_seconds := v_previous.map_ban_seconds;
    new.hero_ban_seconds := v_previous.hero_ban_seconds;
    new.map_types := v_previous.map_types;
    new.hero_bans_per_team := v_previous.hero_bans_per_team;
  end if;
  return new;
end $$;

