-- D-NOTIF-01 피드 레이어 MVP + in-app 발송 배치 RPC (notification_log scheduled → sent).

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  recipient_user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  clan_id uuid NULL REFERENCES public.clans (id) ON DELETE CASCADE,
  kind text NOT NULL,
  source_table text NOT NULL,
  source_id uuid NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now ()
);

COMMENT ON TABLE public.notifications IS 'D-NOTIF-01 in-app 피드. notification_log 발송과 별도 레이어.';

CREATE INDEX notifications_unread_idx ON public.notifications (recipient_user_id, created_at DESC)
WHERE
  read_at IS NULL;

CREATE INDEX notifications_by_recipient_idx ON public.notifications (recipient_user_id, created_at DESC);

CREATE INDEX notifications_by_source_idx ON public.notifications (source_table, source_id);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_select_own ON public.notifications FOR
SELECT
  USING (recipient_user_id = (SELECT auth.uid () AS uid));

GRANT SELECT ON TABLE public.notifications TO authenticated;

GRANT ALL ON TABLE public.notifications TO service_role;

-- in-app 예약 행 처리: 피드 INSERT + 로그 sent. 투표(poll_id)만 MVP.
CREATE OR REPLACE FUNCTION public.dispatch_inapp_notification_batch (p_limit integer DEFAULT 100)
  RETURNS integer
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $$
DECLARE
  rec RECORD;
  v_clan_id uuid;
  v_title text;
  n int := 0;
  lim int;
BEGIN
  lim := GREATEST(1, LEAST(COALESCE(p_limit, 100), 500));
  FOR rec IN
  SELECT
    nl.id,
    nl.poll_id,
    nl.recipient_user_id,
    nl.slot_kind
  FROM
    public.notification_log nl
  WHERE
    nl.status = 'scheduled'::public.notification_status
    AND nl.channel = 'inapp'::public.notification_channel
    AND nl.scheduled_at <= now()
  ORDER BY
    nl.scheduled_at ASC
  LIMIT lim
  FOR UPDATE
    OF nl
  SKIP LOCKED LOOP
    IF rec.poll_id IS NULL THEN
      UPDATE public.notification_log
      SET status = 'failed'::public.notification_status,
        last_error = 'in-app worker: poll_id required in MVP',
        updated_at = now()
      WHERE id = rec.id;
      CONTINUE;
    END IF;
    SELECT
      cp.clan_id,
      cp.title INTO v_clan_id,
      v_title
    FROM
      public.clan_polls cp
    WHERE
      cp.id = rec.poll_id;
    IF NOT FOUND THEN
      UPDATE public.notification_log
      SET status = 'failed'::public.notification_status,
        last_error = 'poll not found',
        updated_at = now()
      WHERE id = rec.id;
      CONTINUE;
    END IF;
    BEGIN
      INSERT INTO public.notifications (recipient_user_id, clan_id, kind, source_table, source_id, payload)
        VALUES (
          rec.recipient_user_id,
          v_clan_id,
          'poll_reminder',
          'notification_log',
          rec.id,
          jsonb_build_object(
            'poll_id',
            rec.poll_id,
            'poll_title',
            v_title,
            'slot_kind',
            rec.slot_kind::text
          ));
      UPDATE public.notification_log
      SET status = 'sent'::public.notification_status,
        effective_at = now(),
        updated_at = now(),
        attempt_count = attempt_count + 1
      WHERE id = rec.id;
      n := n + 1;
    EXCEPTION
      WHEN OTHERS THEN
        UPDATE public.notification_log
        SET status = 'failed'::public.notification_status,
          last_error = left(SQLERRM, 500),
          updated_at = now(),
          attempt_count = attempt_count + 1
        WHERE id = rec.id;
    END;
  END LOOP;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.dispatch_inapp_notification_batch (integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.dispatch_inapp_notification_batch (integer) TO service_role;
