import { test } from "node:test";
import assert from "node:assert/strict";
import { summarize, readRun } from "./state.mjs";
import { redact } from "./runtime.mjs";

test("live results replace running entries, retain errors, and report cleanup separately",()=>{
  const state=summarize([
    {type:"planned",total:2},
    {type:"test",id:"one",status:"start",title:"login"},
    {type:"test",id:"one",status:"pass",title:"login",duration:12},
    {type:"test",id:"two",status:"fail",title:"result",error:"failed"},
    {type:"cleanup",status:"pass",counts:{accounts:0,clans:0,matches:0}},
    {type:"end",status:"fail",at:"2026-11-05T00:00:00Z"},
  ]);
  assert.deepEqual(state.counts,{pass:1,fail:1,skip:0,start:0});
  assert.equal(state.tests.length,2);assert.equal(state.status,"fail");
  assert.equal(state.cleanup.status,"pass");assert.equal(state.tests[1].error,"failed");
});
test("unfinished runs do not claim that cleanup succeeded",()=>{
  const state=summarize([{type:"error",error:"setup failed"},{type:"end",status:"fail"}]);
  assert.equal(state.cleanup,null);assert.equal(state.status,"fail");
});
test("measurement context tracks the active test file and clears it during cleanup",()=>{
  const events=[{type:'phase',title:'DB 검사 실행 중'},{type:'test',id:'one',status:'start',file:'scripts/example.test.mjs'}];
  assert.equal(summarize(events).currentFile,'scripts/example.test.mjs');
  assert.equal(summarize([...events,{type:'phase',title:'검사 후 데이터 정리'}]).currentFile,null);
});
test("report reader rejects paths outside the local results directory",()=>{
  for(const id of ["../.env.local","a/b","a\\b",".","", "C:\\test"])
    assert.throws(()=>readRun(id));
});
test("reports redact authentication material",()=>{
  const output=redact("eyJabc.abc.def sb_secret_abcdef postgresql://user:pass@db/test password=private");
  for(const secret of ["eyJabc","abcdef","user:pass","private"])assert.ok(!output.includes(secret));
});
