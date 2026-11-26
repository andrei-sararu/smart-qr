import {trialFollowups} from './smartqr-workflows.mjs';
import {smartQRIdentity} from './smartqr-auth.mjs';
const H={'cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'};
const json=(body,status=200)=>Response.json(body,{status,headers:H});
const q=(db,s,...a)=>db.prepare(s).bind(...a);
const id=()=>crypto.randomUUID();
const roles=['admin','sales','support','marketing','viewer'];
export const stages=['New','Qualified','Demo','Trial','Won','Lost'];
const validId=s=>typeof s==='string'&&/^[a-f0-9-]{36}$/i.test(s);
const clean=(v,max,required=false)=>{if(typeof v!=='string'||v.length>max||required&&!v.trim())throw Error('Invalid input');return v.trim()};
const email=v=>{const s=clean(v,254);if(s&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s))throw Error('Invalid input');return s.toLowerCase()};
export function permissions(role){return {sales:['superadmin','admin','sales'].includes(role),tasks:['superadmin','admin','sales','support'].includes(role),marketing:['superadmin','admin','marketing'].includes(role),staff:role==='superadmin',audit:['superadmin','admin'].includes(role),customers:['superadmin','admin','support'].includes(role)}}
export async function crmIdentity(req,env){
 const user=await smartQRIdentity(req,env);if(!user)return null;
 // Owner bootstrap is pinned to the provider's immutable subject hash, not an email alone.
 if(env.SMARTQR_SUPERADMIN_ID&&user.id===env.SMARTQR_SUPERADMIN_ID)return {...user,role:'superadmin'};
 const row=await q(env.DB,'SELECT role FROM crm_staff WHERE id=? AND enabled=1',user.id).first();
 return row&&roles.includes(row.role)?{...user,role:row.role}:null;
}
async function read(req){const raw=await req.text();if(raw.length>20000)throw Error('Invalid input');return JSON.parse(raw)}
const audit=(db,user,action,entity)=>q(db,'INSERT INTO crm_audit (id,actor_id,action,entity_id,created_at) VALUES (?,?,?,?,?)',id(),user.id,action,entity,Date.now());
async function assigned(db,v){if(v===null||v===undefined||v==='')return null;if(typeof v!=='string'||v.length>100)throw Error('Invalid input');const r=await q(db,'SELECT id FROM crm_staff WHERE id=? AND enabled=1',v).first();if(!r)throw Error('Invalid assignee');return v}
export async function crmAPI(req,env){
 const db=env.DB,u=new URL(req.url),p=u.pathname.split('/').filter(Boolean).slice(3),method=req.method;
 if(!db)return json({error:'CRM unavailable'},503);
 try{
 const user=await crmIdentity(req,env);if(!user)return json({error:'Administrative access required'},403);
 const access=permissions(user.role),action=p[0],now=Date.now();
 if(method!=='GET'&&(req.headers.get('origin')!==u.origin||req.headers.get('sec-fetch-site')==='cross-site'))return json({error:'Invalid origin'},403);
 if(action==='workflows'&&method==='POST'&&['superadmin','admin'].includes(user.role)){
 const result=await trialFollowups(db,now);await audit(db,user,'workflow.trial-followup','trial-expiring').run();return json(result);
 }
 if(action==='me'&&method==='GET')return json({user,access});
 if(action==='overview'&&method==='GET'){
 const pipeline=await q(db,'SELECT stage,count(*) AS count,sum(value_pence) AS value_pence FROM crm_leads GROUP BY stage').all();
 const tasks=await q(db,"SELECT count(*) AS count FROM crm_tasks WHERE status='open'").first();
 const result={pipeline:pipeline.results,openTasks:tasks.count};
 if(access.marketing)result.marketing=(await q(db,'SELECT status,count(*) AS count FROM smartqr_marketing GROUP BY status').all()).results;
 if(access.customers)result.customers=await q(db,'SELECT count(*) AS accounts,sum(CASE WHEN trial_end>? THEN 1 ELSE 0 END) AS activeTrials FROM smartqr_accounts',now).first();
 return json(result);
 }
 if(action==='staff'){
 if(method==='GET'&&(access.staff||access.sales||access.tasks))return json({staff:(await q(db,'SELECT id,email,role,enabled FROM crm_staff ORDER BY email LIMIT 200').all()).results});
 if(!access.staff)return json({error:'Forbidden'},403);
 if(method==='POST'){
 const d=await read(req),staffId=clean(d.id,100,true),mail=email(d.email);
 if(!/^oidc:[A-Za-z0-9_-]{43}$/.test(staffId)||staffId===user.id||!mail||!roles.includes(d.role)||typeof d.enabled!=='boolean')throw Error('Invalid input');
 await db.batch([q(db,'INSERT INTO crm_staff (id,email,role,enabled,created_at) VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET email=excluded.email,role=excluded.role,enabled=excluded.enabled',staffId,mail,d.role,d.enabled?1:0,now),audit(db,user,'staff.upsert',staffId)]);return json({saved:true});
 }
 }
 if(action==='leads'){
 if(method==='GET')return json({leads:(await q(db,'SELECT * FROM crm_leads ORDER BY updated_at DESC LIMIT 500').all()).results});
 if(!access.sales)return json({error:'Forbidden'},403);
 if(method==='POST'||method==='PATCH'){
 const d=await read(req),company=clean(d.company,160,true),contact=clean(d.contact??'',120),mail=email(d.email??''),source=clean(d.source??'',80),notes=clean(d.notes??'',4000),owner=await assigned(db,d.owner_id);
 if(!stages.includes(d.stage)||!Number.isSafeInteger(d.value_pence)||d.value_pence<0||d.value_pence>100000000)throw Error('Invalid input');
 if(method==='POST'){const lead=id();await db.batch([q(db,'INSERT INTO crm_leads VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',lead,company,contact,mail,d.stage,source,owner,d.value_pence,notes,0,now,now),audit(db,user,'lead.create',lead)]);return json({id:lead},201)}
 if(!validId(p[1])||!Number.isSafeInteger(d.revision))throw Error('Invalid input');
 const results=await db.batch([q(db,'UPDATE crm_leads SET company=?,contact=?,email=?,stage=?,source=?,owner_id=?,value_pence=?,notes=?,revision=revision+1,updated_at=? WHERE id=? AND revision=?',company,contact,mail,d.stage,source,owner,d.value_pence,notes,now,p[1],d.revision),q(db,'INSERT INTO crm_audit SELECT ?,?,?,?,? WHERE changes()>0',id(),user.id,'lead.update',p[1],now)]);
 return results[0].meta.changes?json({saved:true}):json({error:'Stale or missing lead'},409);
 }
 }
 if(action==='tasks'){
 if(method==='GET')return json({tasks:(await q(db,'SELECT * FROM crm_tasks ORDER BY status,due_at LIMIT 500').all()).results});
 if(!access.tasks)return json({error:'Forbidden'},403);
 if(method==='POST'){
 const d=await read(req),title=clean(d.title,200,true),owner=await assigned(db,d.owner_id),lead=d.lead_id||null,due=d.due_at??null;
 if(lead&&(!validId(lead)||!await q(db,'SELECT id FROM crm_leads WHERE id=?',lead).first()))throw Error('Invalid input');
 if(due!==null&&(!Number.isSafeInteger(due)||due<0))throw Error('Invalid input');
 const task=id();await db.batch([q(db,'INSERT INTO crm_tasks VALUES (?,?,?,?,?,?,?,?)',task,lead,title,owner,due,'open',0,now),audit(db,user,'task.create',task)]);return json({id:task},201);
 }
 if(method==='PATCH'){
 const d=await read(req);if(!validId(p[1])||!['open','done'].includes(d.status)||!Number.isSafeInteger(d.revision))throw Error('Invalid input');
 const results=await db.batch([q(db,'UPDATE crm_tasks SET status=?,revision=revision+1 WHERE id=? AND revision=?',d.status,p[1],d.revision),q(db,'INSERT INTO crm_audit SELECT ?,?,?,?,? WHERE changes()>0',id(),user.id,'task.update',p[1],now)]);
 return results[0].meta.changes?json({saved:true}):json({error:'Stale or missing task'},409);
 }
 }
 if(action==='customer'&&method==='GET'&&access.customers){
 const owner=u.searchParams.get('id')||'';if(!/^oidc:[A-Za-z0-9_-]{1,100}$/.test(owner))throw Error('Invalid input');
 const account=await q(db,'SELECT owner_id,trial_end,created_at FROM smartqr_accounts WHERE owner_id=?',owner).first();
 const profile=await q(db,'SELECT company,country FROM smartqr_billing_profiles WHERE owner_id=?',owner).first();
 const links=(await q(db,'SELECT id,label,enabled,scans,created_at FROM smartqr_links WHERE owner_id=? ORDER BY created_at DESC LIMIT 1000',owner).all()).results;
 const tickets=(await q(db,'SELECT id,subject,status,priority,created_at FROM smartqr_tickets WHERE owner_id=? ORDER BY created_at DESC LIMIT 100',owner).all()).results;
 if(!account&&!profile&&!links.length&&!tickets.length)return json({error:'Not found'},404);
 return json({account,profile,links,tickets,billingStatus:'See verified Stripe portal; revenue not aggregated'});
 }
 if(action==='customers'&&method==='GET'&&access.customers)return json({accounts:(await q(db,'SELECT owner_id,trial_end,created_at,(SELECT count(*) FROM smartqr_links l WHERE l.owner_id=a.owner_id) AS links FROM smartqr_accounts a ORDER BY created_at DESC LIMIT 500').all()).results,restaurants:(await q(db,'SELECT id,name,slug,plan,subscription_status,created_at FROM restaurants ORDER BY created_at DESC LIMIT 500').all()).results});
 if(action==='marketing'&&method==='GET'&&access.marketing)return json({contacts:(await q(db,'SELECT email,status,source,requested_at,confirmed_at,unsubscribed_at FROM smartqr_marketing ORDER BY requested_at DESC LIMIT 500').all()).results});
 if(action==='audit'&&method==='GET'&&access.audit)return json({events:(await q(db,'SELECT * FROM crm_audit ORDER BY created_at DESC LIMIT 500').all()).results});
 return json({error:'Not found or forbidden'},404);
 }catch(e){if(e instanceof SyntaxError||['Invalid input','Invalid assignee'].includes(e.message))return json({error:e.message},400);console.error('CRM failure',e.name);return json({error:'CRM request failed'},500)}
}
