-- Score edits must pass the live or historical RPC permission checks.
-- Authenticated clients may still update the other explicitly granted
-- prematch fields; service-role fixtures and security-definer RPCs are exempt.
revoke update (ma_snapshot) on public.balance_sessions from authenticated;
