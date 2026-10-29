-- Legacy imports may have no joined_at. Use the membership creation time as its grace-period anchor.
do $$
declare definition text;
begin
  definition:=pg_get_functiondef('private.refresh_clan_member_participation(uuid,timestamptz)'::regprocedure);
  definition:=replace(definition,'select id,clan_id,user_id,joined_at from public.clan_members',
    'select id,clan_id,user_id,coalesce(joined_at,created_at) joined_at from public.clan_members');
  definition:=replace(definition,'m.joined_at=c.joined_at','coalesce(m.joined_at,m.created_at)=c.joined_at');
  execute definition;
end $$;
select private.refresh_clan_member_participation();
