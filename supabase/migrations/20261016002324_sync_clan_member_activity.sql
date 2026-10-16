-- Visits already recorded person-days, but never refreshed the timestamp used
-- by member management's 30/60-day activity classification.
create or replace function public.record_clan_activity(p_clan_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_now timestamptz := now();
  v_day date := timezone('Asia/Seoul', v_now)::date;
begin
  if v_uid is null then
    return;
  end if;

  perform 1 from public.clan_members
   where clan_id = p_clan_id and user_id = v_uid and status = 'active'
   for no key update;
  if not found then
    return;
  end if;

  -- Repeated navigation should not rewrite the membership on every request.
  update public.clan_members
     set last_activity_at = v_now
   where clan_id = p_clan_id and user_id = v_uid and status = 'active'
     and (last_activity_at is null or last_activity_at < v_now - interval '5 minutes');

  insert into public.clan_daily_member_activity (clan_id, user_id, activity_date)
  values (p_clan_id, v_uid, v_day)
  on conflict (clan_id, user_id, activity_date) do nothing;
end;
$$;

comment on function public.record_clan_activity(uuid) is
  '활성 멤버 본인의 클랜 방문일과 최근 활동 갱신. 방문일은 KST 일 1건, 활동 시각은 5분 간격.';
revoke all on function public.record_clan_activity(uuid) from public, anon;
grant execute on function public.record_clan_activity(uuid) to authenticated, service_role;

-- Historical imports may have recorded_at later than their activity_date.
-- Cap each visit at that KST day's end instead of treating import time as activity.
with visits as (
  select clan_id, user_id,
         max(least(recorded_at,
           ((activity_date + 1)::timestamp at time zone 'Asia/Seoul') - interval '1 microsecond'
         )) as last_activity_at
    from public.clan_daily_member_activity
   where activity_date <= timezone('Asia/Seoul', now())::date
     and recorded_at <= now()
   group by clan_id, user_id
)
update public.clan_members cm
   set last_activity_at = visits.last_activity_at
  from visits
 where cm.clan_id = visits.clan_id and cm.user_id = visits.user_id
   and cm.status = 'active' and visits.last_activity_at >= cm.joined_at
   and (cm.last_activity_at is null or cm.last_activity_at < visits.last_activity_at);
