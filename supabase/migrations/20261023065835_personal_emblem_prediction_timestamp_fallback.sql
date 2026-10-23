-- Legacy completed predictions may only retain the round's opening timestamp.
do $$ declare definition text; clan uuid; begin
  select pg_get_functiondef('private.refresh_clan_personal_emblem_milestones(uuid)'::regprocedure) into definition;
  if position('coalesce(s.predictions_settled_at,s.closed_at)' in definition)=0 then
    raise exception 'personal emblem prediction timestamp definition drift';
  end if;
  execute replace(definition,'coalesce(s.predictions_settled_at,s.closed_at)',
    'coalesce(s.predictions_settled_at,s.closed_at,s.opened_at)');
  for clan in select id from public.clans loop perform private.refresh_clan_personal_emblem_milestones(clan); end loop;
end $$;
