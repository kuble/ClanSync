-- Parenthesize JSON extraction before subtracting allowed slot names.
CREATE OR REPLACE FUNCTION public.save_manual_clan_event(
  p_clan_id uuid, p_actor_id uuid, p_event_id uuid, p_event jsonb, p_schedule jsonb, p_create boolean DEFAULT false
) RETURNS uuid LANGUAGE plpgsql SET search_path = ''
AS $$
DECLARE e public.clan_events%rowtype; notice jsonb; actor_role text; settings jsonb;
BEGIN
  IF p_actor_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.clan_members
    WHERE clan_id = p_clan_id AND user_id = p_actor_id AND status = 'active') THEN
    RAISE EXCEPTION '클랜 구성원이 아닙니다.' USING ERRCODE = '42501';
  END IF;
  IF p_event->>'kind' NOT IN ('intra', 'event') OR length(trim(p_event->>'title')) NOT BETWEEN 1 AND 120 THEN
    RAISE EXCEPTION '일정 내용이 올바르지 않습니다.';
  END IF;
  SELECT role::text INTO actor_role FROM public.clan_members WHERE clan_id=p_clan_id AND user_id=p_actor_id AND status='active' FOR SHARE;
  SELECT permissions INTO settings FROM public.clan_settings WHERE clan_id=p_clan_id FOR SHARE;
  IF jsonb_typeof(settings) IS DISTINCT FROM 'object' OR NOT coalesce(CASE WHEN settings ? 'manage_clan_events' THEN
    jsonb_typeof(settings->'manage_clan_events')='array' AND (settings->'manage_clan_events') ? actor_role
    ELSE actor_role IN ('leader','officer') END,false) THEN
    RAISE EXCEPTION 'Event permission denied' USING ERRCODE='42501';
  END IF;
  notice:=p_event->'discord_notify';
  IF notice IS NOT NULL AND (jsonb_typeof(notice) IS DISTINCT FROM 'object'
    OR jsonb_typeof(notice->'enabled') IS DISTINCT FROM 'boolean' OR jsonb_typeof(notice->'announce') IS DISTINCT FROM 'boolean'
    OR jsonb_typeof(notice->'slots') IS DISTINCT FROM 'array'
    OR (notice->'slots') - ARRAY['event_t_minus_24h','event_t_minus_1h','event_t_minus_10min','event_t_0'] <> '[]'::jsonb) THEN
    RAISE EXCEPTION 'Invalid Discord notification settings';
  END IF;
  IF p_create THEN
    INSERT INTO public.clan_events(id, clan_id, title, kind, start_at, place, source,
      created_by, repeat, repeat_weekdays, repeat_time, discord_notify)
    VALUES(p_event_id, p_clan_id, p_event->>'title', (p_event->>'kind')::public.clan_event_kind,
      (p_event->>'start_at')::timestamptz, p_event->>'place', 'manual', p_actor_id,
      (p_event->>'repeat')::public.clan_event_repeat,
      CASE WHEN jsonb_typeof(p_event->'repeat_weekdays') = 'array'
        THEN ARRAY(SELECT jsonb_array_elements_text(p_event->'repeat_weekdays')::integer) END,
      (p_event->>'repeat_time')::time, coalesce(notice,'{"enabled":false,"announce":false,"slots":[]}'::jsonb));
  ELSE
    SELECT * INTO e FROM public.clan_events WHERE id = p_event_id AND clan_id = p_clan_id FOR UPDATE;
    IF NOT FOUND OR e.source <> 'manual' OR e.cancelled_at IS NOT NULL THEN
      RAISE EXCEPTION '수정할 수 없는 일정입니다.';
    END IF;
    UPDATE public.clan_events SET title = p_event->>'title', kind = (p_event->>'kind')::public.clan_event_kind,
      start_at = (p_event->>'start_at')::timestamptz, place = p_event->>'place',
      repeat = (p_event->>'repeat')::public.clan_event_repeat,
      repeat_weekdays = CASE WHEN jsonb_typeof(p_event->'repeat_weekdays') = 'array'
        THEN ARRAY(SELECT jsonb_array_elements_text(p_event->'repeat_weekdays')::integer) END,
      discord_notify=coalesce(notice,e.discord_notify), repeat_time = (p_event->>'repeat_time')::time
      WHERE id = e.id;
  END IF;
  PERFORM public.replace_event_inapp_notifications(p_event_id, p_schedule);
  PERFORM public.replace_event_discord_notifications(p_event_id,p_actor_id,p_schedule);
  RETURN p_event_id;
END;
$$;
REVOKE ALL ON FUNCTION public.save_manual_clan_event(uuid, uuid, uuid, jsonb, jsonb, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_manual_clan_event(uuid, uuid, uuid, jsonb, jsonb, boolean) TO service_role;
