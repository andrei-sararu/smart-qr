import {crmIdentity,permissions} from './smartqr-crm.mjs';
const q=(db,s,...a)=>db.prepare(s).bind(...a);
const json=(data,status=200)=>Response.json(data,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
const segments=['all','newsletter','generator','demo','pricing','trial'];
export function campaignInput(d){const field=(k,max)=>{if(typeof d?.[k]!=='string'||!d[k].trim()||d[k].length>max)throw Error('Invalid campaign');return d[k].trim()};const name=field('name',120),subject=field('subject',160),body=field('body',12000);if(/[\r\n]/.test(subject)||!segments.includes(d.segment))throw Error('Invalid campaign');return {name,subject,body,segment:d.segment}}
export async function audienceCount(db,segment){if(!segments.includes(segment))throw Error('Invalid campaign');const row=segment==='all'?await q(db,"SELECT count(*) AS count FROM smartqr_marketing WHERE status='active' AND confirmed_at IS NOT NULL").first():await q(db,"SELECT count(*) AS count FROM smartqr_marketing WHERE status='active' AND confirmed_at IS NOT NULL AND source=?",segment).first();return row.count}
export async function campaignsAPI(req,env){
 const db=env.DB,u=new URL(req.url),p=u.pathname.split('/').filter(Boolean).slice(3),method=req.method;
 if(!db)return json({error:'Campaigns unavailable'},503);
 try{
 const user=await crmIdentity(req,env);if(!user||!permissions(user.role).marketing)return json({error:'Forbidden'},403);
 if(method!=='GET'&&(req.headers.get('origin')!==u.origin||req.headers.get('sec-fetch-site')==='cross-site'))return json({error:'Invalid origin'},403);
 if(p[0]!=='campaigns')return json({error:'Not found'},404);
 if(p.length===1&&method==='GET')return json({campaigns:(await q(db,'SELECT * FROM smartqr_campaigns ORDER BY updated_at DESC LIMIT 200').all()).results,deliveryEnabled:false});
 if(p[1]==='audience'&&method==='GET')return json({count:await audienceCount(db,u.searchParams.get('segment')||'all')});
 if(method!=='POST'&&method!=='PATCH')return json({error:'Not found'},404);
 const raw=await req.text();if(raw.length>20000)return json({error:'Too large'},413);const d=JSON.parse(raw),now=Date.now();
 if(p.length===1&&method==='POST'){
 const c=campaignInput(d),id=crypto.randomUUID();await db.batch([q(db,"INSERT INTO smartqr_campaigns VALUES (?,?,?,?,?,'draft',NULL,?,?,?,0)",id,c.name,c.subject,c.body,c.segment,user.id,now,now),q(db,'INSERT INTO crm_audit VALUES (?,?,?,?,?)',crypto.randomUUID(),user.id,'campaign.create',id,now)]);return json({id},201);
 }
 if(!/^[a-f0-9-]{36}$/.test(p[1]||'')||!Number.isSafeInteger(d.revision))return json({error:'Invalid campaign'},400);
 if(p.length===2&&method==='PATCH'){
 const c=campaignInput(d);const r=await db.batch([q(db,"UPDATE smartqr_campaigns SET name=?,subject=?,body=?,segment=?,updated_at=?,revision=revision+1 WHERE id=? AND revision=? AND status='draft'",c.name,c.subject,c.body,c.segment,now,p[1],d.revision),q(db,'INSERT INTO crm_audit SELECT ?,?,?,?,? WHERE changes()>0',crypto.randomUUID(),user.id,'campaign.edit',p[1],now)]);return r[0].meta.changes?json({saved:true}):json({error:'Stale or non-draft campaign'},409);
 }
 if(p.length===3&&p[2]==='plan'&&method==='POST'){
 if(!Number.isSafeInteger(d.scheduled_at)||d.scheduled_at<=now)return json({error:'Choose a future date'},400);
 const r=await db.batch([q(db,"UPDATE smartqr_campaigns SET status='planned',scheduled_at=?,updated_at=?,revision=revision+1 WHERE id=? AND revision=? AND status='draft'",d.scheduled_at,now,p[1],d.revision),q(db,'INSERT INTO crm_audit SELECT ?,?,?,?,? WHERE changes()>0',crypto.randomUUID(),user.id,'campaign.plan',p[1],now)]);return r[0].meta.changes?json({saved:true,deliveryEnabled:false}):json({error:'Stale or non-draft campaign'},409);
 }
 if(p.length===3&&p[2]==='cancel'&&method==='POST'){
 const r=await db.batch([q(db,"UPDATE smartqr_campaigns SET status='draft',scheduled_at=NULL,updated_at=?,revision=revision+1 WHERE id=? AND revision=? AND status='planned'",now,p[1],d.revision),q(db,'INSERT INTO crm_audit SELECT ?,?,?,?,? WHERE changes()>0',crypto.randomUUID(),user.id,'campaign.cancel',p[1],now)]);return r[0].meta.changes?json({saved:true}):json({error:'Stale or non-planned campaign'},409);
 }
 return json({error:'Not found'},404);
 }catch(e){if(e instanceof SyntaxError||e.message==='Invalid campaign')return json({error:'Invalid campaign'},400);console.error('Campaign API failure',e.name);return json({error:'Unable to complete request'},500)}
}
