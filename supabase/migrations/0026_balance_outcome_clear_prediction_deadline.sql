-- M6c — 결과 확정 시 예측 마감 시각 정리 (UI·정합)

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
  v_winner_count int := 0;
  v_total_cost int := 0;
  v_clan_new_bal int;
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

  if v_winner_pick is not null
     and v_tier = 'premium'::public.clan_subscription_tier then
    select count(*)::int
      into v_winner_count
      from public.balance_session_predictions p
     where p.session_id = p_session_id
       and p.pick_team = v_winner_pick
       and not exists (
         select 1
           from public.coin_transactions t
          where t.pool_type = 'personal'::public.coin_pool_type
            and t.reference_type = 'balance_session'
            and t.reference_id = p_session_id
            and t.sub_key = p.user_id::varchar
       );

    v_total_cost := v_winner_count * v_reward;

    if v_total_cost > 0 then
      update public.clans c
         set coin_balance = c.coin_balance - v_total_cost
       where c.id = v_sess.clan_id
         and c.coin_balance >= v_total_cost
       returning c.coin_balance into v_clan_new_bal;

      if v_clan_new_bal is null then
        return jsonb_build_object('ok', false, 'error', 'insufficient_clan_coins');
      end if;

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
        v_sess.clan_id,
        null,
        'clan'::public.coin_pool_type,
        -v_total_cost,
        'balance_prediction_payout',
        'balance_session',
        p_session_id,
        '',
        v_clan_new_bal,
        null,
        v_uid
      );
    end if;
  end if;

  update public.balance_sessions
     set match_outcome = p_outcome,
         predictions_settled_at = now(),
         prediction_deadline_at = null
   where id = p_session_id;

  if v_winner_pick is not null
     and v_tier = 'premium'::public.clan_subscription_tier
     and v_total_cost > 0 then
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

comment on function public.set_balance_match_outcome(uuid, public.balance_match_outcome) is
  '운영진: 경기 결과 확정. Premium·승패 확정 시 적중 인원×보상만큼 클랜 풀 차감(원장 1건) 후 개인 지급. 확정 시 prediction_deadline_at 초기화.';
