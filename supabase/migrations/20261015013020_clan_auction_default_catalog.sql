-- Only newly created clans receive the editable starter catalog.
create function private.add_clan_default_auction_items() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  insert into public.clan_auction_items(clan_id,name,description,cost,enabled) values
    (new.id,'맵 선정권','맵을 선정할 수 있습니다. (양 팀 다 사용할 경우 랜덤으로 선택합니다.)',50,true),
    (new.id,'영웅 밴 카드 1장','영웅을 1명 밴 할 수 있습니다. (양 팀 다 사용할 경우 최대 2명 밴 됩니다.)',100,true),
    (new.id,'영웅 밴 카드 2장','서로 다른 역할의 영웅을 각각 1명씩 총 2명을 밴 할 수 있습니다. (양 팀 다 사용할 경우 최대 4명 밴 됩니다.)',300,true);
  return new;
end $$;
revoke all on function private.add_clan_default_auction_items() from public,anon,authenticated,service_role;
create trigger add_clan_default_auction_items after insert on public.clans
  for each row execute function private.add_clan_default_auction_items();
