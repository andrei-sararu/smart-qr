// Runs only against loopback. Creates disposable records in the local preview database.
import assert from 'node:assert/strict';
const origin=process.argv[2]||'http://127.0.0.1:4173';
if(!['127.0.0.1','localhost'].includes(new URL(origin).hostname))throw Error('Local preview only.');
const owner='qa-'+crypto.randomUUID();
async function api(path,method='GET',data,authenticated=true){const r=await fetch(origin+'/api/'+path,{method,headers:{...(authenticated?{'oai-authenticated-user-id':owner,'oai-authenticated-user-email':'qa@example.test'}:{}),...(method!=='GET'?{'Origin':origin,'Content-Type':'application/json'}:{})},...(data?{body:JSON.stringify(data)}:{})});const json=await r.json();assert.ok(r.ok,JSON.stringify(json));return json}
const created=(await api('restaurant','POST',{name:'QA Preview Bistro'})).restaurant;
const r=(await api('restaurant','PUT',{name:created.name,currency:'EUR',published:true,revision:0,items:[{id:'smoke-dish',name:'Seasonal soup',price:8,category:'Starters',desc:'A fresh daily soup.',allergens:'Celery',image:'',available:true}]})).restaurant;
const w=await api('workspace'),t=w.tables[0];
const guest=await api('public/'+r.slug+'?table='+t.token,'GET',undefined,false);assert.equal(guest.restaurant.items.length,1);
const call=await api('request','POST',{token:t.token,type:'Waiter'},false);assert.equal((await api('workspace')).requests[0].id,call.request.id);
await api('request/'+call.request.id,'PATCH',{status:'taken'});await api('request/'+call.request.id,'PATCH',{status:'done'});
const qr=await fetch(origin+'/api/qr?r='+r.slug+'&t='+t.token);assert.equal(qr.headers.get('content-type'),'image/svg+xml');assert.match(await qr.text(),/<svg/);
console.log(JSON.stringify({result:'Local Worker/D1 flow passed',guestUrl:origin+'/?r='+r.slug+'&t='+t.token+'#menu'}));
