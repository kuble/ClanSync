-- M6c — 5v5 배치(탱1·딜2·힐2 × 양팀) roster JSONB + 멤버 풀 RPC
-- public.users 는 self_select 만 있어 같은 클랜 닉네임 목록은 RPC 로만 제공한다.

alter table public.balance_sessions
  add column roster jsonb not null default jsonb_build_object(
    'team1',
    jsonb_build_object(
      'tank', null,
      'dmg', jsonb_build_array(null, null),
      'sup', jsonb_build_array(null, null)
    ),
    'team2',
    jsonb_build_object(
      'tank', null,
      'dmg', jsonb_build_array(null, null),
      'sup', jsonb_build_array(null, null)
    )
  );

comment on column public.balance_sessions.roster is
  '5v5 배치: { team1|team2: { tank: uuid?, dmg: [uuid?,uuid?], sup: [uuid?,uuid?] } }';

create or replace function public.list_balance_roster_pool(p_clan_id uuid)
returns table (user_id uuid, nickname varchar)
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select u.id, u.nickname::varchar
    from public.clan_members cm
    join public.users u on u.id = cm.user_id
   where cm.clan_id = p_clan_id
     and cm.status = 'active'
     and public.is_active_clan_member(p_clan_id)
   order by u.nickname asc;
$$;

revoke all on function public.list_balance_roster_pool(uuid) from public;
grant execute on function public.list_balance_roster_pool(uuid) to authenticated;
