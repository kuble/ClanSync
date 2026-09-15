-- Clan notices are private to active clan members. Only active officers may write.
CREATE TABLE public.clan_notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id uuid NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  content text NOT NULL CHECK (char_length(btrim(content)) BETWEEN 1 AND 20000),
  is_pinned boolean NOT NULL DEFAULT false,
  created_by uuid DEFAULT auth.uid() REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by uuid DEFAULT auth.uid() REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX clan_notices_clan_feed_idx
  ON public.clan_notices (clan_id, is_pinned DESC, created_at DESC);

CREATE TRIGGER trg_clan_notices_updated_at
  BEFORE UPDATE ON public.clan_notices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.clan_notices ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.clan_notices FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.clan_notices TO service_role;
GRANT SELECT, DELETE ON public.clan_notices TO authenticated;
GRANT INSERT (clan_id, title, content, is_pinned, created_by, updated_by)
  ON public.clan_notices TO authenticated;
GRANT UPDATE (title, content, is_pinned, updated_by)
  ON public.clan_notices TO authenticated;

CREATE POLICY clan_notices_member_read ON public.clan_notices
  FOR SELECT TO authenticated
  USING (public.is_active_clan_member(clan_id));
CREATE POLICY clan_notices_officer_insert ON public.clan_notices
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_clan_officer_plus(clan_id)
    AND created_by = (SELECT auth.uid())
    AND updated_by = (SELECT auth.uid())
  );
CREATE POLICY clan_notices_officer_update ON public.clan_notices
  FOR UPDATE TO authenticated
  USING (public.is_clan_officer_plus(clan_id))
  WITH CHECK (public.is_clan_officer_plus(clan_id) AND updated_by = (SELECT auth.uid()));
CREATE POLICY clan_notices_officer_delete ON public.clan_notices
  FOR DELETE TO authenticated
  USING (public.is_clan_officer_plus(clan_id));

-- Narrow rules-only write path; callers cannot update clan coins, tier, or ownership.
CREATE FUNCTION public.update_clan_rules(p_clan_id uuid, p_rules text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_clan_officer_plus(p_clan_id) THEN
    RAISE EXCEPTION '클랜 운영진만 규칙을 수정할 수 있습니다.' USING ERRCODE = '42501';
  END IF;
  IF char_length(coalesce(p_rules, '')) > 20000 THEN
    RAISE EXCEPTION '규칙은 20,000자 이내로 입력해 주세요.' USING ERRCODE = '22023';
  END IF;
  UPDATE public.clans SET rules = nullif(btrim(p_rules), '') WHERE id = p_clan_id;
END;
$$;
REVOKE ALL ON FUNCTION public.update_clan_rules(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_clan_rules(uuid, text) TO authenticated, service_role;

COMMENT ON TABLE public.clan_notices IS '클랜 내부 공지. 활성 회원 열람, 운영진 작성·편집·삭제. 작성 시각·클랜·작성자는 수정 불가.';
