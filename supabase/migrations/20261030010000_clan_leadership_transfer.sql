-- Role changes use the same clan lock as leaving, kicking and join approval.
create function private.set_clan_member_role(p_clan_id uuid,p_user_id uuid,p_role public.clan_member_role)
returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); me public.clan_members; target public.clan_members;
begin
  if actor is null or p_clan_id is null or p_user_id is null or p_role is null then
    raise exception '클랜과 구성원 정보를 확인해 주십시오.' using errcode='42501';
  end if;
  perform 1 from public.clans where id=p_clan_id for update;
  if not found then raise exception '클랜을 찾을 수 없습니다.'; end if;
  select * into me from public.clan_members where clan_id=p_clan_id and user_id=actor and status='active' for update;
  if not found or me.role<>'leader' then
    raise exception '역할 변경과 클랜장 위임은 현재 클랜장만 할 수 있습니다.' using errcode='42501';
  end if;
  if p_user_id=actor then raise exception '본인에게 역할을 변경하거나 위임할 수 없습니다.'; end if;
  select * into target from public.clan_members where clan_id=p_clan_id and user_id=p_user_id and status='active' for update;
  if not found or target.role='leader' then raise exception '현재 활성 구성원을 선택해 주십시오.'; end if;
  if p_role='leader' then
    if (select count(*) from public.clan_members where clan_id=p_clan_id and status='active' and role='leader')<>1 then
      raise exception '클랜장 정보를 확인한 뒤 다시 시도해 주십시오.';
    end if;
    update public.clan_members set role='member' where id=me.id;
    update public.clan_members set role='leader' where id=target.id;
    update public.clans set ownership_transferred_at=now() where id=p_clan_id;
  else
    if (p_role='officer' and target.role<>'member') or (p_role='member' and target.role<>'officer') then
      raise exception '구성원 역할이 변경되었습니다. 새로고침 후 다시 시도해 주십시오.' using errcode='PT409';
    end if;
    update public.clan_members set role=p_role where id=target.id;
  end if;
end $$;

create function public.set_clan_member_role(p_clan_id uuid,p_user_id uuid,p_role public.clan_member_role)
returns void language sql security invoker set search_path='' as $$
  select private.set_clan_member_role(p_clan_id,p_user_id,p_role);
$$;
revoke all on function private.set_clan_member_role(uuid,uuid,public.clan_member_role),public.set_clan_member_role(uuid,uuid,public.clan_member_role) from public,anon,authenticated;
grant execute on function private.set_clan_member_role(uuid,uuid,public.clan_member_role),public.set_clan_member_role(uuid,uuid,public.clan_member_role) to authenticated;
