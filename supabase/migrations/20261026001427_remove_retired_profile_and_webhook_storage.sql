-- Retired UI storage only. Active housing, namecards, clan badges/emblems and
-- bot notifications remain. RESTRICT deliberately rejects unexpected dependents.
set lock_timeout = '5s';

drop function public.save_showcase_library(integer,jsonb);
drop function public.claim_showcase_product(text);
drop table public.user_showcase_libraries;
drop function public.validate_showcase_library();
drop table public.user_showcase_inventory, public.showcase_catalog;

drop table public.profile_visibility;

-- The bot dispatcher replaced the webhook dispatcher on 2026-10-10.
drop function public.claim_discord_poll_notification_batch(integer);
drop function public.finalize_discord_notification_dispatch(uuid,boolean,text);
drop table public.clan_notification_secrets;

-- The five-slot manual strip was replaced by account-wide personal emblems.
drop function public.save_my_badge_picks(uuid,uuid[]);
drop table public.user_badge_picks, public.user_badge_unlocks;
drop function public.trg_enforce_badge_pick();
drop table public.badges;
drop type public.badge_strip_category, public.badge_unlock_kind;

-- Account-wide selections already replaced per-game selections. Preserve the
-- refund transaction and authorization logic, redirecting its revocation target.
do $$
declare definition text;
begin
  select pg_get_functiondef('public.void_personal_store_purchase(uuid,uuid,uuid,text)'::regprocedure) into definition;
  if position('DELETE FROM public.user_nameplate_selections uns USING public.nameplate_options no' in definition) = 0 then
    raise exception 'Unexpected personal refund definition; review before retiring selections';
  end if;
  execute replace(definition,'public.user_nameplate_selections','public.user_namecard_selections');
end $$;
drop table public.user_nameplate_selections;
drop function public.trg_enforce_nameplate_selection();
