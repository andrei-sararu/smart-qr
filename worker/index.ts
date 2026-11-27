import handler from "vinext/server/fetch-handler";
import { runWithConnectorBinding } from "../lib/connector-context";
import type { ConnectorBinding } from "../lib/connector-contract.mjs";

const worker = {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext<{ CONNECTORS?: ConnectorBinding }>) {
    const auth = await localAuth(request, env);
    if (auth instanceof Response) return auth;
    request = auth;
    let binding = ctx.props?.CONNECTORS;
    // Local preview emulates the same request-scoped capability. This branch and
    // the auxiliary service binding are absent from production builds.
    if (import.meta.env.DEV && !binding && env.CONNECTORS) {
      const preview = env.CONNECTORS;
      const expiresAt = Date.now() + 60_000;
      binding = {
        async getContext() {
          if (Date.now() >= expiresAt) return { status: "request_context_expired" };
          return preview.getContext?.() ?? { status: "binding_unavailable" };
        },
        async invoke(connectorId, actionName, args) {
          if (Date.now() >= expiresAt) {
            return { status: "request_context_expired", message: "This request has expired. Please try again." };
          }
          return preview.invoke(connectorId, actionName, args);
        },
      };
    }
    return runWithConnectorBinding(binding, () => handler.fetch(request, env, ctx));
  },
};

export default worker;

async function localAuth(req:Request, env:Cloudflare.Env):Promise<Request|Response>{
 const db=env.DB as D1Database, url=new URL(req.url), h=new Headers(req.headers);
 for(const k of [...h.keys()])if(k.startsWith('oai-authenticated-user-'))h.delete(k);
 const cookie=req.headers.get('cookie')?.match(/(?:^|;\s*)smart_session=([a-f0-9]{64})(?:;|$)/)?.[1];
 const hex=(b:ArrayBuffer|Uint8Array)=>Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,'0')).join('');
 const hash=async(s:string)=>hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));
 const derive=async(p:string,s:string)=>{const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(p),'PBKDF2',false,['deriveBits']);return hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:new TextEncoder().encode(s),iterations:100000},k,256))};
 const response=(body:unknown,status=200,extra:Record<string,string>={})=>Response.json(body,{status,headers:{'cache-control':'no-store',...extra}});
 const authPath=url.pathname==='/api/account';
 const emailConfig=env as Cloudflare.Env & {RESEND_API_KEY?:string; SMART_QR_FROM_EMAIL?:string};
 const emailReady=!!(emailConfig.RESEND_API_KEY&&emailConfig.SMART_QR_FROM_EMAIL);
 const ensureEmailVerification=()=>db.prepare(`CREATE TABLE IF NOT EXISTS smart_email_verification (
  account_id TEXT PRIMARY KEY, token_hash TEXT UNIQUE, expires INTEGER NOT NULL, verified_at INTEGER
 )`).run();
 const sendAccountEmail=async(email:string,subject:string,text:string)=>{
  try{
   const result=await fetch('https://api.resend.com/emails',{
    method:'POST',headers:{'authorization':'Bearer '+emailConfig.RESEND_API_KEY,'content-type':'application/json'},
    body:JSON.stringify({from:emailConfig.SMART_QR_FROM_EMAIL,to:[email],subject,text})
   });
   return result.ok;
  }catch{return false}
 };
 const sendVerification=async(accountId:string,email:string)=>{
  const token=hex(crypto.getRandomValues(new Uint8Array(32)));
  const tokenHash=await hash(token);
  await db.prepare(`INSERT INTO smart_email_verification (account_id,token_hash,expires)
    VALUES (?,?,?) ON CONFLICT(account_id) DO UPDATE SET token_hash=excluded.token_hash,expires=excluded.expires
    WHERE verified_at IS NULL`).bind(accountId,tokenHash,Date.now()+60*60*1000).run();
  const link=new URL('/#verify?token='+token,url.origin).href;
  return sendAccountEmail(email,'Verify your Smart QR email','Open this link to verify your Smart QR email address. It expires in one hour.\n\n'+link);
 };
 if(authPath||cookie){
 await db.prepare('CREATE TABLE IF NOT EXISTS smart_accounts (id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,salt TEXT NOT NULL,password TEXT NOT NULL)').run();
 await ensureEmailVerification();
 await db.prepare('CREATE TABLE IF NOT EXISTS smart_sessions (token TEXT PRIMARY KEY,account_id TEXT NOT NULL,expires INTEGER NOT NULL)').run();
 }
 if(authPath){
 if(req.method!=='POST'||req.headers.get('origin')!==url.origin)return response({error:'Invalid request'},403);
 const data=await req.json().catch(()=>null) as {action?:string,email?:string,password?:string,token?:string}|null;
 if(data?.action==='logout'){if(cookie)await db.prepare('DELETE FROM smart_sessions WHERE token=?').bind(await hash(cookie)).run();return response({ok:true},200,{'set-cookie':'smart_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'})}
 const ip=req.headers.get('cf-connecting-ip')||'unknown',key='auth:'+await hash(ip),now=Date.now();
 await db.prepare('INSERT INTO rate_limits(key,hits,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN expires<? THEN 1 ELSE hits+1 END,expires=CASE WHEN expires<? THEN excluded.expires ELSE expires END').bind(key,now+600000,now,now).run();
 const rate=await db.prepare('SELECT hits FROM rate_limits WHERE key=?').bind(key).first<{hits:number}>();if((rate?.hits||0)>15)return response({error:'Too many attempts. Try again later.'},429);
 if(data?.action==='verify'){
  const token=String(data.token||'');
  if(!/^[a-f0-9]{64}$/.test(token))return response({error:'Invalid verification link.'},400);
  const updated=await db.prepare('UPDATE smart_email_verification SET token_hash=NULL,verified_at=? WHERE token_hash=? AND verified_at IS NULL AND expires>?').bind(now,await hash(token),now).run();
  return updated.meta.changes===1?response({ok:true}):response({error:'This link is invalid or expired. Sign in again to request another email.'},400);
 }
 const email=String(data?.email||'').trim().toLowerCase(),password=String(data?.password||'');
 if(data?.action==='forgot'&&!emailReady)return response({error:'Password recovery is temporarily unavailable.'},503);
 if(data?.action==='forgot'||data?.action==='reset'){
  await db.prepare('CREATE TABLE IF NOT EXISTS smart_password_resets (account_id TEXT PRIMARY KEY, token_hash TEXT UNIQUE NOT NULL, expires INTEGER NOT NULL)').run();
 }
 if(data?.action==='forgot'){
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)return response({error:'Enter a valid email address.'},400);
  const account=await db.prepare('SELECT id FROM smart_accounts WHERE email=?').bind(email).first<{id:string}>();
  if(account){
   const token=hex(crypto.getRandomValues(new Uint8Array(32)));
   const tokenHash=await hash(token);
   const saved=await db.prepare(`INSERT INTO smart_password_resets (account_id,token_hash,expires)
    VALUES (?,?,?) ON CONFLICT(account_id) DO UPDATE SET token_hash=excluded.token_hash,expires=excluded.expires
    WHERE smart_password_resets.expires<?`).bind(account.id,tokenHash,now+1800000,now+1740000).run();
   if(saved.meta.changes){
    const link=new URL('/#reset-password?token='+token,url.origin).href;
    const sent=await sendAccountEmail(email,'Reset your Smart QR password','Open this one-time link to choose a new password. It expires in 30 minutes.\n\n'+link);
    if(!sent)await db.prepare('DELETE FROM smart_password_resets WHERE account_id=? AND token_hash=?').bind(account.id,tokenHash).run();
   }
  }
  return response({ok:true},202);
 }
 if(data?.action==='reset'){
  const token=String(data.token||'');
  if(!/^[a-f0-9]{64}$/.test(token)||password.length<12||password.length>128)return response({error:'Enter a valid reset link and a password of 12–128 characters.'},400);
  const tokenHash=await hash(token);
  const reset=await db.prepare('SELECT account_id FROM smart_password_resets WHERE token_hash=? AND expires>?').bind(tokenHash,now).first<{account_id:string}>();
  if(!reset)return response({error:'This reset link is invalid or expired.'},400);
  const salt=hex(crypto.getRandomValues(new Uint8Array(16)));
  const newPassword=await derive(password,salt);
  const check='EXISTS (SELECT 1 FROM smart_password_resets WHERE account_id=? AND token_hash=? AND expires>?)';
  const current=Date.now();
  const result=await db.batch([
   db.prepare('UPDATE smart_accounts SET salt=?,password=? WHERE id=? AND '+check).bind(salt,newPassword,reset.account_id,reset.account_id,tokenHash,current),
   db.prepare('DELETE FROM smart_sessions WHERE account_id=? AND '+check).bind(reset.account_id,reset.account_id,tokenHash,current),
   db.prepare('DELETE FROM smart_password_resets WHERE account_id=? AND token_hash=? AND expires>?').bind(reset.account_id,tokenHash,current)
  ]);
  return result[0].meta.changes===1?response({ok:true}):response({error:'This reset link is invalid or expired.'},400);
 }
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||password.length<12||password.length>128||!['register','login'].includes(data?.action||''))return response({error:'Enter a valid email and a password of 12–128 characters.'},400);
 let account=await db.prepare('SELECT a.*,v.account_id IS NOT NULL AND v.verified_at IS NULL AS pending FROM smart_accounts a LEFT JOIN smart_email_verification v ON v.account_id=a.id WHERE a.email=?').bind(email).first<{id:string,email:string,salt:string,password:string,pending:number}>();
 if(data?.action==='register'){
  if(account)return response({error:'Unable to create account. Try signing in.'},409);
  const salt=hex(crypto.getRandomValues(new Uint8Array(16))),id=crypto.randomUUID();
  const passwordHash=await derive(password,salt);
  try{
   const insert=db.prepare('INSERT INTO smart_accounts VALUES (?,?,?,?)').bind(id,email,salt,passwordHash);
   if(emailReady)await db.batch([insert,db.prepare('INSERT INTO smart_email_verification (account_id,expires) VALUES (?,0)').bind(id)]);
   else await insert.run();
  }catch{return response({error:'Unable to create account.'},409)}
  account={id,email,salt,password:passwordHash,pending:Number(emailReady)};
 }else{
  const computed=await derive(password,account?.salt||'dummy-salt');
  if(!account||computed!==account.password)return response({error:'Invalid email or password.'},401);
 }
 if(account.pending){
  if(!emailReady)return response({error:'Email verification is temporarily unavailable. Please try again later.'},503);
  const verificationKey='verify:'+account.id;
  const quota=await db.prepare(`INSERT INTO rate_limits(key,hits,expires) VALUES (?,1,?)
    ON CONFLICT(key) DO UPDATE SET expires=excluded.expires WHERE rate_limits.expires<?`).bind(verificationKey,now+60000,now).run();
  if(quota.meta.changes!==1)return response({verificationRequired:true,emailSent:false,retry:true},202);
  return response({verificationRequired:true,emailSent:await sendVerification(account.id,email)},202);
 }
 const token=hex(crypto.getRandomValues(new Uint8Array(32)));
 const session=await db.prepare('INSERT INTO smart_sessions SELECT ?,id,? FROM smart_accounts WHERE id=? AND password=?').bind(await hash(token),now+604800000,account.id,account.password).run();
 if(!session.meta.changes)return response({error:'Sign in again with your current password.'},401);
 return response({ok:true},200,{'set-cookie':'smart_session='+token+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800'});
 }
 if(cookie){const a=await db.prepare('SELECT a.id,a.email FROM smart_sessions s JOIN smart_accounts a ON a.id=s.account_id WHERE s.token=? AND s.expires>?').bind(await hash(cookie),Date.now()).first<{id:string,email:string}>();if(a){h.set('oai-authenticated-user-id',a.id);h.set('oai-authenticated-user-email',a.email)}}
 return new Request(req,{headers:h});
}
