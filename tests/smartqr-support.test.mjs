import {test} from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {readFileSync} from 'node:fs';import {supportAPI} from '../lib/smartqr-support.mjs';
test('support tickets isolate customers and restrict staff operations',async()=>{
 const sql=new DatabaseSync(':memory:');try{for(const n of ['0007_smartqr_crm.sql','0009_smartqr_support.sql'])sql.exec(readFileSync(new URL('../drizzle/'+n,import.meta.url),'utf8'));
 const DB={prepare:s=>({bind:(...a)=>({first:async()=>sql.prepare(s).get(...a),all:async()=>({results:sql.prepare(s).all(...a)}),run:async()=>({meta:{changes:Number(sql.prepare(s).run(...a).changes)}})})}),batch:async ss=>{sql.exec('BEGIN');try{const r=[];for(const s of ss)r.push(await s.run());sql.exec('COMMIT');return r}catch(e){sql.exec('ROLLBACK');throw e}}};
 const origin='https://qr.example.com',env={DB,SMARTQR_PUBLIC_ORIGIN:origin,SMARTQR_OIDC_ISSUER:'https://identity.example.com',SMARTQR_OIDC_CLIENT_ID:'x',SMARTQR_OIDC_CLIENT_SECRET:'x',SMARTQR_SESSION_SECRET:'x'.repeat(43),SMARTQR_SUPERADMIN_ID:'oidc:owner'};
 async function session(sub){const p=Buffer.from(JSON.stringify({sub,email:'test@example.com',exp:Date.now()+60000})).toString('base64url'),k=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.SMARTQR_SESSION_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);return p+'.'+Buffer.from(await crypto.subtle.sign('HMAC',k,new TextEncoder().encode(p))).toString('base64url')}
 const a=await session('a'),b=await session('b'),owner=await session('owner');const call=(p,method='GET',data,t=a)=>supportAPI(new Request(origin+'/api/smartqr/support/'+p,{method,headers:{origin,...(t?{cookie:'__Host-smartqr_session='+t}:{})},...(data?{body:JSON.stringify(data)}:{})}),env);
 assert.equal((await call('tickets','GET',null,null)).status,401);const c=await call('tickets','POST',{subject:'Help',category:'Billing',body:'Question'});assert.equal(c.status,201);const {id}=await c.json();
 assert.equal((await call('tickets/'+id,'GET',null,b)).status,404);assert.equal((await call('admin/tickets','GET',null,b)).status,401);
 assert.equal((await call('admin/tickets/'+id+'/reply','POST',{body:'Response'},owner)).status,200);
 assert.equal((await(await call('tickets/'+id)).json()).messages.length,2);
 assert.equal((await call('admin/tickets/'+id,'PATCH',{status:'resolved',priority:'high'},owner)).status,200);
 assert.equal((await(await call('tickets/'+id)).json()).ticket.status,'resolved');
 }finally{sql.close()}
});
