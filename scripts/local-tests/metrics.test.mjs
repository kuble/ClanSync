import test from 'node:test';
import assert from 'node:assert/strict';
import { localRates, cloudCounters, cloudRates, deltaRate, parseMetrics } from './metrics.mjs';

test('local interval excludes prior runs and resets instead of showing negative IO',()=>{
  const before={at:'2026-11-05T01:00:00Z',reset:'a',blockSize:8192,read:100,hit:900,inserted:10,updated:0,deleted:0,tempBytes:0,deadlocks:0};
  const after={...before,at:'2026-11-05T01:00:10Z',read:110,hit:990,inserted:30};
  assert.equal(localRates(after,before).cachePercent,90);
  assert.equal(localRates(after,before).changedRowsPerSecond,2);
  assert.equal(localRates(after,before).readMiBps,8192/1048576);
  assert.equal(localRates({...after,reset:'b'},before).readMiBps,null);
  assert.equal(deltaRate(1,100,10),null);
  assert.equal(localRates(after,after).cachePercent,null);
});
test('cloud parser selects only postgres and whole disks, and ignores comments/secrets',()=>{
  const raw=`# HELP ignored data\nnode_time_seconds{project="qa"} 1000\nnode_disk_read_bytes_total{device="nvme0n1"} 200\nnode_disk_read_bytes_total{device="nvme0n1p1"} 200\nnode_disk_read_bytes_total{device="loop0"} 200\npg_stat_database_num_backends{datname="postgres"} 8\npg_stat_database_num_backends{datname="template1"} 1\nnode_memory_MemAvailable_bytes 1048576\nsecret_key{value="hidden"} 99`;
  const counters=cloudCounters(raw);
  assert.equal(counters.readBytes,200);assert.equal(counters.connections,8);assert.equal(counters.memoryBytes,1048576);
  assert.equal(counters.writeBytes,null);assert.equal(JSON.stringify(counters).includes('hidden'),false);
  assert.equal(cloudCounters('pg_stat_database_num_backends{server="localhost:5432"} 14').connections,14);
  assert.equal(parseMetrics('sample{label="hello world"} 1.2e3')[0].value,1200);
});
test('cached cloud samples, restarts and old samples never imply idle recovery',()=>{
  const before={time:1000,boot:1,readBytes:1048576,writeBytes:0,cpu:200,idle:100,ioWait:10,reads:10,writes:1,dbRead:10,dbHit:90,dbReset:1,memoryBytes:1048576};
  const after={...before,time:1010,readBytes:2097152,cpu:210,idle:105,ioWait:11};
  const rates=cloudRates(after,before,1010000);
  assert.equal(rates.readMiBps,.1);assert.equal(rates.cpuPercent,50);assert.equal(rates.ioWaitPercent,10);
  assert.equal(cloudRates(after,after,1010000).readMiBps,null);assert.equal(cloudRates(after,after,1010000).repeated,true);
  assert.equal(cloudRates({...after,boot:2},before,1010000).readMiBps,null);
  assert.equal(cloudRates(after,before,1300000).fresh,false);
  assert.equal(cloudRates({...after,readBytes:null},before,1010000).readMiBps,null);
});
