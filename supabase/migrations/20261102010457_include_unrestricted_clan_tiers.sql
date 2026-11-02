CREATE OR REPLACE FUNCTION public.discover_clans(
  p_game_id uuid, p_seed uuid, p_query text, p_style text, p_tier text, p_recommended boolean
) RETURNS TABLE (clan_id uuid, shuffle_key text)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT c.id, md5(p_seed::text || c.id::text)
  FROM public.clans c
  WHERE c.game_id = p_game_id AND c.promotion_public
    AND c.lifecycle_status = 'active' AND c.moderation_status = 'clean'
    AND (p_query = '' OR strpos(lower(c.name), lower(p_query)) > 0)
    AND (p_style = '' OR c.style::text = p_style)
    AND (p_tier = '' OR cardinality(c.tier_range) = 0 OR c.tier_range @> ARRAY[p_tier])
    AND (NOT p_recommended OR EXISTS (
      SELECT 1 FROM public.users u WHERE u.id = (SELECT auth.uid())
        AND (c.gender_policy = 'all' OR c.gender_policy::text = u.gender::text)
        AND (c.birth_year_from IS NULL OR u.birth_year >= c.birth_year_from)
        AND (c.min_birth_year IS NULL OR u.birth_year <= c.min_birth_year)
    ));
$$;
