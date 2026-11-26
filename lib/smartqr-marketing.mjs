import {smartQRIdentity} from './smartqr-auth.mjs';
const H={'cache-control':'no-store','referrer-policy':'no-referrer','x-content-type-options':'nosniff'};
const reply=(body,status=200)=>Response.json(body,{status,headers:H});
const q=(db,s,...args)=>db.prepare(s).bind(...args);
export const CONSENT_VERSION='smartqr-news-v1';
export const CONSENT_TEXT='I agree to receive SmartQR product news, tips and offers by email. I can unsubscribe at any time.';
const sources=new Set(['newsletter','generator','demo','pricing','trial']);
const hex=b=>Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('');
const hash=async s=>hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));
const token=()=>hex(crypto.getRandomValues(new Uint8Array(32)));
export function normalizeEmail(value){if(typeof value!=='string')throw Error('Invalid email');const s=value.trim().toLowerCase();if(s.length>254||!/^[a-z0-9][a-z0-9._%+!-]{0,63}@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(s))throw Error('Invalid email');return s}
export function csvCell(value){const s=String(value??'');return '"'+(/^[\s]*[=+\-@\t\r]/.test(s)?"'":"")+s.replaceAll('"','""')+'"'}
async function read(req){if(Number(req.headers.get('content-length')||0)>4096)throw Error('Invalid input');const s=await req.text();if(s.length>4096)throw Error('Invalid input');return JSON.parse(s)}
async function throttle(db,key,max){const now=Date.now(),bucket=Math.floor(now/3600000),row=await q(db,'INSERT INTO rate_limits (key,hits,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET hits=hits+1 RETURNING hits','smartqr-news:'+key+':'+bucket,now+7200000).first();return row.hits<=max}
export async function marketingAPI(req,env){
 const u=new URL(req.url),action=u.pathname.split('/').pop(),db=env.DB;
 if(!db)return reply({error:'Newsletter unavailable'},503);
 try{
 if(req.method==='POST'&&(req.headers.get('origin')!==u.origin||req.headers.get('sec-fetch-site')==='cross-site'))return reply({error:'Invalid origin'},403);
 if(action==='subscribe'&&req.method==='POST'){
  const d=await read(req);if(d.website)return reply({received:true},202);
  if(d.consent!==true||d.version!==CONSENT_VERSION||!sources.has(d.source))return reply({error:'Explicit newsletter consent required'},400);
  const email=normalizeEmail(d.email),now=Date.now();
  const ip=req.headers.get('cf-connecting-ip')||'unknown';
  if(!await throttle(db,await hash(ip),20))return reply({error:'Try again later'},429);
  if(!await throttle(db,await hash(email),3))return reply({error:'Try again later'},429);
  // No marketing until the mailbox has been verified. Repeated anonymous submissions cannot reactivate suppressed addresses.
  await q(db,'INSERT INTO smartqr_marketing (email,status,source,consent_version,consent_text,requested_at,updated_at) VALUES (?,\'pending\',?,?,?,?,?) ON CONFLICT(email) DO NOTHING',email,d.source,CONSENT_VERSION,CONSENT_TEXT,now,now).run();
  return reply({received:true,message:'Request saved. Email confirmation is not available yet; no marketing will be sent until confirmed.'},202);
 }
 if(action==='confirm'&&req.method==='POST'){
  const d=await read(req);if(typeof d.token!=='string'||!/^[a-f0-9]{64}$/.test(d.token))return reply({error:'Invalid confirmation'},400);
  const now=Date.now();
  const row=await q(db,"UPDATE smartqr_marketing SET status='active',confirmed_at=?,updated_at=?,confirm_hash=NULL,confirm_expires=NULL WHERE confirm_hash=? AND confirm_expires>? AND status='pending' RETURNING email",now,now,await hash(d.token),now).first();
  return row?reply({confirmed:true}):reply({error:'Invalid or expired confirmation'},400);
 }
 if(action==='unsubscribe'&&req.method==='POST'){
  const d=await read(req);if(typeof d.token!=='string'||!/^[a-f0-9]{64}$/.test(d.token))return reply({error:'Invalid unsubscribe link'},400);
  await q(db,"UPDATE smartqr_marketing SET status='unsubscribed',unsubscribed_at=COALESCE(unsubscribed_at,?),updated_at=?,confirm_hash=NULL,confirm_expires=NULL WHERE unsubscribe_hash=?",Date.now(),Date.now(),await hash(d.token)).run();
  return reply({received:true});
 }
 const identity=await smartQRIdentity(req,env);
 if(!identity)return reply({error:'Sign in required'},401);
 if(!env.SUPPORT_ADMIN_EMAIL||identity.email.toLowerCase()!==env.SUPPORT_ADMIN_EMAIL.toLowerCase())return reply({error:'Forbidden'},403);
 if(action==='stats'&&req.method==='GET'){
  const rows=await q(db,'SELECT status,count(*) AS count FROM smartqr_marketing GROUP BY status').all();
  const sources=await q(db,'SELECT source,count(*) AS count FROM smartqr_marketing GROUP BY source').all();
  return reply({statuses:rows.results,sources:sources.results});
 }
 if(action==='export'&&req.method==='GET'){
  const rows=await q(db,"SELECT email,source,consent_version,confirmed_at FROM smartqr_marketing WHERE status='active' ORDER BY email").all();
  const csv=['email,source,consent_version,confirmed_at',...rows.results.map(r=>[r.email,r.source,r.consent_version,new Date(r.confirmed_at).toISOString()].map(csvCell).join(','))].join('\r\n');
  return new Response(csv,{headers:{...H,'content-type':'text/csv; charset=utf-8','content-disposition':'attachment; filename="smartqr-confirmed-subscribers.csv"'}});
 }
 return reply({error:'Not found'},404);
 }catch(e){if(e instanceof SyntaxError||e.message==='Invalid input'||e.message==='Invalid email')return reply({error:'Invalid input'},400);console.error('Newsletter failure',e.name);return reply({error:'Unable to process request'},500)}
}
// Integration boundary: call only from a trusted outbound-email worker, never from an anonymous browser.
// Raw tokens must be delivered to the mailbox; only hashes persist. No sender is connected in this release.
export async function prepareConfirmation(db,email){
 const confirm=token(),unsubscribe=token(),now=Date.now();
 const row=await q(db,"UPDATE smartqr_marketing SET confirm_hash=?,confirm_expires=?,unsubscribe_hash=?,updated_at=? WHERE email=? AND status='pending' AND (confirm_expires IS NULL OR confirm_expires<=?) RETURNING email",await hash(confirm),now+86400000,await hash(unsubscribe),now,normalizeEmail(email),now).first();
 return row?{email:row.email,confirm,unsubscribe}:null;
}
