-- Signup demographics are fixed; email/password remain managed by Supabase Auth.
REVOKE UPDATE (birth_year, gender) ON public.users FROM PUBLIC, anon, authenticated;

COMMENT ON COLUMN public.clans.min_birth_year IS '가입 가능한 출생연도 상한(포함). 기존 생성 폼의 N년생 이전 의미를 유지한다.';

CREATE FUNCTION private.clan_recruitment_error(p_clan public.clans, p_user_id uuid)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE u public.users%rowtype;
BEGIN
  SELECT * INTO u FROM public.users WHERE id=p_user_id;
  IF NOT FOUND THEN RETURN '가입 정보를 확인할 수 없습니다. 다시 로그인해 주십시오.'; END IF;
  IF p_clan.min_birth_year IS NOT NULL AND u.birth_year > p_clan.min_birth_year THEN
    RETURN p_clan.min_birth_year || '년생 및 이전 출생자만 신청할 수 있습니다.';
  END IF;
  IF p_clan.gender_policy <> 'all' AND u.gender::text <> p_clan.gender_policy::text THEN
    RETURN '클랜의 성별 가입 조건을 충족하지 않습니다. 성별 비공개 계정은 성별 제한 클랜에 신청할 수 없습니다.';
  END IF;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION private.clan_recruitment_error(public.clans,uuid) FROM PUBLIC,anon,authenticated;

-- Locks use the same clan -> user order as approval. Direct REST writes are checked too.
CREATE FUNCTION private.guard_clan_recruitment() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE c public.clans%rowtype; reason text;
BEGIN
  IF new.status IN ('pending','approved') THEN
    SELECT * INTO c FROM public.clans WHERE id=new.clan_id FOR UPDATE;
    IF NOT FOUND OR new.game_id<>c.game_id OR c.lifecycle_status<>'active' OR c.moderation_status<>'clean' THEN
      RAISE EXCEPTION '이 클랜에는 지금 가입 신청할 수 없습니다.' USING ERRCODE='22023';
    END IF;
    PERFORM 1 FROM public.users WHERE id=new.user_id FOR UPDATE;
    reason := private.clan_recruitment_error(c,new.user_id);
    IF reason IS NOT NULL THEN RAISE EXCEPTION '%',reason USING ERRCODE='22023'; END IF;
  END IF;
  RETURN new;
END $$;
REVOKE ALL ON FUNCTION private.guard_clan_recruitment() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER guard_clan_recruitment BEFORE INSERT OR UPDATE OF status,user_id,clan_id,game_id ON public.clan_join_requests
FOR EACH ROW EXECUTE FUNCTION private.guard_clan_recruitment();

CREATE FUNCTION public.update_clan_recruitment(p_clan_id uuid,p_birth_year_limit int DEFAULT NULL,p_gender_policy text DEFAULT 'all',p_tiers text[] DEFAULT '{}')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE c public.clans%rowtype;
BEGIN
  SELECT * INTO c FROM public.clans WHERE id=p_clan_id FOR UPDATE;
  IF NOT FOUND OR auth.uid() IS NULL OR NOT public.is_clan_officer_plus(p_clan_id) THEN
    RAISE EXCEPTION '가입 조건을 변경할 권한이 없습니다.' USING ERRCODE='42501';
  END IF;
  IF p_gender_policy IS NULL OR p_gender_policy NOT IN ('all','male','female') OR p_tiers IS NULL OR
    cardinality(p_tiers)>8 OR EXISTS(SELECT 1 FROM unnest(p_tiers) t WHERE t IS NULL OR t NOT IN ('bronze','silver','gold','plat','diamond','master','gm','challenger')) OR
    (p_birth_year_limit IS NOT NULL AND p_birth_year_limit NOT BETWEEN 1950 AND extract(year FROM now() AT TIME ZONE 'Asia/Seoul')::int-10) THEN
    RAISE EXCEPTION '가입 조건을 확인해 주십시오.' USING ERRCODE='22023';
  END IF;
  UPDATE public.clans SET min_birth_year=p_birth_year_limit,gender_policy=p_gender_policy::public.clan_gender_policy,
    tier_range=ARRAY(SELECT DISTINCT t FROM unnest(p_tiers) t ORDER BY t),updated_at=now() WHERE id=c.id;
END $$;
REVOKE ALL ON FUNCTION public.update_clan_recruitment(uuid,int,text,text[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.update_clan_recruitment(uuid,int,text,text[]) TO authenticated;

-- Changing the target must preserve the old request when the new one is ineligible.
CREATE FUNCTION public.replace_clan_join_request(p_clan_id uuid,p_message text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE c public.clans%rowtype; actor uuid:=auth.uid(); reason text;
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION '로그인이 필요합니다.' USING ERRCODE='42501'; END IF;
  SELECT * INTO c FROM public.clans WHERE id=p_clan_id FOR UPDATE;
  IF NOT FOUND OR c.lifecycle_status<>'active' OR c.moderation_status<>'clean' THEN
    RAISE EXCEPTION '이 클랜에는 지금 가입 신청할 수 없습니다.';
  END IF;
  PERFORM 1 FROM public.users WHERE id=actor FOR UPDATE;
  IF private.game_player_name(actor,c.game_id) IS NULL THEN RAISE EXCEPTION '게임 ID를 먼저 등록해 주십시오.'; END IF;
  IF EXISTS(SELECT 1 FROM public.clan_members m JOIN public.clans other ON other.id=m.clan_id WHERE m.user_id=actor AND m.status='active' AND other.game_id=c.game_id) THEN
    RAISE EXCEPTION '이미 게임 클랜에 소속되어 있습니다.';
  END IF;
  reason:=private.clan_recruitment_error(c,actor);
  IF reason IS NOT NULL THEN RAISE EXCEPTION '%',reason USING ERRCODE='22023'; END IF;
  IF EXISTS(SELECT 1 FROM public.clan_join_requests WHERE clan_id=c.id AND user_id=actor AND status='pending') THEN
    RAISE EXCEPTION '이미 이 클랜에 신청 중입니다.';
  END IF;
  UPDATE public.clan_join_requests SET status='canceled',resolved_at=now(),resolved_by=actor WHERE user_id=actor AND game_id=c.game_id AND status='pending';
  INSERT INTO public.clan_join_requests(clan_id,user_id,game_id,message)
    VALUES(c.id,actor,c.game_id,left(coalesce(trim(p_message),''),2000));
END $$;
REVOKE ALL ON FUNCTION public.replace_clan_join_request(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.replace_clan_join_request(uuid,text) TO authenticated;
