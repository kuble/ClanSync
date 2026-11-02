-- Keep existing management settings, including explicitly cleared links.
update public.clan_settings s
set community_links = jsonb_strip_nulls(jsonb_build_object(
  'discord', case when trim(c.discord_url) ~* '^https://(discord[.]gg/|((www[.])?discord[.]com|discordapp[.]com)/invite/)[a-z0-9_-]+/?([?#].*)?$' then trim(c.discord_url) end,
  'kakao', case when trim(c.kakao_url) ~* '^https://open[.]kakao[.]com/o/[a-z0-9]+/?([?#].*)?$' then trim(c.kakao_url) end
)) || s.community_links
from public.clans c
where c.id = s.clan_id and (c.discord_url is not null or c.kakao_url is not null);

alter table public.clans
  drop column tags,
  drop column discord_url,
  drop column kakao_url;

comment on column public.clan_settings.community_links is
  'Member-facing chat invite URLs managed in clan settings.';
