-- Preserve the historical min_birth_year (upper bound) and add an inclusive lower bound.
ALTER TABLE public.clans ADD COLUMN birth_year_from int,
  ADD CONSTRAINT clans_birth_year_range CHECK (
    (birth_year_from IS NULL OR birth_year_from>=1950)
    AND (birth_year_from IS NULL OR min_birth_year IS NULL OR birth_year_from<=min_birth_year)
  );
COMMENT ON COLUMN public.clans.birth_year_from IS 'Inclusive birth-year lower bound; min_birth_year retains its historical upper-bound meaning.';

CREATE FUNCTION private.guard_clan_birth_year_range() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE last_year int:=extract(year FROM now() AT TIME ZONE 'Asia/Seoul')::int-10;
BEGIN
  IF (new.birth_year_from IS NOT NULL AND new.birth_year_from NOT BETWEEN 1950 AND last_year)
    OR (new.min_birth_year IS NOT NULL AND new.min_birth_year NOT BETWEEN 1950 AND last_year)
    OR (new.birth_year_from IS NOT NULL AND new.min_birth_year IS NOT NULL AND new.birth_year_from>new.min_birth_year) THEN
    RAISE EXCEPTION '출생연도 하한과 상한을 확인해 주십시오.' USING ERRCODE='22023';
  END IF;
  RETURN new;
END $$;
REVOKE ALL ON FUNCTION private.guard_clan_birth_year_range() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER guard_clan_birth_year_range BEFORE INSERT OR UPDATE OF birth_year_from,min_birth_year ON public.clans
FOR EACH ROW EXECUTE FUNCTION private.guard_clan_birth_year_range();

CREATE OR REPLACE FUNCTION private.clan_recruitment_error(p_clan public.clans,p_user_id uuid) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE u public.users%rowtype;
BEGIN
  SELECT * INTO u FROM public.users WHERE id=p_user_id;
  IF NOT FOUND THEN RETURN '가입 정보를 확인할 수 없습니다. 다시 로그인해 주십시오.'; END IF;
  IF p_clan.birth_year_from IS NOT NULL AND u.birth_year<p_clan.birth_year_from THEN
    RETURN p_clan.birth_year_from || '년생 및 이후 출생자만 신청할 수 있습니다.';
  END IF;
  IF p_clan.min_birth_year IS NOT NULL AND u.birth_year>p_clan.min_birth_year THEN
    RETURN p_clan.min_birth_year || '년생 및 이전 출생자만 신청할 수 있습니다.';
  END IF;
  IF p_clan.gender_policy<>'all' AND u.gender::text<>p_clan.gender_policy::text THEN
    RETURN '클랜의 성별 가입 조건을 충족하지 않습니다. 성별 비공개 계정은 성별 제한 클랜에 신청할 수 없습니다.';
  END IF;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION private.clan_recruitment_error(public.clans,uuid) FROM PUBLIC,anon,authenticated;

-- Replace the signatures rather than leaving ambiguous default-argument overloads.
DROP FUNCTION public.update_clan_recruitment(uuid,int,text,text[]);
CREATE FUNCTION public.update_clan_recruitment(p_clan_id uuid,p_birth_year_limit int DEFAULT NULL,p_gender_policy text DEFAULT 'all',p_tiers text[] DEFAULT '{}',p_birth_year_from int DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c public.clans%rowtype; allowed text[]; last_year int:=extract(year FROM now() AT TIME ZONE 'Asia/Seoul')::int-10;
BEGIN
  SELECT * INTO c FROM public.clans WHERE id=p_clan_id FOR UPDATE;
  IF NOT FOUND OR auth.uid() IS NULL OR NOT public.is_clan_officer_plus(p_clan_id) THEN
    RAISE EXCEPTION '가입 조건을 변경할 권한이 없습니다.' USING ERRCODE='42501';
  END IF;
  SELECT private.recruitment_tier_ids(g.slug) INTO allowed FROM public.games g WHERE g.id=c.game_id;
  IF p_gender_policy IS NULL OR p_gender_policy NOT IN ('all','male','female') OR p_tiers IS NULL OR
    cardinality(p_tiers)>cardinality(allowed) OR EXISTS(SELECT 1 FROM unnest(p_tiers) t WHERE t IS NULL OR NOT t=ANY(allowed)) OR
    (p_birth_year_limit IS NOT NULL AND p_birth_year_limit NOT BETWEEN 1950 AND last_year) OR
    (p_birth_year_from IS NOT NULL AND p_birth_year_from NOT BETWEEN 1950 AND last_year) OR
    (p_birth_year_from IS NOT NULL AND p_birth_year_limit IS NOT NULL AND p_birth_year_from>p_birth_year_limit) THEN
    RAISE EXCEPTION '가입 조건의 출생연도 범위·성별·티어를 확인해 주십시오.' USING ERRCODE='22023';
  END IF;
  UPDATE public.clans SET birth_year_from=p_birth_year_from,min_birth_year=p_birth_year_limit,gender_policy=p_gender_policy::public.clan_gender_policy,
    tier_range=ARRAY(SELECT t FROM unnest(allowed) t WHERE t=ANY(p_tiers)),updated_at=now() WHERE id=c.id;
END $$;
REVOKE ALL ON FUNCTION public.update_clan_recruitment(uuid,int,text,text[],int) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.update_clan_recruitment(uuid,int,text,text[],int) TO authenticated;

DROP FUNCTION public.save_clan_promotion(uuid,uuid,text,jsonb,timestamptz,int,text,text[]);
CREATE FUNCTION public.save_clan_promotion(p_clan_id uuid,p_post_id uuid,p_title text,p_blocks jsonb,
  p_expected_updated_at timestamptz DEFAULT NULL,p_birth_year_limit int DEFAULT NULL,p_gender_policy text DEFAULT 'all',p_tiers text[] DEFAULT '{}',p_birth_year_from int DEFAULT NULL)
RETURNS TABLE(id uuid,updated_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c public.clans%rowtype; current_post public.board_posts%rowtype; b jsonb; body text:='';
  images int:=0; image_path text; stamp timestamptz:=clock_timestamp();
BEGIN
  SELECT * INTO c FROM public.clans WHERE clans.id=p_clan_id FOR UPDATE;
  IF NOT FOUND OR auth.uid() IS NULL OR NOT public.is_clan_officer_plus(p_clan_id)
    OR c.lifecycle_status<>'active' OR c.moderation_status<>'clean' THEN
    RAISE EXCEPTION '클랜 홍보를 저장할 권한이 없습니다.' USING ERRCODE='42501';
  END IF;
  SELECT * INTO current_post FROM public.board_posts p WHERE p.clan_id=c.id AND p.post_type='promotion'
    ORDER BY p.created_at DESC,p.id DESC LIMIT 1 FOR UPDATE;
  IF (current_post.id IS NOT NULL AND (current_post.id IS DISTINCT FROM p_post_id OR current_post.updated_at IS DISTINCT FROM p_expected_updated_at))
    OR (current_post.id IS NULL AND p_expected_updated_at IS NOT NULL) THEN
    RAISE EXCEPTION '다른 운영진이 수정했습니다. 새로고침 후 다시 저장해 주십시오.' USING ERRCODE='40001';
  END IF;
  IF p_post_id IS NULL OR p_title IS NULL OR char_length(btrim(p_title)) NOT BETWEEN 1 AND 200
    OR p_blocks IS NULL OR jsonb_typeof(p_blocks)<>'array' THEN
    RAISE EXCEPTION '제목과 내용을 확인해 주십시오.' USING ERRCODE='22023';
  END IF;
  IF jsonb_array_length(p_blocks) NOT BETWEEN 1 AND 25 THEN
    RAISE EXCEPTION '본문 구성을 확인해 주십시오.' USING ERRCODE='22023';
  END IF;
  FOR b IN SELECT value FROM jsonb_array_elements(p_blocks) LOOP
    IF jsonb_typeof(b)<>'object' THEN RAISE EXCEPTION '잘못된 본문입니다.' USING ERRCODE='22023'; END IF;
    IF b->>'type'='text' AND jsonb_typeof(b->'text')='string' THEN
      body:=body || CASE WHEN body='' THEN '' ELSE E'\n\n' END || (b->>'text');
    ELSIF b->>'type'='image' AND jsonb_typeof(b->'path')='string' AND jsonb_typeof(b->'alt')='string' AND char_length(b->>'alt')<=160 THEN
      images:=images+1; image_path:=b->>'path';
      IF image_path !~ ('^'||c.id::text||'/[0-9a-f-]{36}/'||p_post_id::text||'/[0-9a-f-]{36}\.webp$') OR NOT EXISTS(
        SELECT 1 FROM storage.objects o WHERE o.bucket_id='clan-promotion-images' AND o.name=image_path
      ) OR (split_part(image_path,'/',2)<>auth.uid()::text AND NOT coalesce(current_post.content_blocks @> jsonb_build_array(jsonb_build_object('type','image','path',image_path)),false)) THEN
        RAISE EXCEPTION '이 홍보글에 업로드한 사진만 사용할 수 있습니다.' USING ERRCODE='22023';
      END IF;
    ELSE RAISE EXCEPTION '잘못된 본문입니다.' USING ERRCODE='22023';
    END IF;
  END LOOP;
  body:=btrim(body);
  IF char_length(body)>8000 OR images>6 OR (body='' AND images=0) THEN
    RAISE EXCEPTION '내용은 8,000자, 사진은 6장까지 저장할 수 있습니다.' USING ERRCODE='22023';
  END IF;
  -- Conditions and the ad succeed or roll back together, including late validation failures.
  PERFORM public.update_clan_recruitment(c.id,p_birth_year_limit,p_gender_policy,p_tiers,p_birth_year_from);
  IF current_post.id IS NULL THEN
    INSERT INTO public.board_posts(id,game_id,clan_id,post_type,title,content,content_blocks,created_by,updated_at)
      VALUES(p_post_id,c.game_id,c.id,'promotion',btrim(p_title),body,p_blocks,auth.uid(),stamp);
  ELSE
    UPDATE public.board_posts p SET title=btrim(p_title),content=body,content_blocks=p_blocks,updated_at=stamp WHERE p.id=current_post.id;
  END IF;
  RETURN QUERY SELECT p_post_id,stamp;
END $$;
REVOKE ALL ON FUNCTION public.save_clan_promotion(uuid,uuid,text,jsonb,timestamptz,int,text,text[],int) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_clan_promotion(uuid,uuid,text,jsonb,timestamptz,int,text,text[],int) TO authenticated;
