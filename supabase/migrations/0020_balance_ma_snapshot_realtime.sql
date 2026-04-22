-- M6c — 경기 단계 M/A 스냅샷(세션 로컬) + balance_sessions Realtime

alter table public.balance_sessions
  add column ma_snapshot jsonb not null default '{}'::jsonb;

comment on column public.balance_sessions.ma_snapshot is
  '밸런스 세션별 M/A: { "<user_id>": { "m": number, "a": number|null } }. player_scores 테이블과 별개 스냅샷.';

-- Realtime (호스티드 Supabase / 로컬 CLI 공통 publication 가정)
do
$$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1
         from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = 'balance_sessions'
     ) then
    execute 'alter publication supabase_realtime add table public.balance_sessions';
  end if;
end
$$;
