import {billingConfigured,catalog,paidAccess,customerBinding,getOrCreateCustomer,stripeRequest,verifyStripeWebhook} from './smartqr-stripe.mjs';
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
 if(action==='webhook'&&req.method==='POST'){
  if(!billingConfigured(env))return json({error:'Billing disabled'},503);
  const raw=await req.text();if(raw.length>1000000)return json({error:'Too large'},413);
  if(!await verifyStripeWebhook(raw,req.headers.get('stripe-signature')||'',env.SMARTQR_STRIPE_WEBHOOK_SECRET))return json({error:'Invalid signature'},400);
  const event=JSON.parse(raw);if(!/^evt_[A-Za-z0-9]+$/.test(event.id||''))return json({error:'Invalid event'},400);
  await q(db,'INSERT OR IGNORE INTO webhook_events (id,created_at) VALUES (?,?)','smartqr:'+event.id,Date.now()).run();
  // Access is fetched from Stripe on demand; webhook cannot grant a plan.
  return json({received:true});
 }
 const user=await smartQRIdentity(req,env);if(!user)return json({error:'Sign in required'},401);
 if(req.method!=='GET'&&(req.headers.get('origin')!==u.origin||req.headers.get('sec-fetch-site')==='cross-site'))return json({error:'Invalid origin'},403);
 if(action==='overview'&&req.method==='GET'){
 const account=await q(db,'SELECT trial_end FROM smartqr_accounts WHERE owner_id=?',user.id).first();
 const profile=await q(db,'SELECT company,address,city,postal_code,country,tax_id,registration FROM smartqr_billing_profiles WHERE owner_id=?',user.id).first();
 const ready=billingConfigured(env),paid=ready?await paidAccess(env,user.id):null;
 return json({profile:profile||null,entitlement:paid?{plan:paid.plan,trial:false,limit:PLANS[paid.plan].limit,trialEnd:account?.trial_end??null,paid:true}:entitlement(account),plans:PLANS,billingReady:ready,invoices:[],invoiceStatus:ready?'available':'not_connected'});
 }
 if(action==='profile'&&req.method==='PUT'){
 if(Number(req.headers.get('content-length')||0)>8192)return json({error:'Too large'},413);
 const raw=await req.text();if(raw.length>8192)return json({error:'Too large'},413);
 const p=billingProfile(JSON.parse(raw));
 await q(db,'INSERT INTO smartqr_billing_profiles (owner_id,company,address,city,postal_code,country,tax_id,registration,updated_at) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(owner_id) DO UPDATE SET company=excluded.company,address=excluded.address,city=excluded.city,postal_code=excluded.postal_code,country=excluded.country,tax_id=excluded.tax_id,registration=excluded.registration,updated_at=excluded.updated_at',user.id,p.company,p.address,p.city,p.postal_code,p.country,p.tax_id,p.registration,Date.now()).run();
 return json({profile:p});
 }
 if(['checkout','portal','invoices'].includes(action)){
 if(!billingConfigured(env))return json({error:'SmartQR payment provider is not connected. No payment or invoice has been created.'},503);
 const binding=await customerBinding(db,user.id),origin=env.SMARTQR_PUBLIC_ORIGIN;
 if(action==='invoices'&&req.method==='GET'){
  if(!binding)return json({invoices:[]});
  const list=await stripeRequest(env,'invoices?customer='+encodeURIComponent(binding.customer_id)+'&limit=100');
  return json({invoices:list.data.filter(i=>i.customer===binding.customer_id).map(i=>({number:i.number,status:i.status,total:i.total,currency:i.currency,created:i.created,pdf:i.invoice_pdf?.startsWith('https://')?i.invoice_pdf:null,url:i.hosted_invoice_url?.startsWith('https://')?i.hosted_invoice_url:null})),hasMore:!!list.has_more});
 }
 if(action==='portal'&&req.method==='POST'&&binding){const p=await stripeRequest(env,'billing_portal/sessions',{customer:binding.customer_id,return_url:origin+'/smartqr/account'});return json({url:p.url});}
 if(action==='checkout'&&req.method==='POST'){
  const d=JSON.parse(await req.text()),price=Object.entries(catalog(env)).find(([,x])=>x.plan===d.plan&&x.interval===d.interval)?.[0];if(!price)return json({error:'Invalid plan'},400);
  const profile=await q(db,'SELECT * FROM smartqr_billing_profiles WHERE owner_id=?',user.id).first();if(!profile)return json({error:'Save billing profile first'},400);
  const customer=await getOrCreateCustomer(env,user,profile);
  const existing=await stripeRequest(env,'subscriptions?customer='+encodeURIComponent(customer)+'&status=all&limit=100');
  if(existing.has_more||existing.data.some(s=>!['canceled','incomplete_expired'].includes(s.status)))return json({error:'Manage your existing subscription in the billing portal'},409);
  const open=await stripeRequest(env,'checkout/sessions?customer='+encodeURIComponent(customer)+'&status=open&limit=10');
  if(open.data.length)return json({error:'An open checkout already exists; complete or expire it first'},409);
  const session=await stripeRequest(env,'checkout/sessions',{customer,mode:'subscription','line_items[0][price]':price,'line_items[0][quantity]':'1','subscription_data[metadata][product]':'smartqr','subscription_data[metadata][owner_id]':user.id,'billing_address_collection':'required','tax_id_collection[enabled]':'true','customer_update[address]':'auto','customer_update[name]':'auto','automatic_tax[enabled]':'true',success_url:origin+'/smartqr/account?billing=success',cancel_url:origin+'/smartqr/account?billing=cancel'},'smartqr-checkout-'+user.id+'-'+Math.floor(Date.now()/3600000));
  return json({url:session.url});
 }
 return json({error:'Invalid billing operation'},400);
 }
 return json({error:'Not found'},404);
 }catch(e){if(e instanceof SyntaxError||e.message==='Invalid billing profile')return json({error:'Invalid billing profile'},400);console.error('SmartQR billing error',e.name);return json({error:'Billing request failed'},500)}
}
