import {PLANS} from './smartqr-plans.mjs';
const q=(db,s,...a)=>db.prepare(s).bind(...a);
export function catalog(env){const prices={};for(const plan of ['Starter','Business','Agency'])for(const interval of ['month','year']){const id=env['SMARTQR_PRICE_'+plan.toUpperCase()+'_'+interval.toUpperCase()];if(!/^price_[A-Za-z0-9]+$/.test(id||'')||prices[id])return null;prices[id]={plan,interval,amount:PLANS[plan].monthly*(interval==='year'?10:1)}}return prices}
export function billingConfigured(env){return env.SMARTQR_BILLING_ENABLED==='true'&&!!env.SMARTQR_STRIPE_SECRET&&!!env.SMARTQR_STRIPE_WEBHOOK_SECRET&&!!catalog(env)&&/^https:\/\/[a-z0-9.-]+$/i.test(env.SMARTQR_PUBLIC_ORIGIN||'')}
export async function stripeRequest(env,path,params=null,idempotency=null){
 const res=await fetch('https://api.stripe.com/v1/'+path,{method:params?'POST':'GET',redirect:'error',headers:{authorization:'Bearer '+env.SMARTQR_STRIPE_SECRET,...(params?{'content-type':'application/x-www-form-urlencoded'}:{}),...(idempotency?{'idempotency-key':idempotency}:{})},...(params?{body:new URLSearchParams(params)}:{})});
 if(!res.ok)throw Error('Stripe provider request failed');return res.json();
}
export function subscriptionEntitlement(sub,prices,customer,now=Date.now()){
 if(!sub||sub.customer!==customer||sub.metadata?.product!=='smartqr'||sub.status!=='active'||sub.items?.data?.length!==1)return null;
 const item=sub.items.data[0],p=item.price,entry=prices?.[p?.id],end=(item.current_period_end||sub.current_period_end||0)*1000;
 if(!entry||p.currency!=='gbp'||p.unit_amount!==entry.amount||p.recurring?.interval!==entry.interval||p.recurring?.interval_count!==1||item.quantity!==1||end<=now)return null;
 return {...entry,end,subscription:sub.id};
}
export async function customerBinding(db,owner){return q(db,'SELECT customer_id FROM smartqr_stripe_customers WHERE owner_id=?',owner).first()}
export async function paidAccess(env,owner){
 if(!billingConfigured(env))return null;
 const binding=await customerBinding(env.DB,owner);if(!binding)return null;
 const list=await stripeRequest(env,'subscriptions?customer='+encodeURIComponent(binding.customer_id)+'&status=active&limit=100');
 const active=list.data.map(s=>subscriptionEntitlement(s,catalog(env),binding.customer_id)).filter(Boolean);
 if(list.has_more||active.length>1)throw Error('Ambiguous subscription; contact support');return active[0]||null;
}
export async function getOrCreateCustomer(env,user,profile){
 const found=await customerBinding(env.DB,user.id);if(found)return found.customer_id;
 const customer=await stripeRequest(env,'customers',{email:user.email,name:profile.company,'address[line1]':profile.address,'address[city]':profile.city,'address[postal_code]':profile.postal_code,'address[country]':profile.country,'metadata[product]':'smartqr','metadata[owner_id]':user.id},'smartqr-customer-'+user.id);
 if(!/^cus_[A-Za-z0-9]+$/.test(customer.id))throw Error('Invalid customer');
 await q(env.DB,'INSERT INTO smartqr_stripe_customers (owner_id,customer_id) VALUES (?,?) ON CONFLICT(owner_id) DO NOTHING',user.id,customer.id).run();
 return (await customerBinding(env.DB,user.id)).customer_id;
}
export async function verifyStripeWebhook(raw,signature,secret,now=Date.now()){
 const parts=signature.split(','),t=parts.find(s=>s.startsWith('t='))?.slice(2);
 if(!/^\d{1,12}$/.test(t||'')||Math.abs(now/1000-Number(t))>300)return false;
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
 for(const s of parts.filter(s=>s.startsWith('v1='))){const hex=s.slice(3);if(!/^[a-f0-9]{64}$/.test(hex))continue;if(await crypto.subtle.verify('HMAC',key,Uint8Array.from(hex.match(/../g),v=>parseInt(v,16)),new TextEncoder().encode(t+'.'+raw)))return true}return false;
}
