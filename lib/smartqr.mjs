import {recordHit} from './smartqr-safety.mjs';
import {paidAccess} from './smartqr-stripe.mjs';
import {PLANS} from './smartqr-plans.mjs';
import {entitlement,TRIAL_MS,qrOptions} from './smartqr-plans.mjs';
import {smartQRAuth,smartQRIdentity} from './smartqr-auth.mjs';
const headers={'cache-control':'no-store','referrer-policy':'no-referrer','x-content-type-options':'nosniff'};
const json=(data,status=200)=>Response.json(data,{status,headers});
export function destination(value){
 if(typeof value!=='string'||value.length>2000)throw Error('Enter a valid public HTTPS URL.');
 const u=new URL(value.trim());
 if(u.protocol!=='https:'||u.username||u.password||u.port||!/^([a-z0-9-]+\.)+[a-z][a-z0-9-]*$/i.test(u.hostname)||/\.(local|localhost|internal|test|invalid|example|onion)$/i.test(u.hostname))throw Error('Enter a valid public HTTPS URL.');
 return u.href;
}
const query=(db,s,...a)=>db.prepare(s).bind(...a);
const codePattern=/^[a-f0-9]{32}$/;
export async function smartQR(req,env,renderQR){
 const url=new URL(req.url),p=url.pathname.split('/').filter(Boolean).slice(2),method=req.method;
 try{
 if(p[0]==='static'&&p.length===1&&method==='POST'){
  if(req.headers.get('origin')!==url.origin)return json({error:'Invalid origin'},403);
  const raw=await req.text();if(raw.length>4096)return json({error:'Too long'},413);
  const data=JSON.parse(raw),target=destination(data.url);
  return new Response(await renderQR(target,qrOptions(data)),{headers:{...headers,'content-type':'image/svg+xml'}});
 }
 if(p[0]==='auth'&&p.length===2)return smartQRAuth(req,env);
 if(!env.DB)return json({error:'Database unavailable'},503);
 const db=env.DB;
 if(p[0]==='r'&&p.length===2&&method==='GET'&&codePattern.test(p[1])){
  const row=await query(db,'UPDATE smartqr_links SET scans=scans+1 WHERE id=? AND enabled=1 AND NOT EXISTS (SELECT 1 FROM smartqr_blocks WHERE link_id=smartqr_links.id) RETURNING destination',p[1]).first();
  if(!row)return json({error:'QR unavailable'},404);
  try{await recordHit(db,p[1],req)}catch(e){console.error('Scan aggregation failed',e.name)}
  // Revalidate stored destinations. No external URL is fetched by the server.
  return new Response(null,{status:302,headers:{...headers,location:destination(row.destination)}});
 }
 const identity=await smartQRIdentity(req,env);
 const owner=identity?.id,email=identity?.email;
 if(!owner||!email)return json({error:'Sign in required'},401);
 if((env.SMARTQR_PUBLIC_DYNAMIC!=='true'||env.SMARTQR_SAFETY_APPROVED!=='true')&&(!env.SUPPORT_ADMIN_EMAIL||email.toLowerCase()!==env.SUPPORT_ADMIN_EMAIL.toLowerCase()))return json({error:'Dynamic QR is currently an operator-only beta'},403);
 if(method!=='GET'&&(req.headers.get('origin')!==url.origin||req.headers.get('sec-fetch-site')==='cross-site'))return json({error:'Invalid origin'},403);
 const accessFor=async account=>{const paid=await paidAccess(env,owner);return paid?{plan:paid.plan,limit:PLANS[paid.plan].limit,trial:false,paid:true,trialEnd:account?.trial_end??null}:entitlement(account)};
 if(p[0]==='trial'&&p.length===1){
  if(method==='POST'){const now=Date.now();await query(db,'INSERT INTO smartqr_accounts (owner_id,trial_end,created_at) VALUES (?,?,?) ON CONFLICT(owner_id) DO NOTHING',owner,now+TRIAL_MS,now).run();}
  if(method==='GET'||method==='POST'){const account=await query(db,'SELECT trial_end FROM smartqr_accounts WHERE owner_id=?',owner).first();return json({entitlement:await accessFor(account)});}
 }
 if(p[0]!=='links')return json({error:'Not found'},404);
 if(p.length===1&&method==='GET'){
  const rows=await query(db,'SELECT id,label,destination,enabled,scans,revision FROM smartqr_links WHERE owner_id=? ORDER BY created_at DESC',owner).all();
  return json({links:rows.results});
 }
 if(p.length===3&&p[2]==='svg'&&method==='GET'&&codePattern.test(p[1])){
  const row=await query(db,'SELECT id FROM smartqr_links WHERE owner_id=? AND id=?',owner,p[1]).first();
  if(!row)return json({error:'Not found'},404);
  return new Response(await renderQR((env.SMARTQR_PUBLIC_ORIGIN||url.origin)+'/api/smartqr/r/'+row.id),{headers:{...headers,'content-type':'image/svg+xml'}});
 }
 if(!((method==='POST'&&p.length===1)||(method==='PATCH'&&p.length===2&&codePattern.test(p[1]))))return json({error:'Not found'},404);
 const raw=await req.text();if(raw.length>4096)return json({error:'Too long'},413);
 const data=JSON.parse(raw),label=typeof data.label==='string'?data.label.trim():'';
 if(!label||label.length>100)return json({error:'Label must contain 1–100 characters'},400);
 const target=destination(data.destination);
 if(method==='POST'){
  const account=await query(db,'SELECT trial_end FROM smartqr_accounts WHERE owner_id=?',owner).first();
  const access=await accessFor(account);
  if(!access.limit)return json({error:'Start an eligible free trial first'},403);
  const id=crypto.randomUUID().replaceAll('-','');
  const row=await query(db,'INSERT INTO smartqr_links (id,owner_id,label,destination,enabled,scans,revision,created_at) SELECT ?,?,?,?,1,0,0,? WHERE (SELECT count(*) FROM smartqr_links WHERE owner_id=?)<? RETURNING id',id,owner,label,target,Date.now(),owner,access.limit).first();
  return row?json({id},201):json({error:'Trial code limit reached'},409);
 }
 const account=await query(db,'SELECT trial_end FROM smartqr_accounts WHERE owner_id=?',owner).first();
 if(!(await accessFor(account)).limit){
  if(data.enabled!==false||!Number.isSafeInteger(data.revision)||data.revision<0)return json({error:'Trial expired; disabling is still available'},403);
  const disabled=await query(db,'UPDATE smartqr_links SET enabled=0,revision=revision+1 WHERE id=? AND owner_id=? AND revision=? RETURNING id',p[1],owner,data.revision).first();
  return disabled?json({id:disabled.id}):json({error:'Not found or stale revision; refresh'},409);
 }
 if(typeof data.enabled!=='boolean'||!Number.isSafeInteger(data.revision)||data.revision<0)return json({error:'Invalid revision or status'},400);
 const row=await query(db,'UPDATE smartqr_links SET label=?,destination=?,enabled=?,revision=revision+1 WHERE id=? AND owner_id=? AND revision=? RETURNING id',label,target,data.enabled?1:0,p[1],owner,data.revision).first();
 return row?json({id:row.id}):json({error:'Not found or stale revision; refresh'},409);
 }catch(e){if(e instanceof SyntaxError||e instanceof TypeError||(e.message==='Enter a valid public HTTPS URL.'||e.message==='Invalid QR appearance'))return json({error:'Invalid input or URL'},400);console.error('SmartQR request failed',e.name);return json({error:'Unable to complete request'},500)}
}
