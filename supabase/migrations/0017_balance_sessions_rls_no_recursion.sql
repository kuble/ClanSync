-- balance_sessions / map_votes RLS 가 clan_members EXISTS 를 쓰면
-- clan_members_same_clan_select 와 중첩되어 무한 재귀(42P17)가 난다.
-- SECURITY DEFINER 로 clan_members 를 직접 읽어 검증한다.

create or replace function public.is_active_clan_member(p_clan_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
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

revoke all on function public.is_active_clan_member(uuid) from public;
revoke all on function public.is_clan_officer_plus(uuid) from public;
grant execute on function public.is_active_clan_member(uuid) to authenticated;
grant execute on function public.is_clan_officer_plus(uuid) to authenticated;

drop policy if exists balance_sessions_select_member on public.balance_sessions;
drop policy if exists balance_sessions_insert_officer on public.balance_sessions;
drop policy if exists balance_sessions_update_officer on public.balance_sessions;

create policy balance_sessions_select_member on public.balance_sessions
  for select using (public.is_active_clan_member(clan_id));

create policy balance_sessions_insert_officer on public.balance_sessions
  for insert with check (
    auth.uid() = host_user_id
    and public.is_clan_officer_plus(clan_id)
  );

create policy balance_sessions_update_officer on public.balance_sessions
  for update using (public.is_clan_officer_plus(clan_id))
  with check (public.is_clan_officer_plus(clan_id));

drop policy if exists balance_map_votes_select_member on public.balance_session_map_votes;
drop policy if exists balance_map_votes_insert_self on public.balance_session_map_votes;
drop policy if exists balance_map_votes_update_self on public.balance_session_map_votes;

create policy balance_map_votes_select_member on public.balance_session_map_votes
  for select using (
    public.is_active_clan_member(
      (
        select bs.clan_id
          from public.balance_sessions bs
         where bs.id = balance_session_map_votes.session_id
         limit 1
      )
    )
  );

create policy balance_map_votes_insert_self on public.balance_session_map_votes
  for insert with check (
    auth.uid() = user_id
    and public.is_active_clan_member(
      (
        select bs.clan_id
          from public.balance_sessions bs
         where bs.id = session_id
         limit 1
      )
    )
  );

create policy balance_map_votes_update_self on public.balance_session_map_votes
  for update using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and public.is_active_clan_member(
      (
        select bs.clan_id
          from public.balance_sessions bs
         where bs.id = session_id
         limit 1
      )
    )
  );
