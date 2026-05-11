-- D-EVENTS-01 / D-SCRIM-02 — 스크림방 + 양측 확정 + 확정 시 clan_events(scrim_auto) 동기화.
-- D-EVENTS-03 — scrim_auto clan_events 행에 대해 in-app reminder 예약(SQL, 단발·instance_idx=0).

CREATE TYPE public.scrim_room_status AS ENUM (
  'draft',
  'matched',
  'confirmed',
  'cancelled',
  'finished'
);

CREATE TYPE public.scrim_confirm_side AS ENUM ('host', 'guest');

CREATE TYPE public.scrim_closed_reason AS ENUM (
  'auto_timeout',
  'manual',
  'cancelled',
  'finished'
);

CREATE TABLE public.scrim_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  clan_a_id uuid NOT NULL REFERENCES public.clans (id) ON DELETE CASCADE,
  clan_b_id uuid NULL REFERENCES public.clans (id) ON DELETE SET NULL,
  title varchar (200) NULL,
  scheduled_at timestamptz NOT NULL,
  mode varchar (32) NULL,
  tier_min smallint NULL,
  tier_max smallint NULL,
  memo text NULL,
  place varchar (500) NULL,
  status public.scrim_room_status NOT NULL DEFAULT 'draft'::public.scrim_room_status,
  confirmed_at timestamptz NULL,
  cancelled_at timestamptz NULL,
  finished_at timestamptz NULL,
  created_by uuid NOT NULL REFERENCES public.users (id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now (),
  closed_at timestamptz NULL,
  closed_by uuid NULL REFERENCES public.users (id) ON DELETE SET NULL,
  closed_reason public.scrim_closed_reason NULL,
  CONSTRAINT scrim_rooms_confirmed_ck CHECK (
    status != 'confirmed'::public.scrim_room_status
    OR (
      clan_b_id IS NOT NULL
      AND confirmed_at IS NOT NULL
    )
  ),
  CONSTRAINT scrim_rooms_cancelled_ck CHECK (
    status != 'cancelled'::public.scrim_room_status
    OR cancelled_at IS NOT NULL
  ),
  CONSTRAINT scrim_rooms_finished_ck CHECK (
    status != 'finished'::public.scrim_room_status
    OR finished_at IS NOT NULL
  ),
  CONSTRAINT scrim_rooms_closed_pair_ck CHECK (
    (closed_at IS NULL AND closed_reason IS NULL)
    OR (closed_at IS NOT NULL AND closed_reason IS NOT NULL)
  )
);

CREATE INDEX scrim_rooms_clan_a_idx ON public.scrim_rooms (clan_a_id, scheduled_at DESC);

CREATE INDEX scrim_rooms_clan_b_idx ON public.scrim_rooms (clan_b_id, scheduled_at DESC)
WHERE
  clan_b_id IS NOT NULL;

COMMENT ON TABLE public.scrim_rooms IS '스크림 채팅방 D-EVENTS-01 · D-SCRIM-02. 확정 시 clan_events 동기화.';

CREATE TRIGGER trg_scrim_rooms_updated_at
  BEFORE UPDATE ON public.scrim_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at ();

CREATE TABLE public.scrim_room_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  scrim_room_id uuid NOT NULL REFERENCES public.scrim_rooms (id) ON DELETE CASCADE,
  side public.scrim_confirm_side NOT NULL,
  confirmed_by uuid NOT NULL REFERENCES public.users (id) ON DELETE RESTRICT,
  confirmed_at timestamptz NOT NULL DEFAULT now (),
  CONSTRAINT scrim_room_confirmations_side_uq UNIQUE (scrim_room_id, side)
);

CREATE INDEX scrim_room_confirmations_room_idx ON public.scrim_room_confirmations (scrim_room_id);

COMMENT ON TABLE public.scrim_room_confirmations IS 'D-SCRIM-02 양측 운영진 확정 2-phase commit.';

ALTER TABLE public.scrim_rooms ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.scrim_room_confirmations ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.scrim_rooms TO service_role;

GRANT ALL ON TABLE public.scrim_room_confirmations TO service_role;

CREATE POLICY scrim_rooms_select_member ON public.scrim_rooms FOR SELECT USING (
  EXISTS (
    SELECT 1
      FROM public.clan_members cm
     WHERE cm.user_id = (SELECT auth.uid())
       AND cm.status = 'active'::public.clan_member_status
       AND (
         cm.clan_id = scrim_rooms.clan_a_id
         OR cm.clan_id = scrim_rooms.clan_b_id
       )
  )
);

CREATE POLICY scrim_room_confirmations_select ON public.scrim_room_confirmations FOR SELECT USING (
  EXISTS (
    SELECT 1
      FROM public.scrim_rooms sr
     WHERE sr.id = scrim_room_confirmations.scrim_room_id
       AND (
         EXISTS (
           SELECT 1
             FROM public.clan_members cm
            WHERE cm.clan_id = sr.clan_a_id
              AND cm.user_id = (SELECT auth.uid())
              AND cm.status = 'active'::public.clan_member_status
         )
         OR EXISTS (
           SELECT 1
             FROM public.clan_members cm
            WHERE cm.clan_id = sr.clan_b_id
              AND cm.user_id = (SELECT auth.uid())
              AND cm.status = 'active'::public.clan_member_status
         )
       )
  )
);

CREATE POLICY scrim_room_confirmations_insert ON public.scrim_room_confirmations FOR INSERT
  WITH CHECK (
    confirmed_by = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
        FROM public.scrim_rooms sr
       WHERE sr.id = scrim_room_id
         AND (
           (
             side = 'host'::public.scrim_confirm_side
             AND public.is_clan_officer_plus (sr.clan_a_id)
           )
           OR (
             side = 'guest'::public.scrim_confirm_side
             AND sr.clan_b_id IS NOT NULL
             AND public.is_clan_officer_plus (sr.clan_b_id)
           )
         )
    )
  );

CREATE OR REPLACE FUNCTION public.scrim_rooms_invalidate_confirmations ()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  SET row_security = off
  AS $$
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF (
    NEW.scheduled_at IS DISTINCT FROM OLD.scheduled_at
    OR NEW.mode IS DISTINCT FROM OLD.mode
    OR NEW.tier_min IS DISTINCT FROM OLD.tier_min
    OR NEW.tier_max IS DISTINCT FROM OLD.tier_max
    OR NEW.place IS DISTINCT FROM OLD.place
  )
  AND OLD.status IN (
    'matched'::public.scrim_room_status,
    'confirmed'::public.scrim_room_status
  ) THEN
    DELETE FROM public.scrim_room_confirmations c
    WHERE c.scrim_room_id = OLD.id;
    NEW.status := 'matched'::public.scrim_room_status;
    NEW.confirmed_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_scrim_rooms_invalidate_confirmations
  BEFORE UPDATE ON public.scrim_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.scrim_rooms_invalidate_confirmations ();

CREATE OR REPLACE FUNCTION public.scrim_rooms_promote_to_confirmed ()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  SET row_security = off
  AS $$
DECLARE
  v_host boolean;
  v_guest boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
      FROM public.scrim_room_confirmations c
     WHERE c.scrim_room_id = NEW.scrim_room_id
       AND c.side = 'host'::public.scrim_confirm_side
  )
    INTO v_host;

  SELECT EXISTS (
    SELECT 1
      FROM public.scrim_room_confirmations c
     WHERE c.scrim_room_id = NEW.scrim_room_id
       AND c.side = 'guest'::public.scrim_confirm_side
  )
    INTO v_guest;

  IF v_host AND v_guest THEN
    UPDATE public.scrim_rooms sr
    SET status = 'confirmed'::public.scrim_room_status,
        confirmed_at = coalesce(sr.confirmed_at, now()),
        updated_at = now()
    WHERE sr.id = NEW.scrim_room_id
      AND sr.status = 'matched'::public.scrim_room_status;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_scrim_room_confirmations_promote
  AFTER INSERT ON public.scrim_room_confirmations
  FOR EACH ROW
  EXECUTE FUNCTION public.scrim_rooms_promote_to_confirmed ();

ALTER TABLE public.clan_events
  ADD COLUMN scrim_id uuid NULL REFERENCES public.scrim_rooms (id) ON DELETE CASCADE;

ALTER TABLE public.clan_events
  ADD CONSTRAINT clan_events_clan_scrim_uq UNIQUE (clan_id, scrim_id);

ALTER TABLE public.clan_events
  ADD CONSTRAINT clan_events_source_scrim_id_ck CHECK (
    (
      source = 'manual'::public.clan_event_source
      AND scrim_id IS NULL
    )
    OR (
      source = 'scrim_auto'::public.clan_event_source
      AND scrim_id IS NOT NULL
    )
  );

CREATE INDEX clan_events_scrim_id_idx ON public.clan_events (scrim_id)
WHERE
  scrim_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.clan_events_apply_from_scrim_room ()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  SET row_security = off
  AS $$
DECLARE
  v_title varchar(120);
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  v_title := LEFT(coalesce(NEW.title, '스크림'), 120);

  IF NEW.status IS DISTINCT FROM 'confirmed'::public.scrim_room_status
     OR NEW.clan_b_id IS NULL
     OR NEW.cancelled_at IS NOT NULL
  THEN
    UPDATE public.clan_events
      SET cancelled_at = coalesce(cancelled_at, now()),
          updated_at = now()
    WHERE scrim_id = NEW.id
      AND source = 'scrim_auto'::public.clan_event_source
      AND cancelled_at IS NULL;

    RETURN NEW;
  END IF;

  INSERT INTO public.clan_events (
    clan_id,
    title,
    kind,
    start_at,
    place,
    source,
    scrim_id,
    created_by,
    repeat,
    repeat_weekdays,
    repeat_time
  )
  VALUES (
    NEW.clan_a_id,
    v_title,
    'scrim'::public.clan_event_kind,
    NEW.scheduled_at,
    NEW.place,
    'scrim_auto'::public.clan_event_source,
    NEW.id,
    NEW.created_by,
    'none'::public.clan_event_repeat,
    NULL,
    NULL
  )
  ON CONFLICT ON CONSTRAINT clan_events_clan_scrim_uq
    DO UPDATE
    SET title = EXCLUDED.title,
        start_at = EXCLUDED.start_at,
        place = EXCLUDED.place,
        kind = 'scrim'::public.clan_event_kind,
        cancelled_at = NULL,
        updated_at = now();

  INSERT INTO public.clan_events (
    clan_id,
    title,
    kind,
    start_at,
    place,
    source,
    scrim_id,
    created_by,
    repeat,
    repeat_weekdays,
    repeat_time
  )
  VALUES (
    NEW.clan_b_id,
    v_title,
    'scrim'::public.clan_event_kind,
    NEW.scheduled_at,
    NEW.place,
    'scrim_auto'::public.clan_event_source,
    NEW.id,
    NEW.created_by,
    'none'::public.clan_event_repeat,
    NULL,
    NULL
  )
  ON CONFLICT ON CONSTRAINT clan_events_clan_scrim_uq
    DO UPDATE
    SET title = EXCLUDED.title,
        start_at = EXCLUDED.start_at,
        place = EXCLUDED.place,
        kind = 'scrim'::public.clan_event_kind,
        cancelled_at = NULL,
        updated_at = now();

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_scrim_rooms_apply_clan_events
  AFTER UPDATE ON public.scrim_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.clan_events_apply_from_scrim_room ();

CREATE OR REPLACE FUNCTION public.clan_events_reserve_scrm_inapp_notifications ()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  SET row_security = off
  AS $$
DECLARE
  r_uid uuid;
  st timestamptz;
  sk public.notification_slot_kind;
  v_dedup text;
BEGIN
  UPDATE public.notification_log nl
  SET status = 'cancelled'::public.notification_status,
      updated_at = now()
  WHERE nl.event_id = NEW.id
    AND nl.channel = 'inapp'::public.notification_channel
    AND nl.status = 'scheduled'::public.notification_status;

  IF NEW.source IS DISTINCT FROM 'scrim_auto'::public.clan_event_source THEN
    RETURN NEW;
  END IF;

  IF NEW.cancelled_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.start_at <= now() THEN
    RETURN NEW;
  END IF;

  FOR r_uid IN
  SELECT cm.user_id
    FROM public.clan_members cm
   WHERE cm.clan_id = NEW.clan_id
     AND cm.status = 'active'::public.clan_member_status
  LOOP
    st := NEW.start_at - interval '24 hours';

    IF st > now() THEN
      sk := 'event_t_minus_24h'::public.notification_slot_kind;
      v_dedup := encode(
        digest(
          NEW.id::text || '|0|' || sk::text || '|' || st::text || '|' || r_uid::text || '|inapp',
          'sha256'
        ),
        'hex'
      );

      INSERT INTO public.notification_log (
        event_id,
        instance_idx,
        slot_kind,
        channel,
        recipient_user_id,
        scheduled_at,
        dedup_key,
        status
      )
      SELECT
        NEW.id,
        0,
        sk,
        'inapp'::public.notification_channel,
        r_uid,
        st,
        v_dedup,
        'scheduled'::public.notification_status
      WHERE
        NOT EXISTS (
          SELECT 1
            FROM public.notification_log x
           WHERE x.event_id = NEW.id
             AND x.instance_idx = 0
             AND x.slot_kind = sk
             AND x.channel = 'inapp'::public.notification_channel
             AND x.recipient_user_id = r_uid
             AND x.scheduled_at = st
             AND x.status = 'scheduled'::public.notification_status
        );
    END IF;

    st := NEW.start_at - interval '1 hour';

    IF st > now() THEN
      sk := 'event_t_minus_1h'::public.notification_slot_kind;
      v_dedup := encode(
        digest(
          NEW.id::text || '|0|' || sk::text || '|' || st::text || '|' || r_uid::text || '|inapp',
          'sha256'
        ),
        'hex'
      );

      INSERT INTO public.notification_log (
        event_id,
        instance_idx,
        slot_kind,
        channel,
        recipient_user_id,
        scheduled_at,
        dedup_key,
        status
      )
      SELECT
        NEW.id,
        0,
        sk,
        'inapp'::public.notification_channel,
        r_uid,
        st,
        v_dedup,
        'scheduled'::public.notification_status
      WHERE
        NOT EXISTS (
          SELECT 1
            FROM public.notification_log x
           WHERE x.event_id = NEW.id
             AND x.instance_idx = 0
             AND x.slot_kind = sk
             AND x.channel = 'inapp'::public.notification_channel
             AND x.recipient_user_id = r_uid
             AND x.scheduled_at = st
             AND x.status = 'scheduled'::public.notification_status
        );
    END IF;

    st := NEW.start_at - interval '10 minutes';

    IF st > now() THEN
      sk := 'event_t_minus_10min'::public.notification_slot_kind;
      v_dedup := encode(
        digest(
          NEW.id::text || '|0|' || sk::text || '|' || st::text || '|' || r_uid::text || '|inapp',
          'sha256'
        ),
        'hex'
      );

      INSERT INTO public.notification_log (
        event_id,
        instance_idx,
        slot_kind,
        channel,
        recipient_user_id,
        scheduled_at,
        dedup_key,
        status
      )
      SELECT
        NEW.id,
        0,
        sk,
        'inapp'::public.notification_channel,
        r_uid,
        st,
        v_dedup,
        'scheduled'::public.notification_status
      WHERE
        NOT EXISTS (
          SELECT 1
            FROM public.notification_log x
           WHERE x.event_id = NEW.id
             AND x.instance_idx = 0
             AND x.slot_kind = sk
             AND x.channel = 'inapp'::public.notification_channel
             AND x.recipient_user_id = r_uid
             AND x.scheduled_at = st
             AND x.status = 'scheduled'::public.notification_status
        );
    END IF;

    st := NEW.start_at;

    IF st > now() THEN
      sk := 'event_t_0'::public.notification_slot_kind;
      v_dedup := encode(
        digest(
          NEW.id::text || '|0|' || sk::text || '|' || st::text || '|' || r_uid::text || '|inapp',
          'sha256'
        ),
        'hex'
      );

      INSERT INTO public.notification_log (
        event_id,
        instance_idx,
        slot_kind,
        channel,
        recipient_user_id,
        scheduled_at,
        dedup_key,
        status
      )
      SELECT
        NEW.id,
        0,
        sk,
        'inapp'::public.notification_channel,
        r_uid,
        st,
        v_dedup,
        'scheduled'::public.notification_status
      WHERE
        NOT EXISTS (
          SELECT 1
            FROM public.notification_log x
           WHERE x.event_id = NEW.id
             AND x.instance_idx = 0
             AND x.slot_kind = sk
             AND x.channel = 'inapp'::public.notification_channel
             AND x.recipient_user_id = r_uid
             AND x.scheduled_at = st
             AND x.status = 'scheduled'::public.notification_status
        );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_clan_events_reserve_scrm_inapp
  AFTER INSERT
  OR UPDATE OF start_at, cancelled_at ON public.clan_events
  FOR EACH ROW
  EXECUTE FUNCTION public.clan_events_reserve_scrm_inapp_notifications ();
