-- Role-specific counters from the same corrected records as the overall rankings.
create function public.read_clan_stats_role_players(p_clan_id uuid, p_period text, p_role text)
returns jsonb language sql stable security invoker set search_path = '' as $$
  with appearances as (
    select r.id, r.day, r.series_id, r.occurred_at, r.outcome, player.uid,
      r.outcome = 'team' || player.team as win
    from private.clan_stats_records r
    cross join lateral (
      select distinct on (uid) uid, team, role from (
        select p->>'user_id' uid, p->>'team' team, p->>'role' role, ord
        from jsonb_array_elements(r.players) with ordinality as saved(p, ord)
        where r.source = 'match'
        union all
        select r.payload->'roster'->('team' || t.team) #>> slot.path, t.team, slot.path[1], ord
        from (values ('1'), ('2')) t(team)
        cross join (values (array['tank'],1), (array['dmg','0'],2), (array['dmg','1'],3),
          (array['sup','0'],4), (array['sup','1'],5)) slot(path,ord)
        where r.source = 'balance'
      ) slots where nullif(uid,'') is not null order by uid, team desc, ord desc
    ) player
    where r.clan_id = p_clan_id and r.match_type = 'intra' and r.outcome in ('team1','team2','draw')
      and (p_period = 'all' or left(r.day, length(p_period)) = p_period)
      and player.role = p_role
  ), runs as (
    select a.*, count(*) filter (where not win) over (partition by uid order by occurred_at,id) as run
    from appearances a
  ), games as (
    select runs.*, count(*) filter (where win) over (partition by uid,run) as streak from runs
  ), regular_sessions as (
    select s.id from public.balance_session_series s
    where s.clan_id = p_clan_id and exists (select 1 from public.balance_rooms b where b.series_id = s.id and b.kind = 'regular')
      and (p_period = 'all' or left(to_char(s.opened_at at time zone 'Asia/Seoul','YYYY-MM-DD'),length(p_period)) = p_period)
  ), members as (
    select uid as "userId", count(*) played, count(*) filter (where win) wins,
      count(*) filter (where outcome = 'draw') draws, count(*) filter (where not win and outcome <> 'draw') losses,
      count(distinct day) days, count(distinct s.id) sessions, max(streak) longest, max(occurred_at) as "lastPlayedAt"
    from games left join regular_sessions s on s.id = games.series_id group by uid
  )
  select coalesce(jsonb_agg(to_jsonb(members)), '[]'::jsonb) from members;
$$;
revoke all on function public.read_clan_stats_role_players(uuid,text,text) from public, anon, authenticated;
grant execute on function public.read_clan_stats_role_players(uuid,text,text) to service_role;
