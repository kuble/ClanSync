-- Gender remains visible recruitment information. Birth-year bounds still apply.
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
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION private.clan_recruitment_error(public.clans,uuid) FROM PUBLIC,anon,authenticated;
COMMENT ON COLUMN public.clans.gender_policy IS 'Displayed recruitment preference. Does not restrict applications, approval or invite joining.';
