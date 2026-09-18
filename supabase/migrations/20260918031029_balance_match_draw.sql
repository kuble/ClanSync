-- A draw is a played match, distinct from a cancelled/void round.
-- Existing result settlement awards coins only for team1/team2 and marks all
-- other final outcomes settled without a payout. next_balance_round accepts
-- any settled outcome, so preserve those tested permissions and lifecycle rules.
alter type public.balance_match_outcome add value if not exists 'draw';

comment on type public.balance_match_outcome is
  'pending: 미정, team1/team2: 승리 팀, draw: 무승부, void: 무효. 무승부와 무효는 예측 보상을 지급하지 않는다.';
