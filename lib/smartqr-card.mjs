import {smartQRIdentity} from './smartqr-auth.mjs';
import {destination} from './smartqr.mjs';
const q=(db,s,...a)=>db.prepare(s).bind(...a);
const json=(data,status=200)=>Response.json(data,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'}});
export function cardInput(d){
 const field=(k,max,required=false)=>{const v=d?.[k]??'';if(typeof v!=='string'||v.length>max||required&&!v.trim()||/[\x00-\x1f\x7f]/.test(v))throw Error('Invalid card');return v.trim()};
 const name=field('name',100,true),company=field('company',100),role=field('role',100),email=field('email',254),phone=field('phone',40),website=field('website',500);
 if(email&&!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email))throw Error('Invalid card');
 if(phone&&!/^\+?[0-9 ()-]{5,40}$/.test(phone))throw Error('Invalid card');
 if(typeof d.published!=='boolean'||!Number.isSafeInteger(d.revision)||d.revision<0)throw Error('Invalid card');
 return {name,company,role,email,phone,website:website?destination(website):'',published:d.published,revision:d.revision};
}
export async function cardAPI(req,env){
 const db=env.DB,u=new URL(req.url),p=u.pathname.split('/').filter(Boolean).slice(3);
 if(!db)return json({error:'Cards unavailable'},503);
 try{
 if(p[0]==='public'&&p.length===2&&req.method==='GET'&&/^[a-f0-9]{32}$/.test(p[1])){
 const card=await q(db,'SELECT name,company,role,email,phone,website FROM smartqr_cards WHERE id=? AND published=1',p[1]).first();return card?json({card}):json({error:'Not found'},404);
 }
 const user=await smartQRIdentity(req,env);if(!user)return json({error:'Sign in required'},401);
 if(p[0]!=='mine'||p.length!==1)return json({error:'Not found'},404);
 if(req.method==='GET'){const card=await q(db,'SELECT id,name,company,role,email,phone,website,published,revision FROM smartqr_cards WHERE owner_id=?',user.id).first();return json({card:card||null})}
 if(req.method!=='PUT')return json({error:'Not found'},404);
 if(req.headers.get('origin')!==u.origin||req.headers.get('sec-fetch-site')==='cross-site')return json({error:'Invalid origin'},403);
 const raw=await req.text();if(raw.length>4096)return json({error:'Too large'},413);
 const d=cardInput(JSON.parse(raw)),now=Date.now(),id=crypto.randomUUID().replaceAll('-','');
 const row=await q(db,'INSERT INTO smartqr_cards (id,owner_id,name,company,role,email,phone,website,published,revision,updated_at) SELECT ?,?,?,?,?,?,?,?,?,1,? WHERE ?=0 OR EXISTS (SELECT 1 FROM smartqr_cards WHERE owner_id=?) ON CONFLICT(owner_id) DO UPDATE SET name=excluded.name,company=excluded.company,role=excluded.role,email=excluded.email,phone=excluded.phone,website=excluded.website,published=excluded.published,revision=smartqr_cards.revision+1,updated_at=excluded.updated_at WHERE smartqr_cards.revision=? RETURNING id,revision',id,user.id,d.name,d.company,d.role,d.email,d.phone,d.website,d.published?1:0,now,d.revision,user.id,d.revision).first();
 return row?json(row):json({error:'Record changed; reload and retry'},409);
 }catch(e){if(e instanceof SyntaxError||e.message==='Invalid card'||e.message==='Enter a valid public HTTPS URL.')return json({error:'Invalid card'},400);console.error('Card API failure',e.name);return json({error:'Unable to complete request'},500)}
}
