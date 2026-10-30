-- Ordered IDs match the game's own competitive ladder, not a shared LoL ladder.
CREATE FUNCTION private.recruitment_tier_ids(p_game_slug text) RETURNS text[]
LANGUAGE sql IMMUTABLE SET search_path='' AS $$
  SELECT CASE p_game_slug
    WHEN 'overwatch' THEN ARRAY['bronze','silver','gold','plat','diamond','master','gm','champion']
    WHEN 'valorant' THEN ARRAY['iron','bronze','silver','gold','plat','diamond','ascendant','immortal','radiant']
    WHEN 'lol' THEN ARRAY['iron','bronze','silver','gold','plat','emerald','diamond','master','gm','challenger']
    WHEN 'pubg' THEN ARRAY['bronze','silver','gold','plat','crystal','diamond','master','survivor']
    ELSE ARRAY[]::text[] END;
$$;
REVOKE ALL ON FUNCTION private.recruitment_tier_ids(text) FROM PUBLIC,anon,authenticated;

-- Only the mislabeled Overwatch top tier has an unambiguous replacement.
UPDATE public.clans c SET tier_range=ARRAY(
  SELECT DISTINCT CASE WHEN t='challenger' THEN 'champion' ELSE t END
  FROM unnest(c.tier_range) t
) FROM public.games g WHERE c.game_id=g.id AND g.slug='overwatch' AND 'challenger'=ANY(c.tier_range);

-- Cover creation and direct REST writes as well as the management RPC.
CREATE FUNCTION private.guard_clan_recruitment_tiers() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE allowed text[];
BEGIN
  SELECT private.recruitment_tier_ids(g.slug) INTO allowed FROM public.games g WHERE g.id=new.game_id;
  IF new.tier_range IS NULL OR EXISTS(SELECT 1 FROM unnest(new.tier_range) t WHERE t IS NULL OR NOT t=ANY(coalesce(allowed,'{}'::text[]))) THEN
    RAISE EXCEPTION '해당 게임의 모집 티어를 선택해 주십시오.' USING ERRCODE='22023';
  END IF;
  new.tier_range:=ARRAY(SELECT t FROM unnest(coalesce(allowed,'{}'::text[])) t WHERE t=ANY(new.tier_range));
  RETURN new;
END $$;
REVOKE ALL ON FUNCTION private.guard_clan_recruitment_tiers() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER guard_clan_recruitment_tiers BEFORE INSERT OR UPDATE OF game_id,tier_range ON public.clans
FOR EACH ROW EXECUTE FUNCTION private.guard_clan_recruitment_tiers();

CREATE OR REPLACE FUNCTION public.update_clan_recruitment(p_clan_id uuid,p_birth_year_limit int DEFAULT NULL,p_gender_policy text DEFAULT 'all',p_tiers text[] DEFAULT '{}')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c public.clans%rowtype; allowed text[];
BEGIN
  SELECT * INTO c FROM public.clans WHERE id=p_clan_id FOR UPDATE;
  IF NOT FOUND OR auth.uid() IS NULL OR NOT public.is_clan_officer_plus(p_clan_id) THEN
    RAISE EXCEPTION '가입 조건을 변경할 권한이 없습니다.' USING ERRCODE='42501';
  END IF;
  SELECT private.recruitment_tier_ids(g.slug) INTO allowed FROM public.games g WHERE g.id=c.game_id;
  IF p_gender_policy IS NULL OR p_gender_policy NOT IN ('all','male','female') OR p_tiers IS NULL OR
    cardinality(p_tiers)>cardinality(allowed) OR EXISTS(SELECT 1 FROM unnest(p_tiers) t WHERE t IS NULL OR NOT t=ANY(allowed)) OR
    (p_birth_year_limit IS NOT NULL AND p_birth_year_limit NOT BETWEEN 1950 AND extract(year FROM now() AT TIME ZONE 'Asia/Seoul')::int-10) THEN
    RAISE EXCEPTION '가입 조건을 확인해 주십시오.' USING ERRCODE='22023';
  END IF;
  UPDATE public.clans SET min_birth_year=p_birth_year_limit,gender_policy=p_gender_policy::public.clan_gender_policy,
    tier_range=ARRAY(SELECT t FROM unnest(allowed) t WHERE t=ANY(p_tiers)),updated_at=now() WHERE id=c.id;
END $$;
REVOKE ALL ON FUNCTION public.update_clan_recruitment(uuid,int,text,text[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.update_clan_recruitment(uuid,int,text,text[]) TO authenticated;
