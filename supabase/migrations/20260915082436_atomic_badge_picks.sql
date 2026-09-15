-- A badge strip is replaced in one transaction. An invalid later badge must
-- roll back both the deletion and any earlier inserts.
create function public.save_my_badge_picks(
  p_game_id uuid,
  p_ordered_badge_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if p_game_id is null
     or p_ordered_badge_ids is null
     or coalesce(array_ndims(p_ordered_badge_ids), 1) <> 1
     or cardinality(p_ordered_badge_ids) > 5 then
    raise exception 'invalid badge selection' using errcode = '22023';
  end if;

  if exists (
    select 1 from unnest(p_ordered_badge_ids) as picked(badge_id)
     where picked.badge_id is null
  ) or cardinality(p_ordered_badge_ids) <> (
    select count(distinct picked.badge_id)
      from unnest(p_ordered_badge_ids) as picked(badge_id)
  ) then
    raise exception 'badge selection must contain unique badge IDs' using errcode = '22023';
  end if;

  -- Lock an existing parent even when the strip has no rows. The invoker's
  -- profile SELECT/UPDATE policies apply; no additional table grants are needed.
  perform u.id from public.users u
   where u.id = v_user_id
   for no key update;
  if not found then
    raise exception 'user profile not found' using errcode = '42501';
  end if;

  delete from public.user_badge_picks
   where user_id = v_user_id and game_id = p_game_id;

  -- The existing trigger checks active catalog entries, game, ownership and
  -- always-unlocked achievements. Any exception aborts the entire RPC.
  insert into public.user_badge_picks (user_id, game_id, slot_index, badge_id)
  select v_user_id, p_game_id, (picked.position - 1)::integer, picked.badge_id
    from unnest(p_ordered_badge_ids) with ordinality as picked(badge_id, position)
   order by picked.position;
end;
$$;

revoke all on function public.save_my_badge_picks(uuid, uuid[]) from public, anon, authenticated, service_role;
grant execute on function public.save_my_badge_picks(uuid, uuid[]) to authenticated;

comment on function public.save_my_badge_picks(uuid, uuid[]) is
  'Atomically replace the authenticated user''s ordered badge strip; existing RLS and unlock checks apply.';
