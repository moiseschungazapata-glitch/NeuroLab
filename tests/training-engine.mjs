// Uses only synthetic, bounded fixtures; requires the local API and TensorFlow worker.
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
const {request}=await import(process.env.NEUROLAB_PLAYWRIGHT||'playwright');
const api=await request.newContext({baseURL:'http://127.0.0.1:8000'});
const session=await(await api.get('/api/v1/training/session')).json();assert.equal(session.engineReady,true);
const headers={Authorization:'Bearer '+session.token};
const config={epochs:3,batch:16,optimizer:'Adam',modelSeed:42,learningRate:.01,earlyStopping:false,patience:2};
const fixtures=[
 {family:'Feedforward',input:[2],latent:2,outputUnits:1,outputActivation:'Sigmoid',layers:[{id:1,kind:'Dense',units:4,activation:'ReLU'}]},
 {family:'RNN',input:[2,1],latent:2,outputUnits:1,outputActivation:'Lineal',layers:[{id:1,kind:'SimpleRNN',units:3,activation:'Tanh'}]},
 {family:'CNN',input:[2,2,1],latent:2,outputUnits:2,outputActivation:'Softmax',layers:[{id:1,kind:'Conv2D',units:2,kernel:1,stride:1,padding:'same',activation:'ReLU'}]},
 {family:'GAN',input:[2,2,1],latent:2,outputActivation:'Tanh',layers:[{id:1,kind:'Generador · Dense',units:4,activation:'ReLU'},{id:2,kind:'Discriminador · Dense',units:3,activation:'LeakyReLU'}]},
];
function payload(a,override={}){
 const splits={};let index=0;
 for(const [split,count] of [['train',32],['validation',8],['test',8]])splits[split]=Array.from({length:count},()=>{const i=index++,label=i%2?'B':'A';return {sourceIndex:i,input:a.family==='RNN'?[[i/100],[(i+1)/100]]:a.family==='Feedforward'?[i/100,i%2]:a.family==='GAN'?[i/100-1,(i%2)*2-1,.3,.6]:[i/100,i%2,.3,.6],...(a.family==='CNN'?{label}:a.family==='GAN'?{}:{target:a.family==='RNN'?(i+2)/100:i%2})}});
 return {project:{id:9001,name:'Prueba TensorFlow '+a.family,status:'En desarrollo'},architecture:a,config:{...config,...override},dataset:{id:randomUUID(),name:'Datos sintéticos '+a.family,version:1,checksum:'0'.repeat(64),classes:['CNN','Feedforward'].includes(a.family)?['A','B']:[],task:a.family==='Feedforward'?'binary':'regression'},splits,consent:true};
}
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function submit(body,key=randomUUID()){const response=await api.post('/api/v1/projects/9001/training-jobs',{headers:{...headers,'Idempotency-Key':key},data:body});assert.equal(response.status(),202,await response.text());return response.json()}
async function waitJob(id,condition,seconds=240){const deadline=Date.now()+seconds*1000;let prior='';while(Date.now()<deadline){const job=await(await api.get('/api/v1/training-jobs/'+id,{headers})).json();if(job.state!==prior){console.log(job.family,job.id.slice(0,8),job.state);prior=job.state}if(condition(job))return job;await pause(300)}throw Error('Timeout waiting for '+id)}
try{
 assert.equal((await api.get('/api/v1/training-jobs')).status(),401);
 assert.equal((await api.get('/api/v1/training/session',{headers:{Origin:'https://untrusted.example'}})).status(),403);
 const invalid=payload(fixtures[0]);invalid.splits.validation[0].sourceIndex=0;assert.equal((await api.post('/api/v1/projects/9001/training-jobs',{headers:{...headers,'Idempotency-Key':randomUUID()},data:invalid})).status(),422);
 const key=randomUUID(),firstPayload=payload(fixtures[0]),first=await submit(firstPayload,key);assert.equal((await submit(firstPayload,key)).id,first.id);
 const jobs=[first];for(const a of fixtures.slice(1))jobs.push(await submit(payload(a)));
 const queued=await submit(payload(fixtures[0]));assert.equal((await api.post('/api/v1/training-jobs/'+queued.id+'/cancel',{headers})).status(),200);
 const retry=await(await api.post('/api/v1/training-jobs/'+queued.id+'/retry',{headers:{...headers,'Idempotency-Key':randomUUID()}})).json();assert.equal(retry.retryOf,queued.id);assert.notEqual(retry.id,queued.id);await api.post('/api/v1/training-jobs/'+retry.id+'/cancel',{headers});
 for(const pending of jobs){const job=await waitJob(pending.id,j=>['COMPLETED','FAILED','CANCELLED'].includes(j.state));assert.equal(job.state,'COMPLETED',job.error);assert.equal(job.weightsChanged,true);assert.equal(job.metrics.length,3);assert.ok(Number.isFinite(job.testMetrics.loss));assert.ok(job.artifacts.length>0);for(const a of job.artifacts){const response=await api.get('/api/v1/training-jobs/'+job.id+'/artifacts/'+a.name,{headers});assert.equal(response.status(),200);const bytes=await response.body();assert.ok(bytes.length>1000);assert.equal(createHash('sha256').update(bytes).digest('hex'),a.sha256)}const events=await api.get('/api/v1/training-jobs/'+job.id+'/events',{headers});assert.ok(events.headers()['content-type'].startsWith('text/event-stream'));assert.ok((await events.text()).includes('"state": "COMPLETED"'));console.log('VERIFIED',job.family,'weights, metrics, test set and artifact checksum');}
 const cancellable=await submit(payload(fixtures[0],{epochs:200}));await waitJob(cancellable.id,j=>j.state==='RUNNING'||j.state==='FAILED');await api.post('/api/v1/training-jobs/'+cancellable.id+'/cancel',{headers});const cancelled=await waitJob(cancellable.id,j=>['COMPLETED','FAILED','CANCELLED'].includes(j.state),15);assert.equal(cancelled.state,'CANCELLED');assert.equal(cancelled.artifacts.length,0);
 console.log('PASS: actual TensorFlow training for four families, weight changes, final evaluation, artifact checksums, SSE, authorization/origin checks, invalid data, idempotency, FIFO queue, queued/active cancellation and retry.');
}finally{await api.dispose()}
