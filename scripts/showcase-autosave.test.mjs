import { test } from "node:test";
import assert from "node:assert/strict";
import { ShowcaseAutosave } from "../src/lib/showcase/autosave.ts";

const document = background => ({representative:"first",cabinets:[{id:"first",name:"진열장",template:"focus",background,items:[]}]});
const deferred = () => { let resolve; const promise=new Promise(r=>{resolve=r;});return {promise,resolve}; };

test("release starts saving immediately and serializes the newest layout with the acknowledged revision",async()=>{
  const gate=deferred(),calls=[];
  const save=new ShowcaseAutosave(document("forest"),-1,async(doc,revision)=>{calls.push({doc,revision});if(calls.length===1)await gate.promise;return {ok:true,revision:revision+1};});
  save.edit(document("cream"));await Promise.resolve();
  assert.equal(calls.length,1);
  save.edit(document("midnight"));save.edit(document("forest"));
  assert.equal(calls.length,1);
  gate.resolve();assert.equal(await save.flush(),true);
  assert.equal(calls.length,2);assert.equal(calls[1].revision,0);
  assert.equal(calls[1].doc.cabinets[0].background,"forest");
  assert.deepEqual(save.getSnapshot(),{document:document("forest"),revision:1,dirty:false,saving:false,error:null});
});

test("failure pauses writes and keeps newer edits until explicit retry",async()=>{
  const gate=deferred();let calls=0;
  const save=new ShowcaseAutosave(document("forest"),4,async()=>{calls++;if(calls===1){await gate.promise;throw Error("offline");}return {ok:true,revision:5};});
  save.edit(document("cream"));await Promise.resolve();save.edit(document("midnight"));gate.resolve();
  assert.equal(await save.flush(),false);assert.equal(save.getSnapshot().document.cabinets[0].background,"midnight");
  save.edit(document("cream"));await save.flush();assert.equal(calls,1);
  assert.equal(await save.retry(),true);assert.equal(calls,2);assert.equal(save.getSnapshot().revision,5);
  assert.equal(save.getSnapshot().dirty,false);
});

test("conflicts preserve the draft and do not advance revision or retry in a loop",async()=>{
  let calls=0;
  const save=new ShowcaseAutosave(document("forest"),2,async()=>{calls++;return {ok:false,error:"SHOWCASE_CONFLICT"};});
  save.edit(document("cream"));await save.flush();await save.flush();
  assert.equal(calls,1);assert.equal(save.getSnapshot().revision,2);assert.equal(save.getSnapshot().dirty,true);
  assert.equal(save.getSnapshot().error,"SHOWCASE_CONFLICT");
});
