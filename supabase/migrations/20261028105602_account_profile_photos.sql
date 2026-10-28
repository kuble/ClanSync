create table public.account_profile_photos (
  user_id uuid primary key references public.users(id) on delete cascade,
  image_path text check (image_path is null or image_path ~ ('^' || user_id::text || '/[0-9a-f-]{36}\.webp$'))
);
alter table public.account_profile_photos enable row level security;
revoke all on public.account_profile_photos from anon, authenticated;
grant select on public.account_profile_photos to authenticated;
grant all on public.account_profile_photos to service_role;

create policy account_profile_photos_read on public.account_profile_photos
for select to authenticated using (
  user_id = (select auth.uid()) or exists (
    select 1 from public.clan_members m
    where m.user_id = account_profile_photos.user_id and m.status = 'active'
      and public.is_active_clan_member(m.clan_id)
  )
);

-- Files are served through the authenticated app route, never a public Storage URL.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-photos', 'profile-photos', false, 1048576, array['image/webp']);
comment on table public.account_profile_photos is 'Account-wide discussion avatar, independent of namecard cosmetics. Validated server uploads only.';
