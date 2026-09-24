-- Site-usage rows contain individual visit dates. Keep the raw rows within
-- clan management, while record_clan_activity continues to write for members.
drop policy if exists clan_daily_activity_select_member on public.clan_daily_member_activity;

create policy clan_daily_activity_select_staff on public.clan_daily_member_activity
  for select using (
    exists (
      select 1
        from public.clan_members cm
       where cm.clan_id = clan_daily_member_activity.clan_id
         and cm.user_id = auth.uid()
         and cm.status = 'active'
         and cm.role in ('leader', 'officer')
    )
  );
