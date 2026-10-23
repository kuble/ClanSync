alter table public.user_game_profiles add column riot_id text check (riot_id is null or riot_id ~ '^[^#[:cntrl:]]{3,16}#[[:alnum:]]{3,5}$');
comment on column public.user_game_profiles.riot_id is 'Provider-verified Riot display ID; game_uid remains the stable provider ID. No QA backfill.';
create or replace function private.get_clan_namecards(p_clan_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not exists(select 1 from public.clan_members
    where clan_id = p_clan_id and user_id = auth.uid() and status = 'active') then
    raise exception 'namecard_clan_member_required' using errcode = '42501';
  end if;
  return (select coalesce(jsonb_object_agg(m.user_id,jsonb_build_object(
    'displayName',case when g.slug = 'overwatch' then coalesce(nullif(gp.battle_tag,''),u.nickname)
      when g.slug in ('valorant','lol') then coalesce(nullif(gp.riot_id,''),u.nickname)
      else u.nickname end,
    'title',(select o.name_ko from public.user_namecard_selections s join public.nameplate_options o on o.id = s.option_id
      where s.user_id = u.id and s.category = 'sub' and o.unlock_source <> 'default'),
    'frame',(select o.code from public.user_namecard_selections s join public.nameplate_options o on o.id = s.option_id
      where s.user_id = u.id and s.category = 'frame'),
    'namebar',(select o.code from public.user_namecard_selections s join public.nameplate_options o on o.id = s.option_id
      where s.user_id = u.id and s.category = 'namebar'),
    'emblem',(select o.code from public.user_namecard_selections s join public.nameplate_options o on o.id = s.option_id
      where s.user_id = u.id and s.category = 'emblem')
  )),'{}'::jsonb)
  from public.clan_members m join public.users u on u.id = m.user_id
    join public.clans c on c.id = m.clan_id join public.games g on g.id = c.game_id
    left join public.user_game_profiles gp on gp.user_id = u.id and gp.game_id = g.id
  where m.clan_id = p_clan_id and m.status = 'active');
end $$;
