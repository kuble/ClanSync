CREATE TABLE public.clan_favorites (
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.users(id) ON DELETE CASCADE,
  clan_id uuid NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, clan_id)
);
ALTER TABLE public.clan_favorites ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.clan_favorites FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.clan_favorites TO authenticated;
CREATE POLICY own_favorites ON public.clan_favorites FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

DROP FUNCTION public.discover_clans(uuid,uuid,text,text,text,boolean);
CREATE OR REPLACE FUNCTION public.discover_clans(
  p_game_id uuid, p_seed uuid, p_query text, p_style text, p_tier text, p_recommended boolean
) RETURNS TABLE (clan_id uuid, shuffle_key text, is_favorite boolean)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT c.id, md5(p_seed::text || c.id::text),
    EXISTS (SELECT 1 FROM public.clan_favorites f WHERE f.user_id = (SELECT auth.uid()) AND f.clan_id = c.id)
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

REVOKE ALL ON FUNCTION public.discover_clans(uuid,uuid,text,text,text,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.discover_clans(uuid,uuid,text,text,text,boolean) TO authenticated;
