-- Wait for every accepted last-second vote before returning an immutable closed
-- ballot. Submit RPCs lock this row and reject writes after its deadline.
create function public.read_closed_balance_ballot(p_round_id uuid,p_clan_id uuid,p_kind text,p_expected_deadline timestamptz)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.balance_sessions%rowtype; result jsonb; deadline timestamptz;
begin
 select * into s from public.balance_sessions where id=p_round_id and clan_id=p_clan_id for update;
 if not found or auth.uid() is null or not private.can_manage_balance_round(p_round_id,p_clan_id) then raise exception 'forbidden' using errcode='42501'; end if;
 if s.closed_at is not null or p_kind is null or p_kind not in ('map','hero') then raise exception 'invalid_ballot'; end if;
 deadline:=case when p_kind='map' then s.map_ban_deadline_at else s.hero_ban_deadline_at end;
 if deadline is null or deadline is distinct from p_expected_deadline or deadline>clock_timestamp()
 or (p_kind='map' and (s.phase<>'map_ban' or s.resolved_map_label is not null))
 or (p_kind='hero' and (s.phase<>'hero_ban' or s.banned_heroes is not null)) then raise exception '투표 마감 상태가 변경되었습니다.'; end if;
 if p_kind='map' then
 select jsonb_agg(jsonb_build_object('choice_idx',v.choice_idx)) into result from public.balance_session_map_votes v where v.session_id=p_round_id;
 else
 select jsonb_agg(jsonb_build_object('user_id',v.user_id,'pick_1',v.pick_1,'pick_2',v.pick_2,'pick_3',v.pick_3)) into result from public.balance_session_hero_votes v where v.session_id=p_round_id;
 end if;
 return coalesce(result,'[]'::jsonb);
end $$;
revoke all on function public.read_closed_balance_ballot(uuid,uuid,text,timestamptz) from public,anon;
grant execute on function public.read_closed_balance_ballot(uuid,uuid,text,timestamptz) to authenticated;

-- Delegation permits only score edits, never a general round UPDATE.
create function public.set_balance_scores(p_round_id uuid,p_clan_id uuid,p_snapshot jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare s public.balance_sessions%rowtype; role text; permissions jsonb; roles jsonb; premium boolean; entry record;
begin
 select * into s from public.balance_sessions where id=p_round_id and clan_id=p_clan_id for update;
 if not found or auth.uid() is null then raise exception 'forbidden' using errcode='42501'; end if;
 select m.role::text,cs.permissions,c.subscription_tier='premium' into role,permissions,premium
 from public.clan_members m join public.clan_settings cs on cs.clan_id=m.clan_id join public.clans c on c.id=m.clan_id
 where m.clan_id=p_clan_id and m.user_id=auth.uid() and m.status='active';
 roles:=case when permissions ? 'edit_mscore' then permissions->'edit_mscore' else '["leader"]'::jsonb end;
 if role is null or not (private.can_manage_balance_round(p_round_id,p_clan_id) or (jsonb_typeof(roles)='array' and roles ? role)) then raise exception 'forbidden' using errcode='42501'; end if;
 if s.closed_at is not null or s.phase<>'match_live' then raise exception '경기 진행 단계에서만 점수를 기록할 수 있습니다.'; end if;
 if jsonb_typeof(p_snapshot) is distinct from 'object' then raise exception 'invalid_scores'; end if;
 for entry in select key,value from jsonb_each(p_snapshot) loop
   if not public.balance_roster_contains_user(s.roster,entry.key::uuid) or jsonb_typeof(entry.value) is distinct from 'object'
   or jsonb_typeof(entry.value->'m') is distinct from 'number' or not ((entry.value->>'m')::numeric between -10 and 10)
   or (entry.value->'a' is distinct from 'null'::jsonb and (not premium or jsonb_typeof(entry.value->'a') is distinct from 'number' or not ((entry.value->>'a')::numeric between -10 and 10)))
   then raise exception 'invalid_scores'; end if;
 end loop;
 update public.balance_sessions set ma_snapshot=p_snapshot where id=p_round_id;
end $$;
revoke all on function public.set_balance_scores(uuid,uuid,jsonb) from public,anon;
grant execute on function public.set_balance_scores(uuid,uuid,jsonb) to authenticated;

-- Parent lock is acquired before inserting either side's confirmation so the
-- existing AFTER trigger sees the previous side's committed row.
create function private.lock_scrim_confirmation() returns trigger
language plpgsql security definer set search_path='' as $$
declare s public.scrim_rooms%rowtype;
begin
 select * into s from public.scrim_rooms where id=new.scrim_room_id for update;
 if not found or s.status<>'matched' then raise exception '확인할 수 없는 스크림 상태입니다.'; end if;
 return new;
end $$;
revoke all on function private.lock_scrim_confirmation() from public,anon,authenticated;
create trigger aaa_lock_scrim_confirmation before insert on public.scrim_room_confirmations for each row execute function private.lock_scrim_confirmation();

-- Post rows are visible to authenticated users. Return only aggregate counts,
-- leaving individual application details behind the existing self/creator RLS.
create function public.count_lfg_applications(p_post_ids uuid[])
returns table(post_id uuid,applied_count bigint) language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'forbidden' using errcode='42501'; end if;
 if cardinality(p_post_ids)>100 then raise exception 'too_many_posts'; end if;
 return query select a.post_id,count(*) from public.lfg_applications a where a.post_id=any(p_post_ids) and a.status='applied' group by a.post_id;
end $$;
revoke all on function public.count_lfg_applications(uuid[]) from public,anon;
grant execute on function public.count_lfg_applications(uuid[]) to authenticated;
