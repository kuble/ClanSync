-- D-NOTIF-01: 피드 항목 읽음 처리 (클라이언트는 RPC만 호출; 직접 UPDATE는 비허용).

CREATE OR REPLACE FUNCTION public.mark_notification_reads (p_ids uuid[])
  RETURNS integer
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO public
  AS $$
DECLARE
  n int;
BEGIN
  IF p_ids IS NULL OR array_length(p_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;
  UPDATE public.notifications
  SET read_at = now()
  WHERE id = ANY (p_ids)
    AND recipient_user_id = (SELECT auth.uid () AS uid)
    AND read_at IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

COMMENT ON FUNCTION public.mark_notification_reads (uuid[]) IS 'D-NOTIF-01: 표시 중인 알림 일괄 읽음.';

CREATE OR REPLACE FUNCTION public.mark_notifications_read_all_for_clan (p_clan_id uuid)
  RETURNS integer
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO public
  AS $$
DECLARE
  n int;
BEGIN
  IF NOT public.is_active_clan_member (p_clan_id) THEN
    RAISE EXCEPTION 'active clan membership required';
  END IF;
  UPDATE public.notifications
  SET read_at = now()
  WHERE recipient_user_id = (SELECT auth.uid () AS uid)
    AND clan_id = p_clan_id
    AND read_at IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

COMMENT ON FUNCTION public.mark_notifications_read_all_for_clan (uuid) IS 'D-NOTIF-01: 해당 클랜 미읽음 알림 전부 읽음.';

REVOKE ALL ON FUNCTION public.mark_notification_reads (uuid[]) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.mark_notifications_read_all_for_clan (uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.mark_notification_reads (uuid[]) TO authenticated;

GRANT EXECUTE ON FUNCTION public.mark_notifications_read_all_for_clan (uuid) TO authenticated;
