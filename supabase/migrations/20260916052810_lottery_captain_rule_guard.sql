-- Captains for a role lottery must be the two resulting tanks. Selecting IDs
-- before drawing roles would make starts fail randomly when their roles differ.
alter table public.balance_sessions add constraint formation_lottery_captains_ck
  check (formation_settings->>'roles' <> 'lottery' or not (formation_settings ? 'captains'));
