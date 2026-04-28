-- M6b 잔여 — 일정 RSVP (D-EVENTS-01 · 스크림 전용). instance_idx = 회차별 시작 시각(Unix ms, bigint).

CREATE TYPE public.event_rsvp_status AS ENUM ('going', 'maybe', 'not_going');

CREATE TABLE public.event_rsvps (
  event_id uuid NOT NULL REFERENCES public.clan_events (id) ON DELETE CASCADE,
  instance_idx bigint NOT NULL DEFAULT 0,
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  status public.event_rsvp_status NOT NULL DEFAULT 'going',
  responded_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_rsvps_pk PRIMARY KEY (event_id, instance_idx, user_id)
);

COMMENT ON TABLE public.event_rsvps IS
  '스크림 일정 참가 응답(D-EVENTS-01). 반복 일정은 instance_idx에 해당 회차 시작 시각(ms) 저장.';
COMMENT ON COLUMN public.event_rsvps.instance_idx IS '단발 0 또는 회차 시작 Unix ms';

CREATE INDEX event_rsvps_event_instance_idx ON public.event_rsvps (event_id, instance_idx);

CREATE OR REPLACE FUNCTION public.event_rsvps_scrim_kind_only ()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $$
DECLARE
  k public.clan_event_kind;
BEGIN
  SELECT kind INTO k FROM public.clan_events WHERE id = NEW.event_id;
  IF k IS DISTINCT FROM 'scrim'::public.clan_event_kind THEN
    RAISE EXCEPTION 'event_rsvps: RSVP는 스크림(kind=scrim) 일정만 가능합니다';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_event_rsvps_scrim_kind_only
  BEFORE INSERT OR UPDATE ON public.event_rsvps
  FOR EACH ROW
  EXECUTE FUNCTION public.event_rsvps_scrim_kind_only();

ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.event_rsvps TO service_role;
