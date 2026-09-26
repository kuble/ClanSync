-- Threads are identified by clan, ranking category and all / YYYY / YYYY-MM.
create function public.can_access_hof_comments(p_clan_id uuid, p_ranking text, p_period_key text)
returns boolean language plpgsql stable security invoker set search_path = '' as $$
declare
  cfg jsonb;
  top_value jsonb;
  current_month text := to_char(now() at time zone 'Asia/Seoul', 'YYYY-MM');
begin
  if not public.is_active_clan_member(p_clan_id)
    or p_ranking not in ('rate', 'attendance', 'appearances', 'prediction')
    or p_period_key !~ '^(all|[1-9][0-9]{3}(-(0[1-9]|1[0-2]))?)$'
    or p_ranking is null or p_period_key is null then return false; end if;
  if p_period_key <> 'all' and p_period_key > left(current_month, length(p_period_key)) then return false; end if;
  if public.is_clan_officer_plus(p_clan_id) then return true; end if;
  select hof_config into cfg from public.clan_settings where clan_id = p_clan_id;
  cfg := coalesce(cfg, '{}'::jsonb);
  top_value := cfg -> case p_ranking
    when 'rate' then 'win_rate_visible_top'
    when 'attendance' then 'participation_visible_top'
    when 'appearances' then 'cumulative_visible_top'
    else 'prediction_visible_top' end;
  if top_value is null or top_value not in ('0'::jsonb, '3'::jsonb, '5'::jsonb, '10'::jsonb, '20'::jsonb, '999'::jsonb) then
    top_value := case when p_ranking = 'prediction' then '0'::jsonb else '10'::jsonb end;
  end if;
  return top_value <> '0'::jsonb
    and not (p_period_key = current_month and coalesce(cfg ->> 'monthly_rank_visibility', 'always') = 'month_start')
    and not (p_period_key = left(current_month, 4) and coalesce(cfg ->> 'yearly_rank_visibility', 'always') = 'year_start');
end;
$$;
revoke all on function public.can_access_hof_comments(uuid, text, text) from public, anon;
grant execute on function public.can_access_hof_comments(uuid, text, text) to authenticated, service_role;

create table public.clan_hof_comments (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans(id) on delete cascade,
  ranking text not null check (ranking in ('rate', 'attendance', 'appearances', 'prediction')),
  period_key text not null check (period_key ~ '^(all|[1-9][0-9]{3}(-(0[1-9]|1[0-2]))?)$'),
  content text not null check (char_length(content) <= 500 and content ~ '[^[:space:]]'),
  author_id uuid default auth.uid() references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index clan_hof_comments_thread_idx on public.clan_hof_comments (clan_id, ranking, period_key, created_at desc, id desc);
create index clan_hof_comments_author_idx on public.clan_hof_comments (author_id);
alter table public.clan_hof_comments enable row level security;
revoke all on public.clan_hof_comments from public, anon, authenticated;
grant all on public.clan_hof_comments to service_role;
grant select, delete on public.clan_hof_comments to authenticated;
-- Authenticated clients cannot forge authors, timestamps or relocate comments.
grant insert (clan_id, ranking, period_key, content) on public.clan_hof_comments to authenticated;
create policy hof_comments_read on public.clan_hof_comments for select to authenticated
  using (public.can_access_hof_comments(clan_id, ranking, period_key));
create policy hof_comments_create on public.clan_hof_comments for insert to authenticated
  with check (author_id = (select auth.uid()) and public.can_access_hof_comments(clan_id, ranking, period_key));
create policy hof_comments_delete on public.clan_hof_comments for delete to authenticated
  using (public.can_access_hof_comments(clan_id, ranking, period_key)
    and (author_id = (select auth.uid()) or public.is_clan_officer_plus(clan_id)));
