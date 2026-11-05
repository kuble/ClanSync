import test from 'node:test';
import assert from 'node:assert/strict';
import {compareDiagnostics} from './diagnostics.mjs';
test('diagnostics subtracts warm-up work and separates overloaded functions',()=>{
  const query={id:'1:2',role:'authenticated',objects:['public.example'],calls:3,totalMs:30,readBlocks:5,hitBlocks:10,writtenBlocks:1,readMs:2,writeMs:1,tempBlocks:0,walBytes:500,maxMs:15};
  const before={at:'2026-11-05T00:00:00Z',ioTiming:'on',queryReset:'a',database:{stats_reset:'a',blks_read:5},wal:{stats_reset:'a',wal_write_time:10,wal_sync_time:30},queries:[query],functions:[{id:'1',name:'public.same',calls:2,total_time:15,self_time:10},{id:'2',name:'public.same',calls:3,total_time:20,self_time:15}]};
  const after={...before,at:'2026-11-05T00:00:10Z',database:{stats_reset:'a',blks_read:7},wal:{stats_reset:'a',wal_write_time:15,wal_sync_time:45},queries:[{...query,calls:5,totalMs:70,readBlocks:7}],functions:[{...before.functions[0],calls:4,total_time:25,self_time:20},before.functions[1]]};
  const result=compareDiagnostics(before,after);
  assert.equal(result.seconds,10);assert.equal(result.database.blks_read,2);assert.equal(result.queries[0].calls,2);assert.equal(result.queries[0].meanMs,20);
  assert.equal(result.functions.length,1);assert.equal(result.functions[0].calls,2);
  assert.equal(result.wal.wal_sync_time,15);
  assert.throws(()=>compareDiagnostics(before,{...after,queryReset:'b'}));
  assert.throws(()=>compareDiagnostics(before,{...after,database:{stats_reset:'b'}}));
  assert.throws(()=>compareDiagnostics(before,{...after,wal:{stats_reset:'b'}}));
});
