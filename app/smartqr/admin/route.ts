import {env} from 'cloudflare:workers';
import {crmIdentity} from '../../../lib/smartqr-crm.mjs';
import html from '../../../ui/smartqr-admin.html?raw';
export const dynamic='force-dynamic';
export async function GET(req:Request){const headers={'cache-control':'no-store','content-type':'text/html; charset=utf-8','x-content-type-options':'nosniff','referrer-policy':'no-referrer','content-security-policy':"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"};if(!env.DB||!await crmIdentity(req,env))return new Response('<h1>Administrative access required</h1><p><a href="/api/smartqr/auth/login">Sign in to SmartQR</a>, then return to this page.</p>',{status:403,headers});return new Response(html,{headers});}
