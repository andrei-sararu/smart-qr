import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {destination,smartQR} from '../lib/smartqr.mjs';
test('HTTPS destination validation',()=>{assert.equal(destination('https://example.com'),'https://example.com/');for(const value of ['javascript:alert(1)','http://example.com','https://localhost','https://127.0.0.1','https://user:pass@example.com','https://example.com:123','https://test.internal'])assert.throws(()=>destination(value))});
test('static generation and operator-only dynamic lifecycle',async()=>{
 const sql=new DatabaseSync(':memory:');try{sql.exec(readFileSync(new URL('../drizzle/0004_smartqr_links.sql',import.meta.url),'utf8'));
 const DB={prepare:q=>({bind:(...args)=>({first:async()=>sql.prepare(q).get(...args),all:async()=>({results:sql.prepare(q).all(...args)})})})};
 const env={DB,SUPPORT_ADMIN_EMAIL:'admin@example.com'};
 const call=(path,method='GET',data,user='admin',email='admin@example.com',origin='https://qr.example.com')=>smartQR(new Request('https://qr.example.com/api/smartqr/'+path,{method,headers:{origin,...(user?{'oai-authenticated-user-id':user,'oai-authenticated-user-email':email}:{})},...(data?{body:JSON.stringify(data)}:{})}),env,async target=>'<svg>'+target+'</svg>');
 assert.equal((await call('static','POST',{url:'https://example.com'},null)).status,200);
 assert.equal((await call('links','GET',null,null)).status,401);
 assert.equal((await call('links','GET',null,'other','other@example.com')).status,403);
 assert.equal((await call('links','POST',{label:'Test',destination:'https://example.com'},'admin','admin@example.com','https://evil.com')).status,403);
 const created=await call('links','POST',{label:'Test',destination:'https://example.com'});assert.equal(created.status,201);const {id}=await created.json();
 const hit=await call('r/'+id,'GET',null,null);assert.equal(hit.status,302);assert.equal(hit.headers.get('location'),'https://example.com/');
 assert.equal((await call('links/'+id+'/svg')).status,200);
 assert.equal((await call('links/'+id,'PATCH',{label:'Updated',destination:'https://example.org',enabled:true,revision:0})).status,200);
 assert.equal((await call('r/'+id,'GET',null,null)).headers.get('location'),'https://example.org/');
 assert.equal((await call('links/'+id,'PATCH',{label:'Stale',destination:'https://example.com',enabled:false,revision:0})).status,409);
 assert.equal((await call('links/'+id,'PATCH',{label:'Updated',destination:'https://example.org',enabled:false,revision:1})).status,200);
 assert.equal((await call('r/'+id,'GET',null,null)).status,404);
 const list=await(await call('links')).json();assert.equal(list.links[0].scans,2);
 }finally{sql.close()}
});
