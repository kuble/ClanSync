-- Check eligibility after settings cleanup and before the formation/map guard.
alter trigger z_clan_participant_roster on public.balance_sessions rename to guard_balance_01_participant;
