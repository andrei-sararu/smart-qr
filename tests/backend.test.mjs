import {test,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {handleAPI,validateItems} from '../lib/backend.mjs';
let sql,env;
const dbAdapter=sql=>({
 prepare(query){return {
  bind(...args){return {
   async first(){return sql.prepare(query).get(...args)||null},
   async all(){return {results:sql.prepare(query).all(...args)}},
   async run(){const r=sql.prepare(query).run(...args);return {meta:{changes:Number(r.changes)}}}
  }}
 }},
 async batch(statements){sql.exec('BEGIN');try{const r=[];for(const s of statements)r.push(await s.run());sql.exec('COMMIT');return r}catch(e){sql.exec('ROLLBACK');throw e}}
});
beforeEach(()=>{sql=new DatabaseSync(':memory:');for(const name of readdirSync(new URL('../drizzle/',import.meta.url)).filter(n=>n.endsWith('.sql')).sort())sql.exec(readFileSync(new URL('../drizzle/'+name,import.meta.url),'utf8'));env={DB:dbAdapter(sql)}});
async function call(path,method='GET',body,user='owner-a',origin='https://tablemint.test',location){const headers={};if(location)headers['x-cotiso-location']=location;if(user){headers['oai-authenticated-user-id']=user;headers['oai-authenticated-user-email']=user+'@example.test'}if(method!=='GET')headers.origin=origin;if(body)headers['content-type']='application/json';const req=new Request('https://tablemint.test/api/'+path,{method,headers,...(body?{body:JSON.stringify(body)}:{})});const res=await handleAPI(req,env);return {status:res.status,data:await res.json()}}
const product={id:'dish-1',name:'Soup',category:'Starters',price:7,desc:'Seasonal soup',allergens:'Celery',available:true,image:''};
async function create(user='owner-a'){return (await call('restaurant','POST',{name:'Test Bistro'},user)).data.restaurant}
async function publish(){const r=await create();const saved=await call('restaurant','PUT',{name:r.name,currency:r.currency,items:[product],published:true,revision:r.revision});const workspace=await call('workspace');return {r:saved.data.restaurant,t:workspace.data.tables[0]}}
test('anonymous cannot create or access a workspace',async()=>{assert.equal((await call('restaurant','POST',{name:'Bad'},null)).status,401);assert.equal((await call('workspace','GET',null,null)).status,401)});
test('restaurant creation provisions 12 unpredictable table codes and a 14-day trial',async()=>{const r=await create();assert.equal(r.plan,'Service');assert.equal(r.trial,true);const w=await call('workspace');assert.equal(w.data.tables.length,12);assert.equal(new Set(w.data.tables.map(x=>x.token)).size,12);assert.equal(r.published,false);assert.equal((await call('restaurant','POST',{name:'Duplicate'})).status,409);assert.equal(sql.prepare('SELECT count(*) AS n FROM restaurants').get().n,1)});
test('draft is inaccessible to guests; published menu is server-backed',async()=>{const r=await create();assert.equal((await call('public/'+r.slug,'GET',null,null)).status,404);await call('restaurant','PUT',{name:r.name,currency:'EUR',items:[product],published:true,revision:0});const menu=await call('public/'+r.slug,'GET',null,null);assert.equal(menu.status,200);assert.equal(menu.data.restaurant.items[0].name,'Soup');assert.equal(menu.data.restaurant.table,null)});
test('owner isolation: a second account cannot view workspace or mutate another request',async()=>{const {r,t}=await publish();await create('owner-b');const w=await call('workspace','GET',null,'owner-b');assert.equal(w.data.restaurant.items.length,0);const c=await call('request','POST',{token:t.token,type:'Waiter'},null);assert.equal((await call('request/'+c.data.request.id,'PATCH',{status:'taken'},'owner-b')).status,404);assert.notEqual(w.data.restaurant.id,r.id)});
test('cross-device call is visible in workspace, deduplicated, taken and resolved',async()=>{const {r,t}=await publish();const c=await call('request','POST',{token:t.token,type:'Waiter'},null);assert.equal(c.status,201);const duplicate=await call('request','POST',{token:t.token,type:'Waiter'},null);assert.equal(duplicate.data.alreadyOpen,true);const w=await call('workspace');assert.equal(w.data.requests.length,1);assert.equal(w.data.requests[0].tableNumber,t.number);assert.equal((await call('request/'+c.data.request.id,'PATCH',{status:'taken'})).status,200);assert.equal((await call('request/'+c.data.request.id,'PATCH',{status:'taken'})).status,409);assert.equal((await call('request/'+c.data.request.id,'PATCH',{status:'done'})).status,200);const menu=await call('public/'+r.slug+'?table='+t.token,'GET',null,null);assert.equal(menu.data.requests.length,0);assert.equal((await call('request','POST',{token:t.token,type:'Waiter'},null)).status,201)});
test('stale menu writes are rejected without losing the latest revision',async()=>{const r=await create();const b={name:r.name,currency:'EUR',items:[product],published:false,revision:0};assert.equal((await call('restaurant','PUT',b)).status,200);assert.equal((await call('restaurant','PUT',{...b,name:'Stale'})).status,409);assert.equal((await call('workspace')).data.restaurant.name,r.name)});
test('unpublishing blocks new guest calls',async()=>{const {r,t}=await publish();await call('restaurant','PUT',{name:r.name,currency:'EUR',items:[product],published:false,revision:r.revision});assert.equal((await call('request','POST',{token:t.token,type:'Bill'},null)).status,403)});
test('expired trial falls back to Free, limits products and disables service',async()=>{const {t}=await publish();sql.exec('UPDATE restaurants SET trial_end=0');const w=(await call('workspace')).data;assert.equal(w.restaurant.plan,'Free');assert.equal(w.restaurant.service,false);assert.equal((await call('request','POST',{token:t.token,type:'Waiter'},null)).status,403);const items=Array.from({length:31},(_,i)=>({...product,id:'dish-'+i}));assert.equal((await call('restaurant','PUT',{name:'Test',currency:'EUR',items,published:true,revision:w.restaurant.revision})).status,400)});
test('cross-origin writes rejected',async()=>{assert.equal((await call('restaurant','POST',{name:'Bad'},'owner-a','https://evil.example')).status,403)});
test('invalid or disabled table cannot create a request; replacing code revokes the old code',async()=>{const {t}=await publish();assert.equal((await call('request','POST',{token:'invalid',type:'Waiter'},null)).status,404);await call('table/'+t.id,'PATCH',{enabled:false});assert.equal((await call('request','POST',{token:t.token,type:'Waiter'},null)).status,404);await call('table/'+t.id,'PATCH',{enabled:true});await call('table/'+t.id,'PATCH',{rotate:true});assert.equal((await call('request','POST',{token:t.token,type:'Waiter'},null)).status,404)});
test('billing never grants a plan without provider confirmation',async()=>{await create();const c=await call('billing/checkout','POST',{plan:'Service',interval:'month'});assert.equal(c.status,503);assert.equal((await call('workspace')).data.restaurant.trial,true)});
test('unsafe product images and negative prices are rejected',()=>{assert.throws(()=>validateItems([{...product,image:'javascript:alert(1)'}],30));assert.throws(()=>validateItems([{...product,price:-1}],30));assert.throws(()=>validateItems([product,product],30))});
test('rate-limits repeated guest calls',async()=>{const {t}=await publish();for(let i=0;i<6;i++)await call('request','POST',{token:t.token,type:'Waiter'},null);assert.equal((await call('request','POST',{token:t.token,type:'Waiter'},null)).status,429)});

test('all supported translations and original menu language round-trip',async()=>{const locales=JSON.parse(readFileSync(new URL('../lib/locales.json',import.meta.url),'utf8'));const r=await create();const translations=Object.fromEntries(Object.keys(locales).map(code=>[code,{name:code+' soup',category:code+' starters',desc:'Translated',allergens:'Celery'}]));const saved=await call('restaurant','PUT',{name:r.name,currency:'EUR',originalLanguage:'ro',items:[{...product,translations}],published:true,revision:0});assert.equal(saved.status,200);assert.equal(saved.data.restaurant.originalLanguage,'ro');assert.equal(Object.keys(saved.data.restaurant.items[0].translations).length,16);const guest=(await call('public/'+r.slug,'GET',null,null)).data.restaurant;assert.equal(guest.originalLanguage,'ro');assert.equal(guest.items[0].translations.fi.category,'fi starters')});
test('billing profile is private to the owner and validates required company fields',async()=>{await create();const profile={company:'Bistro SRL',address:'Main Street 1',city:'Ploiesti',postalCode:'100000',country:'ro',registration:'12345678'};assert.equal((await call('billing/profile','PUT',profile)).status,200);assert.equal((await call('workspace')).data.restaurant.billing.country,'RO');await create('owner-b');assert.deepEqual((await call('workspace','GET',null,'owner-b')).data.restaurant.billing,{});assert.equal((await call('billing/profile','PUT',{})).status,400);assert.equal((await call('billing/profile','PUT',profile,null)).status,401)});
test('invoice listing without a Stripe customer returns a truthful empty list',async()=>{await create();const invoices=await call('billing/invoices');assert.deepEqual(invoices.data.invoices,[]);assert.equal((await call('billing/invoices','GET',null,null)).status,401)});
test('contact form saves a real enquiry and protects it from ordinary accounts',async()=>{const b={name:'Test Owner',email:'owner@example.test',venue:'Test Bistro',message:'Can I use a tablet?'};const saved=await call('contact','POST',b,null);assert.equal(saved.status,201);assert.ok(saved.data.reference);assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM enquiries').get().n,1);assert.equal((await call('enquiries','GET',null,null)).status,401);assert.equal((await call('enquiries')).status,403);env.SUPPORT_ADMIN_EMAIL='owner-a@example.test';const inbox=await call('enquiries');assert.equal(inbox.data.enquiries[0].message,b.message);assert.equal((await call('enquiries/'+saved.data.reference,'PATCH',{status:'reviewed'})).status,200);assert.equal((await call('enquiries')).data.enquiries[0].status,'reviewed')});
test('contact form validates addresses, suppresses honeypots and rate-limits submissions',async()=>{const b={name:'Owner',email:'owner@example.test',venue:'Bistro',message:'Question'};assert.equal((await call('contact','POST',{...b,email:'invalid'},null)).status,400);assert.equal((await call('contact','POST',{...b,website:'spam'},null)).status,200);assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM enquiries').get().n,0);for(let i=0;i<3;i++)assert.equal((await call('contact','POST',b,null)).status,201);assert.equal((await call('contact','POST',b,null)).status,429)});
test('pickup timestamp is captured once and insights remain owner-scoped',async()=>{const {t}=await publish();const c=await call('request','POST',{token:t.token,type:'Waiter'},null);await call('request/'+c.data.request.id,'PATCH',{status:'taken'});const record=sql.prepare('SELECT taken_at FROM service_requests WHERE id=?').get(c.data.request.id);assert.equal(typeof record.taken_at,'number');await call('request/'+c.data.request.id,'PATCH',{status:'done'});assert.equal(sql.prepare('SELECT taken_at FROM service_requests WHERE id=?').get(c.data.request.id).taken_at,record.taken_at);const metrics=await call('insights');assert.equal(metrics.data.service.measuredResponses,1);assert.equal(metrics.data.service.requests24h,1);await create('owner-b');assert.equal((await call('insights','GET',null,'owner-b')).data.service.requests24h,0);assert.equal((await call('insights','GET',null,null)).status,401)});

test('company logos are owner-scoped, paid-only and hidden after downgrade',async()=>{
 const {r}=await publish();
 const file='11111111-1111-4111-8111-111111111111';
 const url='/api/media/'+file;
 assert.equal((await call('logo','PUT',{url})).status,403);
 const other=await create('owner-b');
 sql.prepare("INSERT INTO uploads (id,restaurant_id,mime,bytes,created_at) VALUES (?,?,'image/png',128,0)").run(file,other.id);
 sql.prepare("UPDATE restaurants SET plan='Menu Pro',subscription_status='active',subscription_end=? WHERE id=?").run(Date.now()+86400000,r.id);
 assert.equal((await call('logo','PUT',{url})).status,403);
 sql.prepare('UPDATE uploads SET restaurant_id=? WHERE id=?').run(r.id,file);
 assert.equal((await call('logo','PUT',{url})).status,200);
 assert.equal((await call('logo')).data.url,url);
 assert.equal((await call('public/'+r.slug,'GET',null,null)).data.restaurant.logo,url);
 assert.equal((await call('logo','PUT',{url:''})).data.url,'');
 assert.equal((await call('public/'+r.slug,'GET',null,null)).data.restaurant.logo,'');
 await call('logo','PUT',{url});
 sql.prepare('UPDATE restaurants SET subscription_end=0 WHERE id=?').run(r.id);
 assert.equal((await call('public/'+r.slug,'GET',null,null)).data.restaurant.logo,'');
});

test('guest dish lists validate the live menu, deduplicate and show only on the owner board',async()=>{
 const {r,t}=await publish();
 const send=items=>call('request','POST',{token:t.token,type:'OrderReady',items},null);
 assert.equal((await send([])).status,400);
 assert.equal((await send([{id:product.id,quantity:21}])).status,400);
 assert.equal((await send([{id:'missing',quantity:1}])).status,400);
 const request=await send([{id:product.id,name:'Untrusted name',quantity:2}]);
 assert.equal(request.status,201);
 assert.equal((await send([{id:product.id,quantity:1}])).data.alreadyOpen,true);
 const board=(await call('workspace')).data.requests;
 assert.deepEqual(board[0].items,[{name:'Soup',quantity:2,unitPrice:7,currency:'EUR'}]);
 assert.equal(board[0].tableNumber,t.number);
 const guest=(await call('public/'+r.slug+'?table='+t.token,'GET',null,null)).data.requests;
 assert.equal(guest[0].type,'OrderReady');
 assert.equal(guest[0].items,undefined);
 await create('owner-b');
 assert.deepEqual((await call('workspace','GET',null,'owner-b')).data.requests,[]);
 assert.equal((await call('request/'+request.data.request.id,'PATCH',{status:'taken'})).status,200);
 assert.equal((await call('request/'+request.data.request.id,'PATCH',{status:'done'})).status,200);
 assert.equal((await send([{id:product.id,quantity:1}])).status,201);
});

test('table count preserves existing QR tokens and saves venue-scoped table details',async()=>{
 const {r,t}=await publish();
 assert.equal((await call('tables','PUT',{count:15})).status,200);
 let tables=(await call('workspace')).data.tables;
 assert.equal(tables.filter(table=>table.enabled).length,15);
 assert.equal(tables[0].token,t.token);
 assert.equal((await call('table/'+t.id,'PUT',{label:'Terrace A',seats:6,area:'outside'})).status,200);
 assert.equal((await call('public/'+r.slug+'?table='+t.token,'GET',null,null)).data.restaurant.table.label,'Terrace A');
 await create('owner-b');
 assert.equal((await call('table/'+t.id,'PUT',{label:'B',seats:2,area:'inside'},'owner-b')).status,404);
 await call('tables','PUT',{count:0});
 assert.equal((await call('public/'+r.slug+'?table='+t.token,'GET',null,null)).status,404);
 await call('tables','PUT',{count:1});
 tables=(await call('workspace')).data.tables;
 assert.equal(tables[0].token,t.token);
 assert.equal(tables[0].seats,6);
 assert.equal(tables[0].area,'outside');
 assert.equal(tables.filter(table=>table.enabled).length,1);
 assert.equal((await call('tables','PUT',{count:101})).status,400);
});

test('menu assistance produces editable translations and extraction drafts without inventing allergens',async()=>{
 await create();
 const request={action:'translate',language:'ro',name:'Soup',category:'Starters',desc:''};
 assert.equal((await call('menu-assist','POST',request,null)).status,401);
 assert.equal((await call('menu-assist','POST',request)).status,503);
 env.AI={async run(model,input){
  if(model.includes('m2m100'))return {translated_text:input.text==='Soup'?'Supă':'Aperitive'};
  assert.match(input.image,/^data:image\/jpeg;base64,/);
  return {response:'[{"name":"Soup","category":"Starter","price":null,"description":"Vegetable soup","allergens":"invented"}]'};
 }};
 const translation=await call('menu-assist','POST',request);
 assert.deepEqual(translation.data.translation,{name:'Supă',category:'Aperitive',desc:''});
 const extraction=await call('menu-assist','POST',{action:'extract',image:'/9j/AA=='});
 assert.deepEqual(extraction.data.items,[{name:'Soup',category:'Starter',desc:'Vegetable soup',price:null}]);
 assert.equal((await call('workspace')).data.restaurant.items.length,0);
});

test('Service invitations are single use, scoped to the board and revocable',async()=>{
  const {r,t}=await publish();
  const other=await create('owner-b');
  const invite=await call('team','POST',{label:'Front of house'});
  assert.equal(invite.status,201);
  assert.match(invite.data.token,/^[a-f0-9]{32}$/);
  assert.equal((await call('team/join','POST',{token:invite.data.token},null)).status,401);
  assert.equal((await call('team/join','POST',{token:invite.data.token},'staff-a')).status,200);
  assert.equal((await call('team/join','POST',{token:invite.data.token},'staff-b')).status,404);
  const c=await call('request','POST',{token:t.token,type:'OrderReady',items:[{id:product.id,quantity:2}]},null);
  const board=await call('team/board/'+r.id,'GET',null,'staff-a');
  assert.equal(board.status,200);
  assert.equal(board.data.requests[0].items[0].quantity,2);
  assert.equal(board.data.tables,undefined);
  assert.equal((await call('workspace','GET',null,'staff-a')).status,404);
  assert.equal((await call('team/board/'+other.id,'GET',null,'staff-a')).status,404);
  assert.equal((await call('request/'+c.data.request.id,'PATCH',{status:'taken',restaurantId:r.id},'staff-a')).status,200);
  const member=(await call('team')).data.members[0];
  await call('team/'+member.id,'DELETE');
  assert.equal((await call('team/board/'+r.id,'GET',null,'staff-a')).status,404);
  assert.equal((await call('request/'+c.data.request.id,'PATCH',{status:'done',restaurantId:r.id},'staff-a')).status,404);
  sql.exec('UPDATE restaurants SET trial_end=0');
  assert.equal((await call('team','POST',{label:'New staff'})).status,403);
});

test('Guest assistant returns only available menu IDs and respects plan and publication',async()=>{
  const {r}=await publish();
  env.AI={run:async()=>({response:'["dish-1","missing","dish-1"]'})};
  const request={question:'Warm starter',language:'en'};
  assert.deepEqual((await call('guest-assistant/'+r.slug,'POST',request,null)).data,{ids:['dish-1']});
  sql.exec('UPDATE restaurants SET trial_end=0');
  assert.equal((await call('guest-assistant/'+r.slug,'POST',request,null)).status,404);
  sql.exec('UPDATE restaurants SET published=0');
  assert.equal((await call('guest-assistant/'+r.slug,'POST',request,null)).status,404);
});

test('A claimed dish list becomes one order and advances through preparation and service',async()=>{
  const {r,t}=await publish();
  const c=await call('request','POST',{token:t.token,type:'OrderReady',items:[{id:product.id,quantity:2}]},null);
  const requestId=c.data.request.id;
  assert.equal((await call('orders/confirm','POST',{requestId})).status,409);
  await call('request/'+requestId,'PATCH',{status:'taken'});
  assert.equal((await call('orders/confirm','POST',{requestId})).status,201);
  assert.equal((await call('orders/confirm','POST',{requestId})).status,409);
  let snapshot=(await call('workspace')).data;
  assert.equal(snapshot.requests[0].status,'done');
  assert.deepEqual(snapshot.orders[0].items,[{name:'Soup',quantity:2,unitPrice:7,currency:'EUR'}]);
  assert.equal((await call('orders/'+requestId,'PATCH',{status:'served'})).status,409);
  assert.equal((await call('orders/'+requestId,'PATCH',{status:'preparing',restaurantId:r.id},'outsider')).status,404);
  const invite=await call('team','POST',{label:'Kitchen'});
  await call('team/join','POST',{token:invite.data.token},'staff-a');
  assert.equal((await call('orders/'+requestId,'PATCH',{status:'preparing',restaurantId:r.id},'staff-a')).status,200);
  assert.equal((await call('orders/'+requestId,'PATCH',{status:'served'})).status,200);
  snapshot=(await call('workspace')).data;
  assert.equal(snapshot.orders[0].status,'served');
});

test('Options and allergen declarations round-trip and the server snapshots customised prices',async()=>{
  const {r,t}=await publish();
  const configured={...product,variants:[{id:'large',name:'Large',price:9.5}],extras:[{id:'bread',name:'Bread',price:1.25}],allergenCodes:['celery','gluten']};
  assert.equal((await call('restaurant','PUT',{name:r.name,currency:'GBP',items:[configured],published:true,revision:r.revision})).status,200);
  const publicMenu=(await call('public/'+r.slug,'GET',null,null)).data.restaurant;
  assert.deepEqual(publicMenu.items[0].allergenCodes,['celery','gluten']);
  assert.throws(()=>validateItems([{...configured,allergenCodes:['invented']}],30));
  const send=items=>call('request','POST',{token:t.token,type:'OrderReady',items},null);
  assert.equal((await send([{id:product.id,quantity:1}])).status,400);
  assert.equal((await send([{id:product.id,quantity:1,variantId:'large',extraIds:['bread','bread']}])).status,400);
  const res=await send([{id:product.id,quantity:2,variantId:'large',extraIds:['bread'],unitPrice:0.01}]);
  assert.equal(res.status,201);
  const workspace=(await call('workspace')).data;
  assert.deepEqual(workspace.requests[0].items,[{name:'Soup (Large, Bread)',quantity:2,unitPrice:10.75,currency:'GBP'}]);
});

test('Confirmed rounds accrue to the table until staff closes the served bill',async()=>{
  const {t}=await publish();
  const orderIds=[];
  for(let round=0;round<2;round++){
    const order=await call('request','POST',{token:t.token,type:'OrderReady',items:[{id:product.id,quantity:1}]},null);
    const requestId=order.data.request.id;
    await call('request/'+requestId,'PATCH',{status:'taken'});
    await call('orders/confirm','POST',{requestId});
    await call('orders/'+requestId,'PATCH',{status:'preparing'});
    orderIds.push(requestId);
  }
  const bill=(await call('orders')).data.bills[0];
  assert.deepEqual(bill.totals,{EUR:1400});
  assert.equal((await call('orders/settle','POST',{tableId:bill.tableId,orderIds})).status,409);
  for(const orderId of orderIds)await call('orders/'+orderId,'PATCH',{status:'served'});
  assert.equal((await call('orders/settle','POST',{tableId:bill.tableId,orderIds})).status,200);
  assert.deepEqual((await call('orders')).data.bills,[]);
});

test('Owners can add and select isolated locations while staff and other accounts cannot select them as owners',async()=>{
 const original=await create();
 const result=await call('restaurant/location','POST',{name:'Example · Camberley'});
 assert.equal(result.status,201);
 const location=result.data.restaurant;
 assert.equal(location.plan,'Free');
 assert.notEqual(location.slug,original.slug);
 const get=(path,user,id)=>call(path,'GET',null,user,'https://tablemint.test',id);
 assert.deepEqual((await get('session','owner-a',location.id)).data.locations.map(row=>row.id),[original.id,location.id]);
 assert.equal((await get('workspace','owner-a')).data.restaurant.id,original.id);
 const branch=await get('workspace','owner-a',location.id);
 assert.equal(branch.data.restaurant.id,location.id);
 assert.equal(branch.data.tables.length,12);
 assert.equal((await get('workspace','owner-b',location.id)).status,404);
 assert.equal((await call('restaurant','PUT',{name:'Updated Camberley',currency:'GBP',items:[],published:false,revision:0},'owner-a','https://tablemint.test',location.id)).status,200);
 assert.equal((await get('workspace','owner-a')).data.restaurant.name,original.name);
});
