-- Retire the sample catalogue. QA purchase history is reset separately with the QA-only script.
delete from public.user_namecard_selections s using public.nameplate_options o
where s.option_id = o.id and (o.code ~ '^(symbol-|starter-|theme-|pf_entrance_store:)'
  or o.code in ('title-team-player','title-dawn-strategist','title-clan-companion'));
delete from public.nameplate_options
where code ~ '^(symbol-|starter-|theme-|pf_entrance_store:)'
  or code in ('title-team-player','title-dawn-strategist','title-clan-companion');

update public.clans set banner_url = null
where banner_url like '/clan-banners/%' or banner_url = '/images/demo/qa-clan-banner.webp';

delete from public.store_items i
where i.slug in ('clan_banner_slot','clan_banner_midnight','clan_banner_sunset','profile_entrance_fx')
  and not exists(select 1 from public.purchases p where p.item_id=i.id);
-- Preserve financial history if this migration is ever reviewed for another environment.
update public.store_items set is_active = false, asset_url = null
where slug in ('clan_banner_slot','clan_banner_midnight','clan_banner_sunset','profile_entrance_fx');
