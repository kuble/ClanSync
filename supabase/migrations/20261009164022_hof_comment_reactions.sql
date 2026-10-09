-- A member keeps one reaction per comment. Changing it replaces the old kind.
create table public.clan_hof_comment_reactions (
  comment_id uuid not null references public.clan_hof_comments(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.users(id) on delete cascade,
  kind text not null check (kind in ('like', 'heart', 'laugh', 'clap', 'surprised', 'sad')),
  primary key (comment_id, user_id)
);
create index clan_hof_comment_reactions_user_idx on public.clan_hof_comment_reactions(user_id);
alter table public.clan_hof_comment_reactions enable row level security;
revoke all on public.clan_hof_comment_reactions from public, anon, authenticated;
grant all on public.clan_hof_comment_reactions to service_role;
grant select, delete on public.clan_hof_comment_reactions to authenticated;
grant insert (comment_id, kind), update (kind) on public.clan_hof_comment_reactions to authenticated;

-- Parent SELECT RLS applies the clan, category and period disclosure rules.
create policy hof_comment_reactions_read on public.clan_hof_comment_reactions for select to authenticated
  using (exists (select 1 from public.clan_hof_comments c where c.id = comment_id));
create policy hof_comment_reactions_create on public.clan_hof_comment_reactions for insert to authenticated
  with check (user_id = (select auth.uid())
    and exists (select 1 from public.clan_hof_comments c where c.id = comment_id));
create policy hof_comment_reactions_update on public.clan_hof_comment_reactions for update to authenticated
  using (user_id = (select auth.uid()) and exists (select 1 from public.clan_hof_comments c where c.id = comment_id))
  with check (user_id = (select auth.uid()) and exists (select 1 from public.clan_hof_comments c where c.id = comment_id));
create policy hof_comment_reactions_delete on public.clan_hof_comment_reactions for delete to authenticated
  using (user_id = (select auth.uid()) and exists (select 1 from public.clan_hof_comments c where c.id = comment_id));

-- Return at most six summaries per comment, without exposing member IDs.
create function public.list_hof_comment_reactions(p_comment_ids uuid[])
returns table(comment_id uuid, kind text, total bigint, mine boolean)
language sql stable security invoker set search_path = '' as $$
  select r.comment_id, r.kind, count(*), bool_or(r.user_id = (select auth.uid()))
  from public.clan_hof_comment_reactions r
  where cardinality(p_comment_ids) between 1 and 30 and r.comment_id = any(p_comment_ids)
  group by r.comment_id, r.kind;
$$;
revoke all on function public.list_hof_comment_reactions(uuid[]) from public, anon;
grant execute on function public.list_hof_comment_reactions(uuid[]) to authenticated, service_role;

-- An explicit desired state makes retries idempotent; NULL removes one's reaction.
create function public.set_hof_comment_reaction(p_comment_id uuid, p_kind text default null)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null or not exists (select 1 from public.clan_hof_comments c where c.id = p_comment_id) then
    raise exception 'Comment is unavailable' using errcode = '42501';
  end if;
  if p_kind is null then
    delete from public.clan_hof_comment_reactions where comment_id = p_comment_id and user_id = auth.uid();
  else
    insert into public.clan_hof_comment_reactions(comment_id, kind) values (p_comment_id, p_kind)
      on conflict (comment_id, user_id) do update set kind = excluded.kind;
  end if;
end;
$$;
revoke all on function public.set_hof_comment_reaction(uuid, text) from public, anon;
grant execute on function public.set_hof_comment_reaction(uuid, text) to authenticated;
