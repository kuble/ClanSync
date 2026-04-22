-- clan_members 직접 SELECT 가 RLS/클라이언트 컨텍스트에서 빈 결과를 주는 경우 대비.
-- 내부에서만 auth.uid() 를 사용하므로 호출자가 임의 user_id 를 넘겨도 타인 멤버십을 볼 수 없음.

CREATE OR REPLACE FUNCTION public.my_active_clan_for_game(p_game_id uuid)
RETURNS TABLE(clan_id uuid, clan_name varchar)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.name
  FROM public.clan_members cm
  INNER JOIN public.clans c ON c.id = cm.clan_id
  WHERE cm.user_id = auth.uid()
    AND cm.status = 'active'
    AND c.game_id = p_game_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.my_active_clans_by_game()
RETURNS TABLE(game_id uuid, clan_id uuid, clan_name varchar)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.game_id, c.id, c.name
  FROM public.clan_members cm
  INNER JOIN public.clans c ON c.id = cm.clan_id
  WHERE cm.user_id = auth.uid()
    AND cm.status = 'active';
$$;

CREATE OR REPLACE FUNCTION public.select_my_clan_membership(p_clan_id uuid)
RETURNS TABLE(role clan_member_role, status clan_member_status)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cm.role, cm.status
  FROM public.clan_members cm
  WHERE cm.clan_id = p_clan_id
    AND cm.user_id = auth.uid()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.my_active_clan_for_game(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_active_clan_for_game(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.my_active_clans_by_game() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_active_clans_by_game() TO authenticated;

REVOKE ALL ON FUNCTION public.select_my_clan_membership(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.select_my_clan_membership(uuid) TO authenticated;
