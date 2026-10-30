-- Keep legacy plain text/history while the current recruitment ad supports inline photos.
ALTER TABLE public.board_posts ADD COLUMN content_blocks jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
CREATE INDEX board_posts_clan_promotion_latest_idx ON public.board_posts(clan_id,created_at DESC,id DESC)
  WHERE post_type='promotion';

-- Legacy REST inserts remain text-only; structured content must use the checked RPC.
CREATE FUNCTION private.guard_promotion_blocks() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  IF current_user IN ('authenticated','anon') AND (new.content_blocks<>'[]'::jsonb
    OR (TG_OP='UPDATE' AND old.content_blocks IS DISTINCT FROM new.content_blocks)) THEN
    RAISE EXCEPTION '홍보 편집 저장 기능을 이용해 주십시오.' USING ERRCODE='42501';
  END IF;
  RETURN new;
END $$;
REVOKE ALL ON FUNCTION private.guard_promotion_blocks() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER guard_promotion_blocks BEFORE INSERT OR UPDATE OF content_blocks ON public.board_posts
FOR EACH ROW EXECUTE FUNCTION private.guard_promotion_blocks();

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('clan-promotion-images','clan-promotion-images',false,5242880,ARRAY['image/webp']);

-- Draft images are visible to their managers; published images are visible during discovery.
CREATE POLICY promotion_image_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK(
  bucket_id='clan-promotion-images' AND (storage.foldername(name))[2]=(SELECT auth.uid())::text
  AND EXISTS(SELECT 1 FROM public.clans c WHERE c.id::text=(storage.foldername(name))[1]
    AND c.lifecycle_status='active' AND c.moderation_status='clean' AND public.is_clan_officer_plus(c.id))
);
CREATE POLICY promotion_image_read ON storage.objects FOR SELECT TO authenticated USING(
  bucket_id='clan-promotion-images' AND EXISTS(SELECT 1 FROM public.clans c
    WHERE c.id::text=(storage.foldername(name))[1] AND c.lifecycle_status='active' AND c.moderation_status='clean'
    AND (public.is_clan_officer_plus(c.id) OR EXISTS(SELECT 1 FROM public.board_posts p
      WHERE p.clan_id=c.id AND p.game_id=c.game_id AND p.post_type='promotion'
      AND p.content_blocks @> jsonb_build_array(jsonb_build_object('type','image','path',name)))))
);
-- A failed response must never cause cleanup to erase an already committed photo.
CREATE POLICY promotion_image_delete ON storage.objects FOR DELETE TO authenticated USING(
  bucket_id='clan-promotion-images' AND (storage.foldername(name))[2]=(SELECT auth.uid())::text
  AND EXISTS(SELECT 1 FROM public.clans c WHERE c.id::text=(storage.foldername(name))[1] AND public.is_clan_officer_plus(c.id))
  AND NOT EXISTS(SELECT 1 FROM public.board_posts p WHERE p.clan_id::text=(storage.foldername(name))[1]
    AND p.content_blocks @> jsonb_build_array(jsonb_build_object('type','image','path',name)))
);

CREATE FUNCTION public.save_clan_promotion(p_clan_id uuid,p_post_id uuid,p_title text,p_blocks jsonb,
  p_expected_updated_at timestamptz DEFAULT NULL,p_birth_year_limit int DEFAULT NULL,p_gender_policy text DEFAULT 'all',p_tiers text[] DEFAULT '{}')
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
  PERFORM public.update_clan_recruitment(c.id,p_birth_year_limit,p_gender_policy,p_tiers);
  IF current_post.id IS NULL THEN
    INSERT INTO public.board_posts(id,game_id,clan_id,post_type,title,content,content_blocks,created_by,updated_at)
      VALUES(p_post_id,c.game_id,c.id,'promotion',btrim(p_title),body,p_blocks,auth.uid(),stamp);
  ELSE
    UPDATE public.board_posts p SET title=btrim(p_title),content=body,content_blocks=p_blocks,updated_at=stamp WHERE p.id=current_post.id;
  END IF;
  RETURN QUERY SELECT p_post_id,stamp;
END $$;
REVOKE ALL ON FUNCTION public.save_clan_promotion(uuid,uuid,text,jsonb,timestamptz,int,text,text[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_clan_promotion(uuid,uuid,text,jsonb,timestamptz,int,text,text[]) TO authenticated;
