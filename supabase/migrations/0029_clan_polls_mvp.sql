-- M6b — 클랜 투표 (D-EVENTS-03 / D-EVENTS-04 MVP). 알림 예약은 후속(notification_log 연동 시 확장).

CREATE TYPE public.poll_notify_repeat AS ENUM (
  'none',
  'once',
  'daily',
  'weekly',
  'until_deadline_daily'
);

CREATE TABLE public.clan_polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  clan_id uuid NOT NULL REFERENCES public.clans (id) ON DELETE CASCADE,
  title varchar(120) NOT NULL,
  anonymous boolean NOT NULL DEFAULT false,
  multiple_choice boolean NOT NULL DEFAULT false,
  deadline_at timestamptz NOT NULL,
  notify_repeat public.poll_notify_repeat NOT NULL DEFAULT 'none'::public.poll_notify_repeat,
  notify_hour smallint NOT NULL DEFAULT 9 CHECK (
    notify_hour >= 0
    AND notify_hour <= 23
  ),
  post_to_notice boolean NOT NULL DEFAULT false,
  closed_at timestamptz NULL,
  created_by uuid NOT NULL REFERENCES public.users (id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT clan_polls_deadline_after_created_ck CHECK (deadline_at > created_at)
);

COMMENT ON TABLE public.clan_polls IS '클랜 이벤트 탭 투표(D-EVENTS-03). 알림 반복 검증은 앱 레이어.';

CREATE INDEX clan_polls_clan_created_idx ON public.clan_polls (clan_id, created_at DESC);

CREATE TABLE public.poll_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  poll_id uuid NOT NULL REFERENCES public.clan_polls (id) ON DELETE CASCADE,
  label varchar(80) NOT NULL,
  sort_order smallint NOT NULL,
  CONSTRAINT poll_options_poll_sort_uq UNIQUE (poll_id, sort_order)
);

CREATE TABLE public.poll_votes (
  poll_id uuid NOT NULL REFERENCES public.clan_polls (id) ON DELETE CASCADE,
  option_id uuid NOT NULL REFERENCES public.poll_options (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  voted_at timestamptz NOT NULL DEFAULT now (),
  CONSTRAINT poll_votes_pk PRIMARY KEY (poll_id, option_id, user_id)
);

CREATE INDEX poll_votes_poll_idx ON public.poll_votes (poll_id);

CREATE OR REPLACE FUNCTION public.poll_votes_replace_single_choice ()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $$
DECLARE
  mc boolean;
BEGIN
  SELECT multiple_choice INTO mc FROM public.clan_polls WHERE id = NEW.poll_id;
  IF mc IS FALSE THEN
    DELETE FROM public.poll_votes pv
    WHERE pv.poll_id = NEW.poll_id
      AND pv.user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_poll_votes_replace_single_choice
  BEFORE INSERT ON public.poll_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.poll_votes_replace_single_choice ();

ALTER TABLE public.clan_polls ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.clan_polls TO service_role;

GRANT ALL ON TABLE public.poll_options TO service_role;

GRANT ALL ON TABLE public.poll_votes TO service_role;
