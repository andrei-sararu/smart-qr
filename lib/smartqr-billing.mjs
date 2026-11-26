import {smartQRIdentity} from './smartqr-auth.mjs';
import {entitlement,PLANS} from './smartqr-plans.mjs';
const H={'cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'};
const json=(body,status=200)=>Response.json(body,{status,headers:H});
const q=(db,s,...a)=>db.prepare(s).bind(...a);
export function billingProfile(d){
 const field=(k,max,required=true)=>{const v=d?.[k];if(typeof v!=='string'||v.length>max||required&&!v.trim())throw Error('Invalid billing profile');return v.trim()};
 const profile={company:field('company',160),address:field('address',240),city:field('city',100),postal_code:field('postal_code',32,false),country:field('country',2).toUpperCase(),tax_id:field('tax_id',80,false),registration:field('registration',80,false)};
 if(!/^[A-Z]{2}$/.test(profile.country))throw Error('Invalid billing profile');return profile;
}
export async function billingAPI(req,env){
 const db=env.DB,u=new URL(req.url),action=u.pathname.split('/').pop();
 if(!db)return json({error:'Billing unavailable'},503);
 try{
 const user=await smartQRIdentity(req,env);if(!user)return json({error:'Sign in required'},401);
 if(req.method!=='GET'&&(req.headers.get('origin')!==u.origin||req.headers.get('sec-fetch-site')==='cross-site'))return json({error:'Invalid origin'},403);
 if(action==='overview'&&req.method==='GET'){
 const account=await q(db,'SELECT trial_end FROM smartqr_accounts WHERE owner_id=?',user.id).first();
 const profile=await q(db,'SELECT company,address,city,postal_code,country,tax_id,registration FROM smartqr_billing_profiles WHERE owner_id=?',user.id).first();
 return json({profile:profile||null,entitlement:entitlement(account),plans:PLANS,billingReady:false,invoices:[],invoiceStatus:'not_connected'});
 }
 if(action==='profile'&&req.method==='PUT'){
 if(Number(req.headers.get('content-length')||0)>8192)return json({error:'Too large'},413);
 const raw=await req.text();if(raw.length>8192)return json({error:'Too large'},413);
 const p=billingProfile(JSON.parse(raw));
 await q(db,'INSERT INTO smartqr_billing_profiles (owner_id,company,address,city,postal_code,country,tax_id,registration,updated_at) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(owner_id) DO UPDATE SET company=excluded.company,address=excluded.address,city=excluded.city,postal_code=excluded.postal_code,country=excluded.country,tax_id=excluded.tax_id,registration=excluded.registration,updated_at=excluded.updated_at',user.id,p.company,p.address,p.city,p.postal_code,p.country,p.tax_id,p.registration,Date.now()).run();
 return json({profile:p});
 }
 if(['checkout','portal','invoices'].includes(action))return json({error:'SmartQR payment provider is not connected. No payment or invoice has been created.'},503);
 return json({error:'Not found'},404);
 }catch(e){if(e instanceof SyntaxError||e.message==='Invalid billing profile')return json({error:'Invalid billing profile'},400);console.error('SmartQR billing error',e.name);return json({error:'Billing request failed'},500)}
}
