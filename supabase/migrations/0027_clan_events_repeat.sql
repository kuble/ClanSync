-- M6b 잔여 — 클랜 일정 반복 (D-EVENTS-02 Revised). manual 전용 제약 제거(scrim_auto 후속 대비).

CREATE TYPE public.clan_event_repeat AS ENUM ('none', 'weekly', 'monthly');

ALTER TABLE public.clan_events DROP CONSTRAINT IF EXISTS clan_events_mvp_manual_only;

ALTER TABLE public.clan_events
  ADD COLUMN repeat public.clan_event_repeat NOT NULL DEFAULT 'none',
  ADD COLUMN repeat_weekdays smallint[] NULL,
  ADD COLUMN repeat_time time without time zone NULL;

COMMENT ON COLUMN public.clan_events.repeat IS 'none · 매주 · 매월 (D-EVENTS-02)';
COMMENT ON COLUMN public.clan_events.repeat_weekdays IS 'ISO 요일 1=월 … 7=일, weekly 일 때만';
COMMENT ON COLUMN public.clan_events.repeat_time IS 'weekly/monthly 공통 시각 (로컬 저장 없음 → 앱에서 KST 해석)';

ALTER TABLE public.clan_events ADD CONSTRAINT clan_events_repeat_fields_ck CHECK (
  (
    repeat = 'none'::public.clan_event_repeat
    AND repeat_weekdays IS NULL
    AND repeat_time IS NULL
  )
  OR (
    repeat = 'weekly'::public.clan_event_repeat
    AND repeat_weekdays IS NOT NULL
    AND cardinality(repeat_weekdays) >= 1
    AND repeat_weekdays <@ ARRAY[1, 2, 3, 4, 5, 6, 7]::smallint[]
    AND repeat_time IS NOT NULL
  )
  OR (
    repeat = 'monthly'::public.clan_event_repeat
    AND repeat_weekdays IS NULL
    AND repeat_time IS NOT NULL
  )
);
