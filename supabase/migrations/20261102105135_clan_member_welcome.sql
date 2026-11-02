alter table public.clan_members add column welcome_completed_at timestamptz;

-- Existing memberships must not receive a new-member prompt retroactively.
update public.clan_members set welcome_completed_at = now();

create function public.complete_clan_welcome(p_clan_id uuid, p_joined_at timestamptz)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare changed integer;
begin
  update public.clan_members
  set welcome_completed_at = clock_timestamp()
  where clan_id = p_clan_id and user_id = (select auth.uid())
    and status = 'active' and coalesce(joined_at, created_at) = p_joined_at;
  get diagnostics changed = row_count;
  return changed = 1;
end;
$$;

revoke all on function public.complete_clan_welcome(uuid, timestamptz) from public, anon;
grant execute on function public.complete_clan_welcome(uuid, timestamptz) to authenticated;
