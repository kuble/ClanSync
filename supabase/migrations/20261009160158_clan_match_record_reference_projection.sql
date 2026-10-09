-- Full/reference and management reads must apply the same corrections as the
-- indexed interactive read model. Never expose deleted source snapshots to users.
grant select on private.clan_match_record_corrections to service_role;
create function public.read_clan_match_record_corrections(p_clan_id uuid)
returns table(id uuid,payload jsonb,deleted boolean)
language sql stable security invoker set search_path='' as $$
  select c.id,c.payload,c.deleted from private.clan_match_record_corrections c
    where c.clan_id=p_clan_id order by c.id;
$$;
revoke all on function public.read_clan_match_record_corrections(uuid) from public,anon,authenticated;
grant execute on function public.read_clan_match_record_corrections(uuid) to service_role;
