create or replace function private.sync_clan_stats_records(p_ids uuid[]) returns void
language plpgsql security definer set search_path = '' set plan_cache_mode = 'force_custom_plan' as $$
begin
  delete from private.clan_stats_records where id = any(p_ids);
  insert into private.clan_stats_records
  select m.id, m.clan_id, 'match', null, m.played_at, m.played_at,
    to_char(m.played_at at time zone 'Asia/Seoul', 'YYYY-MM-DD'), m.match_type::text,
    case when res.match_id is null then 'unrecorded' when res.winner_team=1 then 'team1'
      when res.winner_team=2 then 'team2' else 'draw' end,
    m.map_label, coalesce(p.players,'[]'), coalesce(p.ids,'{}'),
    jsonb_build_object('id',m.id,'played_at',m.played_at,'status',m.status,
      'match_type',m.match_type,'map_label',m.map_label,'match_players',coalesce(p.players,'[]'),
      'match_results',case when res.match_id is null then null else jsonb_build_object('winner_team',res.winner_team) end)
  from public.matches m left join public.match_results res on res.match_id=m.id
  left join lateral (
    select jsonb_agg(jsonb_build_object('user_id',user_id,'team',team) order by mp.id) players,
      array_agg(user_id::text order by mp.id) ids
    from public.match_players mp where mp.match_id=m.id
  ) p on true where m.id=any(p_ids) and m.status='finished'
  union all
  select s.id,s.clan_id,'balance',s.series_id,ss.opened_at,
    coalesce(s.predictions_settled_at,s.closed_at,s.opened_at),
    to_char(ss.opened_at at time zone 'Asia/Seoul','YYYY-MM-DD'),'intra',s.match_outcome::text,
    s.resolved_map_label,coalesce(p.players,'[]'),coalesce(p.ids,'{}'),
    jsonb_build_object('id',s.id,'series_id',s.series_id,'opened_at',s.opened_at,'closed_at',s.closed_at,
      'predictions_settled_at',s.predictions_settled_at,'resolved_map_label',s.resolved_map_label,
      'roster',s.roster,'ma_snapshot',s.ma_snapshot,'match_outcome',s.match_outcome,
      'banned_heroes',s.banned_heroes,'hero_ban_enabled',s.hero_ban_enabled,'map_candidates',s.map_candidates,
      'balance_session_series',jsonb_build_object('opened_at',ss.opened_at),
      'balance_session_map_votes',(select coalesce(jsonb_agg(jsonb_build_object('choice_idx',v.choice_idx)),'[]') from public.balance_session_map_votes v where v.session_id=s.id))
  from public.balance_sessions s join public.balance_session_series ss on ss.id=s.series_id
  join public.balance_rooms room on room.series_id=ss.id and room.kind='regular'
  left join lateral (
    select jsonb_agg(jsonb_build_object('user_id',slot.uid,'team',slot.team) order by slot.ord) players,
      array_agg(slot.uid order by slot.ord) ids
    from (values
      (s.roster#>>'{team1,tank}',1,1),(s.roster#>>'{team1,dmg,0}',1,2),(s.roster#>>'{team1,dmg,1}',1,3),
      (s.roster#>>'{team1,sup,0}',1,4),(s.roster#>>'{team1,sup,1}',1,5),
      (s.roster#>>'{team2,tank}',2,6),(s.roster#>>'{team2,dmg,0}',2,7),(s.roster#>>'{team2,dmg,1}',2,8),
      (s.roster#>>'{team2,sup,0}',2,9),(s.roster#>>'{team2,sup,1}',2,10)
    ) slot(uid,team,ord) where nullif(slot.uid,'') is not null
  ) p on true
  where s.id=any(p_ids) and s.match_outcome<>'pending'
    and not exists(select 1 from public.matches m where m.id=s.id and m.clan_id=s.clan_id);
end;
$$;

-- Clan sizes and import batches differ by orders of magnitude. Do not reuse
-- a generic single-row plan for a 250-match batch (or vice versa).
alter function private.refresh_clan_stats(uuid,text[]) set plan_cache_mode='force_custom_plan';
alter function private.clan_stats_changed() set plan_cache_mode='force_custom_plan';

create or replace function public.read_clan_stats_records(p_clan_id uuid,p_day text default null,p_user_id uuid default null,p_offset int default 0)
returns table(source text,payload jsonb) language plpgsql stable security invoker set search_path='' as $$
begin
  if p_day is not null then
    return query select r.source,r.payload from private.clan_stats_records r
      where r.clan_id=p_clan_id and r.day=p_day and (p_user_id is null or r.user_ids @> array[p_user_id::text])
      order by r.occurred_at desc,r.id desc limit 500 offset greatest(p_offset,0);
  elsif p_user_id is not null then
    return query select r.source,r.payload from private.clan_stats_records r
      where r.clan_id=p_clan_id and r.user_ids @> array[p_user_id::text]
      order by r.occurred_at desc,r.id desc limit 500 offset greatest(p_offset,0);
  end if;
end;
$$;
