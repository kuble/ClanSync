-- M7 — D-LFG-01 LFG 만료 후 in-app 예약(notification_log → dispatch).

ALTER TYPE public.notification_slot_kind ADD VALUE IF NOT EXISTS 'lfg_post_expired';

ALTER TYPE public.notification_slot_kind ADD VALUE IF NOT EXISTS 'lfg_application_expired';

ALTER TABLE public.notification_log DROP CONSTRAINT IF EXISTS notification_log_event_xor_poll_ck;

ALTER TABLE public.notification_log ADD COLUMN IF NOT EXISTS lfg_post_id uuid REFERENCES public.lfg_posts (id) ON DELETE CASCADE;

ALTER TABLE public.notification_log ADD CONSTRAINT notification_log_scope_exactly_one CHECK (
  (
    CASE WHEN poll_id IS NOT NULL THEN 1 ELSE 0 END
    + CASE WHEN event_id IS NOT NULL THEN 1 ELSE 0 END
    + CASE WHEN lfg_post_id IS NOT NULL THEN 1 ELSE 0 END
  ) = 1
);

CREATE INDEX notification_log_lfg_sched_idx ON public.notification_log (lfg_post_id, scheduled_at)
WHERE lfg_post_id IS NOT NULL
  AND status = 'scheduled'::public.notification_status;

COMMENT ON COLUMN public.notification_log.lfg_post_id IS 'M7 — LFG 만료 in-app 타깃.';

-- 만료 처리 + 작성자·대기 신청자 notification_log 행 적재 (크론이 이어 dispatch).
CREATE OR REPLACE FUNCTION public.expire_open_lfg_posts_batch (p_limit integer DEFAULT 500)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_lim integer := GREATEST(1, LEAST(COALESCE(NULLIF(p_limit, 0), 500), 2000));
  v_now timestamptz := now();
  r RECORD;
  v_rc integer;
  v_n integer := 0;
BEGIN
  FOR r IN
  SELECT p.id AS post_id, p.creator_user_id AS creator_user_id
  FROM public.lfg_posts AS p
  WHERE p.status = 'open'::public.lfg_post_status
    AND p.expires_at <= v_now
  ORDER BY p.expires_at ASC
  LIMIT v_lim
  FOR UPDATE OF p SKIP LOCKED
  LOOP
    UPDATE public.lfg_posts AS l
    SET status = 'expired'::public.lfg_post_status
    WHERE l.id = r.post_id
      AND l.status = 'open'::public.lfg_post_status;
    GET DIAGNOSTICS v_rc = ROW_COUNT;
    IF v_rc = 0 THEN CONTINUE;
    END IF;

    v_n := v_n + 1;

    INSERT INTO public.notification_log (
      event_id,
      instance_idx,
      poll_id,
      lfg_post_id,
      slot_kind,
      channel,
      recipient_user_id,
      scheduled_at,
      dedup_key,
      status
    )
    SELECT
      NULL,
      NULL,
      NULL,
      r.post_id,
      'lfg_post_expired'::public.notification_slot_kind,
      'inapp'::public.notification_channel,
      r.creator_user_id,
      v_now,
      md5(format('lfg|post|%s|author',
          r.post_id::text)),
      'scheduled'::public.notification_status
    WHERE NOT EXISTS (
      SELECT 1 FROM public.notification_log AS x
      WHERE x.lfg_post_id = r.post_id
        AND x.slot_kind = 'lfg_post_expired'::public.notification_slot_kind AND x.channel = 'inapp'::public.notification_channel
        AND x.recipient_user_id = r.creator_user_id);

    WITH applicant_updates AS (
      UPDATE public.lfg_applications AS a
      SET status = 'expired'::public.lfg_application_status,
        resolved_at = v_now
      WHERE a.post_id = r.post_id AND a.status = 'applied'::public.lfg_application_status
      RETURNING a.applicant_user_id AS uid
    )
INSERT INTO public.notification_log (event_id, instance_idx, poll_id, lfg_post_id, slot_kind, channel,
      recipient_user_id, scheduled_at, dedup_key, status)
 SELECT
 NULL, NULL,
 NULL,
 r.post_id,
 'lfg_application_expired'::public.notification_slot_kind,
 'inapp'::public.notification_channel,
 au.uid,
 v_now,
 md5(format('lfg|app|%s|%s', r.post_id::text,
        au.uid::text)),
 'scheduled'::public.notification_status
      FROM applicant_updates au
WHERE au.uid <> r.creator_user_id
      AND NOT EXISTS (
 SELECT 1 FROM public.notification_log AS nl
      WHERE nl.lfg_post_id = r.post_id
        AND nl.slot_kind =
        'lfg_application_expired'::public.notification_slot_kind AND nl.channel = 'inapp'::public.notification_channel AND nl.recipient_user_id =
        au.uid);
  END LOOP;
  RETURN v_n;
END;
$$;

COMMENT ON FUNCTION public.expire_open_lfg_posts_batch (integer) IS
'D-LFG-01 — open LFG 만료 + 작성자·지원자 in-app(notification_log).';

CREATE OR REPLACE FUNCTION public.dispatch_inapp_notification_batch (p_limit integer DEFAULT 100)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  rec RECORD;
  v_clan_id uuid;
  v_title text;
  v_cancelled timestamptz;
  v_game_slug text;
  v_lp_mode text;
  v_lp_desc text;
  nl_kind text;
  n int := 0;
  lim int;
BEGIN
  lim := GREATEST(1, LEAST(COALESCE(p_limit, 100), 500));
  FOR rec IN
  SELECT nl.id AS id, nl.poll_id AS poll_id,
    nl.event_id AS event_id, nl.lfg_post_id AS lfg_post_id,
    nl.recipient_user_id AS recipient_user_id,
    nl.slot_kind AS slot_kind
  FROM public.notification_log nl
  WHERE nl.status = 'scheduled'::public.notification_status
    AND nl.channel = 'inapp'::public.notification_channel
    AND nl.scheduled_at <= now()
  ORDER BY nl.scheduled_at ASC LIMIT lim FOR UPDATE OF nl SKIP LOCKED
  LOOP
    IF rec.poll_id IS NOT NULL THEN
      SELECT cp.clan_id, cp.title INTO v_clan_id, v_title
      FROM public.clan_polls cp
      WHERE cp.id = rec.poll_id;
      IF NOT FOUND THEN
        UPDATE public.notification_log
        SET status = 'failed'::public.notification_status, last_error = 'poll not found', updated_at = now()
        WHERE id = rec.id;
        CONTINUE;
      END IF;

      BEGIN
        INSERT INTO public.notifications (recipient_user_id, clan_id, kind,
          source_table, source_id, payload)
          VALUES (
            rec.recipient_user_id, v_clan_id,
            'poll_reminder',
            'notification_log',
            rec.id,
            jsonb_build_object('poll_id',
              rec.poll_id,
              'poll_title',
              v_title,
              'slot_kind',
              rec.slot_kind::text));
        UPDATE public.notification_log
        SET
          status = 'sent'::public.notification_status,
          effective_at = now(),
          updated_at = now(),
          attempt_count = attempt_count + 1
        WHERE id = rec.id;
        n := n + 1;
      EXCEPTION WHEN OTHERS THEN
        UPDATE public.notification_log
        SET status = 'failed'::public.notification_status,
          last_error = left(SQLERRM, 500),
          updated_at = now(),
          attempt_count = attempt_count + 1 WHERE id = rec.id;
      END;

    ELSIF rec.event_id IS NOT NULL THEN
      SELECT ce.clan_id, ce.title, ce.cancelled_at INTO v_clan_id, v_title, v_cancelled
      FROM public.clan_events ce
      WHERE ce.id = rec.event_id;
      IF NOT FOUND OR v_cancelled IS NOT NULL THEN
        UPDATE public.notification_log
        SET
          status = 'cancelled'::public.notification_status,
          last_error = 'event missing or cancelled',
          updated_at = now()
        WHERE id = rec.id;
        CONTINUE;
      END IF;

      BEGIN
        INSERT INTO public.notifications (
          recipient_user_id, clan_id, kind,
          source_table, source_id, payload
        )
        VALUES (
          rec.recipient_user_id,
          v_clan_id,
          'event_reminder',
          'notification_log',
          rec.id,
          jsonb_build_object('event_id', rec.event_id, 'event_title', v_title,
            'slot_kind', rec.slot_kind::text));
        UPDATE public.notification_log SET status = 'sent'::public.notification_status,
          effective_at = now(), updated_at = now(), attempt_count = attempt_count + 1
        WHERE id = rec.id;
        n := n + 1;
      EXCEPTION WHEN OTHERS THEN
        UPDATE public.notification_log SET status = 'failed'::public.notification_status,
          last_error = left(SQLERRM, 500), updated_at = now(), attempt_count = attempt_count + 1
        WHERE id = rec.id;
      END;

    ELSIF rec.lfg_post_id IS NOT NULL THEN
      SELECT g.slug, lp.mode, left(coalesce(lp.description, ''::text), 140)::text INTO
        v_game_slug, v_lp_mode, v_lp_desc
      FROM public.lfg_posts lp
      INNER JOIN public.games g ON g.id = lp.game_id
      WHERE lp.id = rec.lfg_post_id;

      IF NOT FOUND THEN
        UPDATE public.notification_log SET status = 'failed'::public.notification_status,
          last_error = 'lfg post not found', updated_at = now() WHERE id = rec.id;
        CONTINUE;
      END IF;

      nl_kind := CASE WHEN rec.slot_kind = 'lfg_post_expired'::public.notification_slot_kind THEN 'lfg_post_expired'
        WHEN rec.slot_kind = 'lfg_application_expired'::public.notification_slot_kind THEN 'lfg_application_expired'
        ELSE 'lfg_expire' END;

      BEGIN
        INSERT INTO public.notifications (recipient_user_id, clan_id,
          kind,
          source_table, source_id, payload)
          VALUES (
            rec.recipient_user_id,
            NULL,
            nl_kind,
            'notification_log',
            rec.id,
            jsonb_build_object('lfg_post_id',
              rec.lfg_post_id,
              'game_slug',
              v_game_slug,
              'mode',
              v_lp_mode,
              'description_preview',
              v_lp_desc,
              'slot_kind',
              rec.slot_kind::text));
        UPDATE public.notification_log SET status = 'sent'::public.notification_status,
          effective_at = now(), updated_at = now(),
          attempt_count = attempt_count + 1 WHERE id = rec.id;
        n := n + 1;
      EXCEPTION WHEN OTHERS THEN
        UPDATE public.notification_log SET status = 'failed'::public.notification_status,
          last_error = left(SQLERRM, 500), updated_at = now(),
          attempt_count = attempt_count + 1 WHERE id = rec.id;
      END;

    ELSE
      UPDATE public.notification_log SET status = 'failed'::public.notification_status,
        last_error = 'in-app worker: poll_id, event_id, or lfg_post_id required', updated_at = now()
      WHERE id = rec.id;
    END IF;

  END LOOP;
  RETURN n;
END;
$$;

COMMENT ON FUNCTION public.dispatch_inapp_notification_batch (integer) IS
'D-NOTIF-01 scheduled → notifications. poll, event, lfg 만료류.';

CREATE OR REPLACE FUNCTION public.mark_notifications_read_all_for_clan (p_clan_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE n int;

BEGIN IF NOT public.is_active_clan_member (p_clan_id) THEN RAISE EXCEPTION 'active clan membership required';
END IF;

UPDATE public.notifications
SET read_at = now()
WHERE recipient_user_id = (SELECT auth.uid () AS uid) AND read_at IS NULL AND (clan_id = p_clan_id OR clan_id IS NULL);

GET DIAGNOSTICS n = ROW_COUNT;

RETURN n;

END;
$$;

COMMENT ON FUNCTION public.mark_notifications_read_all_for_clan (uuid) IS
'D-NOTIF-01: 해당 클랜 미읽음 전부 읽음 + 게임 전역 알림(clan_id null).';

REVOKE ALL ON FUNCTION public.expire_open_lfg_posts_batch (integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.expire_open_lfg_posts_batch (integer) TO service_role;
