-- M6b — D-EVENTS-03 MVP: 클랜 일정 알림 설정 (Discord 웹훅 등, Premium 연동 전 스텁)

alter table public.clan_settings
  add column if not exists event_notify jsonb not null default '{}'::jsonb;

comment on column public.clan_settings.event_notify is
  'D-EVENTS-03 MVP: { "discord_enabled": bool, "discord_webhook_url": string } 등. RLS는 clan_settings 기존 정책(클랜장 update).';
