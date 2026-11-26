import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {destination,smartQR} from '../lib/smartqr.mjs';
test('HTTPS destination validation',()=>{assert.equal(destination('https://example.com'),'https://example.com/');for(const value of ['javascript:alert(1)','http://example.com','https://localhost','https://127.0.0.1','https://user:pass@example.com','https://example.com:123','https://test.internal'])assert.throws(()=>destination(value))});
test('static generation and unconfigured independent auth',async()=>{
 const sql=new DatabaseSync(':memory:');try{sql.exec(readFileSync(new URL('../drizzle/0004_smartqr_links.sql',import.meta.url),'utf8'));sql.exec(readFileSync(new URL('../drizzle/0005_smartqr_trials.sql',import.meta.url),'utf8'));
 const DB={prepare:q=>({bind:(...args)=>({first:async()=>sql.prepare(q).get(...args),run:async()=>sql.prepare(q).run(...args),all:async()=>({results:sql.prepare(q).all(...args)})})})};
 const env={DB,SUPPORT_ADMIN_EMAIL:'admin@example.com'};
 const call=(path,method='GET',data,user='admin',email='admin@example.com',origin='https://qr.example.com')=>smartQR(new Request('https://qr.example.com/api/smartqr/'+path,{method,headers:{origin,...(user?{'oai-authenticated-user-id':user,'oai-authenticated-user-email':email}:{})},...(data?{body:JSON.stringify(data)}:{})}),env,async target=>'<svg>'+target+'</svg>');
 assert.equal((await call('static','POST',{url:'https://example.com'},null)).status,200);
 assert.equal((await call('links','GET',null,null)).status,401);
 assert.equal((await call('links','GET',null,'other','other@example.com')).status,401);
 assert.equal((await call('auth/login')).status,503);
 assert.equal((await call('auth/session')).status,200);
 const session=await(await call('auth/session')).json();assert.equal(session.configured,false);assert.equal(session.user,null);
 sql.prepare('INSERT INTO smartqr_links (id,owner_id,label,destination,enabled,scans,revision,created_at) VALUES (?,?,?,?,1,0,0,?)').run('a'.repeat(32),'oidc:test','Test','https://example.com/',Date.now());
 const hit=await call('r/'+'a'.repeat(32),'GET',null,null);assert.equal(hit.status,302);assert.equal(hit.headers.get('location'),'https://example.com/');
 assert.equal(sql.prepare('SELECT scans FROM smartqr_links').get().scans,1);
 }finally{sql.close()}
});

test('signed independent sessions enforce operator access and dynamic link lifecycle',async()=>{
 const sql=new DatabaseSync(':memory:');try{
 sql.exec(readFileSync(new URL('../drizzle/0004_smartqr_links.sql',import.meta.url),'utf8'));sql.exec(readFileSync(new URL('../drizzle/0005_smartqr_trials.sql',import.meta.url),'utf8'));
 const DB={prepare:q=>({bind:(...args)=>({first:async()=>sql.prepare(q).get(...args),run:async()=>sql.prepare(q).run(...args),all:async()=>({results:sql.prepare(q).all(...args)})})})};
 const env={DB,SUPPORT_ADMIN_EMAIL:'admin@example.com',SMARTQR_PUBLIC_ORIGIN:'https://qr.example.com',SMARTQR_OIDC_ISSUER:'https://identity.example.com',SMARTQR_OIDC_CLIENT_ID:'test',SMARTQR_OIDC_CLIENT_SECRET:'test',SMARTQR_SESSION_SECRET:'a'.repeat(43)};
 async function session(email,exp=Date.now()+60000,sub='test'){
 const p=Buffer.from(JSON.stringify({sub,email,exp})).toString('base64url');
 const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.SMARTQR_SESSION_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const s=Buffer.from(await crypto.subtle.sign('HMAC',k,new TextEncoder().encode(p))).toString('base64url');return p+'.'+s;
 }
 const admin=await session('admin@example.com'),other=await session('other@example.com'),expired=await session('admin@example.com',Date.now()-1000);
 const call=(path,method='GET',data,token=admin,origin=env.SMARTQR_PUBLIC_ORIGIN)=>smartQR(new Request(env.SMARTQR_PUBLIC_ORIGIN+'/api/smartqr/'+path,{method,headers:{origin,...(token?{cookie:'__Host-smartqr_session='+token}:{})},...(data?{body:JSON.stringify(data)}:{})}),env,async target=>'<svg>'+target+'</svg>');
 assert.equal((await call('links','GET',null,other)).status,403);
 assert.equal((await call('links','GET',null,expired)).status,401);
 assert.equal((await call('links','GET',null,admin+'x')).status,401);
 assert.equal((await call('links','POST',{label:'Test',destination:'https://example.com'},admin,'https://evil.example')).status,403);
 assert.equal((await call('links','POST',{label:'Test',destination:'https://example.com'})).status,403);
 const trial=await(await call('trial','POST',{})).json();assert.equal(trial.entitlement.limit,10);const again=await(await call('trial','POST',{})).json();assert.equal(again.entitlement.trialEnd,trial.entitlement.trialEnd);
 const c=await call('links','POST',{label:'Test',destination:'https://example.com'});assert.equal(c.status,201);const {id}=await c.json();
 assert.equal((await call('r/'+id,'GET',null,null)).headers.get('location'),'https://example.com/');
 const svg=await call('links/'+id+'/svg');assert.match(await svg.text(),/https:\/\/qr\.example\.com\/api\/smartqr\/r\//);
 assert.equal((await call('links/'+id,'PATCH',{label:'Updated',destination:'https://example.org',enabled:true,revision:0})).status,200);
 assert.equal((await call('r/'+id,'GET',null,null)).headers.get('location'),'https://example.org/');
 assert.equal((await call('links/'+id,'PATCH',{label:'Stale',destination:'https://example.com',enabled:false,revision:0})).status,409);
 assert.equal((await call('links/'+id,'PATCH',{label:'Updated',destination:'https://example.org',enabled:false,revision:1})).status,200);
 assert.equal((await call('r/'+id,'GET',null,null)).status,404);
 assert.equal((await(await call('links')).json()).links[0].scans,2);
 }finally{sql.close()}
});
