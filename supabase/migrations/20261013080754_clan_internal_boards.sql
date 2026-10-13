create table public.clan_board_posts (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans(id) on delete cascade,
  author_id uuid default auth.uid() references public.users(id) on delete set null,
  kind text not null check (kind in ('free','feedback','channels','memories')),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  content text not null default '' check (char_length(content) <= 20000),
  details jsonb not null default '{}' check (jsonb_typeof(details) = 'object' and octet_length(details::text) <= 4000),
  status text not null default 'requested' check (status in ('requested','answering','complete')),
  image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (kind = 'feedback' or status = 'requested'),
  check (kind <> 'memories' or (image_path is not null and char_length(content) <= 100)),
  check (image_path is null or (
    image_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'
    and split_part(image_path,'/',1) = clan_id::text
    and split_part(image_path,'/',3) = id::text
    and (author_id is null or split_part(image_path,'/',2) = author_id::text)
  ))
);
create index clan_board_posts_feed_idx on public.clan_board_posts(clan_id,kind,created_at desc,id desc);
create index clan_board_posts_author_idx on public.clan_board_posts(author_id);
create trigger clan_board_posts_updated_at before update on public.clan_board_posts
  for each row execute function public.set_updated_at();
alter table public.clan_board_posts enable row level security;
revoke all on public.clan_board_posts from public,anon,authenticated;
grant all on public.clan_board_posts to service_role;
grant select,delete on public.clan_board_posts to authenticated;
grant insert(id,clan_id,kind,title,content,details,status,image_path) on public.clan_board_posts to authenticated;
grant update(title,content,details,status,image_path) on public.clan_board_posts to authenticated;
create policy board_member_read on public.clan_board_posts for select to authenticated
  using(public.is_active_clan_member(clan_id));
create policy board_member_insert on public.clan_board_posts for insert to authenticated
  with check(public.is_active_clan_member(clan_id) and author_id = (select auth.uid()));
create policy board_author_update on public.clan_board_posts for update to authenticated
  using(public.is_active_clan_member(clan_id) and (author_id = (select auth.uid()) or public.is_clan_officer_plus(clan_id)))
  with check(public.is_active_clan_member(clan_id) and (author_id = (select auth.uid()) or public.is_clan_officer_plus(clan_id)));
create policy board_author_delete on public.clan_board_posts for delete to authenticated
  using(public.is_active_clan_member(clan_id) and (author_id = (select auth.uid()) or public.is_clan_officer_plus(clan_id)));

create table public.clan_board_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.clan_board_posts(id) on delete cascade,
  author_id uuid default auth.uid() references public.users(id) on delete set null,
  content text not null check(char_length(btrim(content)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index clan_board_comments_post_idx on public.clan_board_comments(post_id,created_at,id);
create index clan_board_comments_author_idx on public.clan_board_comments(author_id);
alter table public.clan_board_comments enable row level security;
revoke all on public.clan_board_comments from public,anon,authenticated;
grant all on public.clan_board_comments to service_role;
grant select,delete on public.clan_board_comments to authenticated;
grant insert(post_id,content) on public.clan_board_comments to authenticated;
grant update(content) on public.clan_board_comments to authenticated;
create policy board_comment_read on public.clan_board_comments for select to authenticated
  using(exists(select 1 from public.clan_board_posts p where p.id=post_id));
create policy board_comment_insert on public.clan_board_comments for insert to authenticated
  with check(author_id=(select auth.uid()) and exists(select 1 from public.clan_board_posts p where p.id=post_id));
create policy board_comment_update on public.clan_board_comments for update to authenticated
  using(exists(select 1 from public.clan_board_posts p where p.id=post_id and (clan_board_comments.author_id=(select auth.uid()) or public.is_clan_officer_plus(p.clan_id))))
  with check(exists(select 1 from public.clan_board_posts p where p.id=post_id and (clan_board_comments.author_id=(select auth.uid()) or public.is_clan_officer_plus(p.clan_id))));
create policy board_comment_delete on public.clan_board_comments for delete to authenticated
  using(exists(select 1 from public.clan_board_posts p where p.id=post_id and (clan_board_comments.author_id=(select auth.uid()) or public.is_clan_officer_plus(p.clan_id))));

create table public.clan_board_reactions (
  post_id uuid not null references public.clan_board_posts(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.users(id) on delete cascade,
  primary key(post_id,user_id)
);
create index clan_board_reactions_user_idx on public.clan_board_reactions(user_id);
alter table public.clan_board_reactions enable row level security;
revoke all on public.clan_board_reactions from public,anon,authenticated;
grant all on public.clan_board_reactions to service_role;
grant select,delete on public.clan_board_reactions to authenticated;
grant insert(post_id) on public.clan_board_reactions to authenticated;
create policy board_reaction_read on public.clan_board_reactions for select to authenticated
  using(exists(select 1 from public.clan_board_posts p where p.id=post_id));
create policy board_reaction_insert on public.clan_board_reactions for insert to authenticated
  with check(user_id=(select auth.uid()) and exists(select 1 from public.clan_board_posts p where p.id=post_id));
create policy board_reaction_delete on public.clan_board_reactions for delete to authenticated
  using(user_id=(select auth.uid()) and exists(select 1 from public.clan_board_posts p where p.id=post_id));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('clan-board-images','clan-board-images',false,5242880,array['image/jpeg','image/png','image/webp']);
-- Text folder comparison avoids UUID casts on arbitrary object names.
create policy board_image_insert on storage.objects for insert to authenticated with check(
  bucket_id='clan-board-images' and (storage.foldername(name))[2]=(select auth.uid())::text
  and exists(select 1 from public.clan_members m where m.clan_id::text=(storage.foldername(name))[1] and m.user_id=(select auth.uid()) and m.status='active')
);
create policy board_image_read on storage.objects for select to authenticated using(
  bucket_id='clan-board-images'
  and exists(select 1 from public.clan_members m where m.clan_id::text=(storage.foldername(name))[1] and m.user_id=(select auth.uid()) and m.status='active')
);
create policy board_image_delete on storage.objects for delete to authenticated using(
  bucket_id='clan-board-images'
  and exists(select 1 from public.clan_members m where m.clan_id::text=(storage.foldername(name))[1] and m.user_id=(select auth.uid()) and m.status='active')
  and (
    ((storage.foldername(name))[2]=(select auth.uid())::text and not exists(
      select 1 from public.clan_board_posts p where p.id::text=(storage.foldername(name))[3] and p.image_path is not null
      and regexp_replace(p.image_path,'\.(jpg|png|webp)$','')=regexp_replace(name,'(\.thumb)?\.(jpg|png|webp)$','')
    ))
    or exists(select 1 from public.clan_members m where m.clan_id::text=(storage.foldername(name))[1] and m.user_id=(select auth.uid()) and m.status='active' and m.role in ('leader','officer'))
  )
);
