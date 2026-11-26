import {destination} from './smartqr.mjs';
const text=(v,max=200,required=true)=>{if(typeof v!=='string'||v.length>max||required&&!v.trim()||/[\u0000-\u001f\u007f]/.test(v))throw Error('Invalid QR payload');return v.trim()};
const wifiEscape=s=>s.replace(/[\\;,:"]/g,'\\$&');
const cardEscape=s=>s.replace(/[\\;,]/g,'\\$&');
const email=v=>{const s=text(v,254);if(!/^[^\s@?&#]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(s))throw Error('Invalid QR payload');return s};
const phone=v=>{const s=text(v,40).replace(/[ ()-]/g,'');if(!/^\+?[0-9]{5,15}$/.test(s))throw Error('Invalid QR payload');return s};
export function makePayload(d){
 switch(d?.type){
 case 'website':return destination(d.url);
 case 'text':return text(d.value,500);
 case 'email':return 'mailto:'+email(d.email)+'?subject='+encodeURIComponent(text(d.subject??'',120,false));
 case 'phone':return 'tel:'+phone(d.phone);
 case 'whatsapp':return 'https://wa.me/'+phone(d.phone).replace(/^\+/,'')+'?text='+encodeURIComponent(text(d.message??'',200,false));
 case 'wifi':{
 const ssid=text(d.ssid,64),security=d.security;
 if(!['WPA','WEP','nopass'].includes(security))throw Error('Invalid QR payload');
 const password=security==='nopass'?'':text(d.password,128);
 return 'WIFI:T:'+security+';S:'+wifiEscape(ssid)+';P:'+wifiEscape(password)+';H:'+(d.hidden===true?'true':'false')+';;';
 }
 case 'vcard':{
 const name=text(d.name,120),company=text(d.company??'',120,false);
 return ['BEGIN:VCARD','VERSION:3.0','FN:'+cardEscape(name),'N:'+cardEscape(name)+';;;;',company?'ORG:'+cardEscape(company):'',d.email?'EMAIL:'+cardEscape(email(d.email)):'',d.phone?'TEL:'+phone(d.phone):'','END:VCARD'].filter(Boolean).join('\r\n');
 }
 default:throw Error('Invalid QR payload');
 }
}
