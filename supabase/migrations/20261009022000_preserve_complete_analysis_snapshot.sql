-- Partial evaluation writes cannot delete other participants' frozen analyses.
do $$
declare definition text;
begin
 definition := pg_get_functiondef('public.set_balance_scores(uuid,uuid,jsonb)'::regprocedure);
 definition := replace(definition,
   'select coalesce(jsonb_object_agg(e.key,e.value ||',
   'select coalesce(s.ma_snapshot,''{}''::jsonb) || coalesce(jsonb_object_agg(e.key,e.value ||');
 execute definition;
end $$;
