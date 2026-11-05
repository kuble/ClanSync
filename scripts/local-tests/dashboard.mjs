import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { readState, readRun } from "./state.mjs";
import { createMetricsCollector } from "./metrics.mjs";
const port = 3040;
const html = readFileSync(new URL("./dashboard.html",import.meta.url));
const metrics = createMetricsCollector(()=>{
  const run=readState().current;
  return run?.status==='running'?{runId:run.id,phase:run.phase,file:run.currentFile||null}:{runId:null};
});
metrics.sample('local'); metrics.sample('qa');
let previousPhase='',lastLocal=Date.now();
// Sample stage boundaries too, so a short test phase is not lost between ticks.
setInterval(()=>{
  const run=readState().current,phase=`${run?.id}:${run?.phase}:${run?.status}`;
  if(phase!==previousPhase||Date.now()-lastLocal>=10000){previousPhase=phase;lastLocal=Date.now();metrics.sample('local');}
},1000).unref();
setInterval(()=>metrics.sample('qa'),60000).unref();
createServer((request,response)=>{
  if (!new Set([`127.0.0.1:${port}`,`localhost:${port}`]).has(request.headers.host)) { response.writeHead(403).end(); return; }
  response.setHeader("Cache-Control","no-store");
  response.setHeader("X-Content-Type-Options","nosniff");
  response.setHeader("Content-Security-Policy","default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'");
  if (request.method!=="GET") { response.writeHead(405).end(); return; }
  const url = new URL(request.url,`http://127.0.0.1:${port}`);
  if(url.pathname==="/") { response.writeHead(200,{"Content-Type":"text/html; charset=utf-8"}).end(html); return; }
  const snapshot = () => {
    const measurement=metrics.snapshot();
    return {...readState(),database:measurement.local,metrics:measurement,now:new Date().toISOString()};
  };
  if(url.pathname==="/api/state") { response.writeHead(200,{"Content-Type":"application/json"}).end(JSON.stringify(snapshot())); return; }
  if(url.pathname==="/api/run") {
    try { response.writeHead(200,{"Content-Type":"application/json"}).end(JSON.stringify(readRun(url.searchParams.get("id")||""))); }
    catch { response.writeHead(404).end(); } return;
  }
  if(url.pathname==="/events") {
    response.writeHead(200,{"Content-Type":"text/event-stream",Connection:"keep-alive"});
    const send = () => response.write(`data: ${JSON.stringify(snapshot())}\n\n`);
    send(); const timer=setInterval(send,1000); request.on("close",()=>clearInterval(timer)); return;
  }
  response.writeHead(404).end();
}).listen(port,"127.0.0.1",()=>console.log(`LOCAL_TEST_DASHBOARD http://127.0.0.1:${port}`));
