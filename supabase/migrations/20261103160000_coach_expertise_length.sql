alter table public.clan_board_coaches
  drop constraint clan_board_coaches_expertise_check,
  add constraint clan_board_coaches_expertise_check
    check (char_length(btrim(expertise)) between 1 and 1000);
