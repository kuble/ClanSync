-- The existing balance_sessions UPDATE RLS still limits writes to round managers.
-- Only grant the new result column; rule changes continue through the settings RPC.
grant update (hero_ban_context) on public.balance_sessions to authenticated;
