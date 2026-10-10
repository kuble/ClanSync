-- Preserve unrelated tabs and serialize settings changes with permission rechecks.
create or replace function private.save_clan_stats_settings(p_clan_id uuid,p_actor_id uuid,p_scope text,p_patch jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare
  v_role text; v_settings public.clan_settings%rowtype; v_keys text[];
begin
  select role::text into v_role from public.clan_members
    where clan_id=p_clan_id and user_id=p_actor_id and status='active' for share;
  select * into v_settings from public.clan_settings where clan_id=p_clan_id for update;
  if v_role not in ('leader','officer') or v_role is null or v_settings.clan_id is null
    then raise exception 'Settings permission denied' using errcode='42501'; end if;
  if p_scope in ('records','intra') then
    if v_role<>'leader' then raise exception 'Leader required' using errcode='42501'; end if;
    v_keys:=case when p_scope='records' then array['view_match_records','create_match_records','edit_match_records','delete_match_records'] else array['view_intra_stats'] end;
  elsif p_scope in ('hof','personal','all') then
    if jsonb_typeof(v_settings.permissions) is distinct from 'object'
      or not coalesce(case when v_settings.permissions ? 'set_hof_rules' then
        jsonb_typeof(v_settings.permissions->'set_hof_rules')='array' and (v_settings.permissions->'set_hof_rules') ? v_role
        else v_role='leader' end,false)
      then raise exception 'Statistics settings permission denied' using errcode='42501'; end if;
    v_keys:=case when p_scope='personal' then array['member_personal_records','member_personal_audience','member_personal_sections']
      when p_scope='hof' then array['expose_hof','win_rate_visible_top','wins_visible_top','streak_visible_top','prediction_visible_top','participation_visible_top','cumulative_visible_top','monthly_rank_visibility','yearly_rank_visibility','eligibility_game_threshold','eligibility_below_pct','eligibility_above_min_games','eligibility_session_pct']
      else array['member_personal_records','expose_hof','win_rate_visible_top','wins_visible_top','streak_visible_top','prediction_visible_top','participation_visible_top','cumulative_visible_top','monthly_rank_visibility','yearly_rank_visibility','eligibility_game_threshold','eligibility_below_pct','eligibility_above_min_games','eligibility_session_pct'] end;
    if p_patch ? 'expose_hof' and v_role<>'leader' then raise exception 'Leader required' using errcode='42501'; end if;
  else raise exception 'Invalid scope'; end if;
  if jsonb_typeof(p_patch) is distinct from 'object'
    or exists(select 1 from jsonb_object_keys(p_patch) k where not (k=any(v_keys)))
    then raise exception 'Invalid settings'; end if;
  if p_scope in ('records','intra') then
    if exists(select 1 from jsonb_each(p_patch) x where jsonb_typeof(x.value)<>'array'
      or not (x.value ? 'leader') or x.value - array['leader','officer','member'] <> '[]'::jsonb)
      then raise exception 'Invalid roles'; end if;
    update public.clan_settings set permissions=coalesce(v_settings.permissions,'{}')||p_patch,updated_by=p_actor_id where clan_id=p_clan_id;
  else
    update public.clan_settings set hof_config=coalesce(v_settings.hof_config,'{}')||(p_patch-'expose_hof'),
      expose_hof=case when p_patch ? 'expose_hof' then (p_patch->>'expose_hof')::boolean else expose_hof end,
      updated_by=p_actor_id where clan_id=p_clan_id;
  end if;
end;
$$;
revoke all on function private.save_clan_stats_settings(uuid,uuid,text,jsonb) from public,anon,authenticated;

create or replace function public.save_clan_stats_settings(p_clan_id uuid,p_actor_id uuid,p_scope text,p_patch jsonb)
returns void language sql security invoker set search_path='' as $$
  select private.save_clan_stats_settings(p_clan_id,p_actor_id,p_scope,p_patch);
$$;
revoke all on function public.save_clan_stats_settings(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function private.save_clan_stats_settings(uuid,uuid,text,jsonb) to service_role;
grant execute on function public.save_clan_stats_settings(uuid,uuid,text,jsonb) to service_role;
