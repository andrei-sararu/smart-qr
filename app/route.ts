import locales from '../lib/locales.json';
import html from '../ui/index.html?raw';
import live from '../ui/live.js?raw';
import marketing from '../ui/marketing.js?raw';
import marketingCss from '../ui/marketing.styles.txt?raw';
import growth from '../ui/growth.js?raw';
import growthCss from '../ui/growth.styles.txt?raw';
export const dynamic='force-dynamic';
export async function GET(){return new Response(html.replace('</head>','<style>'+marketingCss+growthCss+'</style></head>').replace('</body>','<script>const LOCALES='+JSON.stringify(locales)+';</script><script>'+live+'</script><script>'+marketing+'</script><script>'+growth+'</script></body>'),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','Permissions-Policy':'camera=(), microphone=(), geolocation=()'}})}
