ALTER TABLE public.clans ADD COLUMN promotion_public boolean NOT NULL DEFAULT true;

-- All historical posts and their storage objects follow the current clan setting.
CREATE POLICY promotion_visibility ON public.board_posts AS RESTRICTIVE FOR SELECT TO authenticated
USING (post_type <> 'promotion' OR EXISTS (
  SELECT 1 FROM public.clans c WHERE c.id = board_posts.clan_id
    AND (c.promotion_public OR public.is_clan_officer_plus(c.id))
));

DROP FUNCTION public.save_clan_promotion(uuid,uuid,text,jsonb,timestamptz,int,text,text[],int,text,text[]);
CREATE FUNCTION public.save_clan_promotion(
  p_clan_id uuid, p_post_id uuid, p_title text, p_blocks jsonb,
  p_expected_updated_at timestamptz DEFAULT NULL, p_birth_year_limit int DEFAULT NULL,
  p_gender_policy text DEFAULT 'all', p_tiers text[] DEFAULT '{}', p_birth_year_from int DEFAULT NULL,
  p_style text DEFAULT NULL, p_positions text[] DEFAULT NULL, p_public boolean DEFAULT NULL
) RETURNS TABLE(id uuid, updated_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  saved record;
  roles constant text[] := ARRAY['tank', 'sup', 'dmg'];
  selected_roles text[];
BEGIN
  SELECT * INTO STRICT saved FROM private.save_clan_promotion(
    p_clan_id, p_post_id, p_title, p_blocks, p_expected_updated_at,
    p_birth_year_limit, p_gender_policy, p_tiers, p_birth_year_from
  );

  -- Older editors omit the new arguments. An explicit empty value clears that field.
  IF p_positions IS NOT NULL THEN
    IF NOT (p_positions <@ roles) OR cardinality(p_positions) > 3 OR
      (cardinality(p_positions) > 0 AND NOT EXISTS (
        SELECT 1 FROM public.clans c JOIN public.games g ON g.id = c.game_id
        WHERE c.id = p_clan_id AND g.slug = 'overwatch'
      )) THEN
      RAISE EXCEPTION '이 게임의 모집 포지션을 확인해 주십시오.' USING ERRCODE = '22023';
    END IF;
    selected_roles := ARRAY(SELECT role FROM unnest(roles) role WHERE role = ANY(p_positions));
    IF selected_roles = roles THEN selected_roles := '{}'; END IF;
  END IF;
  IF p_style IS NOT NULL OR p_positions IS NOT NULL OR p_public IS NOT NULL THEN
    UPDATE public.clans c SET
      promotion_public = coalesce(p_public, c.promotion_public),
      style = CASE WHEN p_style IS NULL THEN c.style ELSE nullif(p_style, '')::public.clan_style END,
      recruitment_positions = coalesce(selected_roles, c.recruitment_positions)
    WHERE c.id = p_clan_id;
  END IF;
  RETURN QUERY SELECT saved.id, saved.updated_at;
END $$;
REVOKE ALL ON FUNCTION public.save_clan_promotion(uuid,uuid,text,jsonb,timestamptz,int,text,text[],int,text,text[],boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_clan_promotion(uuid,uuid,text,jsonb,timestamptz,int,text,text[],int,text,text[],boolean) TO authenticated;
