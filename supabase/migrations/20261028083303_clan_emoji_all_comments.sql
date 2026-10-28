-- Keep existing post reactions and extend the same ledger to every clan discussion.
alter table public.clan_emoji_reactions drop constraint clan_emoji_reactions_pkey;
alter table public.clan_emoji_reactions alter column post_id drop not null;
alter table public.clan_emoji_reactions
  add column id uuid primary key default gen_random_uuid(),
  add column board_comment_id uuid references public.clan_board_comments(id) on delete cascade,
  add column hof_comment_id uuid references public.clan_hof_comments(id) on delete cascade,
  add column notice_id uuid references public.clan_notices(id) on delete cascade,
  add constraint emoji_exactly_one_target check(num_nonnulls(post_id,board_comment_id,hof_comment_id,notice_id)=1),
  add unique(post_id,emoji_id,user_id), add unique(board_comment_id,emoji_id,user_id),
  add unique(hof_comment_id,emoji_id,user_id), add unique(notice_id,emoji_id,user_id);
grant insert(board_comment_id,hof_comment_id,notice_id) on public.clan_emoji_reactions to authenticated;

-- The underlying tables keep membership and HoF disclosure checks in their own RLS.
create function public.can_use_clan_emoji_target(p_emoji_id uuid,p_post_id uuid,p_board_comment_id uuid,p_hof_comment_id uuid,p_notice_id uuid)
returns boolean language sql stable security invoker set search_path='' as $$
  select exists(select 1 from public.clan_emojis e where e.id=p_emoji_id and (
    exists(select 1 from public.clan_board_posts p where p.id=p_post_id and p.clan_id=e.clan_id)
    or exists(select 1 from public.clan_board_comments c join public.clan_board_posts p on p.id=c.post_id where c.id=p_board_comment_id and p.clan_id=e.clan_id)
    or exists(select 1 from public.clan_hof_comments c where c.id=p_hof_comment_id and c.clan_id=e.clan_id)
    or exists(select 1 from public.clan_notices n where n.id=p_notice_id and n.clan_id=e.clan_id)
  ));
$$;
revoke all on function public.can_use_clan_emoji_target(uuid,uuid,uuid,uuid,uuid) from public,anon;
grant execute on function public.can_use_clan_emoji_target(uuid,uuid,uuid,uuid,uuid) to authenticated;
drop policy emoji_reaction_read on public.clan_emoji_reactions;
drop policy emoji_reaction_insert on public.clan_emoji_reactions;
drop policy emoji_reaction_delete on public.clan_emoji_reactions;
create policy emoji_reaction_read on public.clan_emoji_reactions for select to authenticated using(
  public.can_use_clan_emoji_target(emoji_id,post_id,board_comment_id,hof_comment_id,notice_id));
create policy emoji_reaction_insert on public.clan_emoji_reactions for insert to authenticated with check(
  user_id=(select auth.uid()) and public.can_use_clan_emoji_target(emoji_id,post_id,board_comment_id,hof_comment_id,notice_id));
create policy emoji_reaction_delete on public.clan_emoji_reactions for delete to authenticated using(
  user_id=(select auth.uid()) and public.can_use_clan_emoji_target(emoji_id,post_id,board_comment_id,hof_comment_id,notice_id));

create function public.list_clan_emoji_reactions(p_post_ids uuid[] default '{}',p_board_comment_ids uuid[] default '{}',p_hof_comment_ids uuid[] default '{}',p_notice_ids uuid[] default '{}')
returns table(target_id uuid,target_kind text,emoji_id uuid,total bigint,mine boolean)
language sql stable security invoker set search_path='' as $$
  select coalesce(r.post_id,r.board_comment_id,r.hof_comment_id,r.notice_id),
    case when r.post_id is not null then 'post' when r.board_comment_id is not null then 'board_comment' when r.hof_comment_id is not null then 'hof_comment' else 'notice' end,
    r.emoji_id,count(*),bool_or(r.user_id=auth.uid())
  from public.clan_emoji_reactions r
  where r.post_id=any(p_post_ids) or r.board_comment_id=any(p_board_comment_ids) or r.hof_comment_id=any(p_hof_comment_ids) or r.notice_id=any(p_notice_ids)
  group by r.post_id,r.board_comment_id,r.hof_comment_id,r.notice_id,r.emoji_id;
$$;
revoke all on function public.list_clan_emoji_reactions(uuid[],uuid[],uuid[],uuid[]) from public,anon;
grant execute on function public.list_clan_emoji_reactions(uuid[],uuid[],uuid[],uuid[]) to authenticated;
