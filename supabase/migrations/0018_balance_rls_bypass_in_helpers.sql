-- SECURITY DEFINER 만으로는 환경에 따라 함수 본문의 clan_members SELECT 에 RLS 가 남을 수 있어
-- clan_members_same_clan_select 와 다시 맞물린다. SET row_security = off 로 확실히 끊는다.
-- 맵 투표 정책의 balance_sessions 스칼라 서브쿼리도 헬퍼로 흡수해 정책식을 단순화한다.

create or replace function public.is_active_clan_member(p_clan_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
      from public.clan_members cm
     where cm.clan_id = p_clan_id
       and cm.user_id = auth.uid()
       and cm.status = 'active'
  );
$$;

create or replace function public.is_clan_officer_plus(p_clan_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
      from public.clan_members cm
     where cm.clan_id = p_clan_id
       and cm.user_id = auth.uid()
       and cm.status = 'active'
       and cm.role in ('leader', 'officer')
  );
$$;

create or replace function public.is_member_of_balance_session(p_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
      from public.balance_sessions bs
      join public.clan_members cm on cm.clan_id = bs.clan_id
     where bs.id = p_session_id
       and cm.user_id = auth.uid()
       and cm.status = 'active'
  );
$$;

revoke all on function public.is_active_clan_member(uuid) from public;
revoke all on function public.is_clan_officer_plus(uuid) from public;
revoke all on function public.is_member_of_balance_session(uuid) from public;
grant execute on function public.is_active_clan_member(uuid) to authenticated;
grant execute on function public.is_clan_officer_plus(uuid) to authenticated;
grant execute on function public.is_member_of_balance_session(uuid) to authenticated;

drop policy if exists balance_map_votes_select_member on public.balance_session_map_votes;
drop policy if exists balance_map_votes_insert_self on public.balance_session_map_votes;
drop policy if exists balance_map_votes_update_self on public.balance_session_map_votes;

create policy balance_map_votes_select_member on public.balance_session_map_votes
  for select using (public.is_member_of_balance_session(session_id));

create policy balance_map_votes_insert_self on public.balance_session_map_votes
  for insert with check (
    auth.uid() = user_id
    and public.is_member_of_balance_session(session_id)
  );

create policy balance_map_votes_update_self on public.balance_session_map_votes
  for update using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and public.is_member_of_balance_session(session_id)
  );
