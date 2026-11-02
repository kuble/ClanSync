-- Ordinary applications are reviewed by officers. Direct invite redemption still
-- checks the birth-year range through private.clan_recruitment_error.
CREATE OR REPLACE FUNCTION private.guard_clan_recruitment() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE c public.clans%rowtype;
BEGIN
  IF new.status IN ('pending','approved') THEN
    SELECT * INTO c FROM public.clans WHERE id=new.clan_id FOR UPDATE;
    IF NOT FOUND OR new.game_id<>c.game_id OR c.lifecycle_status<>'active' OR c.moderation_status<>'clean' THEN
      RAISE EXCEPTION '이 클랜에는 지금 가입 신청할 수 없습니다.' USING ERRCODE='22023';
    END IF;
    PERFORM 1 FROM public.users WHERE id=new.user_id FOR UPDATE;
  END IF;
  RETURN new;
END $$;

CREATE OR REPLACE FUNCTION public.replace_clan_join_request(p_clan_id uuid,p_message text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE c public.clans%rowtype; actor uuid:=auth.uid();
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION '로그인이 필요합니다.' USING ERRCODE='42501'; END IF;
  SELECT * INTO c FROM public.clans WHERE id=p_clan_id FOR UPDATE;
  IF NOT FOUND OR c.lifecycle_status<>'active' OR c.moderation_status<>'clean' THEN
    RAISE EXCEPTION '이 클랜에는 지금 가입 신청할 수 없습니다.';
  END IF;
  PERFORM 1 FROM public.users WHERE id=actor FOR UPDATE;
  IF private.game_player_name(actor,c.game_id) IS NULL THEN RAISE EXCEPTION '게임 ID를 먼저 등록해 주십시오.'; END IF;
  IF EXISTS(SELECT 1 FROM public.clan_members m JOIN public.clans other ON other.id=m.clan_id WHERE m.user_id=actor AND m.status='active' AND other.game_id=c.game_id) THEN
    RAISE EXCEPTION '이미 게임 클랜에 소속되어 있습니다.';
  END IF;
  IF EXISTS(SELECT 1 FROM public.clan_join_requests WHERE clan_id=c.id AND user_id=actor AND status='pending') THEN
    RAISE EXCEPTION '이미 이 클랜에 신청 중입니다.';
  END IF;
  UPDATE public.clan_join_requests SET status='canceled',resolved_at=now(),resolved_by=actor WHERE user_id=actor AND game_id=c.game_id AND status='pending';
  INSERT INTO public.clan_join_requests(clan_id,user_id,game_id,message)
    VALUES(c.id,actor,c.game_id,left(coalesce(trim(p_message),''),2000));
END $$;
