import { appendFileSync, mkdirSync, readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { checked, container, workdir, root, assertLocalWorkdir } from "./runtime.mjs";
import { parseEnvFile } from "../parse-env-file.mjs";
import { TEST_PROJECT_REF } from "../test-env.mjs";

// Statistics only: no application rows, query text, parameters or credentials.
const localSql = `/* clansync_metrics */
select json_build_object(
 'at',clock_timestamp(),'reset',d.stats_reset,'blockSize',current_setting('block_size')::int,
 'read',d.blks_read,'hit',d.blks_hit,'inserted',d.tup_inserted,'updated',d.tup_updated,'deleted',d.tup_deleted,
 'tempBytes',d.temp_bytes,'deadlocks',d.deadlocks,
 'accounts',(select count(*) from auth.users),'clans',(select count(*) from public.clans),'matches',(select count(*) from public.balance_sessions),
 'activity',(select json_build_object('active',count(*) filter(where state='active'),
   'lockWaits',count(*) filter(where wait_event_type='Lock'), 'ioWaits',count(*) filter(where wait_event_type='IO'),
   'longestSeconds',coalesce(max(extract(epoch from clock_timestamp()-query_start)) filter(where state='active'),0))
   from pg_stat_activity where datname=current_database() and pid<>pg_backend_pid() and backend_type='client backend'),
 'queries',coalesce((select json_agg(q) from (
   select s.queryid::text as id, s.calls, round(s.mean_exec_time::numeric,2) as "meanMs",
     round(s.total_exec_time::numeric,2) as "totalMs",s.shared_blks_read as "readBlocks",
     s.temp_blks_written as "tempBlocks"
   from extensions.pg_stat_statements(false) s join pg_roles r on r.oid=s.userid
   where r.rolname in ('authenticator','authenticated','anon','service_role','supabase_auth_admin','supabase_storage_admin')
   order by s.total_exec_time desc limit 8
 ) q),'[]'::json)) from pg_stat_database d where datname=current_database();`;

export function deltaRate(current, previous, seconds) {
  return seconds > 0 && Number.isFinite(current) && Number.isFinite(previous) && current >= previous
    ? (current - previous) / seconds : null;
}
const ratio = (part, total) => part !== null && total > 0 ? 100 * part / total : null;
export function localRates(current, previous) {
  const seconds = previous && current.reset === previous.reset ? (Date.parse(current.at)-Date.parse(previous.at))/1000 : 0;
  const rate = name => deltaRate(current[name], previous?.[name], seconds);
  const read=rate("read"),hit=rate("hit"),inserted=rate("inserted"),updated=rate("updated"),deleted=rate("deleted");
  return { readMiBps: read === null ? null : read*current.blockSize/1048576,
    changedRowsPerSecond: [inserted,updated,deleted].includes(null) ? null : inserted+updated+deleted,
    cachePercent: read === null || hit === null ? null : ratio(hit,hit+read),
    tempMiBps: rate("tempBytes") === null ? null : rate("tempBytes")/1048576,
    deadlocksPerSecond: rate("deadlocks"), intervalSeconds: seconds || null };
}

// The exporter may return a cached sample. Use its timestamp, never request time,
// to calculate rates. Missing counters and resets remain unknown, not zero.
export function parseMetrics(text) {
  return text.split("\n").flatMap(line=>{
    const match=line.match(/^([a-zA-Z_:][\w:]*)(\{.*\})?\s+([-+\d.eE]+)(?:\s+\d+)?$/);
    if(!match || !Number.isFinite(Number(match[3]))) return [];
    const labels=Object.fromEntries([...String(match[2]||"").matchAll(/(\w+)="((?:[^"\\]|\\.)*)"/g)].map(m=>[m[1],m[2]]));
    return [{name:match[1],labels,value:Number(match[3])}];
  });
}
export function cloudCounters(text) {
  const metrics=parseMetrics(text);
  const sum=(name,filter=()=>true)=>{const rows=metrics.filter(m=>m.name===name&&filter(m.labels));return rows.length?rows.reduce((total,m)=>total+m.value,0):null;};
  // Whole physical devices only; do not count both a disk and its partitions.
  const disk=l=>/^(nvme\d+n\d+|[svx]d[a-z]+)$/.test(l.device||"");
  // Hosted Supabase's aggregate exporter omits datname; vanilla exporters keep it.
  const pg=l=>!l.datname||l.datname==="postgres";
  return { time:sum("node_time_seconds"),boot:sum("node_boot_time_seconds"),
    readBytes:sum("node_disk_read_bytes_total",disk),writeBytes:sum("node_disk_written_bytes_total",disk),
    reads:sum("node_disk_reads_completed_total",disk),writes:sum("node_disk_writes_completed_total",disk),
    queue:sum("node_disk_io_now",disk),cpu:sum("node_cpu_seconds_total",l=>!['guest','guest_nice'].includes(l.mode)),
    idle:sum("node_cpu_seconds_total",l=>l.mode==='idle'),ioWait:sum("node_cpu_seconds_total",l=>l.mode==='iowait'),
    memoryBytes:sum("node_memory_MemAvailable_bytes"),dbRead:sum("pg_stat_database_blks_read_total",pg),
    dbHit:sum("pg_stat_database_blks_hit_total",pg),connections:sum("pg_stat_database_num_backends",pg),
    dbReset:sum("pg_stat_database_most_recent_reset",pg) };
}
export function cloudRates(current, previous, now=Date.now()) {
  const seconds=previous && current.boot === previous.boot ? current.time-previous.time : 0;
  const rate=name=>deltaRate(current[name],previous?.[name],seconds);
  const cpu=rate('cpu'),idle=rate('idle'),wait=rate('ioWait');
  const read=rate('dbRead'),hit=rate('dbHit');
  return { sampledAt: current.time ? new Date(current.time*1000).toISOString() : null,
    fresh: !!current.time && now/1000-current.time<150 && now/1000-current.time>=-10,
    repeated: !!previous && current.time===previous.time, intervalSeconds:seconds>0?seconds:null,
    readMiBps:rate('readBytes')===null?null:rate('readBytes')/1048576,
    writeMiBps:rate('writeBytes')===null?null:rate('writeBytes')/1048576,
    iops:rate('reads')===null||rate('writes')===null?null:rate('reads')+rate('writes'),
    cpuPercent:cpu>0 && idle!==null?100*(cpu-idle)/cpu:null,ioWaitPercent:ratio(wait,cpu),
    memoryMiB:current.memoryBytes===null?null:current.memoryBytes/1048576,queue:current.queue,connections:current.connections,
    cachePercent:current.dbReset===previous?.dbReset&&read!==null&&hit!==null?ratio(hit,read+hit):null };
}

export function createMetricsCollector(context=()=>({})) {
  const dir=resolve(workdir,'metrics');mkdirSync(dir,{recursive:true});
  const histories={local:[],qa:[]};
  // Restore a bounded tail, so refreshing/restarting the dashboard keeps evidence.
  for(const file of readdirSync(dir).filter(f=>/^\d{4}-\d{2}-\d{2}\.jsonl$/.test(f)).sort().slice(-2)) {
    for(const line of readFileSync(resolve(dir,file),'utf8').split('\n').slice(-1200)) {
      try { const item=JSON.parse(line);if(histories[item.source])histories[item.source].push(item); } catch { /* incomplete last line */ }
    }
  }
  for(const key of Object.keys(histories))histories[key]=histories[key].slice(-120);
  let previousLocal=null,previousCloud=null;
  const busy={local:false,qa:false};
  const latest={local:{status:'checking'},qa:{status:'checking'}};
  const persist=sample=>{
    histories[sample.source].push(sample);histories[sample.source]=histories[sample.source].slice(-120);
    appendFileSync(resolve(dir,sample.at.slice(0,10)+'.jsonl'),JSON.stringify(sample)+'\n');
    latest[sample.source]=sample;
  };
  async function sample(source) {
    if(busy[source])return;busy[source]=true;
    const at=new Date().toISOString(),tag=context();
    try {
      if(source==='local') {
        assertLocalWorkdir();
        const current=JSON.parse((await checked('docker',['exec',container,'psql','-U','postgres','-d','postgres','-Atc',localSql],{timeout:8000})).trim());
        persist({source,at,...tag,status:'ready',activityScope:'client-backend-v1',...localRates(current,previousLocal),...current.activity,
          accounts:current.accounts,clans:current.clans,matches:current.matches,queries:current.queries});
        previousLocal=current;
      } else {
        const envPath=resolve(root,'.env.local');
        const token=existsSync(envPath)?parseEnvFile(envPath).SUPABASE_ACCESS_TOKEN:null;
        if(!token){persist({source,at,...tag,status:'unconfigured'});return;}
        const response=await fetch(`https://api.supabase.com/v1/projects/${TEST_PROJECT_REF}/analytics/endpoints/metrics`,{
          headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(15000)});
        if(!response.ok)throw new Error(`지표 조회 응답 ${response.status}`);
        const current=cloudCounters(await response.text()),rates=cloudRates(current,previousCloud);
        if(!current.time)throw new Error('지표 시각이 없습니다.');
        persist({source,at,...tag,status:rates.fresh?'ready':'stale',...rates});
        if(!previousCloud||current.time!==previousCloud.time)previousCloud=current;
      }
    } catch {
      // Raw errors may contain URLs/credentials; publish only a fixed state.
      persist({source,at,...tag,status:'unavailable'});
      if(source==='local')previousLocal=null;
    } finally {busy[source]=false;}
  }
  return { sample, snapshot:()=>({local:latest.local,qa:latest.qa,
    history:Object.fromEntries(Object.entries(histories).map(([source,items])=>[source,items.map(item=>({...item,queries:undefined}))]))}) };
}
