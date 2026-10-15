-- Stable record subjects; account ownership is an approved, reversible relation.
create table public.clan_participants (
  clan_id uuid not null references public.clans(id) on delete cascade,
  id uuid not null default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  is_guest boolean not null default true,
  nickname text not null check (length(btrim(nickname)) between 1 and 32),
  alias text check (length(btrim(alias)) between 1 and 24),
  created_at timestamptz not null default now(),
  primary key (clan_id,id),
  check (not is_guest or alias is not null),
  check (is_guest or user_id is null or id=user_id)
);
create unique index clan_participant_alias_unique on public.clan_participants(clan_id,lower(alias)) where alias is not null;
create index clan_participants_account_idx on public.clan_participants(clan_id,user_id);
alter table public.clan_participants enable row level security;
revoke all on public.clan_participants from public,anon,authenticated;
grant select on public.clan_participants to authenticated;
grant all on public.clan_participants to service_role;
create policy participant_member_read on public.clan_participants for select to authenticated
  using (public.is_active_clan_member(clan_id));

insert into public.clan_participants(clan_id,id,user_id,is_guest,nickname)
select cm.clan_id,u.id,u.id,false,u.nickname from public.clan_members cm join public.users u on u.id=cm.user_id
on conflict do nothing;
-- Preserve display names for people in old matches who have already left.
insert into public.clan_participants(clan_id,id,user_id,is_guest,nickname)
select distinct r.clan_id,u.id,u.id,false,u.nickname from private.clan_stats_records r
cross join lateral unnest(r.user_ids) p(id) join public.users u on u.id=p.id::uuid
on conflict do nothing;

create function private.ensure_clan_participant() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.clan_participants(clan_id,id,user_id,is_guest,nickname)
 select new.clan_id,u.id,u.id,false,u.nickname from public.users u where u.id=new.user_id
 on conflict(clan_id,id) do nothing;
 return new;
end $$;
revoke all on function private.ensure_clan_participant() from public,anon,authenticated;
create trigger clan_member_participant after insert on public.clan_members for each row execute function private.ensure_clan_participant();

create table public.clan_participant_links (
 id uuid primary key default gen_random_uuid(),
 clan_id uuid not null,
 participant_id uuid not null,
 requested_by uuid not null references public.users(id) on delete cascade,
 status text not null default 'pending' check(status in ('pending','approved','rejected','revoked')),
 requested_at timestamptz not null default now(),
 reviewed_by uuid references public.users(id) on delete set null,
 reviewed_at timestamptz,
 review_note text check(length(review_note)<=300),
 revoked_by uuid references public.users(id) on delete set null,
 revoked_at timestamptz,
 revoke_note text check(length(revoke_note)<=300),
 foreign key(clan_id,participant_id) references public.clan_participants(clan_id,id) on delete cascade
);
create unique index participant_pending_request_unique on public.clan_participant_links(clan_id,participant_id,requested_by) where status='pending';
create unique index participant_approved_request_unique on public.clan_participant_links(clan_id,participant_id) where status='approved';
create index participant_links_requester_idx on public.clan_participant_links(requested_by);
create index participant_links_clan_idx on public.clan_participant_links(clan_id,requested_at desc);
alter table public.clan_participant_links enable row level security;
revoke all on public.clan_participant_links from public,anon,authenticated;
grant select on public.clan_participant_links to authenticated;
grant all on public.clan_participant_links to service_role;
create policy participant_link_read on public.clan_participant_links for select to authenticated using
 ((select auth.uid())=requested_by or public.is_clan_officer_plus(clan_id));

create table public.clan_participant_invites (
 clan_id uuid not null,
 participant_id uuid not null,
 token uuid not null default gen_random_uuid() unique,
 expires_at timestamptz not null default now()+interval '30 days',
 primary key(clan_id,participant_id),
 foreign key(clan_id,participant_id) references public.clan_participants(clan_id,id) on delete cascade
);
alter table public.clan_participant_invites enable row level security;
revoke all on public.clan_participant_invites from public,anon,authenticated;
grant select on public.clan_participant_invites to authenticated;
grant all on public.clan_participant_invites to service_role;
create policy participant_invite_staff_read on public.clan_participant_invites for select to authenticated
 using(public.is_clan_officer_plus(clan_id));

create function private.participant_account(p_clan uuid,p_id uuid) returns uuid language sql stable set search_path='' as $$
 select coalesce((select user_id from public.clan_participants where clan_id=p_clan and id=p_id),p_id);
$$;
revoke all on function private.participant_account(uuid,uuid) from public,anon,authenticated;

create function private.participant_label(p_clan uuid,p_id uuid) returns text language sql stable set search_path='' as $$
 select coalesce(u.nickname,p.nickname)||case when p.alias is not null then ' · '||p.alias
 when exists(select 1 from public.clan_participants q left join public.users qu on qu.id=q.user_id
   where q.clan_id=p.clan_id and q.id<>p.id and q.alias is null
     and lower(coalesce(qu.nickname,q.nickname))=lower(coalesce(u.nickname,p.nickname))) then ' · '||left(p.id::text,6)
 else '' end from public.clan_participants p left join public.users u on u.id=p.user_id and not p.is_guest
 where p.clan_id=p_clan and p.id=p_id;
$$;
revoke all on function private.participant_label(uuid,uuid) from public,anon,authenticated;

-- Keep the historical two-column RPC contract: IDs are record subjects, not auth grants.
create or replace function public.list_balance_roster_pool(p_clan_id uuid)
returns table(user_id uuid,nickname varchar) language sql stable security definer set search_path='' as $$
 select p.id,private.participant_label(p.clan_id,p.id)::varchar
 from public.clan_participants p where p.clan_id=p_clan_id and public.is_active_clan_member(p_clan_id)
 and ((not p.is_guest and exists(select 1 from public.clan_members cm where cm.clan_id=p.clan_id and cm.user_id=p.id and cm.status='active'))
 or (p.is_guest and (p.user_id is null or not exists(select 1 from public.clan_members cm where cm.clan_id=p.clan_id and cm.user_id=p.user_id and cm.status='active'))))
 order by 2,p.id;
$$;
revoke all on function public.list_balance_roster_pool(uuid) from public,anon;
grant execute on function public.list_balance_roster_pool(uuid) to authenticated;

create or replace function public.clan_peer_nicknames(p_clan_id uuid)
returns table(user_id uuid,nickname varchar) language sql stable security definer set search_path='' as $$
 select distinct on (coalesce(p.user_id,p.id)) coalesce(p.user_id,p.id),
 (case when p.is_guest and p.user_id is not null then coalesce(u.nickname,p.nickname)||coalesce(' · '||p.alias,'')
 else private.participant_label(p.clan_id,p.id) end)::varchar
 from public.clan_participants p left join public.users u on u.id=p.user_id
 where p.clan_id=p_clan_id and public.is_active_clan_member(p_clan_id)
 order by coalesce(p.user_id,p.id),p.is_guest,p.created_at;
$$;
revoke all on function public.clan_peer_nicknames(uuid) from public,anon;
grant execute on function public.clan_peer_nicknames(uuid) to authenticated;

create function private.save_clan_participant(p_clan_id uuid,p_id uuid,p_nickname text,p_alias text) returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid; p public.clan_participants;
begin
 if auth.uid() is null or not public.is_clan_officer_plus(p_clan_id) then raise exception '운영진만 참가자를 관리할 수 있습니다.' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended('clan-participants:'||p_clan_id::text,0));
 if p_id is null then
  insert into public.clan_participants(clan_id,nickname,alias) values(p_clan_id,btrim(p_nickname),nullif(btrim(p_alias),'')) returning id into result;
 else
  select * into p from public.clan_participants where clan_id=p_clan_id and id=p_id for update;
  if not found then raise exception '참가자를 찾을 수 없습니다.'; end if;
  update public.clan_participants set nickname=case when is_guest then btrim(p_nickname) else nickname end,alias=nullif(btrim(p_alias),'')
  where clan_id=p_clan_id and id=p_id returning id into result;
 end if;
 return result;
end $$;
create function public.save_clan_participant(p_clan_id uuid,p_id uuid,p_nickname text,p_alias text) returns uuid
language sql security invoker set search_path='' as $$ select private.save_clan_participant(p_clan_id,p_id,p_nickname,p_alias); $$;

create function private.issue_clan_participant_invite(p_clan_id uuid,p_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if auth.uid() is null or not public.is_clan_officer_plus(p_clan_id) then raise exception '운영진만 연결 링크를 발급할 수 있습니다.' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended('clan-participants:'||p_clan_id::text,0));
 if not exists(select 1 from public.clan_participants where clan_id=p_clan_id and id=p_id and is_guest and user_id is null) then raise exception '연결되지 않은 미가입 참가자를 선택하세요.'; end if;
 insert into public.clan_participant_invites(clan_id,participant_id) values(p_clan_id,p_id)
 on conflict(clan_id,participant_id) do update set token=gen_random_uuid(),expires_at=now()+interval '30 days'
 returning token into result;
 return result;
end $$;
create function public.issue_clan_participant_invite(p_clan_id uuid,p_id uuid) returns uuid
language sql security invoker set search_path='' as $$ select private.issue_clan_participant_invite(p_clan_id,p_id); $$;

create function private.read_clan_participant_invite(p_token uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('clanName',c.name,'nickname',p.nickname,'alias',p.alias,
 'requestStatus',(select l.status from public.clan_participant_links l where l.clan_id=p.clan_id and l.participant_id=p.id and l.requested_by=auth.uid() order by l.requested_at desc limit 1))
 from public.clan_participant_invites i join public.clan_participants p on p.clan_id=i.clan_id and p.id=i.participant_id
 join public.clans c on c.id=p.clan_id where i.token=p_token and i.expires_at>now() and auth.uid() is not null and p.user_id is null;
$$;
create function public.read_clan_participant_invite(p_token uuid) returns jsonb language sql stable security invoker set search_path='' as $$ select private.read_clan_participant_invite(p_token); $$;

create function private.request_clan_participant_link(p_token uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare i public.clan_participant_invites; result uuid;
begin
 if auth.uid() is null then raise exception '로그인이 필요합니다.' using errcode='42501'; end if;
 select * into i from public.clan_participant_invites where token=p_token and expires_at>now();
 if not found then raise exception '만료되거나 사용할 수 없는 연결 링크입니다.'; end if;
 perform pg_advisory_xact_lock(hashtextextended('clan-participants:'||i.clan_id::text,0));
 if not exists(select 1 from public.clan_participant_invites where token=p_token and expires_at>now()) or
 not exists(select 1 from public.clan_participants where clan_id=i.clan_id and id=i.participant_id and is_guest and user_id is null) then raise exception '연결 링크를 다시 확인하세요.'; end if;
 insert into public.clan_participant_links(clan_id,participant_id,requested_by) values(i.clan_id,i.participant_id,auth.uid())
 on conflict(clan_id,participant_id,requested_by) where status='pending' do update set requested_by=excluded.requested_by returning id into result;
 return result;
end $$;
create function public.request_clan_participant_link(p_token uuid) returns uuid language sql security invoker set search_path='' as $$ select private.request_clan_participant_link(p_token); $$;

-- Project only player identity fields; actors, predictions and coin ledgers stay untouched.
create function private.project_participant_record(p_clan uuid,p_payload jsonb) returns jsonb
language plpgsql stable set search_path='' as $$
declare result jsonb:=p_payload; originals jsonb:='{}'; players jsonb; slot record; old_id text; new_id text; scores jsonb:='{}';
begin
 if jsonb_typeof(p_payload->'match_players')='array' then
  select jsonb_agg(p||jsonb_build_object('user_id',private.participant_account(p_clan,(p->>'user_id')::uuid))),
   jsonb_object_agg(private.participant_account(p_clan,(p->>'user_id')::uuid)::text,p->>'user_id')
   into players,originals from jsonb_array_elements(p_payload->'match_players') p;
  result:=jsonb_set(result,'{match_players}',coalesce(players,'[]'));
 elsif p_payload ? 'roster' then
  for slot in select team,role,idx from (values('team1'),('team2')) t(team)
   cross join (values('tank',null::text),('dmg','0'),('dmg','1'),('sup','0'),('sup','1')) s(role,idx) loop
   old_id:=p_payload#>>(case when slot.idx is null then array['roster',slot.team,slot.role] else array['roster',slot.team,slot.role,slot.idx] end);
   if old_id is not null then
    new_id:=private.participant_account(p_clan,old_id::uuid)::text;
    originals:=originals||jsonb_build_object(new_id,old_id);
    result:=jsonb_set(result,case when slot.idx is null then array['roster',slot.team,slot.role] else array['roster',slot.team,slot.role,slot.idx] end,to_jsonb(new_id));
   end if;
  end loop;
  for old_id,players in select key,value from jsonb_each(coalesce(p_payload->'ma_snapshot','{}')) loop
   scores:=scores||jsonb_build_object(private.participant_account(p_clan,old_id::uuid)::text,players);
  end loop;
  result:=jsonb_set(result,'{ma_snapshot}',scores);
 end if;
 return result||jsonb_build_object('_participant_ids',coalesce(originals,'{}'));
end $$;
revoke all on function private.project_participant_record(uuid,jsonb) from public,anon,authenticated;

alter function private.sync_clan_stats_records(uuid[]) rename to sync_clan_stats_unlinked_records;
create function private.sync_clan_stats_records(p_ids uuid[]) returns void language plpgsql security definer set search_path='' as $$
begin
 perform private.sync_clan_stats_unlinked_records(p_ids);
 update private.clan_stats_records r set
  players=(select coalesce(jsonb_agg(p||jsonb_build_object('user_id',private.participant_account(r.clan_id,(p->>'user_id')::uuid))),'[]') from jsonb_array_elements(r.players) p),
  user_ids=array(select private.participant_account(r.clan_id,u::uuid)::text from unnest(r.user_ids) u),
  payload=private.project_participant_record(r.clan_id,r.payload)
 where r.id=any(p_ids) and exists(select 1 from public.clan_participants p where p.clan_id=r.clan_id and p.is_guest and p.user_id is not null);
end $$;
revoke all on function private.sync_clan_stats_records(uuid[]) from public,anon,authenticated;

create function private.review_clan_participant_link(p_request_id uuid,p_action text,p_note text) returns void
language plpgsql security definer set search_path='' as $$
declare l public.clan_participant_links; p public.clan_participants; ids uuid[]; days text[];
begin
 select * into l from public.clan_participant_links where id=p_request_id;
 if not found or auth.uid() is null or not public.is_clan_officer_plus(l.clan_id) then raise exception '운영진만 연결을 확인할 수 있습니다.' using errcode='42501'; end if;
 -- Shared lock order with record corrections/summary refreshes.
 perform pg_advisory_xact_lock(hashtextextended('clan-stats:'||l.clan_id::text,0));
 perform pg_advisory_xact_lock(hashtextextended('clan-participants:'||l.clan_id::text,0));
 select * into l from public.clan_participant_links where id=p_request_id for update;
 select * into p from public.clan_participants where clan_id=l.clan_id and id=l.participant_id for update;
 if p_action not in ('approve','reject','revoke') or p_action is null or length(btrim(coalesce(p_note,''))) not between 1 and 300 then raise exception '확인 또는 취소 사유를 입력하세요.'; end if;
 if (p_action in ('approve','reject') and l.status<>'pending') or (p_action='revoke' and (l.status<>'approved' or p.user_id is distinct from l.requested_by)) then raise exception '이미 처리된 요청입니다. 새로고침하세요.' using errcode='PT409'; end if;
 if p_action in ('approve','revoke') then
  if exists(select 1 from public.balance_sessions s join public.balance_session_series ss on ss.id=s.series_id
   where s.clan_id=l.clan_id and ss.closed_at is null and
    (public.balance_roster_contains_user(s.roster,p.id) or public.balance_roster_contains_user(s.roster,l.requested_by)))
   then raise exception '참가자의 진행 중인 내전을 종료한 뒤 연결을 변경하세요.'; end if;
  if p_action='approve' then
   if p.user_id is not null or not p.is_guest then raise exception '이미 연결된 참가자입니다.'; end if;
   if exists(select 1 from private.clan_stats_records r where r.clan_id=l.clan_id and r.user_ids @> array[p.id::text,l.requested_by::text])
    then raise exception '같은 경기에 두 참가자의 출전 기록이 있습니다. 경기 기록을 먼저 정정하세요.'; end if;
   update public.clan_participants set user_id=l.requested_by where clan_id=l.clan_id and id=p.id;
   update public.clan_participant_links set status='approved',reviewed_by=auth.uid(),reviewed_at=now(),review_note=btrim(p_note) where id=l.id;
   update public.clan_participant_links set status='rejected',reviewed_by=auth.uid(),reviewed_at=now(),review_note='다른 요청이 승인되었습니다.'
    where clan_id=l.clan_id and participant_id=p.id and status='pending';
   delete from public.clan_participant_invites where clan_id=l.clan_id and participant_id=p.id;
  else
   update public.clan_participants set user_id=null where clan_id=l.clan_id and id=p.id;
   update public.clan_participant_links set status='revoked',revoked_by=auth.uid(),revoked_at=now(),revoke_note=btrim(p_note) where id=l.id;
  end if;
  select array_agg(id),array_agg(distinct day) into ids,days from private.clan_stats_records where clan_id=l.clan_id;
  perform private.sync_clan_stats_records(coalesce(ids,'{}'));
  perform private.refresh_clan_stats(l.clan_id,coalesce(days,'{}'));
 else
  update public.clan_participant_links set status='rejected',reviewed_by=auth.uid(),reviewed_at=now(),review_note=btrim(p_note) where id=l.id;
 end if;
end $$;
create function public.review_clan_participant_link(p_request_id uuid,p_action text,p_note text) returns void
language sql security invoker set search_path='' as $$ select private.review_clan_participant_link(p_request_id,p_action,p_note); $$;

-- Serialize roster validation against ownership changes, including direct writes.
create function private.guard_clan_participant_roster() returns trigger language plpgsql security definer set search_path='' as $$
declare id text;
begin
 perform pg_advisory_xact_lock(hashtextextended('clan-participants:'||new.clan_id::text,0));
 for id in select v#>>'{}' from jsonb_path_query(new.roster,'$.*.** ? (@.type() == "string")') q(v) loop
  if not exists(select 1 from public.clan_participants p where p.clan_id=new.clan_id and p.id=id::uuid and
   ((not p.is_guest and exists(select 1 from public.clan_members cm where cm.clan_id=p.clan_id and cm.user_id=p.id and cm.status='active'))
    or (p.is_guest and (p.user_id is null or not exists(select 1 from public.clan_members cm where cm.clan_id=p.clan_id and cm.user_id=p.user_id and cm.status='active')))))
  then raise exception '참가자 명부가 변경되었습니다. 최신 명부를 확인하세요.'; end if;
 end loop;
 return new;
end $$;
revoke all on function private.guard_clan_participant_roster() from public,anon,authenticated;
create trigger z_clan_participant_roster before insert or update of roster,phase on public.balance_sessions
 for each row execute function private.guard_clan_participant_roster();

do $$
declare d text;
begin
 d:=pg_get_functiondef('private.guard_balance_formation()'::regprocedure);
 if position('(select count(*) from public.clan_members where clan_id = new.clan_id and status = ''active'' and user_id = any(ids::uuid[])) <> 10' in d)=0 then raise exception 'roster guard drift'; end if;
 -- The new guard validates every selected participant, including guests.
 d:=replace(d,'(select count(*) from public.clan_members where clan_id = new.clan_id and status = ''active'' and user_id = any(ids::uuid[])) <> 10','false');
 execute d;
 d:=pg_get_functiondef('private.edit_clan_match_record(uuid,uuid,uuid,text,text,jsonb)'::regprocedure);
 if position('and not coalesce(v_current.user_ids @> array[v_pick->>''userId''],false)' in d)=0 then raise exception 'record guard drift'; end if;
 d:=replace(d,'and not coalesce(v_current.user_ids @> array[v_pick->>''userId''],false)',
 'and not exists(select 1 from public.clan_participants cp where cp.clan_id=p_clan_id and cp.id=(v_pick->>''userId'')::uuid and cp.is_guest and cp.user_id is null) and not coalesce(v_current.user_ids @> array[v_pick->>''userId''],false)');
 d:=replace(d,'''user_id'',v_pick->>''userId''','''user_id'',coalesce(v_base->''_participant_ids''->>(v_pick->>''userId''),v_pick->>''userId'')');
 execute d;
end $$;

-- Mutations are exposed only through auth-checking private implementations.
do $$
declare sig text;
begin
 foreach sig in array array['save_clan_participant(uuid,uuid,text,text)','issue_clan_participant_invite(uuid,uuid)',
  'read_clan_participant_invite(uuid)','request_clan_participant_link(uuid)','review_clan_participant_link(uuid,text,text)'] loop
  execute 'revoke all on function public.'||sig||' from public,anon';
  execute 'revoke all on function private.'||sig||' from public,anon';
  execute 'grant execute on function public.'||sig||' to authenticated';
  execute 'grant execute on function private.'||sig||' to authenticated';
 end loop;
end $$;
