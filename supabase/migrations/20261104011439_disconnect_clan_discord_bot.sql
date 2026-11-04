create function public.disconnect_clan_discord_bot(p_clan_id uuid, p_actor_id uuid, p_guild_id text)
returns void language plpgsql security invoker set search_path = '' as $$
declare current_guild text;
begin
  perform 1 from public.clan_members
    where clan_id = p_clan_id and user_id = p_actor_id and role = 'leader' and status = 'active' for share;
  if not found then raise exception 'Leader required' using errcode = '42501'; end if;

  -- Serialize with the connect and preferences functions in the same lock order.
  perform 1 from public.clan_settings where clan_id = p_clan_id for update;
  select guild_id into current_guild from public.clan_discord_connections where clan_id = p_clan_id for update;
  if not found then return; end if;
  if current_guild is distinct from p_guild_id then raise exception 'Discord connection changed'; end if;

  update public.notification_log n set status = 'cancelled', updated_at = now()
    from private.discord_notification_targets t
    where t.log_id = n.id and t.clan_id = p_clan_id and n.status in ('scheduled','processing');
  delete from public.clan_discord_connections where clan_id = p_clan_id;
  update public.clan_settings
    set event_notify = (event_notify - 'discord_routes') || '{"discord_enabled":false,"discord_configured":false}'::jsonb,
        updated_by = p_actor_id where clan_id = p_clan_id;
end $$;

revoke all on function public.disconnect_clan_discord_bot(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.disconnect_clan_discord_bot(uuid,uuid,text) to service_role;
