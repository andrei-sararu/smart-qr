// Independent OIDC login via a configured managed identity provider.
const enc=new TextEncoder(),dec=new TextDecoder();
const b64=b=>btoa(String.fromCharCode(...new Uint8Array(b))).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
const un64=s=>Uint8Array.from(atob(s.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
const random=()=>b64(crypto.getRandomValues(new Uint8Array(32)));
const cookie=(name,value,maxAge)=>name+'='+value+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age='+maxAge;
const read=(req,name)=>req.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith(name+'='))?.slice(name.length+1);
const key=env=>crypto.subtle.importKey('raw',enc.encode(env.SMARTQR_SESSION_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
const seal=async (env,data)=>{const payload=b64(enc.encode(JSON.stringify(data)));return payload+'.'+b64(await crypto.subtle.sign('HMAC',await key(env),enc.encode(payload)))};
const open=async(env,value)=>{try{if(!value||value.length>4096)return null;const [p,s,...rest]=value.split('.');if(rest.length||!await crypto.subtle.verify('HMAC',await key(env),un64(s),enc.encode(p)))return null;const data=JSON.parse(dec.decode(un64(p)));return Number.isFinite(data.exp)&&data.exp>Date.now()?data:null}catch{return null}};
export function authConfig(env){
 try{const issuer=new URL(env.SMARTQR_OIDC_ISSUER),origin=new URL(env.SMARTQR_PUBLIC_ORIGIN);
 if(issuer.protocol!=='https:'||issuer.username||issuer.password||issuer.search||issuer.hash||origin.protocol!=='https:'||origin.origin!==env.SMARTQR_PUBLIC_ORIGIN||!env.SMARTQR_OIDC_CLIENT_ID||!env.SMARTQR_OIDC_CLIENT_SECRET||typeof env.SMARTQR_SESSION_SECRET!=='string'||env.SMARTQR_SESSION_SECRET.length<43)return null;
 return {issuer:issuer.href.replace(/\/$/,''),origin:origin.origin,client:env.SMARTQR_OIDC_CLIENT_ID,secret:env.SMARTQR_OIDC_CLIENT_SECRET};
 }catch{return null}
}
export async function smartQRIdentity(req,env){if(!authConfig(env))return null;const s=await open(env,read(req,'__Host-smartqr_session'));return s&&typeof s.sub==='string'&&typeof s.email==='string'?{id:'oidc:'+s.sub,email:s.email}:null}
const reply=(body,status=200)=>Response.json(body,{status,headers:{'cache-control':'no-store','referrer-policy':'no-referrer'}});
function redirect(target,cookies=[]){const headers=new Headers({location:target,'cache-control':'no-store','referrer-policy':'no-referrer'});for(const c of cookies)headers.append('set-cookie',c);return new Response(null,{status:303,headers})}
async function discover(c){const r=await fetch(c.issuer+'/.well-known/openid-configuration',{redirect:'error'});if(!r.ok)throw Error('Discovery failed');const d=await r.json();if(d.issuer?.replace(/\/$/,'')!==c.issuer)throw Error('Issuer mismatch');for(const n of ['authorization_endpoint','token_endpoint','userinfo_endpoint']){const u=new URL(d[n]);if(u.protocol!=='https:'||u.origin!==new URL(c.issuer).origin||u.username||u.password)throw Error('Invalid provider endpoint')}return d}
export async function smartQRAuth(req,env){
 const c=authConfig(env),u=new URL(req.url),action=u.pathname.split('/').pop();
 if(action==='session'&&req.method==='GET')return reply({configured:!!c,user:await smartQRIdentity(req,env)});
 if(!c)return reply({error:'Independent sign-in has not been configured'},503);
 if(u.origin!==c.origin)return reply({error:'Use the configured SmartQR domain'},400);
 const callback=c.origin+'/api/smartqr/auth/callback';
 try{
 if(action==='login'&&req.method==='GET'){
 const d=await discover(c),state=random(),verifier=random(),challenge=b64(await crypto.subtle.digest('SHA-256',enc.encode(verifier)));
 const target=new URL(d.authorization_endpoint);target.search=new URLSearchParams({client_id:c.client,response_type:'code',redirect_uri:callback,scope:'openid email profile',state,code_challenge:challenge,code_challenge_method:'S256'}).toString();
 return redirect(target.href,[cookie('__Host-smartqr_flow',await seal(env,{state,verifier,exp:Date.now()+600000}),600)]);
 }
 if(action==='callback'&&req.method==='GET'){
 const f=await open(env,read(req,'__Host-smartqr_flow')),code=u.searchParams.get('code');
 if(!f||!code||u.searchParams.get('state')!==f.state)return reply({error:'Invalid or expired login; restart sign-in'},400);
 const d=await discover(c);
 const tr=await fetch(d.token_endpoint,{method:'POST',redirect:'error',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'authorization_code',client_id:c.client,client_secret:c.secret,code,redirect_uri:callback,code_verifier:f.verifier})});
 if(!tr.ok)throw Error('Token exchange failed');const tokens=await tr.json();if(typeof tokens.access_token!=='string'||tokens.token_type?.toLowerCase()!=='bearer')throw Error('Invalid token');
 // UserInfo is obtained directly from the trusted provider over TLS, never from browser claims.
 const ur=await fetch(d.userinfo_endpoint,{redirect:'error',headers:{authorization:'Bearer '+tokens.access_token}});if(!ur.ok)throw Error('UserInfo failed');const profile=await ur.json();
 if(typeof profile.sub!=='string'||!profile.sub||typeof profile.email!=='string'||profile.email_verified!==true||profile.sub.length>255||profile.email.length>320)throw Error('Verified identity required');
 const sub=b64(await crypto.subtle.digest('SHA-256',enc.encode(c.issuer+'\n'+profile.sub)));
 return redirect('/smartqr',[cookie('__Host-smartqr_flow','',0),cookie('__Host-smartqr_session',await seal(env,{sub,email:profile.email,exp:Date.now()+28800000}),28800)]);
 }
 if(action==='logout'&&req.method==='POST'&&req.headers.get('origin')===u.origin)return redirect('/smartqr',[cookie('__Host-smartqr_session','',0),cookie('__Host-smartqr_flow','',0)]);
 return reply({error:'Not found'},404);
 }catch(e){console.error('SmartQR authentication failed',e.name);return reply({error:'Sign-in failed. Restart sign-in or contact support.'},502)}
}
