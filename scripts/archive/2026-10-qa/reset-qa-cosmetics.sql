-- Run only through reset-qa-cosmetics.mjs, which verifies the QA project link.
do $$
declare t record; phase integer; signature text; previous text; projection text; affected integer;
begin
  if not exists(select 1 from public.clans where id='73441bc9-2ffd-4789-8da4-f50423073706' and name='QA_01_Clan') then
    raise exception 'QA clan identity required';
  end if;
  lock table public.clans,public.coin_transactions,public.nameplate_options,public.purchases,
    public.store_items,public.user_namecard_selections,public.user_nameplate_inventory,public.users
    in share row exclusive mode;
  create temp table cosmetic_reset_report(label text, total bigint);
  create temp table cosmetic_reset_fingerprints(table_name text primary key, signature text);
  create temp table cosmetic_reset_purchases as
    select p.* from public.purchases p join public.store_items i on i.id=p.item_id
    where i.slug in ('clan_banner_slot','clan_banner_midnight','clan_banner_sunset','profile_entrance_fx',
      'clan_emoji_slots_10','clan_photo_frames','clan_photo_stickers');
  create temp table cosmetic_reset_transactions as
    with recursive roots as (
      select coin_transaction_id as id from cosmetic_reset_purchases
      union select id from public.coin_transactions where reason='purchase_title' and reference_type='profile_title'
    ), chain as (
      select id from roots union select c.id from public.coin_transactions c join chain on c.correction_of=chain.id
    ) select c.* from public.coin_transactions c join chain using(id);
  create temp table cosmetic_reset_refunds as
    select pool_type,user_id,clan_id,sum(amount)::integer as amount from cosmetic_reset_transactions group by pool_type,user_id,clan_id;
  create temp table cosmetic_reset_balances as
    select 'personal' as pool,u.id,u.coin_balance-coalesce(r.amount,0) as expected from public.users u left join cosmetic_reset_refunds r on r.user_id=u.id
    union all select 'clan',c.id,c.coin_balance-coalesce(r.amount,0) from public.clans c left join cosmetic_reset_refunds r on r.clan_id=c.id;
  create temp table cosmetic_reset_other_ledger as
    select * from public.coin_transactions where id not in(select id from cosmetic_reset_transactions);
  create temp table cosmetic_reset_defaults as select * from public.nameplate_options where code like '%-default';
  create temp table cosmetic_reset_other_purchases as select * from public.purchases where id not in(select id from cosmetic_reset_purchases);
  create temp table cosmetic_reset_other_products as select * from public.store_items
    where slug not in ('clan_banner_slot','clan_banner_midnight','clan_banner_sunset','profile_entrance_fx');

  for phase in 1..2 loop
    for t in select tablename from pg_tables where schemaname='public' and tablename not in
      ('coin_transactions','purchases','store_items','nameplate_options','user_namecard_selections','user_nameplate_inventory') order by tablename loop
      projection := case t.tablename when 'users' then 'to_jsonb(r)-''coin_balance''-''updated_at'''
        when 'clans' then 'to_jsonb(r)-''coin_balance''-''banner_url''-''updated_at''' else 'to_jsonb(r)' end;
      execute format('select md5(coalesce(string_agg(row::text,'''' order by row::text),'''')) from (select %s as row from public.%I r) s',projection,t.tablename) into signature;
      if phase=1 then insert into cosmetic_reset_fingerprints values(t.tablename,signature);
      else select f.signature into previous from cosmetic_reset_fingerprints f where f.table_name=t.tablename;
        if signature is distinct from previous then raise exception 'Unrelated data changed: %',t.tablename; end if;
      end if;
    end loop;
    if phase=2 then exit; end if;

    update public.users u set coin_balance=u.coin_balance-r.amount from cosmetic_reset_refunds r where r.user_id=u.id;
    update public.clans c set coin_balance=c.coin_balance-r.amount from cosmetic_reset_refunds r where r.clan_id=c.id;
    delete from public.user_namecard_selections; get diagnostics affected=row_count;
    insert into cosmetic_reset_report values('selections_deleted',affected);
    delete from public.user_nameplate_inventory; get diagnostics affected=row_count;
    insert into cosmetic_reset_report values('inventory_deleted',affected);
    delete from public.purchases where id in(select id from cosmetic_reset_purchases); get diagnostics affected=row_count;
    insert into cosmetic_reset_report values('purchases_deleted',affected);
    delete from public.coin_transactions where id in(select id from cosmetic_reset_transactions); get diagnostics affected=row_count;
    insert into cosmetic_reset_report values('purchase_transactions_deleted',affected);
    delete from public.nameplate_options where code ~ '^(symbol-|starter-|theme-|pf_entrance_store:)'
      or code in ('title-team-player','title-dawn-strategist','title-clan-companion'); get diagnostics affected=row_count;
    insert into cosmetic_reset_report values('sample_options_deleted',affected);
    update public.clans set banner_url=null where banner_url like '/clan-banners/%' or banner_url='/images/demo/qa-clan-banner.webp';
    get diagnostics affected=row_count; insert into cosmetic_reset_report values('banners_reset',affected);
    delete from public.store_items where slug in ('clan_banner_slot','clan_banner_midnight','clan_banner_sunset','profile_entrance_fx');
    get diagnostics affected=row_count; insert into cosmetic_reset_report values('sample_products_deleted',affected);
  end loop;
  if exists(select 1 from cosmetic_reset_balances b left join public.users u on b.pool='personal' and u.id=b.id
    left join public.clans c on b.pool='clan' and c.id=b.id where b.expected is distinct from coalesce(u.coin_balance,c.coin_balance)) then
    raise exception 'Refund balance mismatch';
  end if;
  if exists((select * from cosmetic_reset_other_ledger except select * from public.coin_transactions)
    union all (select * from public.coin_transactions except select * from cosmetic_reset_other_ledger)) then raise exception 'Unrelated coin ledger changed'; end if;
  if exists((select * from cosmetic_reset_defaults except select * from public.nameplate_options)
    union all (select * from public.nameplate_options where code like '%-default' except select * from cosmetic_reset_defaults)) then raise exception 'Default options changed'; end if;
  if exists((select * from cosmetic_reset_other_purchases except select * from public.purchases)
    union all (select * from public.purchases except select * from cosmetic_reset_other_purchases)) then raise exception 'Unrelated purchases changed'; end if;
  if exists((select * from cosmetic_reset_other_products except select * from public.store_items)
    union all (select * from public.store_items except select * from cosmetic_reset_other_products)) then raise exception 'Other products changed'; end if;
  insert into cosmetic_reset_report values('protected_tables_verified',(select count(*) from cosmetic_reset_fingerprints)),
    ('coins_restored',coalesce((select -sum(amount) from cosmetic_reset_transactions),0));
end $$;
select * from cosmetic_reset_report order by label;
