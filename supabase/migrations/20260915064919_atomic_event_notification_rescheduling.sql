-- R06: one logical occurrence/slot/recipient is reused on edits.
-- Sent rows are terminal; changing a title or rescheduling never re-sends them.
CREATE FUNCTION public.replace_event_inapp_notifications(p_event_id uuid, p_schedule jsonb)
RETURNS void LANGUAGE plpgsql SET search_path = ''
AS $$
DECLARE e public.clan_events%rowtype;
BEGIN
  SELECT * INTO e FROM public.clan_events WHERE id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION '일정을 찾을 수 없습니다.'; END IF;
  IF p_schedule IS NULL OR jsonb_typeof(p_schedule) <> 'array' THEN
    RAISE EXCEPTION '알림 예약 형식이 올바르지 않습니다.';
  END IF;
  UPDATE public.notification_log SET status = 'cancelled', updated_at = now()
    WHERE event_id = e.id AND channel = 'inapp' AND status = 'scheduled';
  IF e.cancelled_at IS NOT NULL THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_to_recordset(p_schedule)
    AS s(instance_idx bigint, slot_kind text, scheduled_at timestamptz)
    WHERE s.instance_idx IS NULL OR s.scheduled_at IS NULL OR s.slot_kind IS NULL
      OR s.slot_kind NOT IN ('event_t_minus_24h', 'event_t_minus_1h', 'event_t_minus_10min', 'event_t_0')) THEN
    RAISE EXCEPTION '알림 슬롯이 올바르지 않습니다.';
  END IF;
  INSERT INTO public.notification_log(event_id, instance_idx, slot_kind, channel,
    recipient_user_id, scheduled_at, dedup_key, status)
    SELECT e.id, s.instance_idx, s.slot_kind::public.notification_slot_kind, 'inapp',
      cm.user_id, s.scheduled_at,
      e.id::text || '|' || s.instance_idx::text || '|' || s.slot_kind || '|' || cm.user_id::text || '|inapp',
      'scheduled'
    FROM jsonb_to_recordset(p_schedule) AS s(instance_idx bigint, slot_kind text, scheduled_at timestamptz)
    CROSS JOIN public.clan_members cm
    WHERE cm.clan_id = e.clan_id AND cm.status = 'active'
    ON CONFLICT (event_id, instance_idx, slot_kind, channel, recipient_user_id) WHERE event_id IS NOT NULL
    DO UPDATE SET scheduled_at = EXCLUDED.scheduled_at, status = 'scheduled',
      updated_at = now(), last_error = NULL
    WHERE notification_log.status IN ('scheduled', 'cancelled', 'failed');
END;
$$;
REVOKE ALL ON FUNCTION public.replace_event_inapp_notifications(uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replace_event_inapp_notifications(uuid, jsonb) TO service_role;

CREATE FUNCTION public.save_manual_clan_event(
  p_clan_id uuid, p_actor_id uuid, p_event_id uuid, p_event jsonb, p_schedule jsonb, p_create boolean DEFAULT false
) RETURNS uuid LANGUAGE plpgsql SET search_path = ''
AS $$
DECLARE e public.clan_events%rowtype;
BEGIN
  IF p_actor_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.clan_members
    WHERE clan_id = p_clan_id AND user_id = p_actor_id AND status = 'active') THEN
    RAISE EXCEPTION '클랜 구성원이 아닙니다.' USING ERRCODE = '42501';
  END IF;
  IF p_event->>'kind' NOT IN ('intra', 'event') OR length(trim(p_event->>'title')) NOT BETWEEN 1 AND 120 THEN
    RAISE EXCEPTION '일정 내용이 올바르지 않습니다.';
  END IF;
  IF p_create THEN
    INSERT INTO public.clan_events(id, clan_id, title, kind, start_at, place, source,
      created_by, repeat, repeat_weekdays, repeat_time)
    VALUES(p_event_id, p_clan_id, p_event->>'title', (p_event->>'kind')::public.clan_event_kind,
      (p_event->>'start_at')::timestamptz, p_event->>'place', 'manual', p_actor_id,
      (p_event->>'repeat')::public.clan_event_repeat,
      CASE WHEN jsonb_typeof(p_event->'repeat_weekdays') = 'array'
        THEN ARRAY(SELECT jsonb_array_elements_text(p_event->'repeat_weekdays')::integer) END,
      (p_event->>'repeat_time')::time);
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
      repeat_time = (p_event->>'repeat_time')::time
      WHERE id = e.id;
  END IF;
  PERFORM public.replace_event_inapp_notifications(p_event_id, p_schedule);
  RETURN p_event_id;
END;
$$;
REVOKE ALL ON FUNCTION public.save_manual_clan_event(uuid, uuid, uuid, jsonb, jsonb, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_manual_clan_event(uuid, uuid, uuid, jsonb, jsonb, boolean) TO service_role;

-- The trigger executes inside the scrim edit/reconfirmation transaction.
-- It also makes cancellation of a manual event and its reservations atomic.
CREATE OR REPLACE FUNCTION public.clan_events_reserve_scrm_inapp_notifications()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' SET row_security = off
AS $$
DECLARE schedule jsonb;
BEGIN
  IF NEW.cancelled_at IS NOT NULL THEN
    PERFORM public.replace_event_inapp_notifications(NEW.id, '[]'::jsonb);
  ELSIF NEW.source = 'scrim_auto' THEN
    SELECT coalesce(jsonb_agg(jsonb_build_object('instance_idx', 0, 'slot_kind', s.kind,
      'scheduled_at', NEW.start_at - s.lead_time)), '[]'::jsonb) INTO schedule
    FROM (VALUES ('event_t_minus_24h', interval '24 hours'), ('event_t_minus_1h', interval '1 hour'),
      ('event_t_minus_10min', interval '10 minutes'), ('event_t_0', interval '0')) AS s(kind, lead_time)
    WHERE NEW.start_at - s.lead_time > now();
    PERFORM public.replace_event_inapp_notifications(NEW.id, schedule);
  END IF;
  RETURN NEW;
END;
$$;
