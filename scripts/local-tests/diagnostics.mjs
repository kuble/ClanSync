import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { checked, container, assertLocalWorkdir } from './runtime.mjs';

async function sql(statement, user='postgres') {
  assertLocalWorkdir();
  const command=user==='supabase_admin'
    ? ['sh','-c','PGPASSWORD="$POSTGRES_PASSWORD" exec psql -U supabase_admin "$@"','sh']
    : ['psql','-U','postgres'];
  return checked('docker',['exec',container,...command,'-d','postgres','-v','ON_ERROR_STOP=1','-Atc',statement],{timeout:15000});
}
export async function enableDiagnostics() {
  // Reload the disposable server's defaults, including already-open pool
  // connections. ALTER DATABASE alone affects only newly opened sessions.
  await sql("ALTER SYSTEM SET track_io_timing = on;",'supabase_admin');
  await sql("ALTER SYSTEM SET track_wal_io_timing = on;",'supabase_admin');
  await sql("ALTER SYSTEM SET track_functions = 'pl';",'supabase_admin');
  await sql("SELECT pg_reload_conf();",'supabase_admin');
}
export async function captureDiagnostics(dir, stage) {
  if(!['before','after'].includes(stage))throw new Error('잘못된 계측 단계');
  const result=JSON.parse((await sql(`/* clansync_metrics */
    select json_build_object('at',clock_timestamp(),'ioTiming',current_setting('track_io_timing'),
    'walTiming',current_setting('track_wal_io_timing'),'queryScope','all-roles-v2','timingScope','server-reload-v2',
    'wal',(select row_to_json(w) from (select stats_reset,wal_bytes,wal_records,wal_buffers_full,wal_write,wal_sync,wal_write_time,wal_sync_time from pg_stat_wal) w),
    'queryReset',(select stats_reset from extensions.pg_stat_statements_info),
    'database',(select row_to_json(d) from (select stats_reset,blks_read,blks_hit,blk_read_time,blk_write_time,
      tup_inserted,tup_updated,tup_deleted,temp_bytes,deadlocks,xact_commit,xact_rollback
      from pg_stat_database where datname=current_database()) d),
    'functions',(select coalesce(json_agg(f),'[]'::json) from (select funcid::text as id,schemaname||'.'||funcname as name,calls,total_time,self_time from pg_stat_user_functions) f),
    'queries',(select coalesce(json_agg(q),'[]'::json) from (
      select s.queryid::text||':'||s.userid::text as id,r.rolname as role,s.calls,
        s.total_exec_time as "totalMs",s.mean_exec_time as "meanMs",s.max_exec_time as "maxMs",
        s.shared_blks_read as "readBlocks",s.shared_blks_hit as "hitBlocks",s.shared_blks_written as "writtenBlocks",
        s.shared_blk_read_time as "readMs",s.shared_blk_write_time as "writeMs",s.temp_blks_written as "tempBlocks",s.wal_bytes as "walBytes",
        (select coalesce(json_agg(distinct m[1]||'.'||m[2]),'[]'::json) from regexp_matches(s.query,'"?(public|private|auth|storage)"?\\."?([a-zA-Z_][a-zA-Z0-9_]*)"?','g') m) as objects
      from extensions.pg_stat_statements s join pg_roles r on r.oid=s.userid
      where s.query not like '%clansync_metrics%'
    ) q));`)).trim());
  writeFileSync(resolve(dir,`db-${stage}.json`),JSON.stringify(result,null,2));
  return result;
}

export function compareDiagnostics(before,after) {
  if(before.database.stats_reset!==after.database.stats_reset||before.queryReset!==after.queryReset||before.wal?.stats_reset!==after.wal?.stats_reset)throw new Error('측정 사이에 DB 통계가 초기화되었습니다.');
  const previous=new Map(before.queries.map(q=>[q.id,q]));
  const fields=['calls','totalMs','readBlocks','hitBlocks','writtenBlocks','readMs','writeMs','tempBlocks','walBytes'];
  const queries=after.queries.map(q=>{
    const p=previous.get(q.id),d={id:q.id,role:q.role,objects:q.objects};
    for(const key of fields)d[key]=q[key]-(p?.[key]||0);
    d.meanMs=d.calls>0?d.totalMs/d.calls:null;
    // maxMs is lifetime since DB initialization, not an interval maximum.
    d.lifetimeMaxMs=q.maxMs;
    return d;
  }).filter(q=>q.calls>0).sort((a,b)=>b.totalMs-a.totalMs);
  const database=Object.fromEntries(Object.keys(after.database).filter(k=>k!=='stats_reset').map(k=>[k,after.database[k]-before.database[k]]));
  const wal=after.wal&&before.wal?Object.fromEntries(Object.keys(after.wal).filter(k=>k!=='stats_reset').map(k=>[k,after.wal[k]-before.wal[k]])):null;
  const oldFunctions=new Map(before.functions.map(f=>[f.id,f]));
  const functions=after.functions.map(f=>({id:f.id,name:f.name,calls:f.calls-(oldFunctions.get(f.id)?.calls||0),
    totalMs:f.total_time-(oldFunctions.get(f.id)?.total_time||0),selfMs:f.self_time-(oldFunctions.get(f.id)?.self_time||0)}))
    .filter(f=>f.calls>0).sort((a,b)=>b.selfMs-a.selfMs);
  return {from:before.at,to:after.at,seconds:(Date.parse(after.at)-Date.parse(before.at))/1000,ioTiming:after.ioTiming,
    walTiming:after.walTiming,timingScope:after.timingScope||'new-connections-v1',queryScope:after.queryScope||'application-roles-v1',database,wal,queries,functions};
}
