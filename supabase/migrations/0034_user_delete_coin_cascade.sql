-- 개발 단계: 계정(auth/public.users) 삭제 시 개인 코인 원장·구매 행 연쇄 삭제
-- (클랜 풀 coin_transactions 는 user_id NULL 이라 사용자 삭제와 무관하게 유지)

alter table public.coin_transactions
  drop constraint if exists coin_transactions_user_id_fkey;

alter table public.coin_transactions
  add constraint coin_transactions_user_id_fkey
  foreign key (user_id) references public.users (id) on delete cascade;

-- 정정 거래(correction_of)가 원본을 가리킬 때, 원본 삭제 시 정정 행도 함께 제거
alter table public.coin_transactions
  drop constraint if exists coin_transactions_correction_of_fkey;

alter table public.coin_transactions
  add constraint coin_transactions_correction_of_fkey
  foreign key (correction_of) references public.coin_transactions (id) on delete cascade;

alter table public.purchases
  drop constraint if exists purchases_user_id_fkey;

alter table public.purchases
  add constraint purchases_user_id_fkey
  foreign key (user_id) references public.users (id) on delete cascade;

-- user 삭제 시 purchases ↔ coin_transactions 순서 충돌 방지
alter table public.purchases
  drop constraint if exists purchases_coin_transaction_id_fkey;

alter table public.purchases
  add constraint purchases_coin_transaction_id_fkey
  foreign key (coin_transaction_id) references public.coin_transactions (id) on delete cascade;
