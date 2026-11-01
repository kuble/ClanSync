-- One current invite per clan. Tokens are only exposed through checked RPCs.
CREATE TABLE private.clan_join_invites (
  clan_id uuid PRIMARY KEY REFERENCES public.clans(id) ON DELETE CASCADE,
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  issued_by uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);
ALTER TABLE private.clan_join_invites ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.clan_join_invites FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.get_clan_join_invite(p_clan_id uuid)
RETURNS TABLE(token uuid, expires_at timestamptz, server_now timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c public.clans;
BEGIN
  SELECT * INTO c FROM public.clans WHERE id=p_clan_id FOR UPDATE;
  IF auth.uid() IS NULL OR NOT FOUND OR NOT public.is_clan_officer_plus(p_clan_id)
    OR c.lifecycle_status<>'active' OR c.moderation_status<>'clean' THEN
    RAISE EXCEPTION '초대 링크를 발급할 권한이 없습니다.' USING ERRCODE='42501';
  END IF;
  INSERT INTO private.clan_join_invites AS i(clan_id,issued_by,expires_at)
    VALUES(c.id,auth.uid(),clock_timestamp()+interval '30 minutes')
    ON CONFLICT(clan_id) DO UPDATE SET token=gen_random_uuid(),issued_by=auth.uid(),
      expires_at=clock_timestamp()+interval '30 minutes'
    WHERE i.expires_at<=clock_timestamp() OR NOT EXISTS (
      SELECT 1 FROM public.clan_members m WHERE m.clan_id=c.id AND m.user_id=i.issued_by
        AND m.status='active' AND m.role IN ('leader','officer')
    );
  RETURN QUERY SELECT i.token,i.expires_at,clock_timestamp() FROM private.clan_join_invites i WHERE i.clan_id=c.id;
END $$;

CREATE FUNCTION public.read_clan_join_invite(p_token uuid)
RETURNS TABLE(clan_id uuid, clan_name text, game_slug text, expires_at timestamptz, server_now timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
  SELECT c.id,c.name,g.slug,i.expires_at,clock_timestamp()
  FROM private.clan_join_invites i JOIN public.clans c ON c.id=i.clan_id
  JOIN public.games g ON g.id=c.game_id
  WHERE auth.uid() IS NOT NULL AND i.token=p_token AND i.expires_at>clock_timestamp()
    AND c.lifecycle_status='active' AND c.moderation_status='clean'
    AND EXISTS (SELECT 1 FROM public.clan_members m WHERE m.clan_id=c.id AND m.user_id=i.issued_by
      AND m.status='active' AND m.role IN ('leader','officer'));
$$;

CREATE FUNCTION public.join_clan_by_invite(p_token uuid)
RETURNS TABLE(joined_clan_id uuid, game_slug text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c public.clans; invitation private.clan_join_invites; actor uuid:=auth.uid(); reason text;
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION '로그인이 필요합니다.' USING ERRCODE='42501'; END IF;
  SELECT * INTO c FROM public.clans WHERE id=(SELECT i.clan_id FROM private.clan_join_invites i WHERE i.token=p_token) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION '만료되거나 사용할 수 없는 초대 링크입니다.' USING ERRCODE='22023'; END IF;
  -- Match approval's clan -> user lock order. Recheck expiry after waiting for locks.
  PERFORM 1 FROM public.users WHERE id=actor FOR UPDATE;
  SELECT * INTO invitation FROM private.clan_join_invites i WHERE i.clan_id=c.id AND i.token=p_token;
  IF NOT FOUND OR invitation.expires_at<=clock_timestamp() OR c.lifecycle_status<>'active' OR c.moderation_status<>'clean'
    OR NOT EXISTS(SELECT 1 FROM public.clan_members m WHERE m.clan_id=c.id AND m.user_id=invitation.issued_by
      AND m.status='active' AND m.role IN ('leader','officer')) THEN
    RAISE EXCEPTION '만료되거나 사용할 수 없는 초대 링크입니다.' USING ERRCODE='22023';
  END IF;
  IF EXISTS(SELECT 1 FROM public.clan_members m WHERE m.clan_id=c.id AND m.user_id=actor AND m.status='active') THEN
    RETURN QUERY SELECT c.id,g.slug::text FROM public.games g WHERE g.id=c.game_id;
    RETURN;
  END IF;
  IF EXISTS(SELECT 1 FROM public.clan_members m WHERE m.clan_id=c.id AND m.user_id=actor AND m.status='banned') THEN
    RAISE EXCEPTION '운영진이 재가입을 허용한 뒤 가입할 수 있습니다.' USING ERRCODE='42501';
  END IF;
  IF EXISTS(SELECT 1 FROM public.clan_members m JOIN public.clans other ON other.id=m.clan_id
    WHERE m.user_id=actor AND other.game_id=c.game_id AND m.status='active') THEN
    RAISE EXCEPTION '이미 이 게임의 다른 클랜에 소속되어 있습니다.' USING ERRCODE='22023';
  END IF;
  IF private.game_player_name(actor,c.game_id) IS NULL THEN
    RAISE EXCEPTION '게임 ID를 먼저 등록해 주십시오.' USING ERRCODE='22023';
  END IF;
  reason:=private.clan_recruitment_error(c,actor);
  IF reason IS NOT NULL THEN RAISE EXCEPTION '%',reason USING ERRCODE='22023'; END IF;
  IF (SELECT count(*) FROM public.clan_members m WHERE m.clan_id=c.id AND m.status='active')>=c.max_members THEN
    RAISE EXCEPTION '클랜 정원이 찼습니다.' USING ERRCODE='22023';
  END IF;
  INSERT INTO public.clan_members(clan_id,user_id,role,status,joined_at,last_activity_at)
    VALUES(c.id,actor,'member','active',clock_timestamp(),clock_timestamp())
    ON CONFLICT(clan_id,user_id) DO UPDATE SET role='member',status='active',
      joined_at=clock_timestamp(),last_activity_at=clock_timestamp()
    WHERE public.clan_members.status='left';
  IF NOT FOUND THEN RAISE EXCEPTION '소속 상태가 변경되었습니다. 다시 확인해 주십시오.' USING ERRCODE='22023'; END IF;
  UPDATE public.clan_join_requests SET status='canceled',resolved_at=clock_timestamp(),resolved_by=actor
    WHERE user_id=actor AND game_id=c.game_id AND status='pending';
  RETURN QUERY SELECT c.id,g.slug::text FROM public.games g WHERE g.id=c.game_id;
END $$;

REVOKE ALL ON FUNCTION public.get_clan_join_invite(uuid), public.read_clan_join_invite(uuid), public.join_clan_by_invite(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_clan_join_invite(uuid), public.read_clan_join_invite(uuid), public.join_clan_by_invite(uuid) TO authenticated;
