-- M6b — 클랜 내 대진표 개최 메타·스냅샷 영속화 (D-EVENTS-05 MVP).
-- 코인 연동(host_coin_transaction_id 등)·정규화 팀/매치 테이블은 후속 마이그레이션으로 확장.

CREATE TYPE public.bracket_format AS ENUM (
  'single_elim',
  'double_elim',
  'round_robin'
);

CREATE TYPE public.bracket_status AS ENUM (
  'draft',
  'in_progress',
  'finished',
  'cancelled'
);

CREATE TABLE public.bracket_tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  host_clan_id uuid NOT NULL REFERENCES public.clans (id) ON DELETE CASCADE,
  title varchar(120) NOT NULL,
  format public.bracket_format NOT NULL DEFAULT 'single_elim'::public.bracket_format,
  team_count smallint NOT NULL CHECK (team_count IN (2, 4, 8, 16)),
  status public.bracket_status NOT NULL DEFAULT 'draft'::public.bracket_status,
  started_at timestamptz NULL,
  finished_at timestamptz NULL,
  cancelled_at timestamptz NULL,
  host_coin_transaction_id uuid NULL REFERENCES public.coin_transactions (id) ON DELETE SET NULL,
  winner_coin_transaction_id uuid NULL REFERENCES public.coin_transactions (id) ON DELETE SET NULL,
  entry_coin_transaction_id uuid NULL REFERENCES public.coin_transactions (id) ON DELETE SET NULL,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL REFERENCES public.users (id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now (),
  updated_at timestamptz NOT NULL DEFAULT now (),
  CONSTRAINT bracket_tournaments_cancel_requires_no_winner_ck CHECK (
    cancelled_at IS NULL
    OR winner_coin_transaction_id IS NULL
  )
);

COMMENT ON COLUMN public.bracket_tournaments.snapshot IS
  'MVP 마법사·브래킷 트리 JSON (팀 로스터·매치 결과 등). 정규화 테이블 도입 후 이관 가능.';

CREATE INDEX bracket_tournaments_host_created_idx ON public.bracket_tournaments (
  host_clan_id,
  created_at DESC
);

CREATE TRIGGER trg_bracket_tournaments_updated_at
  BEFORE UPDATE ON public.bracket_tournaments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at ();

CREATE OR REPLACE FUNCTION public.bracket_tournaments_host_must_be_premium ()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $$
BEGIN
  IF NOT EXISTS (
    SELECT
      1
    FROM
      public.clans c
    WHERE
      c.id = NEW.host_clan_id
      AND c.subscription_tier = 'premium'::public.clan_subscription_tier
  ) THEN
    RAISE EXCEPTION 'bracket_tournaments: Premium 클랜만 대진표를 개최할 수 있습니다';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_bracket_tournaments_premium_host
  BEFORE INSERT OR UPDATE OF host_clan_id ON public.bracket_tournaments
  FOR EACH ROW
  EXECUTE FUNCTION public.bracket_tournaments_host_must_be_premium ();

ALTER TABLE public.bracket_tournaments ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.bracket_tournaments TO service_role;
