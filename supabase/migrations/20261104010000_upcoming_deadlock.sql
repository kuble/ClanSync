update public.games
set slug = 'deadlock', name_ko = '데드록', name_en = 'Deadlock'
where slug = 'pubg' and not is_active;
