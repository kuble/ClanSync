-- R08: lock the clan before the request, then validate and commit together.
CREATE FUNCTION public.resolve_clan_join_request(
  p_clan_id uuid, p_request_id uuid, p_decision text, p_reason text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' SET row_security = off
AS $$
DECLARE
  c public.clans%rowtype;
  r public.clan_join_requests%rowtype;
  actor uuid := auth.uid();
BEGIN
  IF actor IS NULL OR p_decision IS NULL OR p_decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION '잘못된 가입 처리 요청입니다.' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO c FROM public.clans WHERE id = p_clan_id FOR UPDATE;
  IF NOT FOUND OR NOT public.is_clan_officer_plus(p_clan_id) THEN
    RAISE EXCEPTION '가입을 처리할 권한이 없습니다.' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO r FROM public.clan_join_requests
    WHERE id = p_request_id AND clan_id = p_clan_id FOR UPDATE;
  IF NOT FOUND OR r.status <> 'pending' OR r.game_id <> c.game_id THEN
    RAISE EXCEPTION '처리할 수 없는 신청입니다.' USING ERRCODE = '22023';
  END IF;
  IF p_decision = 'approved' THEN
    PERFORM 1 FROM public.users WHERE id = r.user_id FOR UPDATE;
    IF c.lifecycle_status <> 'active' OR c.moderation_status IN ('hidden', 'deleted') THEN
      RAISE EXCEPTION '가입할 수 없는 클랜입니다.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.user_game_profiles
      WHERE user_id = r.user_id AND game_id = c.game_id AND is_verified) THEN
      RAISE EXCEPTION '게임 인증이 필요합니다.';
    END IF;
    IF EXISTS (SELECT 1 FROM public.clan_members cm JOIN public.clans other ON other.id = cm.clan_id
      WHERE cm.user_id = r.user_id AND other.game_id = c.game_id AND cm.status = 'active') THEN
      RAISE EXCEPTION '이미 게임 클랜에 소속되어 있습니다.';
    END IF;
    IF (SELECT count(*) FROM public.clan_members WHERE clan_id = c.id AND status = 'active') >= c.max_members THEN
      RAISE EXCEPTION '클랜 정원이 찼습니다.';
    END IF;
    IF EXISTS (SELECT 1 FROM public.clan_members WHERE clan_id = c.id AND user_id = r.user_id) THEN
      RAISE EXCEPTION '이미 클랜에 등록된 사용자입니다.';
    END IF;
    INSERT INTO public.clan_members (clan_id, user_id, role, status, joined_at, last_activity_at)
      VALUES (c.id, r.user_id, 'member', 'active', now(), now());
  END IF;
  UPDATE public.clan_join_requests SET status = p_decision::public.clan_join_request_status,
    resolved_at = now(), resolved_by = actor,
    reject_reason = CASE WHEN p_decision = 'rejected' THEN nullif(left(trim(p_reason), 500), '') END
    WHERE id = r.id;
END;
$$;
REVOKE ALL ON FUNCTION public.resolve_clan_join_request(uuid, uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_clan_join_request(uuid, uuid, text, text) TO authenticated;

-- Applicants can still cancel a pending join request, but cannot move it.
REVOKE UPDATE ON public.clan_join_requests FROM PUBLIC, anon, authenticated;
GRANT UPDATE (status, resolved_at, resolved_by) ON public.clan_join_requests TO authenticated;

-- R05/R09: direct status writes are replaced by authenticated state transitions.
REVOKE INSERT, UPDATE ON public.lfg_applications FROM PUBLIC, anon, authenticated;
REVOKE UPDATE ON public.lfg_posts FROM PUBLIC, anon, authenticated;
DROP POLICY lfg_app_insert_self ON public.lfg_applications;
DROP POLICY lfg_app_update_applicant ON public.lfg_applications;
DROP POLICY lfg_app_update_creator ON public.lfg_applications;

CREATE FUNCTION public.apply_lfg_post(p_post_id uuid, p_message text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' SET row_security = off
AS $$
DECLARE p public.lfg_posts%rowtype; actor uuid := auth.uid(); result uuid;
BEGIN
  SELECT * INTO p FROM public.lfg_posts WHERE id = p_post_id FOR UPDATE;
  IF actor IS NULL OR NOT FOUND OR p.creator_user_id = actor OR p.status <> 'open' OR p.expires_at <= now() THEN
    RAISE EXCEPTION '신청할 수 없는 모집입니다.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_game_profiles WHERE user_id = actor AND game_id = p.game_id AND is_verified) THEN
    RAISE EXCEPTION '게임 인증이 필요합니다.' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (SELECT 1 FROM public.lfg_applications WHERE post_id = p.id AND applicant_user_id = actor AND status IN ('applied', 'accepted')) THEN
    RAISE EXCEPTION '이미 신청한 모집입니다.' USING ERRCODE = '23505';
  END IF;
  INSERT INTO public.lfg_applications (post_id, applicant_user_id, message)
    VALUES (p.id, actor, nullif(left(trim(p_message), 200), '')) RETURNING id INTO result;
  RETURN result;
END;
$$;

CREATE FUNCTION public.resolve_lfg_application(p_post_id uuid, p_application_id uuid, p_decision text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' SET row_security = off
AS $$
DECLARE p public.lfg_posts%rowtype; a public.lfg_applications%rowtype; actor uuid := auth.uid(); n integer;
BEGIN
  IF actor IS NULL OR p_decision IS NULL OR p_decision NOT IN ('accepted', 'rejected', 'canceled') THEN
    RAISE EXCEPTION '잘못된 신청 처리 요청입니다.';
  END IF;
  SELECT * INTO p FROM public.lfg_posts WHERE id = p_post_id FOR UPDATE;
  IF NOT FOUND OR p.status <> 'open' OR p.expires_at <= now() THEN
    RAISE EXCEPTION '모집이 마감되었습니다.';
  END IF;
  SELECT * INTO a FROM public.lfg_applications WHERE id = p_application_id AND post_id = p.id FOR UPDATE;
  IF NOT FOUND OR a.status <> 'applied' THEN RAISE EXCEPTION '처리할 수 없는 신청입니다.'; END IF;
  IF (p_decision = 'canceled' AND a.applicant_user_id <> actor)
    OR (p_decision <> 'canceled' AND p.creator_user_id <> actor) THEN
    RAISE EXCEPTION '신청을 처리할 권한이 없습니다.' USING ERRCODE = '42501';
  END IF;
  SELECT count(*) INTO n FROM public.lfg_applications WHERE post_id = p.id AND status = 'accepted';
  IF p_decision = 'accepted' AND n >= p.slots THEN RAISE EXCEPTION '모집 정원이 찼습니다.'; END IF;
  UPDATE public.lfg_applications SET status = p_decision::public.lfg_application_status,
    resolved_at = now(), resolved_by = actor WHERE id = a.id;
  IF p_decision = 'accepted' AND n + 1 >= p.slots THEN
    UPDATE public.lfg_posts SET status = 'filled' WHERE id = p.id;
    UPDATE public.lfg_applications SET status = 'expired', resolved_at = now(), resolved_by = actor
      WHERE post_id = p.id AND status = 'applied';
  END IF;
END;
$$;

CREATE FUNCTION public.cancel_lfg_post(p_post_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' SET row_security = off
AS $$
DECLARE p public.lfg_posts%rowtype; actor uuid := auth.uid();
BEGIN
  SELECT * INTO p FROM public.lfg_posts WHERE id = p_post_id FOR UPDATE;
  IF actor IS NULL OR NOT FOUND OR p.creator_user_id <> actor OR p.status <> 'open' THEN
    RAISE EXCEPTION '취소할 수 없는 모집입니다.' USING ERRCODE = '42501';
  END IF;
  UPDATE public.lfg_posts SET status = 'canceled' WHERE id = p.id;
  UPDATE public.lfg_applications SET status = 'expired', resolved_at = now(), resolved_by = actor
    WHERE post_id = p.id AND status = 'applied';
END;
$$;
REVOKE ALL ON FUNCTION public.apply_lfg_post(uuid, text), public.resolve_lfg_application(uuid, uuid, text), public.cancel_lfg_post(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_lfg_post(uuid, text), public.resolve_lfg_application(uuid, uuid, text), public.cancel_lfg_post(uuid) TO authenticated;
