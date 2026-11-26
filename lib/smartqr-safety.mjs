import {smartQRIdentity} from './smartqr-auth.mjs';
import {crmIdentity} from './smartqr-crm.mjs';
const H={'cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'};
const json=(body,status=200)=>Response.json(body,{status,headers:H});
const q=(db,s,...a)=>db.prepare(s).bind(...a);
const validId=s=>typeof s==='string'&&/^[a-f0-9]{32}$/.test(s);
export function dimensions(req,now=Date.now()){
 const country=String(req.cf?.country||'ZZ').toUpperCase(),ua=req.headers.get('user-agent')||'';
 return {day:new Date(now).toISOString().slice(0,10),country:/^[A-Z]{2}$/.test(country)?country:'ZZ',device:/bot|crawler|spider|preview/i.test(ua)?'bot':/ipad|tablet/i.test(ua)?'tablet':/mobile|iphone|android/i.test(ua)?'mobile':ua?'desktop':'unknown'};
}
export async function recordHit(db,link,req){
 const d=dimensions(req),key=[link,d.day,d.country,d.device].join(':');
 await q(db,'INSERT INTO smartqr_daily (id,link_id,day,country,device,hits) VALUES (?,?,?,?,?,1) ON CONFLICT(id) DO UPDATE SET hits=hits+1',key,link,d.day,d.country,d.device).run();
}
export async function safetyAPI(req,env){
 const db=env.DB,u=new URL(req.url),p=u.pathname.split('/').filter(Boolean).slice(3),method=req.method;
 if(!db)return json({error:'Service unavailable'},503);
 try{
 if(method!=='GET'&&(req.headers.get('origin')!==u.origin||req.headers.get('sec-fetch-site')==='cross-site'))return json({error:'Invalid origin'},403);
 if(p[0]==='report'&&p.length===1&&method==='POST'){
 const raw=await req.text();if(raw.length>2048)return json({error:'Too large'},413);const d=JSON.parse(raw);
 if(!validId(d.link)||!['phishing','malware','spam','other'].includes(d.category))return json({error:'Invalid report'},400);
 const ip=req.headers.get('cf-connecting-ip')||'unknown',key=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(ip))),x=>x.toString(16).padStart(2,'0')).join('');
 const now=Date.now(),r=await q(db,'INSERT INTO rate_limits (key,hits,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET hits=hits+1 RETURNING hits','smartqr-report:'+key+':'+Math.floor(now/3600000),now+7200000).first();
 if(r.hits>10)return json({error:'Try again later'},429);
 await q(db,"INSERT INTO smartqr_abuse (id,link_id,category,status,created_at) SELECT ?,?,?,'open',? WHERE EXISTS (SELECT 1 FROM smartqr_links WHERE id=?)",crypto.randomUUID(),d.link,d.category,now,d.link).run();
 return json({received:true},202);
 }
 if(p[0]==='analytics'&&p.length===1&&method==='GET'){
 const user=await smartQRIdentity(req,env);if(!user)return json({error:'Sign in required'},401);
 const since=new Date(Date.now()-29*86400000).toISOString().slice(0,10);
 const rows=await q(db,'SELECT d.day,SUM(d.hits) AS hits FROM smartqr_daily d JOIN smartqr_links l ON l.id=d.link_id WHERE l.owner_id=? AND d.day>=? GROUP BY d.day ORDER BY d.day',user.id,since).all();
 const countries=await q(db,'SELECT d.country,SUM(d.hits) AS hits FROM smartqr_daily d JOIN smartqr_links l ON l.id=d.link_id WHERE l.owner_id=? AND d.day>=? GROUP BY d.country ORDER BY hits DESC LIMIT 20',user.id,since).all();
 const devices=await q(db,'SELECT d.device,SUM(d.hits) AS hits FROM smartqr_daily d JOIN smartqr_links l ON l.id=d.link_id WHERE l.owner_id=? AND d.day>=? GROUP BY d.device ORDER BY hits DESC',user.id,since).all();
 return json({daily:rows.results,countries:countries.results,devices:devices.results,since,metric:'Redirect hits, not unique visitors'});
 }
 const admin=await crmIdentity(req,env);
 if(!admin||!['superadmin','admin','support'].includes(admin.role))return json({error:'Forbidden'},403);
 if(p[0]==='reports'&&method==='GET')return json({reports:(await q(db,'SELECT a.id,a.link_id,a.category,a.status,a.created_at,l.destination,CASE WHEN b.link_id IS NULL THEN 0 ELSE 1 END AS blocked FROM smartqr_abuse a JOIN smartqr_links l ON l.id=a.link_id LEFT JOIN smartqr_blocks b ON b.link_id=a.link_id ORDER BY a.created_at DESC LIMIT 200').all()).results});
 if(p[0]==='block'&&method==='POST'&&['superadmin','admin'].includes(admin.role)){
 const raw=await req.text();if(raw.length>2048)return json({error:'Too large'},413);const d=JSON.parse(raw);
 if(!validId(d.link)||typeof d.reason!=='string'||!d.reason.trim()||d.reason.length>300)return json({error:'Invalid request'},400);
 if(!await q(db,'SELECT id FROM smartqr_links WHERE id=?',d.link).first())return json({error:'Not found'},404);
 const now=Date.now();await db.batch([q(db,'INSERT INTO smartqr_blocks VALUES (?,?,?) ON CONFLICT(link_id) DO UPDATE SET reason=excluded.reason',d.link,d.reason.trim(),now),q(db,"UPDATE smartqr_abuse SET status='blocked' WHERE link_id=? AND status='open'",d.link),q(db,'INSERT INTO crm_audit (id,actor_id,action,entity_id,created_at) VALUES (?,?,?,?,?)',crypto.randomUUID(),admin.id,'qr.block',d.link,now)]);return json({saved:true});
 }
 return json({error:'Not found or forbidden'},404);
 }catch(e){if(e instanceof SyntaxError)return json({error:'Invalid input'},400);console.error('Safety API error',e.name);return json({error:'Request failed'},500)}
}
