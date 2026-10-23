-- Match the directory's historical eligibility; deleted periods have no awards.
create or replace function private.pending_clan_personal_emblem_awards(p_limit integer default 20)
returns table(clan_id uuid) language sql stable security definer set search_path='' as $$
  with current_period as (select to_char(now() at time zone 'Asia/Seoul','YYYY-MM') month_key,
    to_char(now() at time zone 'Asia/Seoul','YYYY') year_key), candidates as (
    select p.clan_id,case when length(p.period)=4 then 'year' else 'month' end period_type,p.period period_key
      from private.clan_stats_periods p cross join current_period c
      where ((p.period ~ '^[0-9]{4}$' and p.period<c.year_key)
        or (p.period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$' and p.period<c.month_key))
        and (p.data#>>'{totals,days}')::integer>0
    union select c.id,'month',to_char((now() at time zone 'Asia/Seoul')-interval '1 month','YYYY-MM') from public.clans c
    union select c.id,'year',to_char((now() at time zone 'Asia/Seoul')-interval '1 year','YYYY') from public.clans c
  ) select distinct c.clan_id from candidates c where not exists(
    select 1 from public.clan_personal_emblem_award_periods a
    where a.clan_id=c.clan_id and a.period_type=c.period_type and a.period_key=c.period_key)
    and not exists(select 1 from public.balance_session_series s join public.balance_rooms r on r.series_id=s.id
      where s.clan_id=c.clan_id and r.kind='regular' and s.closed_at is null and r.status<>'closed'
        and to_char(s.opened_at at time zone 'Asia/Seoul',case c.period_type when 'year' then 'YYYY' else 'YYYY-MM' end)=c.period_key)
  order by c.clan_id limit greatest(1,least(100,coalesce(p_limit,20)));
$$;
