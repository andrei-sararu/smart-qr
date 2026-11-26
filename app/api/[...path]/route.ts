import {makePayload} from '../../../lib/smartqr-payloads.mjs';
import {qrOptions} from '../../../lib/smartqr-plans.mjs';
import {supportAPI} from '../../../lib/smartqr-support.mjs';
import {billingAPI} from '../../../lib/smartqr-billing.mjs';
import {crmAPI} from '../../../lib/smartqr-crm.mjs';
import {marketingAPI} from '../../../lib/smartqr-marketing.mjs';
import { env } from 'cloudflare:workers';
import { handleAPI } from '../../../lib/backend.mjs';
import { smartQR } from '../../../lib/smartqr.mjs';
import QRCode from 'qrcode';
export const dynamic='force-dynamic';
export async function GET(req:Request){
 const url=new URL(req.url);
 if(url.pathname==='/api/smartqr/tools/generate'&&req.method==='POST'){
  if(req.headers.get('origin')!==url.origin||req.headers.get('sec-fetch-site')==='cross-site')return Response.json({error:'Invalid origin'},{status:403});
  try{
   const raw=await req.text();if(raw.length>4096)return Response.json({error:'Too large'},{status:413});
   const data=JSON.parse(raw);if(data.type==='wifi')return Response.json({error:'Wi-Fi QR requires local generation'},{status:400});const payload=makePayload(data),options=qrOptions(data);
   const svg=await QRCode.toString(payload,{type:'svg',...options});
   return new Response(svg,{headers:{'content-type':'image/svg+xml','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'}});
  }catch{return Response.json({error:'Invalid QR content or appearance'},{status:400,headers:{'cache-control':'no-store'}})}
 }
 if(url.pathname.startsWith('/api/smartqr/support/'))return supportAPI(req,env);
 if(url.pathname.startsWith('/api/smartqr/billing/'))return billingAPI(req,env);
 if(url.pathname.startsWith('/api/smartqr/crm/'))return crmAPI(req,env);
 if(/^\/api\/smartqr\/marketing\/(subscribe|confirm|unsubscribe|stats|export)$/.test(url.pathname))return marketingAPI(req,env);
 if(url.pathname.startsWith('/api/smartqr/'))return smartQR(req,env,(target:string,options?:Record<string,unknown>)=>QRCode.toString(target,{type:'svg',width:512,margin:4,errorCorrectionLevel:'M',...options}));
 if(url.pathname==='/api/qr'&&req.method==='GET'){
  const slug=url.searchParams.get('r')||'',token=url.searchParams.get('t')||'';
  if(!/^[a-z0-9-]{1,80}$/.test(slug)||token&&!/^[a-f0-9-]{36}$/.test(token))return new Response('Invalid menu or table',{status:400});
  const target=new URL('/',url.origin);target.searchParams.set('r',slug);if(token)target.searchParams.set('t',token);target.hash='menu';
  const svg=await QRCode.toString(target.href,{type:'svg',width:350,margin:3,errorCorrectionLevel:'M'});
  return new Response(svg,{headers:{'content-type':'image/svg+xml','content-disposition':'inline; filename="tablemint-qr.svg"','cache-control':'public,max-age=3600','x-content-type-options':'nosniff'}});
 }
 return handleAPI(req,env);
}
export const POST=GET;
export const PUT=GET;
export const PATCH=GET;
