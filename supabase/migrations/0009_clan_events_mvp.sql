-- M6b MVP: 단발 일정만 (source=manual 고정). 반복·스크림 자동·예외 테이블은 후속.

CREATE TYPE clan_event_kind AS ENUM ('intra', 'scrim', 'event');
CREATE TYPE clan_event_source AS ENUM ('manual', 'scrim_auto');

CREATE TABLE public.clan_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id uuid NOT NULL REFERENCES public.clans (id) ON DELETE CASCADE,
  title varchar(120) NOT NULL,
  kind clan_event_kind NOT NULL DEFAULT 'event',
  start_at timestamptz NOT NULL,
  place varchar(500),
  source clan_event_source NOT NULL DEFAULT 'manual',
  created_by uuid NOT NULL REFERENCES public.users (id) ON DELETE RESTRICT,
  cancelled_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT clan_events_mvp_manual_only CHECK (source = 'manual')
);

COMMENT ON TABLE public.clan_events IS
  '클랜 일정(M6b MVP 단발). D-EVENTS-01 확장·반복·scrim_auto 는 후속 마이그레이션.';

CREATE INDEX clan_events_clan_upcoming_idx
  ON public.clan_events (clan_id, start_at)
  WHERE cancelled_at IS NULL;

CREATE TRIGGER trg_clan_events_updated_at
  BEFORE UPDATE ON public.clan_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.clan_events ENABLE ROW LEVEL SECURITY;

-- 서버에서 멤버십·권한 검증 후 service_role 만 사용 (authenticated 직접 GRANT 없음).

GRANT ALL ON TABLE public.clan_events TO service_role;
