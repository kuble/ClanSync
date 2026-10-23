-- Hold current qualification rules stable until the award marker commits.
do $$ declare definition text; begin
  select pg_get_functiondef('private.finalize_clan_personal_emblem_awards(uuid,text,text,jsonb,jsonb)'::regprocedure) into definition;
  if position('declare ends_at timestamptz; actual jsonb;' in definition)=0
    or position('if p_expected_summary is not null then' in definition)=0
    or position('if p_expected_summary is distinct from jsonb_build_object(' in definition)=0 then
    raise exception 'personal emblem finalization definition drift';
  end if;
  definition:=replace(definition,'declare ends_at timestamptz; actual jsonb;',
    'declare ends_at timestamptz; actual jsonb; actual_config jsonb;');
  definition:=replace(definition,'if p_expected_summary is not null then',
    $body$if p_expected_summary is not null then
    if p_expected_summary ? 'hof_config' then
      select hof_config into actual_config from public.clan_settings where clan_id=p_clan_id for share;
      if (p_expected_summary->'hof_config') is distinct from coalesce(actual_config,'null'::jsonb) then return false; end if;
    end if;$body$);
  execute replace(definition,'if p_expected_summary is distinct from jsonb_build_object(',
    'if (p_expected_summary - ''hof_config'') is distinct from jsonb_build_object(');
end $$;
