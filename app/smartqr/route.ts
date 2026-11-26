import html from '../../ui/smartqr.html?raw';
export const dynamic='force-dynamic';
export async function GET(){return new Response(html,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer','content-security-policy':"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src blob:; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"}})}
