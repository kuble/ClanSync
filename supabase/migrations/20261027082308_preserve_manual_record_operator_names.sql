-- Manually entered records have no matches/balance_sessions parent.
alter table private.clan_match_record_corrections add column operator_name text;
create trigger capture_operator_name before insert or update on private.clan_match_record_corrections
  for each row execute function private.capture_operator_name('updated_by','operator_name');
update private.clan_match_record_corrections set operator_name=null where operator_name is null;

create or replace function public.read_clan_match_record_corrections(p_clan_id uuid)
returns table(id uuid,payload jsonb,deleted boolean)
language sql stable security invoker set search_path='' as $$
  select c.id,c.payload||jsonb_build_object('operator_name',c.operator_name),c.deleted
    from private.clan_match_record_corrections c where c.clan_id=p_clan_id order by c.id;
$$;
revoke all on function public.read_clan_match_record_corrections(uuid) from public,anon,authenticated;
grant execute on function public.read_clan_match_record_corrections(uuid) to service_role;

create or replace function public.read_clan_stats_records(p_clan_id uuid,p_day text default null,p_user_id uuid default null,p_offset int default 0)
returns table(source text,payload jsonb) language plpgsql stable security invoker set search_path='' as $$
begin
  if p_day is not null then
    return query select r.source,r.payload||jsonb_build_object('_revision',md5(r.source||r.payload::text),
        'operator_name',coalesce(m.operator_name,s.operator_name,c.operator_name,'운영자 정보 없음'))
      from private.clan_stats_records r
      left join public.matches m on r.source='match' and m.id=r.id and m.clan_id=r.clan_id
      left join public.balance_sessions s on r.source='balance' and s.id=r.id and s.clan_id=r.clan_id
      left join private.clan_match_record_corrections c on c.id=r.id and c.clan_id=r.clan_id
      where r.clan_id=p_clan_id and r.day=p_day and (p_user_id is null or r.user_ids @> array[p_user_id::text])
      order by r.occurred_at desc,r.id desc limit 500 offset greatest(p_offset,0);
  elsif p_user_id is not null then
    return query select r.source,r.payload||jsonb_build_object('_revision',md5(r.source||r.payload::text),
        'operator_name',coalesce(m.operator_name,s.operator_name,c.operator_name,'운영자 정보 없음'))
      from private.clan_stats_records r
      left join public.matches m on r.source='match' and m.id=r.id and m.clan_id=r.clan_id
      left join public.balance_sessions s on r.source='balance' and s.id=r.id and s.clan_id=r.clan_id
      left join private.clan_match_record_corrections c on c.id=r.id and c.clan_id=r.clan_id
      where r.clan_id=p_clan_id and r.user_ids @> array[p_user_id::text]
      order by r.occurred_at desc,r.id desc limit 500 offset greatest(p_offset,0);
  end if;
end;
$$;
revoke all on function public.read_clan_stats_records(uuid,text,uuid,int) from public,anon,authenticated;
grant execute on function public.read_clan_stats_records(uuid,text,uuid,int) to service_role;
