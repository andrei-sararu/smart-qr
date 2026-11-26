import { env } from 'cloudflare:workers';
import { handleAPI } from '../../../lib/backend.mjs';
import { smartQR } from '../../../lib/smartqr.mjs';
import QRCode from 'qrcode';
export const dynamic='force-dynamic';
export async function GET(req:Request){
 const url=new URL(req.url);
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
