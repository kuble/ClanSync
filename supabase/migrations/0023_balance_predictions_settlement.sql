-- M6c — 승부예측( Premium · 비출전 ) + 경기 결과 확정 + 적중 시 개인 코인 지급(MVP 고정 5코인/인)
-- docs/01-plan/pages/09-BalanceMaker.md

create type public.balance_match_outcome as enum (
  'pending',
  'team1',
  'team2',
  'void'
);

alter table public.balance_sessions
  add column match_outcome public.balance_match_outcome not null default 'pending',
  add column predictions_settled_at timestamptz;

comment on column public.balance_sessions.match_outcome is
  '경기 결과: pending → 운영진 확정 시 team1|team2|void.';

comment on column public.balance_sessions.predictions_settled_at is
  '예측 마감(결과 확정) 시각.';

create table public.balance_session_predictions (
  session_id uuid not null references public.balance_sessions (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  pick_team smallint not null check (pick_team in (1, 2)),
  created_at timestamptz not null default now(),
  primary key (session_id, user_id)
);

create index balance_session_predictions_session_idx
  on public.balance_session_predictions (session_id);

comment on table public.balance_session_predictions is
  'Premium · 비출전 멤버만. pick_team 1=team1(블루), 2=team2(레드).';

-- 로스터 JSON 에 user_id 포함 여부 (RLS·정책용)
create or replace function public.balance_roster_contains_user(
  p_roster jsonb,
  p_uid uuid
)
returns boolean
language plpgsql
stable
as $$
declare
  uid_txt text := p_uid::text;
  slots text[] := array[
    p_roster#>>'{team1,tank}',
    p_roster#>>'{team1,dmg,0}',
    p_roster#>>'{team1,dmg,1}',
    p_roster#>>'{team1,sup,0}',
    p_roster#>>'{team1,sup,1}',
    p_roster#>>'{team2,tank}',
    p_roster#>>'{team2,dmg,0}',
    p_roster#>>'{team2,dmg,1}',
    p_roster#>>'{team2,sup,0}',
    p_roster#>>'{team2,sup,1}'
  ];
  s text;
begin
  if p_roster is null then
    return false;
  end if;
  foreach s in array slots
  loop
    if s is not null and s <> '' and s = uid_txt then
      return true;
    end if;
  end loop;
  return false;
exception
  when others then
    return false;
end;
$$;

revoke all on function public.balance_roster_contains_user(jsonb, uuid) from public;
grant execute on function public.balance_roster_contains_user(jsonb, uuid) to authenticated;

alter table public.balance_session_predictions enable row level security;

create policy balance_session_predictions_select_member
  on public.balance_session_predictions
  for select using (
    exists (
      select 1
        from public.balance_sessions s
        join public.clan_members cm on cm.clan_id = s.clan_id
       where s.id = balance_session_predictions.session_id
         and cm.user_id = (select auth.uid())
         and cm.status = 'active'
    )
  );

create policy balance_session_predictions_insert_self
  on public.balance_session_predictions
  for insert with check (
    (select auth.uid()) = user_id
    and pick_team in (1, 2)
    and exists (
      select 1
        from public.balance_sessions s
        join public.clans c on c.id = s.clan_id
       where s.id = session_id
         and s.phase = 'match_live'::public.balance_session_phase
         and s.match_outcome = 'pending'::public.balance_match_outcome
         and s.closed_at is null
         and c.subscription_tier = 'premium'::public.clan_subscription_tier
         and not public.balance_roster_contains_user(s.roster, (select auth.uid()))
    )
  );

create policy balance_session_predictions_update_self
  on public.balance_session_predictions
  for update using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and pick_team in (1, 2)
    and exists (
      select 1
        from public.balance_sessions s
        join public.clans c on c.id = s.clan_id
       where s.id = balance_session_predictions.session_id
         and s.phase = 'match_live'::public.balance_session_phase
         and s.match_outcome = 'pending'::public.balance_match_outcome
         and s.closed_at is null
         and c.subscription_tier = 'premium'::public.clan_subscription_tier
         and not public.balance_roster_contains_user(s.roster, (select auth.uid()))
    )
  );

-- 경기 결과 확정 + Premium 적중자 코인 (idempotent per user·session via coin_transactions unique)
create or replace function public.set_balance_match_outcome(
  p_session_id uuid,
  p_outcome public.balance_match_outcome
)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_uid uuid := auth.uid();
  v_sess public.balance_sessions%rowtype;
  v_tier public.clan_subscription_tier;
  v_reward int := 5;
  pred record;
  v_new_bal int;
  v_winner_pick smallint;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if p_outcome = 'pending'::public.balance_match_outcome then
    return jsonb_build_object('ok', false, 'error', 'invalid_outcome');
  end if;

  select * into v_sess from public.balance_sessions where id = p_session_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'session_not_found');
  end if;

  if v_sess.closed_at is not null then
    return jsonb_build_object('ok', false, 'error', 'session_closed');
  end if;

  if v_sess.phase is distinct from 'match_live'::public.balance_session_phase then
    return jsonb_build_object('ok', false, 'error', 'wrong_phase');
  end if;

  if v_sess.match_outcome is distinct from 'pending'::public.balance_match_outcome then
    return jsonb_build_object('ok', false, 'error', 'already_resolved');
  end if;

  if not public.is_clan_officer_plus(v_sess.clan_id) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  select c.subscription_tier
    into v_tier
    from public.clans c
   where c.id = v_sess.clan_id;

  if p_outcome = 'team1'::public.balance_match_outcome then
    v_winner_pick := 1;
  elsif p_outcome = 'team2'::public.balance_match_outcome then
    v_winner_pick := 2;
  else
    v_winner_pick := null;
  end if;

  update public.balance_sessions
     set match_outcome = p_outcome,
         predictions_settled_at = now()
   where id = p_session_id;

  if v_winner_pick is not null and v_tier = 'premium'::public.clan_subscription_tier then
    for pred in
      select p.user_id, p.pick_team
        from public.balance_session_predictions p
       where p.session_id = p_session_id
         and p.pick_team = v_winner_pick
    loop
      update public.users u
         set coin_balance = u.coin_balance + v_reward
       where u.id = pred.user_id
         and not exists (
           select 1
             from public.coin_transactions t
            where t.pool_type = 'personal'::public.coin_pool_type
              and t.reference_type = 'balance_session'
              and t.reference_id = p_session_id
              and t.sub_key = pred.user_id::varchar
         )
       returning u.coin_balance into v_new_bal;

      if v_new_bal is not null then
        insert into public.coin_transactions (
          clan_id,
          user_id,
          pool_type,
          amount,
          reason,
          reference_type,
          reference_id,
          sub_key,
          balance_after,
          correction_of,
          created_by
        )
        values (
          null,
          pred.user_id,
          'personal'::public.coin_pool_type,
          v_reward,
          'balance_prediction_win',
          'balance_session',
          p_session_id,
          pred.user_id::varchar,
          v_new_bal,
          null,
          v_uid
        );
      end if;
    end loop;
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

comment on function public.set_balance_match_outcome is
  '운영진: 경기 결과 확정. Premium 이고 team1/team2 일 때 적중자에게 개인 코인 5 지급(중복 방지).';

revoke all on function public.set_balance_match_outcome(uuid, public.balance_match_outcome) from public;
grant execute on function public.set_balance_match_outcome(uuid, public.balance_match_outcome) to authenticated;

do
$$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1
         from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = 'balance_session_predictions'
     ) then
    execute 'alter publication supabase_realtime add table public.balance_session_predictions';
  end if;
end
$$;
