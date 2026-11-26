import {smartQRIdentity} from './smartqr-auth.mjs';
import {crmIdentity} from './smartqr-crm.mjs';
const H={'cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'};
const json=(body,status=200)=>Response.json(body,{status,headers:H});
const q=(db,s,...a)=>db.prepare(s).bind(...a);
const id=()=>crypto.randomUUID();
const validId=s=>typeof s==='string'&&/^[a-f0-9-]{36}$/.test(s);
const clean=(v,max)=>{if(typeof v!=='string'||!v.trim()||v.length>max)throw Error('Invalid input');return v.trim()};
const categories=['Billing','QR codes','Account','Restaurant menus','Other'];
const statuses=['open','waiting_customer','resolved'];
async function read(req){if(Number(req.headers.get('content-length')||0)>12000)throw Error('Invalid input');const raw=await req.text();if(raw.length>12000)throw Error('Invalid input');return JSON.parse(raw)}
export async function supportAPI(req,env){
 const db=env.DB,u=new URL(req.url),p=u.pathname.split('/').filter(Boolean).slice(3),method=req.method,admin=p[0]==='admin';
 if(!db)return json({error:'Support unavailable'},503);
 try{
 const user=admin?await crmIdentity(req,env):await smartQRIdentity(req,env);
 if(!user)return json({error:'Sign in required'},401);
 if(admin&&!['superadmin','admin','support'].includes(user.role))return json({error:'Forbidden'},403);
 if(method!=='GET'&&(req.headers.get('origin')!==u.origin||req.headers.get('sec-fetch-site')==='cross-site'))return json({error:'Invalid origin'},403);
 if(admin)p.shift();
 if(p[0]!=='tickets')return json({error:'Not found'},404);
 const now=Date.now();
 if(p.length===1&&method==='GET'){
 const rows=admin?await q(db,'SELECT * FROM smartqr_tickets ORDER BY updated_at DESC LIMIT 200').all():await q(db,'SELECT * FROM smartqr_tickets WHERE owner_id=? ORDER BY updated_at DESC LIMIT 100',user.id).all();
 return json({tickets:rows.results});
 }
 if(p.length===1&&method==='POST'&&!admin){
 const d=await read(req),subject=clean(d.subject,160),body=clean(d.body,5000);
 if(!categories.includes(d.category))throw Error('Invalid input');
 const ticket=id(),message=id();
 const results=await db.batch([
 q(db,"INSERT INTO smartqr_tickets (id,owner_id,subject,category,status,priority,created_at,updated_at) SELECT ?,?,?,?,'open','normal',?,? WHERE (SELECT count(*) FROM smartqr_tickets WHERE owner_id=? AND created_at>?)<10",ticket,user.id,subject,d.category,now,now,user.id,now-86400000),
 q(db,"INSERT INTO smartqr_ticket_messages SELECT ?,?,?,?, ?,? WHERE EXISTS (SELECT 1 FROM smartqr_tickets WHERE id=?)",message,ticket,user.id,'customer',body,now,ticket)
 ]);
 return results[0].meta.changes?json({id:ticket},201):json({error:'Daily ticket limit reached'},429);
 }
 if(!validId(p[1]))return json({error:'Not found'},404);
 const ticket=admin?await q(db,'SELECT * FROM smartqr_tickets WHERE id=?',p[1]).first():await q(db,'SELECT * FROM smartqr_tickets WHERE id=? AND owner_id=?',p[1],user.id).first();
 if(!ticket)return json({error:'Not found'},404);
 if(p.length===2&&method==='GET'){
 const rows=await q(db,'SELECT author_type,body,created_at FROM smartqr_ticket_messages WHERE ticket_id=? ORDER BY created_at,id LIMIT 200',ticket.id).all();return json({ticket,messages:rows.results});
 }
 if(p.length===3&&p[2]==='reply'&&method==='POST'){
 const d=await read(req),body=clean(d.body,5000),message=id(),next=admin?'waiting_customer':'open';
 const results=await db.batch([
 q(db,"INSERT INTO smartqr_ticket_messages SELECT ?,?,?,?,?,? WHERE (SELECT count(*) FROM smartqr_ticket_messages WHERE ticket_id=?)<200",message,ticket.id,user.id,admin?'support':'customer',body,now,ticket.id),
 q(db,'UPDATE smartqr_tickets SET status=?,updated_at=? WHERE id=? AND changes()>0',next,now,ticket.id)
 ]);
 return results[0].meta.changes?json({saved:true}):json({error:'Thread limit reached; create a new ticket'},409);
 }
 if(p.length===2&&method==='PATCH'&&admin){
 const d=await read(req);if(!statuses.includes(d.status)||!['low','normal','high','urgent'].includes(d.priority))throw Error('Invalid input');
 await db.batch([q(db,'UPDATE smartqr_tickets SET status=?,priority=?,updated_at=? WHERE id=?',d.status,d.priority,now,ticket.id),q(db,'INSERT INTO crm_audit (id,actor_id,action,entity_id,created_at) VALUES (?,?,?,?,?)',id(),user.id,'support.update',ticket.id,now)]);return json({saved:true});
 }
 return json({error:'Not found'},404);
 }catch(e){if(e instanceof SyntaxError||e.message==='Invalid input')return json({error:'Invalid input'},400);console.error('Support failure',e.name);return json({error:'Support request failed'},500)}
}
