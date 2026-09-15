-- R01: application functions are private unless explicitly exposed below.
-- Extension-owned functions retain their ACLs (citext operators, etc.).
ALTER DEFAULT PRIVILEGES FOR ROLE postgres REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO service_role;

DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS signature, p.proname
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND NOT EXISTS (SELECT 1 FROM pg_depend d
        WHERE d.classid = 'pg_proc'::regclass AND d.objid = p.oid AND d.deptype = 'e')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.signature);
    IF f.proname = ANY (ARRAY[
      'record_clan_activity', 'clan_peer_nicknames', 'my_active_clan_for_game',
      'my_active_clans_by_game', 'select_my_clan_membership', 'clan_active_member_counts',
      'is_active_clan_member', 'is_clan_officer_plus', 'is_member_of_balance_session',
      'list_balance_roster_pool', 'balance_roster_contains_user', 'set_balance_match_outcome',
      'mark_notification_reads', 'mark_notifications_read_all_for_clan',
      'select_my_clan_join_requests', 'effective_view_alt_account_roles'
    ]) THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f.signature);
    END IF;
  END LOOP;
END;
$$;

-- R02: RLS restricts rows; column grants protect balances and server evidence.
REVOKE INSERT, UPDATE ON public.users FROM PUBLIC, anon, authenticated;
GRANT INSERT (id, nickname, email, language, birth_year, gender, auto_login)
  ON public.users TO authenticated;
GRANT UPDATE (nickname, language, birth_year, gender, auto_login)
  ON public.users TO authenticated;

-- R03: verified game identities may only be written by the trusted server.
REVOKE INSERT, UPDATE ON public.user_game_profiles FROM PUBLIC, anon, authenticated;
DROP POLICY ugp_self_insert ON public.user_game_profiles;
DROP POLICY ugp_self_update ON public.user_game_profiles;

-- R04: auth.uid()-scoped helper avoids clan_members referring to itself via RLS.
DROP POLICY clan_members_same_clan_select ON public.clan_members;
CREATE POLICY clan_members_same_clan_select ON public.clan_members
  FOR SELECT TO authenticated
  USING (public.is_active_clan_member(clan_id));
