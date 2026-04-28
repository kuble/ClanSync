-- M6b — D-EVENTS-04 poll notification reservations (notification_log MVP, in-app rows; Discord/Kakao workers later).

CREATE TYPE public.notification_slot_kind AS ENUM (
  'event_t_minus_24h',
  'event_t_minus_1h',
  'event_t_minus_10min',
  'event_t_0',
  'poll_created',
  'poll_daily',
  'poll_weekly',
  'poll_deadline_window',
  'poll_deadline_1h',
  'event_cancelled'
);

CREATE TYPE public.notification_channel AS ENUM ('inapp', 'discord', 'kakao', 'web_push');

CREATE TYPE public.notification_status AS ENUM (
  'scheduled',
  'sent',
  'failed',
  'cancelled',
  'dlq'
);

CREATE TABLE public.notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  event_id uuid NULL REFERENCES public.clan_events (id) ON DELETE CASCADE,
  instance_idx integer NULL,
  poll_id uuid NULL REFERENCES public.clan_polls (id) ON DELETE CASCADE,
  slot_kind public.notification_slot_kind NOT NULL,
  channel public.notification_channel NOT NULL,
  recipient_user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  scheduled_at timestamptz NOT NULL,
  effective_at timestamptz NULL,
  status public.notification_status NOT NULL DEFAULT 'scheduled'::public.notification_status,
  attempt_count smallint NOT NULL DEFAULT 0,
  last_error text NULL,
  dedup_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now (),
  CONSTRAINT notification_log_event_xor_poll_ck CHECK (
    (event_id IS NULL AND poll_id IS NOT NULL)
    OR (event_id IS NOT NULL AND poll_id IS NULL)
  )
);

COMMENT ON TABLE public.notification_log IS 'D-EVENTS-03/04 발송 예약·로그. 투표(MVP)·일정(후속).';

CREATE UNIQUE INDEX notification_log_poll_dedup_uq ON public.notification_log (poll_id, slot_kind, scheduled_at, channel, recipient_user_id)
WHERE
  poll_id IS NOT NULL;

CREATE UNIQUE INDEX notification_log_event_dedup_uq ON public.notification_log (event_id, instance_idx, slot_kind, channel, recipient_user_id)
WHERE
  event_id IS NOT NULL;

CREATE INDEX notification_log_poll_sched_idx ON public.notification_log (poll_id, scheduled_at)
WHERE
  status = 'scheduled'::public.notification_status;

CREATE INDEX notification_log_recipient_idx ON public.notification_log (recipient_user_id, scheduled_at DESC);

CREATE TRIGGER trg_notification_log_updated_at
  BEFORE UPDATE ON public.notification_log
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at ();

CREATE OR REPLACE FUNCTION public.cancel_notification_log_on_poll_close ()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $$
BEGIN
  IF NEW.closed_at IS NOT NULL
    AND (
      OLD.closed_at IS NULL
      OR OLD.closed_at IS DISTINCT FROM NEW.closed_at
    ) THEN
    UPDATE public.notification_log nl
    SET status = 'cancelled'::public.notification_status,
      updated_at = now()
    WHERE nl.poll_id = NEW.id
      AND nl.status = 'scheduled'::public.notification_status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_clan_polls_cancel_notifications_on_close
  AFTER UPDATE OF closed_at ON public.clan_polls
  FOR EACH ROW
  EXECUTE FUNCTION public.cancel_notification_log_on_poll_close ();

ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.notification_log TO service_role;

-- 마감 시각 경과 후에도 scheduled 가 남는 경우 일괄 취소 (이벤트 페이지 등에서 호출 · cron 후속 가능)
CREATE OR REPLACE FUNCTION public.maint_cancel_poll_notifications_past_deadline ()
  RETURNS void
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $$
  UPDATE public.notification_log nl
  SET status = 'cancelled'::public.notification_status,
    updated_at = now()
  FROM public.clan_polls p
  WHERE nl.poll_id = p.id
    AND nl.status = 'scheduled'::public.notification_status
    AND p.deadline_at <= now();
$$;

REVOKE ALL ON FUNCTION public.maint_cancel_poll_notifications_past_deadline () FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.maint_cancel_poll_notifications_past_deadline () TO service_role;
