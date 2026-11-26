import {test} from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {readFileSync,readdirSync} from 'node:fs';import {crmAPI,permissions} from '../lib/smartqr-crm.mjs';
test('role boundaries',()=>{assert.equal(permissions('superadmin').staff,true);assert.equal(permissions('admin').staff,false);assert.equal(permissions('viewer').sales,false);assert.equal(permissions('marketing').customers,false);assert.equal(permissions('support').tasks,true)});
test('CRM denies anonymous and supports owner-only staff changes, lead revision and audit',async()=>{
 const sql=new DatabaseSync(':memory:');try{for(const n of readdirSync(new URL('../drizzle/',import.meta.url)).filter(n=>n.endsWith('.sql')).sort())sql.exec(readFileSync(new URL('../drizzle/'+n,import.meta.url),'utf8'));
 const DB={prepare:s=>({bind:(...args)=>({first:async()=>sql.prepare(s).get(...args),all:async()=>({results:sql.prepare(s).all(...args)}),run:async()=>({meta:{changes:Number(sql.prepare(s).run(...args).changes)}})})}),batch:async ss=>{sql.exec('BEGIN');try{const r=[];for(const s of ss)r.push(await s.run());sql.exec('COMMIT');return r}catch(e){sql.exec('ROLLBACK');throw e}}};
 const origin='https://qr.example.com',sub='a'.repeat(43),other='b'.repeat(43),env={DB,SMARTQR_PUBLIC_ORIGIN:origin,SMARTQR_OIDC_ISSUER:'https://identity.example.com',SMARTQR_OIDC_CLIENT_ID:'test',SMARTQR_OIDC_CLIENT_SECRET:'test',SMARTQR_SESSION_SECRET:'x'.repeat(43),SMARTQR_SUPERADMIN_ID:'oidc:'+sub};
 const session=async s=>{const p=Buffer.from(JSON.stringify({sub:s,email:'test@example.com',exp:Date.now()+60000})).toString('base64url'),k=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.SMARTQR_SESSION_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);return p+'.'+Buffer.from(await crypto.subtle.sign('HMAC',k,new TextEncoder().encode(p))).toString('base64url')};
 const owner=await session(sub),staff=await session(other);
 const call=(p,method='GET',data,token=owner)=>crmAPI(new Request(origin+'/api/smartqr/crm/'+p,{method,headers:{origin,...(token?{cookie:'__Host-smartqr_session='+token}:{})},...(data?{body:JSON.stringify(data)}:{})}),env);
 assert.equal((await call('overview','GET',null,null)).status,403);
 assert.equal((await call('staff','POST',{id:'oidc:'+other,email:'staff@example.com',role:'viewer',enabled:true})).status,200);
 assert.equal((await call('staff','POST',{id:'oidc:'+other,email:'staff@example.com',role:'admin',enabled:true},staff)).status,403);
 const data={company:'Test',stage:'New',value_pence:10000};
 assert.equal((await call('leads','POST',data,staff)).status,403);
 const lead=await(await call('leads','POST',data)).json();assert.ok(lead.id);
 assert.equal((await call('leads/'+lead.id,'PATCH',{...data,stage:'Won',revision:0})).status,200);
 assert.equal((await call('leads/'+lead.id,'PATCH',{...data,revision:0})).status,409);
 assert.equal((await call('audit','GET',null,staff)).status,404);
 assert.equal((await(await call('audit')).json()).events.length,3);
 assert.equal((await call('staff','POST',{id:'oidc:'+other,email:'staff@example.com',role:'viewer',enabled:false})).status,200);
 assert.equal((await call('overview','GET',null,staff)).status,403);
 }finally{sql.close()}
});
