-- D-EVENTS-03/04 — 투표 알림 Discord 웹훅 배치(claim → HTTP → finalize). notification_status 에 processing 추가.

ALTER TYPE public.notification_status
  ADD VALUE IF NOT EXISTS 'processing';

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
      AND nl.status IN (
        'scheduled'::public.notification_status,
        'processing'::public.notification_status
      );
  END IF;
  RETURN NEW;
END;
$$;

-- 예약된 Discord 투표 알림을 잠그고 processing 으로 전환, 페이로드 JSON 배열 반환
CREATE OR REPLACE FUNCTION public.claim_discord_poll_notification_batch (p_limit integer)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $$
DECLARE
  lim int := GREATEST(1, LEAST(COALESCE(p_limit, 25), 100));
  result jsonb;
BEGIN
  WITH picked AS (
    SELECT
      nl.id
    FROM
      notification_log nl
      INNER JOIN clan_polls cp ON cp.id = nl.poll_id
      INNER JOIN clan_settings cs ON cs.clan_id = cp.clan_id
    WHERE
      nl.channel = 'discord'::public.notification_channel
      AND nl.status = 'scheduled'::public.notification_status
      AND nl.scheduled_at <= now()
      AND nl.poll_id IS NOT NULL
      AND (cs.event_notify ->> 'discord_enabled')::boolean IS TRUE
      AND POSITION('https://discord.com/api/webhooks/' IN
        trim(coalesce(cs.event_notify ->> 'discord_webhook_url', ''))) = 1
    ORDER BY
      nl.scheduled_at ASC,
      nl.id ASC
    LIMIT lim
    FOR UPDATE OF nl
      SKIP LOCKED
  ),
  upd AS (
    UPDATE
      notification_log nl
    SET
      status = 'processing'::public.notification_status,
      updated_at = now(),
      attempt_count = nl.attempt_count + 1
    FROM
      picked p
    WHERE
      nl.id = p.id
    RETURNING
      nl.id,
      nl.poll_id,
      nl.slot_kind,
      nl.scheduled_at
  )
  SELECT
    jsonb_agg(jsonb_build_object(
        'log_id', u.id,
        'poll_id', u.poll_id,
        'slot_kind', u.slot_kind::text,
        'scheduled_at', u.scheduled_at,
        'poll_title', cp.title,
        'deadline_at', cp.deadline_at,
        'webhook_url', trim(cs.event_notify ->> 'discord_webhook_url'),
        'clan_id', cp.clan_id,
        'game_slug', g.slug
      )) INTO result
  FROM
    upd u
    INNER JOIN clan_polls cp ON cp.id = u.poll_id
    INNER JOIN clan_settings cs ON cs.clan_id = cp.clan_id
    INNER JOIN clans c ON c.id = cp.clan_id
    INNER JOIN games g ON g.id = c.game_id;

  RETURN coalesce(result, '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_discord_notification_dispatch (
  p_log_id uuid,
  p_ok boolean,
  p_error text
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $$
BEGIN
  UPDATE
    public.notification_log
  SET
    status = CASE WHEN p_ok THEN
      'sent'::public.notification_status
    ELSE
      'failed'::public.notification_status
    END,
    effective_at = CASE WHEN p_ok THEN
      now()
    ELSE
      NULL
    END,
    last_error = CASE WHEN p_ok THEN
      NULL
    ELSE
      left(coalesce(p_error, 'webhook'), 500)
    END,
    updated_at = now()
  WHERE
    id = p_log_id
    AND status = 'processing'::public.notification_status;
END;
$$;

COMMENT ON FUNCTION public.claim_discord_poll_notification_batch (integer) IS
  'D-EVENTS-04 — due Discord poll 알림을 processing 으로 잠금 후 반환. service_role 전용.';

COMMENT ON FUNCTION public.finalize_discord_notification_dispatch (uuid, boolean, text) IS
  'Discord 웹훅 시도 후 notification_log 를 sent/failed 로 확정.';

REVOKE ALL ON FUNCTION public.claim_discord_poll_notification_batch (integer)
FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.claim_discord_poll_notification_batch (integer)
TO service_role;

REVOKE ALL ON FUNCTION public.finalize_discord_notification_dispatch (uuid, boolean, text)
FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.finalize_discord_notification_dispatch (uuid, boolean, text)
TO service_role;
