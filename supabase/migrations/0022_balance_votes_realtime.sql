-- M6c — 맵·영웅 투표 행 변경 시 클라이언트 Realtime 갱신용 publication

do
$$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1
         from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = 'balance_session_map_votes'
     ) then
    execute 'alter publication supabase_realtime add table public.balance_session_map_votes';
  end if;

  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1
         from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = 'balance_session_hero_votes'
     ) then
    execute 'alter publication supabase_realtime add table public.balance_session_hero_votes';
  end if;
end
$$;
