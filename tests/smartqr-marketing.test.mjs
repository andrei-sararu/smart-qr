import {test} from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {readFileSync} from 'node:fs';
import {marketingAPI,prepareConfirmation,normalizeEmail,csvCell,CONSENT_VERSION} from '../lib/smartqr-marketing.mjs';
test('email normalization and spreadsheet injection protection',()=>{assert.equal(normalizeEmail(' Alice@Example.com '),'alice@example.com');assert.throws(()=>normalizeEmail('bad'));assert.equal(csvCell('=1+1'),'"\'=1+1"')});
test('consent, pending, double opt-in, suppression and export authorization',async()=>{
 const sql=new DatabaseSync(':memory:');try{
 sql.exec('CREATE TABLE rate_limits(key TEXT PRIMARY KEY,hits INTEGER,expires INTEGER)');
 sql.exec(readFileSync(new URL('../drizzle/0006_smartqr_marketing.sql',import.meta.url),'utf8'));
 const DB={prepare:s=>({bind:(...args)=>({first:async()=>sql.prepare(s).get(...args),run:async()=>sql.prepare(s).run(...args),all:async()=>({results:sql.prepare(s).all(...args)})})})};
 const env={DB},origin='https://qr.example.com';
 const call=(action,body,from=origin)=>marketingAPI(new Request(origin+'/api/smartqr/marketing/'+action,{method:body?'POST':'GET',headers:{origin:from},...(body?{body:JSON.stringify(body)}:{})}),env);
 const data={email:'Alice@example.com',consent:true,source:'demo',version:CONSENT_VERSION};
 assert.equal((await call('subscribe',{...data,consent:false})).status,400);
 assert.equal((await call('subscribe',data,'https://evil.example')).status,403);
 assert.equal((await call('subscribe',data)).status,202);
 assert.equal(sql.prepare('SELECT status FROM smartqr_marketing').get().status,'pending');
 assert.equal((await call('export')).status,401);
 const keys=await prepareConfirmation(DB,data.email);assert.ok(keys.confirm);
 assert.equal((await call('confirm',{token:keys.confirm})).status,200);
 assert.equal((await call('confirm',{token:keys.confirm})).status,400);
 assert.equal(sql.prepare('SELECT status FROM smartqr_marketing').get().status,'active');
 assert.equal((await call('unsubscribe',{token:keys.unsubscribe})).status,200);
 assert.equal((await call('subscribe',data)).status,202);
 assert.equal(sql.prepare('SELECT status FROM smartqr_marketing').get().status,'unsubscribed');
 assert.equal(await prepareConfirmation(DB,data.email),null);
 }finally{sql.close()}
});
