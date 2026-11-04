-- Reserve a short window for the Discord HTTP request after the unlink commits.
create table private.discord_bot_departures (
  guild_id text primary key,
  expires_at timestamptz not null
);
revoke all on private.discord_bot_departures from public, anon, authenticated;
grant select, insert, update, delete on private.discord_bot_departures to service_role;

create function private.guard_discord_bot_departure()
returns trigger language plpgsql set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.guild_id, 713));
  if exists (select 1 from private.discord_bot_departures
    where guild_id = new.guild_id and expires_at > clock_timestamp()) then
    raise exception 'Discord bot is leaving this guild; retry the connection shortly';
  end if;
  return new;
end $$;

create trigger guard_discord_bot_departure before insert or update of guild_id
on public.clan_discord_connections for each row execute function private.guard_discord_bot_departure();

create function public.disconnect_clan_discord_and_check_departure(p_clan_id uuid, p_actor_id uuid, p_guild_id text)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare was_connected boolean;
begin
  perform 1 from public.clan_settings where clan_id = p_clan_id for update;
  perform pg_advisory_xact_lock(hashtextextended(p_guild_id, 713));
  select exists(select 1 from public.clan_discord_connections
    where clan_id = p_clan_id and guild_id = p_guild_id) into was_connected;
  perform public.disconnect_clan_discord_bot(p_clan_id, p_actor_id, p_guild_id);
  if not was_connected or exists(select 1 from public.clan_discord_connections where guild_id = p_guild_id) then
    return false;
  end if;
  delete from private.discord_bot_departures where expires_at <= clock_timestamp();
  insert into private.discord_bot_departures values (p_guild_id, clock_timestamp() + interval '30 seconds');
  return true;
end $$;

revoke all on function public.disconnect_clan_discord_and_check_departure(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.disconnect_clan_discord_and_check_departure(uuid,uuid,text) to service_role;
