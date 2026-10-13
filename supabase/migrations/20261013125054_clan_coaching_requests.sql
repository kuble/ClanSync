create table public.clan_board_coaches (
  clan_id uuid not null references public.clans(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.users(id) on delete cascade,
  expertise text not null check (char_length(btrim(expertise)) between 1 and 100),
  bio text not null default '' check (char_length(bio) <= 1000),
  accepting boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (clan_id,user_id)
);
create index clan_board_coaches_user_idx on public.clan_board_coaches(user_id);
create trigger clan_board_coaches_updated_at before update on public.clan_board_coaches
  for each row execute function public.set_updated_at();
alter table public.clan_board_coaches enable row level security;
revoke all on public.clan_board_coaches from public,anon,authenticated;
grant all on public.clan_board_coaches to service_role;
grant select on public.clan_board_coaches to authenticated;
grant insert(clan_id,expertise,bio,accepting) on public.clan_board_coaches to authenticated;
grant update(expertise,bio,accepting) on public.clan_board_coaches to authenticated;
create policy coach_read on public.clan_board_coaches for select to authenticated using (
  public.is_active_clan_member(clan_id) and exists(select 1 from public.clan_members m
    where m.clan_id=clan_board_coaches.clan_id and m.user_id=clan_board_coaches.user_id and m.status='active')
);
create policy coach_enroll on public.clan_board_coaches for insert to authenticated
  with check(public.is_active_clan_member(clan_id) and user_id=(select auth.uid()));
create policy coach_edit on public.clan_board_coaches for update to authenticated
  using(public.is_active_clan_member(clan_id) and user_id=(select auth.uid()))
  with check(public.is_active_clan_member(clan_id) and user_id=(select auth.uid()));

alter table public.clan_board_posts add column coach_id uuid references public.users(id) on delete set null;
alter table public.clan_board_posts add constraint board_feedback_coach_kind check(kind='feedback' or coach_id is null);
create index clan_board_posts_coach_idx on public.clan_board_posts(coach_id) where coach_id is not null;
grant insert(coach_id),update(coach_id) on public.clan_board_posts to authenticated;
drop policy board_author_update on public.clan_board_posts;
create policy board_author_update on public.clan_board_posts for update to authenticated
  using(public.is_active_clan_member(clan_id) and (author_id=(select auth.uid()) or public.is_clan_officer_plus(clan_id) or (kind='feedback' and coach_id=(select auth.uid()))))
  with check(public.is_active_clan_member(clan_id) and (author_id=(select auth.uid()) or public.is_clan_officer_plus(clan_id) or (kind='feedback' and coach_id=(select auth.uid()))));

create function private.guard_coaching_request() returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if tg_op='UPDATE' and old.coach_id=(select auth.uid()) and old.author_id is distinct from (select auth.uid())
     and not public.is_clan_officer_plus(old.clan_id) and (to_jsonb(new)-'status'-'updated_at') is distinct from (to_jsonb(old)-'status'-'updated_at') then
    raise exception 'Coaches can only change request status';
  end if;
  if new.kind='feedback' and (tg_op='INSERT' or new.coach_id is distinct from old.coach_id) then
    -- Account removal can clear the coach foreign key; ordinary requests require a current teacher.
    if new.coach_id is null and tg_op='UPDATE' and (select auth.uid()) is null then return new; end if;
    if new.coach_id is null or new.coach_id=new.author_id or not exists (
      select 1 from public.clan_board_coaches c join public.clan_members m on m.clan_id=c.clan_id and m.user_id=c.user_id
      where c.clan_id=new.clan_id and c.user_id=new.coach_id and c.accepting and m.status='active'
    ) then raise exception 'Choose an active coach accepting requests'; end if;
  end if;
  return new;
end $$;
revoke all on function private.guard_coaching_request() from public,anon,authenticated;
create trigger coaching_request_guard before insert or update on public.clan_board_posts
  for each row execute function private.guard_coaching_request();

create unique index coaching_notification_once on public.notifications(recipient_user_id,kind,source_table,source_id)
  where kind in ('coaching_requested','coaching_comment');
create function private.notify_coaching_request() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if (select auth.uid()) is null or not public.is_active_clan_member(new.clan_id) then return new; end if;
  if new.kind='feedback' and new.coach_id is not null and (tg_op='INSERT' or new.coach_id is distinct from old.coach_id) then
    insert into public.notifications(recipient_user_id,clan_id,kind,source_table,source_id,payload)
      values(new.coach_id,new.clan_id,'coaching_requested','clan_board_posts',new.id,
        jsonb_build_object('post_id',new.id,'post_title',new.title)) on conflict do nothing;
  end if;
  return new;
end $$;
revoke all on function private.notify_coaching_request() from public,anon,authenticated;
create trigger coaching_request_notification after insert or update of coach_id on public.clan_board_posts
  for each row execute function private.notify_coaching_request();

create function private.notify_coaching_comment() returns trigger language plpgsql security definer set search_path='' as $$
declare p public.clan_board_posts;
begin
  if (select auth.uid()) is null or new.author_id is distinct from (select auth.uid()) then return new; end if;
  select * into p from public.clan_board_posts where id=new.post_id;
  if p.kind<>'feedback' or not public.is_active_clan_member(p.clan_id) then return new; end if;
  insert into public.notifications(recipient_user_id,clan_id,kind,source_table,source_id,payload)
    select m.user_id,p.clan_id,'coaching_comment','clan_board_comments',new.id,
      jsonb_build_object('post_id',p.id,'post_title',p.title,'comment_id',new.id)
    from public.clan_members m where m.clan_id=p.clan_id and m.status='active' and m.user_id<>new.author_id
      and m.user_id in (select p.author_id union select p.coach_id union select c.author_id from public.clan_board_comments c where c.post_id=p.id)
    on conflict do nothing;
  return new;
end $$;
revoke all on function private.notify_coaching_comment() from public,anon,authenticated;
create trigger coaching_comment_notification after insert on public.clan_board_comments
  for each row execute function private.notify_coaching_comment();
