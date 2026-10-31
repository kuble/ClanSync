ALTER TABLE public.clans
  ADD COLUMN recruitment_positions text[] NOT NULL DEFAULT '{}',
  ADD CONSTRAINT clans_recruitment_positions_valid CHECK (
    recruitment_positions <@ ARRAY['tank', 'sup', 'dmg']::text[]
    AND cardinality(recruitment_positions) <= 3
  );
COMMENT ON COLUMN public.clans.recruitment_positions IS 'Preferred Overwatch roles for recruitment; an empty array means all positions.';

-- Keep the existing permission, revision and post checks in the same transaction.
ALTER FUNCTION public.save_clan_promotion(uuid,uuid,text,jsonb,timestamptz,int,text,text[],int) SET SCHEMA private;
REVOKE ALL ON FUNCTION private.save_clan_promotion(uuid,uuid,text,jsonb,timestamptz,int,text,text[],int) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.save_clan_promotion(
  p_clan_id uuid, p_post_id uuid, p_title text, p_blocks jsonb,
  p_expected_updated_at timestamptz DEFAULT NULL, p_birth_year_limit int DEFAULT NULL,
  p_gender_policy text DEFAULT 'all', p_tiers text[] DEFAULT '{}', p_birth_year_from int DEFAULT NULL,
  p_style text DEFAULT NULL, p_positions text[] DEFAULT NULL
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
  IF p_style IS NOT NULL OR p_positions IS NOT NULL THEN
    UPDATE public.clans c SET
      style = CASE WHEN p_style IS NULL THEN c.style ELSE nullif(p_style, '')::public.clan_style END,
      recruitment_positions = coalesce(selected_roles, c.recruitment_positions)
    WHERE c.id = p_clan_id;
  END IF;
  RETURN QUERY SELECT saved.id, saved.updated_at;
END $$;
REVOKE ALL ON FUNCTION public.save_clan_promotion(uuid,uuid,text,jsonb,timestamptz,int,text,text[],int,text,text[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_clan_promotion(uuid,uuid,text,jsonb,timestamptz,int,text,text[],int,text,text[]) TO authenticated;
