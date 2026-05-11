-- 프로필(D-PROFILE-02) 등에서 본인 가입 신청만 안정적으로 조회한다.
-- RLS 정책(cjr_select_staff 등) 평가·PostgREST 조합으로 SELECT 가 실패하는 환경을 피하기 위해
-- my_active_clan_for_game 과 동일 패턴으로 SECURITY DEFINER + auth.uid() 고정 필터만 사용한다.

CREATE OR REPLACE FUNCTION public.select_my_clan_join_requests()
RETURNS SETOF public.clan_join_requests
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
    FROM public.clan_join_requests
   WHERE user_id = auth.uid()
   ORDER BY applied_at DESC;
$$;

REVOKE ALL ON FUNCTION public.select_my_clan_join_requests() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.select_my_clan_join_requests() TO authenticated;
