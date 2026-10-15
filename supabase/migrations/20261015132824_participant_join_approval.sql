-- Nicknames are labels, never ownership keys. Keep legacy aliases and links intact.
do $$ declare c record; begin
 for c in select conname from pg_constraint where conrelid='public.clan_participants'::regclass
  and contype='c' and pg_get_constraintdef(oid) like '%alias IS NOT NULL%'
 loop execute format('alter table public.clan_participants drop constraint %I',c.conname); end loop;
end $$;

create function private.list_clan_guest_records(p_clan_id uuid)
returns table(id uuid,nickname text,user_id uuid,played bigint,last_played text,recent_matches jsonb)
language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.is_clan_officer_plus(p_clan_id) then
  raise exception '운영진만 기존 참가자 기록을 확인할 수 있습니다.' using errcode='42501';
 end if;
 return query select p.id,p.nickname,p.user_id,
  (select count(*) from private.clan_stats_records r where r.clan_id=p.clan_id and
   (r.user_ids @> array[p.id::text] or r.payload->'_participant_ids'->>p.user_id::text=p.id::text)),
  (select max(r.day) from private.clan_stats_records r where r.clan_id=p.clan_id and
   (r.user_ids @> array[p.id::text] or r.payload->'_participant_ids'->>p.user_id::text=p.id::text)),
  (select coalesce(jsonb_agg(to_jsonb(recent) order by recent.day desc,recent.id),'[]') from
   (select r.id,r.day,r.map_label from private.clan_stats_records r where r.clan_id=p.clan_id and
    (r.user_ids @> array[p.id::text] or r.payload->'_participant_ids'->>p.user_id::text=p.id::text)
    order by r.day desc,r.id limit 3) recent)
 from public.clan_participants p where p.clan_id=p_clan_id and p.is_guest order by p.created_at,p.id;
end $$;
create function public.list_clan_guest_records(p_clan_id uuid)
returns table(id uuid,nickname text,user_id uuid,played bigint,last_played text,recent_matches jsonb)
language sql security invoker set search_path='' as $$ select * from private.list_clan_guest_records(p_clan_id); $$;

create function private.link_clan_participant(p_clan_id uuid,p_user_id uuid,p_participant_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare request_id uuid;
begin
 if auth.uid() is null or not public.is_clan_officer_plus(p_clan_id) then
  raise exception '운영진만 기록을 연결할 수 있습니다.' using errcode='42501';
 end if;
 -- The same clan -> stats -> participant order is used by approval and later linking.
 perform 1 from public.clans where id=p_clan_id for update;
 perform pg_advisory_xact_lock(hashtextextended('clan-stats:'||p_clan_id::text,0));
 perform pg_advisory_xact_lock(hashtextextended('clan-participants:'||p_clan_id::text,0));
 if not exists(select 1 from public.clan_members where clan_id=p_clan_id and user_id=p_user_id and status='active') then
  raise exception '현재 클랜 구성원에게만 기록을 연결할 수 있습니다.';
 end if;
 if not exists(select 1 from public.clan_participants where clan_id=p_clan_id and id=p_participant_id and is_guest and user_id is null) then
  raise exception '이미 연결되었거나 사용할 수 없는 참가자입니다.' using errcode='PT409';
 end if;
 insert into public.clan_participant_links(clan_id,participant_id,requested_by)
 values(p_clan_id,p_participant_id,p_user_id)
 on conflict(clan_id,participant_id,requested_by) where status='pending'
 do update set requested_by=excluded.requested_by returning id into request_id;
 perform private.review_clan_participant_link(request_id,'approve','운영진이 기존 내전 기록의 본인을 확인했습니다.');
end $$;
create function public.link_clan_participant(p_clan_id uuid,p_user_id uuid,p_participant_id uuid)
returns void language sql security invoker set search_path='' as $$ select private.link_clan_participant(p_clan_id,p_user_id,p_participant_id); $$;

create function private.approve_clan_join_with_participant(p_clan_id uuid,p_request_id uuid,p_participant_id uuid default null)
returns void language plpgsql security definer set search_path='' as $$
declare target uuid;
begin
 if auth.uid() is null or not public.is_clan_officer_plus(p_clan_id) then
  raise exception '가입을 승인할 권한이 없습니다.' using errcode='42501';
 end if;
 perform 1 from public.clans where id=p_clan_id for update;
 perform pg_advisory_xact_lock(hashtextextended('clan-stats:'||p_clan_id::text,0));
 perform pg_advisory_xact_lock(hashtextextended('clan-participants:'||p_clan_id::text,0));
 select user_id into target from public.clan_join_requests where id=p_request_id and clan_id=p_clan_id and status='pending' for update;
 if not found then raise exception '이미 처리되었거나 사용할 수 없는 신청입니다.' using errcode='PT409'; end if;
 -- Existing capacity, verification, game and membership checks remain authoritative.
 perform public.resolve_clan_join_request(p_clan_id,p_request_id,'approved',null);
 if p_participant_id is not null then perform private.link_clan_participant(p_clan_id,target,p_participant_id); end if;
end $$;
create function public.approve_clan_join_with_participant(p_clan_id uuid,p_request_id uuid,p_participant_id uuid default null)
returns void language sql security invoker set search_path='' as $$ select private.approve_clan_join_with_participant(p_clan_id,p_request_id,p_participant_id); $$;

create function private.unlink_clan_participant(p_clan_id uuid,p_participant_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare request_id uuid;
begin
 if auth.uid() is null or not public.is_clan_officer_plus(p_clan_id) then
  raise exception '운영진만 기록 연결을 해제할 수 있습니다.' using errcode='42501';
 end if;
 perform 1 from public.clans where id=p_clan_id for update;
 perform pg_advisory_xact_lock(hashtextextended('clan-stats:'||p_clan_id::text,0));
 perform pg_advisory_xact_lock(hashtextextended('clan-participants:'||p_clan_id::text,0));
 select l.id into request_id from public.clan_participant_links l join public.clan_participants p
  on p.clan_id=l.clan_id and p.id=l.participant_id and p.user_id=l.requested_by
 where l.clan_id=p_clan_id and l.participant_id=p_participant_id and l.status='approved';
 if not found then raise exception '이미 해제되었거나 사용할 수 없는 연결입니다.' using errcode='PT409'; end if;
 perform private.review_clan_participant_link(request_id,'revoke','운영진이 구성원 화면에서 기록 연결을 해제했습니다.');
end $$;
create function public.unlink_clan_participant(p_clan_id uuid,p_participant_id uuid)
returns void language sql security invoker set search_path='' as $$ select private.unlink_clan_participant(p_clan_id,p_participant_id); $$;

do $$ declare sig text; begin
 foreach sig in array array['list_clan_guest_records(uuid)','link_clan_participant(uuid,uuid,uuid)',
  'approve_clan_join_with_participant(uuid,uuid,uuid)','unlink_clan_participant(uuid,uuid)'] loop
  execute 'revoke all on function public.'||sig||' from public,anon';
  execute 'revoke all on function private.'||sig||' from public,anon';
  execute 'grant execute on function public.'||sig||' to authenticated';
  execute 'grant execute on function private.'||sig||' to authenticated';
 end loop;
end $$;
