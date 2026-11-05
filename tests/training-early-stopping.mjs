import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const {request}=await import(process.env.NEUROLAB_PLAYWRIGHT||'playwright');
const api=await request.newContext({baseURL:'http://127.0.0.1:8000'});
try{
 const {token}=await(await api.get('/api/v1/training/session')).json(),headers={Authorization:'Bearer '+token};
 let index=0;const splits={};for(const [key,count] of [['train',32],['validation',8],['test',8]])splits[key]=Array.from({length:count},()=>{const i=index++;return {sourceIndex:i,input:[i*1e-12],target:i%2}});
 const payload={consent:true,project:{id:9002,name:'Parada temprana sintética',status:'En desarrollo'},architecture:{family:'Feedforward',input:[1],latent:2,outputUnits:1,outputActivation:'Sigmoid',layers:[{id:1,kind:'Dense',units:2,activation:'ReLU'}]},config:{epochs:20,batch:16,optimizer:'SGD',learningRate:1e-6,modelSeed:42,earlyStopping:true,patience:1},dataset:{id:randomUUID(),name:'Datos sintéticos de convergencia',version:1,checksum:'0'.repeat(64),task:'binary',classes:['A','B']},splits};
 const response=await api.post('/api/v1/projects/9002/training-jobs',{headers:{...headers,'Idempotency-Key':randomUUID()},data:payload});assert.equal(response.status(),202,await response.text());const created=await response.json();let job;
 const deadline=Date.now()+90000;while(Date.now()<deadline){job=await(await api.get('/api/v1/training-jobs/'+created.id,{headers})).json();if(['COMPLETED','FAILED','CANCELLED'].includes(job.state))break;await new Promise(resolve=>setTimeout(resolve,300))}
 assert.equal(job.state,'COMPLETED',job.error);assert.equal(job.stoppedEarly,true);assert.ok(job.epoch<20);assert.equal(job.progress,100);assert.ok(Number.isFinite(job.testMetrics.loss));console.log('PASS: real early stopping at epoch '+job.epoch+', restored best validation weights, test evaluation and completed progress.');
}finally{await api.dispose()}
