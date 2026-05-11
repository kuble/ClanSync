-- D-EVENTS-03/D-NOTIF-01 — in-app 배치: 투표(poll_id)에 이어 단발 일정(event_id) 알림 발송.

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
  v_cancelled timestamptz;
  n int := 0;
  lim int;
BEGIN
  lim := GREATEST(1, LEAST(COALESCE(p_limit, 100), 500));
  FOR rec IN
  SELECT
    nl.id,
    nl.poll_id,
    nl.event_id,
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
    IF rec.poll_id IS NOT NULL THEN
      SELECT
        cp.clan_id,
        cp.title INTO v_clan_id,
        v_title
      FROM
        public.clan_polls cp
      WHERE
        cp.id = rec.poll_id;
      IF NOT FOUND THEN
        UPDATE
          public.notification_log
        SET
          status = 'failed'::public.notification_status,
          last_error = 'poll not found',
          updated_at = now()
        WHERE
          id = rec.id;
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
              rec.slot_kind::text));
        UPDATE
          public.notification_log
        SET
          status = 'sent'::public.notification_status,
          effective_at = now(),
          updated_at = now(),
          attempt_count = attempt_count + 1
        WHERE
          id = rec.id;
        n := n + 1;
      EXCEPTION
        WHEN OTHERS THEN
          UPDATE
            public.notification_log
          SET
            status = 'failed'::public.notification_status,
            last_error = left(SQLERRM, 500),
            updated_at = now(),
            attempt_count = attempt_count + 1
          WHERE
            id = rec.id;
      END;
    ELSIF rec.event_id IS NOT NULL THEN
      SELECT
        ce.clan_id,
        ce.title,
        ce.cancelled_at INTO v_clan_id,
        v_title,
        v_cancelled
      FROM
        public.clan_events ce
      WHERE
        ce.id = rec.event_id;
      IF NOT FOUND
        OR v_cancelled IS NOT NULL THEN
        UPDATE
          public.notification_log
        SET
          status = 'cancelled'::public.notification_status,
          last_error = 'event missing or cancelled',
          updated_at = now()
        WHERE
          id = rec.id;
        CONTINUE;
      END IF;
      BEGIN
        INSERT INTO public.notifications (recipient_user_id, clan_id, kind, source_table, source_id, payload)
          VALUES (
            rec.recipient_user_id,
            v_clan_id,
            'event_reminder',
            'notification_log',
            rec.id,
            jsonb_build_object(
              'event_id',
              rec.event_id,
              'event_title',
              v_title,
              'slot_kind',
              rec.slot_kind::text));
        UPDATE
          public.notification_log
        SET
          status = 'sent'::public.notification_status,
          effective_at = now(),
          updated_at = now(),
          attempt_count = attempt_count + 1
        WHERE
          id = rec.id;
        n := n + 1;
      EXCEPTION
        WHEN OTHERS THEN
          UPDATE
            public.notification_log
          SET
            status = 'failed'::public.notification_status,
            last_error = left(SQLERRM, 500),
            updated_at = now(),
            attempt_count = attempt_count + 1
          WHERE
            id = rec.id;
      END;
    ELSE
      UPDATE
        public.notification_log
      SET
        status = 'failed'::public.notification_status,
        last_error = 'in-app worker: poll_id or event_id required',
        updated_at = now()
      WHERE
        id = rec.id;
    END IF;
  END LOOP;
  RETURN n;
END;
$$;

COMMENT ON FUNCTION public.dispatch_inapp_notification_batch (integer) IS
  'D-NOTIF-01 scheduled → notifications. 투표(poll_reminder)·단발 일정(event_reminder). service_role 전용.';
