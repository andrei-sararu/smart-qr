import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {platform} from '../lib/platform.mjs';

function fixture(){
  const sql=new DatabaseSync(':memory:');
  sql.exec('CREATE TABLE rate_limits (key TEXT PRIMARY KEY,hits INTEGER NOT NULL,expires INTEGER NOT NULL)');
  function prepare(text){
    return {bind(...args){return {
      async first(){return sql.prepare(text).get(...args)},
      async all(){return {results:sql.prepare(text).all(...args)}},
      async run(){return {meta:sql.prepare(text).run(...args)}}
    }},async run(){return {meta:sql.prepare(text).run()}}};
  }
  const db={prepare,async batch(statements){
    sql.exec('BEGIN');
    try{const results=[];for(const s of statements)results.push(await s.run());sql.exec('COMMIT');return results}
    catch(error){sql.exec('ROLLBACK');throw error}
  }};
  const call=(path,method='GET',body,owner='account-a',origin='https://cotiso.test')=>platform(new Request('https://cotiso.test'+path,{
    method,headers:{...(owner?{'oai-authenticated-user-id':owner}:{}),...(method==='GET'?{}:{origin})},
    ...(body===undefined?{}:{body:typeof body==='string'?body:JSON.stringify(body)})
  }),db);
  return {call};
}
const profile={title:'Boiler <B1024>',description:'Maintenance instructions',reference:'B1024',location:'Riverside',mode:'profile',status:'active',actions:[{label:'Manual',url:'https://example.com/boiler.pdf'}],report:true};

test('Persistent profile, event funnel and owner isolation',async()=>{
  const {call}=fixture();
  assert.equal((await call('/api/platform','GET',undefined,null)).status,401);
  const create=await call('/api/platform','POST',profile);
  assert.equal(create.status,201);
  const {id}=await create.json();
  const publicPath='/q/'+id,adminPath='/api/platform/'+id;
  const visit=await call(publicPath,'GET',undefined,null);
  assert.match(await visit.text(),/Boiler &lt;B1024&gt;/);
  assert.equal((await call(publicPath+'/go/0?v=1','POST',undefined,null)).headers.get('location'),'https://example.com/boiler.pdf');
  assert.equal((await call(publicPath+'/report','POST',undefined,null)).status,200);
  assert.equal((await call(publicPath+'/submit','POST','message=Leak',null,'https://other.test')).status,403);
  assert.equal((await call(publicPath+'/submit','POST','message=Leak',null)).status,303);
  const dashboard=await (await call('/api/platform')).json();
  assert.deepEqual(dashboard.events.map(e=>e.kind).sort(),['action','complete','scan','start']);
  assert.equal(dashboard.events.find(e=>e.kind==='action').total,2);
  assert.equal(dashboard.reports[0].reference,'B1024');
  assert.equal((await (await call('/api/platform','GET',undefined,'account-b')).json()).reports.length,0);
  assert.equal((await call(adminPath+'/history','GET',undefined,'account-b')).status,404);
  assert.equal((await call(adminPath,'PUT',{...profile,status:'paused',revision:1})).status,200);
  assert.equal((await call(publicPath,'GET',undefined,null)).status,404);
  assert.equal((await call(adminPath,'PUT',{...profile,revision:1})).status,409);
  assert.equal((await (await call(adminPath+'/history')).json()).history.length,2);
});

test('Static QR is immutable and a dynamic QR changes destination without reprinting',async()=>{
  const {call}=fixture();
  const create=await call('/api/platform','POST',{...profile,mode:'static'});
  const {id}=await create.json();
  const adminPath='/api/platform/'+id;
  assert.equal((await call(adminPath+'/svg')).headers.get('content-type'),'image/svg+xml');
  const png=await call(adminPath+'/png');
  assert.equal(png.headers.get('content-type'),'image/png');
  assert.equal(new Uint8Array(await png.arrayBuffer())[0],137);
  const updated={...profile,actions:[{label:'Other',url:'https://example.org/second'}]};
  assert.equal((await call(adminPath,'PUT',{...updated,mode:'static',revision:1})).status,400);
  const dynamic=await (await call('/api/platform','POST',{...profile,mode:'dynamic'})).json();
  const path='/q/'+dynamic.id;
  assert.equal((await call(path)).headers.get('location'),'https://example.com/boiler.pdf');
  assert.equal((await call('/api/platform/'+dynamic.id,'PUT',{...updated,mode:'dynamic',revision:1})).status,200);
  assert.equal((await call(path)).headers.get('location'),'https://example.org/second');
  assert.equal((await call('/api/platform','POST',{...profile,actions:[{label:'Bad',url:'javascript:alert(1)'}]})).status,400);
});

test('Project metadata and expiry are scoped, versioned and preserve the QR address',async()=>{
  const {call}=fixture();
  const {id}=await (await call('/api/platform','POST',profile)).json();
  const admin='/api/platform/'+id,scan='/q/'+id;
  const initial=(await (await call('/api/platform')).json()).profiles[0];
  assert.deepEqual([initial.project,initial.tags,initial.expires],['',[],null]);
  const expired={...profile,project:'Riverside',tags:['Maintenance','Boilers','Boilers'],expires:1,revision:1};
  assert.equal((await call(admin,'PUT',expired,'someone-else')).status,404);
  assert.equal((await call(admin,'PUT',expired)).status,200);
  assert.equal((await call(scan,'GET',undefined,null)).status,404);
  assert.equal((await call(admin,'PUT',{...expired,project:'Stale'})).status,409);
  const dashboard=await (await call('/api/platform')).json();
  assert.deepEqual([dashboard.profiles[0].project,dashboard.profiles[0].tags],['Riverside',['Maintenance','Boilers']]);
  const history=await (await call(admin+'/history')).json();
  assert.equal(history.history[0].profile.expires,1);
  assert.equal((await call(admin,'PUT',{...expired,expires:null,revision:2})).status,200);
  assert.equal((await call(scan,'GET',undefined,null)).status,200);
});

test('Bulk import validates the entire batch, creates fresh paused codes and enforces capacity atomically',async()=>{
  const {call}=fixture();
  const send=codes=>call('/api/platform/import','POST',{version:1,codes});
  const list=async()=>(await (await call('/api/platform')).json()).profiles;
  const bad=await send([profile,{...profile,title:''}]);
  assert.equal(bad.status,400);
  assert.match((await bad.json()).error,/Code 2/);
  assert.equal((await list()).length,0);
  const created=await send([{...profile,id:'old',status:'active',report:1,project:'Maintenance',expires:1}]);
  assert.equal(created.status,201);
  const {ids}=await created.json();
  const item=(await list())[0];
  assert.equal(item.id,ids[0]);
  assert.notEqual(item.id,'old');
  assert.deepEqual([item.status,item.report,item.project,item.expires],['paused',1,'Maintenance',null]);
  assert.equal((await call('/q/'+item.id,'GET',undefined,null)).status,404);
  assert.equal((await send(Array.from({length:25},()=>profile))).status,409);
  assert.equal((await list()).length,1);
  assert.equal((await send(Array.from({length:24},()=>profile))).status,201);
  assert.equal((await list()).length,25);
});

test('A dynamic code uses its scheduled URL only inside the window and respects lifecycle controls',async()=>{
  const {call}=fixture();
  const now=Date.now();
  const base={...profile,mode:'dynamic'};
  const schedule={starts:now+3600000,ends:now+7200000,url:'https://example.org/special'};
  assert.equal((await call('/api/platform','POST',{...profile,schedule})).status,400);
  assert.equal((await call('/api/platform','POST',{...base,schedule:{...schedule,url:'http://example.org'}})).status,400);
  const {id}=await (await call('/api/platform','POST',{...base,schedule})).json();
  const admin='/api/platform/'+id,scan='/q/'+id;
  const location=async()=>(await call(scan,'GET',undefined,null)).headers.get('location');
  const update=(revision,changes)=>call(admin,'PUT',{...base,revision,...changes});
  assert.equal(await location(),'https://example.com/boiler.pdf');
  const active={...schedule,starts:now-3600000};
  assert.equal((await update(1,{schedule:active})).status,200);
  assert.equal(await location(),schedule.url);
  assert.equal((await update(1,{schedule:null})).status,409);
  assert.equal(await location(),schedule.url);
  assert.equal((await update(2,{schedule:active,status:'paused'})).status,200);
  assert.equal((await call(scan,'GET',undefined,null)).status,404);
  assert.equal((await update(3,{schedule:active,expires:1})).status,200);
  assert.equal((await call(scan,'GET',undefined,null)).status,404);
  assert.equal((await update(4,{schedule:{...active,ends:now-1}})).status,200);
  assert.equal(await location(),'https://example.com/boiler.pdf');
  assert.equal((await update(5,{schedule:null})).status,200);
  const history=await (await call(admin+'/history')).json();
  assert.equal(history.history[0].profile.schedule,null);
  assert.equal(history.history[1].profile.schedule.url,schedule.url);
});
