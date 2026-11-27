import walkthrough from '../ui/walkthrough.js?raw';
import walkthroughCss from '../ui/walkthrough.styles.txt?raw';
import platform from '../ui/platform.js?raw';
import platformCss from '../ui/platform.styles.txt?raw';
import allergens from '../lib/allergens.json';
import options from '../ui/options.js?raw';
import locales from '../lib/locales.json';
import html from '../ui/index.html?raw';
import live from '../ui/live.js?raw';
import marketing from '../ui/marketing.js?raw';
import marketingCss from '../ui/marketing.styles.txt?raw';
import growth from '../ui/growth.js?raw';
import suite from '../ui/suite.js?raw';
import suiteCss from '../ui/suite.styles.txt?raw';
import growthCss from '../ui/growth.styles.txt?raw';
export const dynamic='force-dynamic';
export async function GET(){return new Response(html.replace('</head>',()=>'<style>'+marketingCss+growthCss+suiteCss+platformCss+walkthroughCss+'</style></head>').replace('</body>',()=>'<script>const LOCALES='+JSON.stringify(locales)+';const UK_ALLERGENS='+JSON.stringify(allergens)+';</script><script>'+live+'</script><script>'+marketing+'</script><script>'+growth+'</script><script>'+suite+'</script><script>'+options+'</script><script>'+platform+'</script><script>'+walkthrough+'</script></body>'),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','Permissions-Policy':'camera=(), microphone=(), geolocation=()'}})}
