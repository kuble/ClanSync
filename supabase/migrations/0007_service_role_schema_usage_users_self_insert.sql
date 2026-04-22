-- 0006 에서 누락: PostgREST 가 JWT role=service_role 일 때도 schema public 에 USAGE 가 필요하다.
-- 누락 시 증상: ensurePublicUserProfile 등에서 `permission denied for schema public` (42501).
GRANT USAGE ON SCHEMA public TO service_role;

-- 가입 직후 세션이 있는 경우(이메일 확인 끔) 인증된 클라이언트로 본인 행만 INSERT 가능.
-- 서비스 롤 키 미설정·오설정 시 보강 경로.
CREATE POLICY users_self_insert ON public.users
  FOR INSERT
  WITH CHECK (id = auth.uid());
