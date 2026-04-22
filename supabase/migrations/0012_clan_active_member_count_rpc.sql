-- M7 — 공개 순위·홍보 "여유" 정렬용 활성 멤버 수 (RLS 우회, 집계만 노출)

create or replace function public.clan_active_member_counts(p_clan_ids uuid[])
returns table (clan_id uuid, n bigint)
language sql
stable
security definer
set search_path = public
as $$
  select cm.clan_id, count(*)::bigint
    from public.clan_members cm
   where cm.clan_id = any(p_clan_ids)
     and cm.status = 'active'
   group by cm.clan_id;
$$;

comment on function public.clan_active_member_counts(uuid[]) is
  'M7 D-RANK-01: 클랜별 active 멤버 수. 인증 사용자 호출.';

grant execute on function public.clan_active_member_counts(uuid[]) to authenticated;
