-- Membership changes never delete record subjects or rewrite past matches.
-- Existing QA membership rows are not backfilled with invented departure dates.
alter table public.clan_members
  add column departed_at timestamptz,
  add column departure_kind text check (departure_kind in ('left','kicked'));

create function private.stamp_clan_departure() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if old.status='active' and new.status in ('left','banned') then
    new.departed_at:=clock_timestamp();
    new.departure_kind:=case when new.status='banned' then 'kicked' else 'left' end;
  elsif old.status='banned' and new.status='left' then
    new.departed_at:=old.departed_at;
    new.departure_kind:=coalesce(old.departure_kind,'kicked');
  elsif new.status='active' and old.status is distinct from 'active' then
    new.departed_at:=null; new.departure_kind:=null;
  end if;
  return new;
end $$;
revoke all on function private.stamp_clan_departure() from public,anon,authenticated;
create trigger clan_members_departure before update of status on public.clan_members
for each row execute function private.stamp_clan_departure();

create function private.change_clan_membership(p_clan_id uuid,p_action text,p_user_id uuid default null)
returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); member_id uuid; me public.clan_members; target public.clan_members; permissions jsonb; allowed jsonb;
begin
  if actor is null or p_action is null or p_action not in ('leave','kick','allow_rejoin') then
    raise exception '잘못된 소속 변경 요청입니다.' using errcode='42501';
  end if;
  perform 1 from public.clans where id=p_clan_id for update;
  select * into me from public.clan_members where clan_id=p_clan_id and user_id=actor and status='active' for update;
  if not found then raise exception '현재 클랜 구성원만 처리할 수 있습니다.' using errcode='42501'; end if;
  member_id:=case when p_action='leave' then actor else p_user_id end;
  if p_action='leave' and p_user_id is not null and p_user_id<>actor then
    raise exception '본인만 탈퇴할 수 있습니다.' using errcode='42501';
  end if;
  select * into target from public.clan_members where clan_id=p_clan_id and user_id=member_id for update;
  if not found then raise exception '대상 구성원을 찾을 수 없습니다.' using errcode='42501'; end if;
  if p_action='leave' then
    if me.role='leader' then raise exception '클랜장은 클랜장 권한을 위임한 뒤 탈퇴할 수 있습니다.'; end if;
  else
    if member_id=actor or target.role='leader' then raise exception '처리할 수 없는 대상입니다.' using errcode='42501'; end if;
    if p_action='allow_rejoin' then
      if me.role not in ('leader','officer') or (target.role='officer' and me.role<>'leader') then
        raise exception '재가입을 허용할 권한이 없습니다.' using errcode='42501';
      end if;
      if target.status<>'banned' then raise exception '이미 재가입이 허용되었거나 상태가 변경되었습니다.' using errcode='PT409'; end if;
      update public.clan_members set status='left' where id=target.id;
      return;
    end if;
    if target.role='officer' then
      if me.role<>'leader' then raise exception '클랜장만 운영진을 강퇴할 수 있습니다.' using errcode='42501'; end if;
    else
      select s.permissions into permissions from public.clan_settings s where s.clan_id=p_clan_id;
      allowed:=case when jsonb_typeof(permissions->'kick_member')='array' then permissions->'kick_member'
        when jsonb_typeof(permissions)='object' and not permissions ? 'kick_member' then '["leader","officer"]'::jsonb else '[]'::jsonb end;
      if not allowed ? me.role::text then raise exception '멤버 강퇴 권한이 없습니다.' using errcode='42501'; end if;
    end if;
  end if;
  if target.status<>'active' then raise exception '구성원 상태가 변경되었습니다.' using errcode='PT409'; end if;
  if exists(select 1 from public.balance_sessions s where s.clan_id=p_clan_id and s.closed_at is null and s.match_outcome='pending'
    and (jsonb_path_exists(s.roster,'$.*.** ? (@ == $id)',jsonb_build_object('id',member_id::text)) or exists(
      select 1 from public.clan_participants p where p.clan_id=p_clan_id and p.user_id=member_id and p.is_guest
      and jsonb_path_exists(s.roster,'$.*.** ? (@ == $id)',jsonb_build_object('id',p.id::text))))) then
    raise exception '진행 중인 내전이 있습니다. 경기를 마치거나 출전 명단에서 제외한 뒤 처리해 주세요.';
  end if;
  if exists(select 1 from public.balance_rooms r where r.clan_id=p_clan_id and r.created_by=member_id and r.kind='flash' and r.status in ('scheduled','open')) then
    raise exception '호스트인 깜짝 내전을 종료하거나 예약을 취소한 뒤 처리해 주세요.';
  end if;
  update public.clan_members set status=case when p_action='kick' then 'banned'::public.clan_member_status else 'left'::public.clan_member_status end where id=target.id;
  update public.clan_join_requests set status='canceled',resolved_at=now(),resolved_by=actor
    where clan_id=p_clan_id and user_id=member_id and status='pending';
end $$;
create function public.change_clan_membership(p_clan_id uuid,p_action text,p_user_id uuid default null)
returns void language sql security invoker set search_path='' as $$ select private.change_clan_membership(p_clan_id,p_action,p_user_id); $$;
revoke all on function private.change_clan_membership(uuid,text,uuid),public.change_clan_membership(uuid,text,uuid) from public,anon;
grant execute on function private.change_clan_membership(uuid,text,uuid),public.change_clan_membership(uuid,text,uuid) to authenticated;

-- Serialize applications with kicks/allowances, including direct REST inserts.
create function private.guard_banned_clan_application() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.status='pending' then
    perform 1 from public.clans where id=new.clan_id for update;
    if exists(select 1 from public.clan_members where clan_id=new.clan_id and user_id=new.user_id and status='banned') then
      raise exception '이 클랜은 재가입이 제한되어 있습니다. 운영진의 재가입 허용 후 신청해 주세요.' using errcode='42501';
    end if;
  end if;
  return new;
end $$;
revoke all on function private.guard_banned_clan_application() from public,anon,authenticated;
create trigger guard_banned_clan_application before insert or update of status,user_id,clan_id on public.clan_join_requests
for each row execute function private.guard_banned_clan_application();

-- Preserve existing capacity, verification, one-clan-per-game and request locks.
do $$
declare d text; before text;
begin
  d:=pg_get_functiondef('public.resolve_clan_join_request(uuid,uuid,text,text)'::regprocedure);
  before:=$old$IF EXISTS (SELECT 1 FROM public.clan_members WHERE clan_id = c.id AND user_id = r.user_id) THEN
      RAISE EXCEPTION '이미 클랜에 등록된 사용자입니다.';
    END IF;
    INSERT INTO public.clan_members (clan_id, user_id, role, status, joined_at, last_activity_at)
      VALUES (c.id, r.user_id, 'member', 'active', now(), now());$old$;
  if position(before in d)=0 then raise exception 'Returning membership approval drift'; end if;
  execute replace(d,before,$new$IF EXISTS (SELECT 1 FROM public.clan_members WHERE clan_id=c.id AND user_id=r.user_id AND status='banned') THEN
      RAISE EXCEPTION '운영진이 재가입을 허용한 뒤 승인할 수 있습니다.' USING ERRCODE='42501';
    END IF;
    INSERT INTO public.clan_members (clan_id, user_id, role, status, joined_at, last_activity_at)
      VALUES (c.id, r.user_id, 'member', 'active', now(), now())
      ON CONFLICT (clan_id,user_id) DO UPDATE SET status='active',role='member',joined_at=now(),last_activity_at=now()
      WHERE public.clan_members.status='left';
    IF NOT FOUND THEN RAISE EXCEPTION '이미 등록되었거나 소속 상태가 변경되었습니다.'; END IF;$new$);
end $$;
