-- M7 — D-LFG-01: 만료 시각이 지난 open LFG 글을 expired로 일괄 전환 + 대기 중(applied) 신청 만료 처리.
-- Cron (`dispatch-notifications` 등)에서 service_role로 호출.

CREATE OR REPLACE FUNCTION public.expire_open_lfg_posts_batch (p_limit integer DEFAULT 500)
  RETURNS integer
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $$
DECLARE
  v_n int;
  v_cap int;
BEGIN
  v_cap := GREATEST(1, LEAST(COALESCE(NULLIF(p_limit, 0), 500), 2000));

  WITH to_expire AS (
    SELECT
      id
    FROM
      public.lfg_posts
    WHERE
      status = 'open'::public.lfg_post_status
      AND expires_at <= now()
    ORDER BY
      expires_at ASC
    LIMIT v_cap
    FOR UPDATE SKIP LOCKED
),
expired AS (
  UPDATE
    public.lfg_posts p
  SET
    status = 'expired'::public.lfg_post_status
  FROM
    to_expire t
  WHERE
    p.id = t.id
  RETURNING
    p.id
),
_apps AS (
  UPDATE
    public.lfg_applications a
  SET
    status = 'expired'::public.lfg_application_status,
    resolved_at = now()
  WHERE
    a.post_id IN (
      SELECT
        id
      FROM
        expired
    )
    AND a.status = 'applied'::public.lfg_application_status
  RETURNING
    a.id
)
  SELECT
    count(*)::int INTO v_n
  FROM
    expired;

  RETURN COALESCE(v_n, 0);
END;
$$;

COMMENT ON FUNCTION public.expire_open_lfg_posts_batch (integer) IS
  'D-LFG-01 — 만료된 open LFG 글을 expired로 바꾸고 applied 신청을 expired 처리. service_role 전용.';

REVOKE ALL ON FUNCTION public.expire_open_lfg_posts_batch (integer)
FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.expire_open_lfg_posts_batch (integer)
TO service_role;
