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
 if(authPath||cookie){
 await db.prepare('CREATE TABLE IF NOT EXISTS smart_accounts (id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,salt TEXT NOT NULL,password TEXT NOT NULL)').run();
 await db.prepare('CREATE TABLE IF NOT EXISTS smart_sessions (token TEXT PRIMARY KEY,account_id TEXT NOT NULL,expires INTEGER NOT NULL)').run();
 }
 if(authPath){
 if(req.method!=='POST'||req.headers.get('origin')!==url.origin)return response({error:'Invalid request'},403);
 const data=await req.json().catch(()=>null) as {action?:string,email?:string,password?:string}|null;
 if(data?.action==='logout'){if(cookie)await db.prepare('DELETE FROM smart_sessions WHERE token=?').bind(await hash(cookie)).run();return response({ok:true},200,{'set-cookie':'smart_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'})}
 const email=String(data?.email||'').trim().toLowerCase(),password=String(data?.password||'');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||password.length<12||password.length>128||!['register','login'].includes(data?.action||''))return response({error:'Enter a valid email and a password of 12–128 characters.'},400);
 const ip=req.headers.get('cf-connecting-ip')||'unknown',key='auth:'+await hash(ip),now=Date.now();
 await db.prepare('INSERT INTO rate_limits(key,hits,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN expires<? THEN 1 ELSE hits+1 END,expires=CASE WHEN expires<? THEN excluded.expires ELSE expires END').bind(key,now+600000,now,now).run();
 const rate=await db.prepare('SELECT hits FROM rate_limits WHERE key=?').bind(key).first<{hits:number}>();if((rate?.hits||0)>15)return response({error:'Too many attempts. Try again later.'},429);
 let account=await db.prepare('SELECT * FROM smart_accounts WHERE email=?').bind(email).first<{id:string,email:string,salt:string,password:string}>();
 if(data?.action==='register'){if(account)return response({error:'Unable to create account. Try signing in.'},409);const salt=hex(crypto.getRandomValues(new Uint8Array(16))),id=crypto.randomUUID();try{await db.prepare('INSERT INTO smart_accounts VALUES (?,?,?,?)').bind(id,email,salt,await derive(password,salt)).run()}catch{return response({error:'Unable to create account.'},409)}account={id,email,salt,password:''}}
 else {const computed=await derive(password,account?.salt||'dummy-salt');if(!account||computed!==account.password)return response({error:'Invalid email or password.'},401)}
 const token=hex(crypto.getRandomValues(new Uint8Array(32)));await db.prepare('INSERT INTO smart_sessions VALUES (?,?,?)').bind(await hash(token),account.id,now+604800000).run();return response({ok:true},200,{'set-cookie':'smart_session='+token+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800'});
 }
 if(cookie){const a=await db.prepare('SELECT a.id,a.email FROM smart_sessions s JOIN smart_accounts a ON a.id=s.account_id WHERE s.token=? AND s.expires>?').bind(await hash(cookie),Date.now()).first<{id:string,email:string}>();if(a){h.set('oai-authenticated-user-id',a.id);h.set('oai-authenticated-user-email',a.email)}}
 return new Request(req,{headers:h});
}
