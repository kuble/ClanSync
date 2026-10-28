-- Invite links inherit active-member reads and leader-only writes from clan_settings.
alter table public.clan_settings
  add column community_links jsonb not null default '{}'::jsonb,
  add constraint clan_community_links_shape check (
    jsonb_typeof(community_links) = 'object'
    and octet_length(community_links::text) <= 16000
    and community_links - array['discord','kakao','line','telegram','whatsapp','steam'] = '{}'::jsonb
    and not jsonb_path_exists(community_links, '$.* ? (@.type() != "string")')
  );

comment on column public.clan_settings.community_links is
  'Member-facing chat invite URLs. Empty provider values explicitly hide legacy URLs. Unrelated to Discord bot delivery.';

update public.clan_settings s
set community_links = jsonb_strip_nulls(jsonb_build_object(
  'discord', case when c.discord_url ~* '^https://(discord[.]gg/|discord[.]com/invite/)' then c.discord_url end,
  'kakao', case when c.kakao_url ~* '^https://open[.]kakao[.]com/o/' then c.kakao_url end
))
from public.clans c
where c.id = s.clan_id and (c.discord_url is not null or c.kakao_url is not null);
