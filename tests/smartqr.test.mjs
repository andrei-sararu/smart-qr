import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {destination,smartQR} from '../lib/smartqr.mjs';
test('HTTPS destination validation',()=>{assert.equal(destination('https://example.com'),'https://example.com/');for(const value of ['javascript:alert(1)','http://example.com','https://localhost','https://127.0.0.1','https://user:pass@example.com','https://example.com:123','https://test.internal'])assert.throws(()=>destination(value))});
test('static generation and unconfigured independent auth',async()=>{
 const sql=new DatabaseSync(':memory:');try{sql.exec(readFileSync(new URL('../drizzle/0004_smartqr_links.sql',import.meta.url),'utf8'));
 const DB={prepare:q=>({bind:(...args)=>({first:async()=>sql.prepare(q).get(...args),all:async()=>({results:sql.prepare(q).all(...args)})})})};
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
