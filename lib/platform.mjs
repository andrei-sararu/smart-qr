import QRCode from 'qrcode';

const schema=[
  'CREATE TABLE IF NOT EXISTS qr_profile_settings (profile TEXT PRIMARY KEY, project TEXT NOT NULL, tags TEXT NOT NULL, expires INTEGER)',
  `CREATE TABLE IF NOT EXISTS qr_profiles (id TEXT PRIMARY KEY, owner TEXT NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL, reference TEXT NOT NULL, location TEXT NOT NULL, mode TEXT NOT NULL, status TEXT NOT NULL, actions TEXT NOT NULL, report INTEGER NOT NULL, revision INTEGER NOT NULL, created INTEGER NOT NULL)`,
  'CREATE INDEX IF NOT EXISTS qr_profiles_owner ON qr_profiles(owner,created)',
  'CREATE TABLE IF NOT EXISTS qr_profile_history (profile TEXT NOT NULL, revision INTEGER NOT NULL, snapshot TEXT NOT NULL, created INTEGER NOT NULL, PRIMARY KEY(profile,revision))',
  'CREATE TABLE IF NOT EXISTS qr_profile_events (profile TEXT NOT NULL, kind TEXT NOT NULL, created INTEGER NOT NULL)',
  'CREATE INDEX IF NOT EXISTS qr_events_profile ON qr_profile_events(profile,created)',
  'CREATE TABLE IF NOT EXISTS qr_profile_reports (id TEXT PRIMARY KEY, profile TEXT NOT NULL, message TEXT NOT NULL, created INTEGER NOT NULL)'
];
const response=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const query=(db,sql,...args)=>db.prepare(sql).bind(...args);
const rows=async(db,sql,...args)=>(await query(db,sql,...args).all()).results||[];
const idPattern=/^[a-f0-9]{32}$/;
class Invalid extends Error {}
function field(value,max,required=false){
  if(typeof value!=='string'||value.trim().length>max||(required&&!value.trim()))throw new Invalid('Check the required fields and length limits.');
  return value.trim();
}
function destination(value){
  const input=field(value,1000,true);
  try{
    const url=new URL(input);
    if(url.protocol!=='https:'||url.username||url.password||!url.hostname.includes('.'))throw Error();
    return url.href;
  }catch{throw new Invalid('Use a public HTTPS link without credentials.')}
}
function profileInput(data){
  const project=field(data?.project??'',80);
  const tags=data?.tags??[];
  if(!Array.isArray(tags)||tags.length>10)throw new Invalid('Use up to ten tags.');
  const uniqueTags=[...new Set(tags.map(tag=>field(tag,35,true)))];
  const expires=data?.expires??null;
  if(expires!==null&&(!Number.isSafeInteger(expires)||expires<=0||expires>4102444800000))throw new Invalid('Choose an expiry before 2100.');

  if(!data||!['profile','dynamic','static'].includes(data.mode)||!['active','paused','archived'].includes(data.status))throw new Invalid('Choose a valid code type and status.');
  if(!Array.isArray(data.actions)||data.actions.length>6||(data.mode==='profile'&&!data.actions.length&&data.report!==true)||(data.mode!=='profile'&&data.actions.length!==1))throw new Invalid('Enter the required destinations (up to six for a profile).');
  return {project,tags:uniqueTags,expires:data.mode==='static'?null:expires,title:field(data.title,100,true),description:field(data.description,700),reference:field(data.reference,80),location:field(data.location,120),mode:data.mode,status:data.mode==='static'?'active':data.status,actions:data.actions.map(action=>({label:field(action?.label,60,true),url:destination(action?.url)})),report:data.mode==='profile'&&data.report===true?1:0};
}
const profileSelect=`SELECT p.*, COALESCE(s.project,'') AS project, COALESCE(s.tags,'[]') AS tags, s.expires FROM qr_profiles p LEFT JOIN qr_profile_settings s ON s.profile=p.id`;
const present=({owner,actions,tags,...item})=>({...item,actions:JSON.parse(actions),tags:JSON.parse(tags)});
async function boundedText(req,max){
  if(!req.body)return '';
  const reader=req.body.getReader(),decoder=new TextDecoder();
  let bytes=0,text='';
  while(true){
    const {done,value}=await reader.read();
    if(done)return text+decoder.decode();
    bytes+=value.length;
    if(bytes>max){await reader.cancel();throw new Invalid('Request too large.')}
    text+=decoder.decode(value,{stream:true});
  }
}
async function payload(req,max=12000){
  const raw=await boundedText(req,max);
  try{return JSON.parse(raw)}catch{throw new Invalid('Invalid request.')}
}
async function quota(db,key,max,span=3600000){
  const now=Date.now();
  const row=await query(db,'INSERT INTO rate_limits (key,hits,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET hits=hits+1 RETURNING hits',key+':'+Math.floor(now/span),now+span).first();
  return row.hits<=max;
}
function event(db,id,kind){
  return query(db,'INSERT INTO qr_profile_events VALUES (?,?,?)',id,kind,Date.now());
}
function htmlEscape(value){
  return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function publicPage(title,body,status=200){
  return new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${htmlEscape(title)} · Cotiso QR</title><style>
  *{box-sizing:border-box}body{margin:0;background:#eef2f5;color:#172536;font:16px/1.6 system-ui}main{width:min(100% - 28px,620px);margin:8vh auto;background:white;padding:clamp(20px,5vw,44px);border-radius:20px}h1{font-size:clamp(26px,6vw,44px);line-height:1.1;overflow-wrap:anywhere}p{white-space:pre-wrap;overflow-wrap:anywhere}small{color:#48596d}form{margin:12px 0}textarea{width:100%;padding:12px;font:inherit;border:1px solid #687e8e;border-radius:8px}button{padding:11px 18px;background:#09574c;color:white;border:0;border-radius:8px;font:inherit;cursor:pointer;text-align:left}
  </style><main><small>Cotiso QR</small><h1>${htmlEscape(title)}</h1>${body}</main></html>`,{status,headers:{'Content-Type':'text/html;charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'same-origin','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self' https:; frame-ancestors 'none'; base-uri 'none'"}});
}
export async function platform(req,db){
  const url=new URL(req.url),path=url.pathname.split('/').filter(Boolean);
  const isPublic=path[0]==='q';
  const owner=req.headers.get('oai-authenticated-user-id');
  if(!isPublic&&!owner)return response({error:'Sign in to manage your QR codes.'},401);
  if(req.method!=='GET'&&req.headers.get('origin')!==url.origin)return response({error:'Invalid request origin.'},403);
  try{
    await db.batch(schema.map(sql=>db.prepare(sql)));
    if(isPublic){
      const [,id,action,index]=path;
      if(!idPattern.test(id||'')||path.length>4)return publicPage('Code unavailable','',404);
      const item=await query(db,profileSelect+' WHERE p.id=?',id).first();
      if(!item||item.mode==='static'||item.status!=='active'||(item.expires!==null&&item.expires<=Date.now()))return publicPage('Code unavailable','<p>This touchpoint is currently unavailable.</p>',404);
      const profile=present(item);
      const safe=value=>{try{return destination(value)}catch{return null}};
      const rateKey='platform-guest:'+id+':'+(req.headers.get('cf-connecting-ip')||'unknown');
      if(req.method==='GET'&&!action){
        if(await quota(db,rateKey+':scan',60))await event(db,id,'scan').run();
        if(profile.mode==='dynamic'){
          const target=safe(profile.actions[0]?.url);
          return target?new Response(null,{status:302,headers:{Location:target,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}}):publicPage('Destination unavailable','',404);
        }
        const actions=profile.actions.map((link,n)=>`<form method="post" action="/q/${id}/go/${n}?v=${profile.revision}"><button>${htmlEscape(link.label)}</button></form>`).join('');
        const report=profile.report?`<form method="post" action="/q/${id}/report"><button>Report an issue</button></form>`:'';
        return publicPage(profile.title,`<small>${htmlEscape([profile.reference,profile.location].filter(Boolean).join(' · '))}</small><p>${htmlEscape(profile.description)}</p>${actions}${report}`);
      }
      if(req.method==='POST'&&profile.mode==='profile'){
        if(!await quota(db,rateKey+':action',30))return publicPage('Try again later','',429);
        if(action==='go'&&/^\d$/.test(index||'')){
          if(url.searchParams.get('v')!==String(profile.revision))return publicPage('Profile updated','<p>Open the QR code again to view its current actions.</p>',409);
          const target=safe(profile.actions[Number(index)]?.url);
          if(!target)return publicPage('Destination unavailable','',404);
          await event(db,id,'action').run();
          return new Response(null,{status:303,headers:{Location:target,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
        }
        if(action==='report'&&!index&&profile.report){
          await db.batch([event(db,id,'action'),event(db,id,'start')]);
          return publicPage('Report an issue',`<p>${htmlEscape(profile.title)}</p><form method="post" action="/q/${id}/submit"><label>What happened?<textarea name="message" required maxlength="1500" rows="5"></textarea></label><p>Please leave out personal or sensitive details.</p><button>Send report</button></form>`);
        }
        if(action==='submit'&&!index&&profile.report){
          const body=await boundedText(req,10000);
          const message=field(new URLSearchParams(body).get('message'),1500,true);
          const receipt=crypto.randomUUID();
          await db.batch([query(db,'INSERT INTO qr_profile_reports VALUES (?,?,?,?)',receipt,id,message,Date.now()),event(db,id,'complete')]);
          return new Response(null,{status:303,headers:{Location:'/q/'+id+'/received','Cache-Control':'no-store'}});
        }
      }
      if(req.method==='GET'&&action==='received'&&!index&&profile.report)return publicPage('Report received','<p>Your report has been saved for the team.</p>');
      return publicPage('Page unavailable','',404);
    }
    if(req.method==='POST'&&path.length===3&&path[2]==='import'){
      if(!await quota(db,'platform-import:'+owner,20))return response({error:'Too many imports. Try again later.'},429);
      const data=await payload(req,250000);
      if(data?.version!==1||!Array.isArray(data.codes)||!data.codes.length||data.codes.length>25)throw new Invalid('Use a Cotiso QR version 1 export with 1–25 codes.');
      const codes=data.codes.map((code,index)=>{
        try{
          if(!code||typeof code!=='object'||Array.isArray(code))throw new Invalid('Invalid code.');
          return profileInput({...code,status:code.mode==='static'?'active':'paused',expires:null,report:code.report===true||code.report===1});
        }catch(error){
          if(error instanceof Invalid)throw new Invalid('Code '+(index+1)+': '+error.message);
          throw error;
        }
      });
      const ids=codes.map(()=>crypto.randomUUID().replaceAll('-',''));
      const now=Date.now();
      const statements=codes.flatMap((code,index)=>{
        const id=ids[index];
        const guard=index?'EXISTS (SELECT 1 FROM qr_profiles WHERE id=? AND owner=?)':'(SELECT COUNT(*) FROM qr_profiles WHERE owner=?)+?<=25';
        const guardArgs=index?[ids[0],owner]:[owner,codes.length];
        return [
          query(db,'INSERT INTO qr_profiles SELECT ?,?,?,?,?,?,?,?,?,?,?,? WHERE '+guard,id,owner,code.title,code.description,code.reference,code.location,code.mode,code.status,JSON.stringify(code.actions),code.report,1,now,...guardArgs),
          query(db,'INSERT INTO qr_profile_settings SELECT ?,?,?,? WHERE EXISTS (SELECT 1 FROM qr_profiles WHERE id=? AND owner=?)',id,code.project,JSON.stringify(code.tags),code.expires,id,owner),
          query(db,'INSERT INTO qr_profile_history SELECT ?,?,?,? WHERE EXISTS (SELECT 1 FROM qr_profiles WHERE id=? AND owner=?)',id,1,JSON.stringify(code),now,id,owner)
        ];
      });
      const results=await db.batch(statements);
      if(!results[0].meta.changes)return response({error:'The batch exceeds the workspace limit of 25 codes. Import a smaller batch.'},409);
      return response({ids},201);
    }
    const id=path[2],action=path[3];
    if(path.length>4)return response({error:'Unknown platform action.'},404);
    if(req.method==='GET'&&!id){
      const profiles=await rows(db,profileSelect+' WHERE p.owner=? ORDER BY p.created DESC',owner);
      const since=Date.now()-30*86400000;
      const events=await rows(db,`SELECT e.profile,e.kind,strftime('%Y-%m-%d',e.created/1000,'unixepoch') AS day,COUNT(*) AS total
        FROM qr_profile_events e JOIN qr_profiles p ON p.id=e.profile WHERE p.owner=? AND e.created>=? GROUP BY e.profile,e.kind,day ORDER BY day`,owner,since);
      const reports=await rows(db,`SELECT r.id,r.message,r.created,p.title,p.reference,p.location FROM qr_profile_reports r JOIN qr_profiles p ON p.id=r.profile WHERE p.owner=? ORDER BY r.created DESC LIMIT 100`,owner);
      return response({profiles:profiles.map(present),events,reports});
    }
    const existing=id&&idPattern.test(id)?await query(db,profileSelect+' WHERE p.id=? AND p.owner=?',id,owner).first():null;
    if(id&&!existing)return response({error:'Code not found.'},404);
    if(req.method==='GET'&&action==='history')return response({history:(await rows(db,'SELECT revision,snapshot,created FROM qr_profile_history WHERE profile=? ORDER BY revision DESC LIMIT 30',id)).map(({snapshot,...row})=>({...row,profile:JSON.parse(snapshot)}))});
    if(req.method==='GET'&&['png','svg'].includes(action)){
      const item=present(existing);
      const target=item.mode==='static'?destination(item.actions[0]?.url):new URL('/q/'+id,url.origin).href;
      const opts={width:600,margin:4,errorCorrectionLevel:'M'};
      const image=action==='svg'?await QRCode.toString(target,{...opts,type:'svg'}):Uint8Array.from(atob((await QRCode.toDataURL(target,opts)).split(',')[1]),c=>c.charCodeAt(0));
      return new Response(image,{headers:{'Content-Type':action==='svg'?'image/svg+xml':'image/png','Content-Disposition':'attachment; filename="cotiso-'+id+'.'+action+'"','Cache-Control':'no-store'}});
    }
    if((req.method==='POST'&&!id)||(req.method==='PUT'&&existing&&!action)){
      if(!await quota(db,'platform-edit:'+owner,80))return response({error:'Too many changes. Try again later.'},429);
      const data=await payload(req),input=profileInput(data),now=Date.now();
      if(existing&&existing.revision!==data.revision)return response({error:'This code changed. Reload before saving.'},409);
      if(existing&&(existing.mode!==input.mode||(existing.mode==='static'&&present(existing).actions[0].url!==input.actions[0].url)))throw new Invalid('A printed static code has a fixed destination. Create a new code.');
      const key=id||crypto.randomUUID().replaceAll('-',''),revision=existing?existing.revision+1:1;
      const values=[input.title,input.description,input.reference,input.location,input.mode,input.status,JSON.stringify(input.actions),input.report,revision];
      const change=existing?query(db,'UPDATE qr_profiles SET title=?,description=?,reference=?,location=?,mode=?,status=?,actions=?,report=?,revision=? WHERE id=? AND owner=? AND revision=?',...values,key,owner,data.revision):query(db,'INSERT INTO qr_profiles SELECT ?,?,?,?,?,?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM qr_profiles WHERE owner=?)<25',key,owner,...values,now,owner);
      const history=query(db,'INSERT OR IGNORE INTO qr_profile_history SELECT ?,?,?,? WHERE EXISTS (SELECT 1 FROM qr_profiles WHERE id=? AND owner=? AND revision=?)',key,revision,JSON.stringify(input),now,key,owner,revision);
      const settings=query(db,`INSERT INTO qr_profile_settings (profile,project,tags,expires)
        SELECT ?,?,?,? WHERE changes()=1
        ON CONFLICT(profile) DO UPDATE SET project=excluded.project,tags=excluded.tags,expires=excluded.expires`,key,input.project,JSON.stringify(input.tags),input.expires);
      const result=await db.batch([change,settings,history]);
      if(!result[0].meta.changes)return response({error:existing?'This code changed. Reload before saving.':'This release supports up to 25 codes per account.'},409);
      return response({id:key,revision},existing?200:201);
    }
    return response({error:'Unknown platform action.'},404);
  }catch(error){
    if(error instanceof Invalid)return isPublic?publicPage('Check your submission','<p>'+htmlEscape(error.message)+'</p>',400):response({error:error.message},400);
    console.error('Cotiso platform request failed',error.name);
    return isPublic?publicPage('Temporarily unavailable','',503):response({error:'Platform temporarily unavailable.'},503);
  }
}
