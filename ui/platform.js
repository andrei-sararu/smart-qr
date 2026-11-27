const platformHospitality=home;
let companyRecord=null,companyError='',companyPending=false;
let selectedProject='',platformSearch='';
let platformData=null,platformError='',platformPending=false;
const useCases=[
  ['Asset management','Equipment label','Asset profile and maintenance instructions','Report a fault','Fault reports per asset'],
  ['Property & housing','Building or unit sign','Property profile with repair and safety links','Report a repair','Repair reports per location'],
  ['Field service','Machine or service point','Service instructions and support links','Request service','Requests by service point'],
  ['Retail & packaging','Product packaging','Product information and warranty links','Open warranty registration','Registration link selections'],
  ['Hospitality','Table card','Digital menu and table service','Request service','Service requests by table'],
  ['Marketing','Printed campaign','Campaign landing page and interest form','Submit interest','Form submissions by campaign']
];
home=function(){
  if(view==='hospitality')return platformHospitality();
  return `<main class="cotiso-home">
    <section class="cotiso-hero"><div class="wrap cotiso-hero-grid">
      <div><p class="cotiso-kicker">QR infrastructure for business operations</p><h1>Turn every physical touchpoint into a digital workflow.</h1>
      <p>Give equipment, properties and products a persistent digital identity. Change what a printed QR code opens, collect reports and measure what people do after they scan.</p>
      <div class="actions"><a class="btn primary" href="/#platform">Start free</a><a class="btn" href="/#platform-demo">See how it works</a></div></div>
      <div class="cotiso-preview"><p class="cotiso-kicker">Example Smart QR profile</p><h2>Boiler B1024</h2><p>Plant room · Riverside House</p><ol><li><strong>Scan</strong> the label on the boiler.</li><li><strong>Open</strong> its instructions or issue form.</li><li><strong>Submit</strong> a report linked to B1024.</li><li><strong>Measure</strong> visits, actions and submitted reports.</li></ol></div>
    </div></section>
    <section class="wrap cotiso-use-cases"><h2>One platform for the places and things you manage</h2>
    <div class="cotiso-cases">${useCases.map(([title,object,experience,action,outcome])=>`<article><h3>${esc(title)}</h3><dl><dt>Scan</dt><dd>${esc(object)}</dd><dt>Experience</dt><dd>${esc(experience)}</dd><dt>Action</dt><dd>${esc(action)}</dd><dt>Measure</dt><dd>${esc(outcome)}</dd></dl>${title==='Hospitality'?'<a class="btn small" href="/#hospitality">Explore hospitality</a>':''}</article>`).join('')}</div>
    <div class="quick-start"><div><h2>Create your first Smart QR profile</h2><p class="muted">The platform release supports up to 25 codes per account.</p></div><a class="btn primary" href="/#platform">Open workspace</a></div></section><footer class="wrap cotiso-footer"><a href="/#home">Cotiso QR</a><a href="/#hospitality">Hospitality</a><a href="/#contact">Contact</a><a href="/#privacy">Privacy</a></footer>
  </main>`;
};
const platformHeader=header;
header=function(){
  if(!['home','platform','platform-demo'].includes(view))return platformHeader();
  return `<div class="wrap"><header class="cotiso-header"><a class="brand" href="/#home"><img class="brand-icon" src="/favicon.svg?v=2" width="36" height="36" alt="">Cotiso QR</a><nav class="nav" aria-label="Main navigation"><a href="/#hospitality">Hospitality</a><a class="btn primary small" href="/#platform">${session?'Workspace':'Start free'}</a></nav></header></div>`;
};
function platformDemo(){
  return `<main class="wrap cotiso-workspace"><a class="breadcrumb" href="/#home">Home</a><h1>From boiler label to repair report</h1><p>Example asset · B1024 · Riverside House</p>
  <details class="card"><summary>View example instructions</summary><p>Check the equipment label and contact your maintenance team if the unit displays a fault.</p></details>
  <details class="card"><summary>Preview the issue form</summary><p>A visitor describes the issue. In a published profile, their report is saved to the owner’s inbox with the asset reference and location.</p><p>This example does not collect or send reports.</p></details>
  <p><a class="btn primary" href="/#platform">Create a real profile</a></p></main>`;
}
async function loadPlatform(){
  if(!session||platformPending)return;
  platformPending=true;
  try{platformData=await api('platform');platformError=''}catch(error){platformError=error.message}
  finally{platformPending=false;if(view==='platform')render()}
}
const platformSections={overview:'Overview',codes:'QR codes',reports:'Reports',analytics:'Analytics',help:'Getting started',company:'Company & billing'};
function platformSection(){
  const value=new URLSearchParams(location.hash.split('?')[1]).get('tab');
  return Object.hasOwn(platformSections,value)?value:'overview';
}
function platformWorkspace(){
  if(!session)return accountForm().replace('Sign in to Smart QR','Sign in to Cotiso QR').replace('Manage your restaurant and digital menus.','Create and manage QR codes, profiles and reports.');
  if(platformError)return `<main class="wrap cotiso-workspace"><h1>QR workspace</h1><p role="alert">${esc(platformError)}</p><button class="btn" onclick="loadPlatform()">Retry</button></main>`;
  if(!platformData)return '<main class="wrap cotiso-workspace"><h1>QR workspace</h1><p>Loading workspace…</p></main>';
  const {profiles,events,reports}=platformData;
  const section=platformSection();
  const steps=`<ol class="cotiso-steps">
    <li><strong>Choose what the scan opens.</strong> Pick a Smart QR profile for instructions and issue reports, a dynamic link for an address you may change, or a static link for a fixed address.</li>
    <li><strong>Save and test.</strong> For a profile or dynamic link, set the status to Active and use Open to check what a visitor sees.</li>
    <li><strong>Print the code.</strong> Use PNG for everyday printing or SVG for print layouts. With an active profile and its issue form enabled, submissions appear in Reports.</li>
  </ol>`;
  const projects=[...new Set(profiles.map(item=>item.project).filter(Boolean))].sort();
  const term=platformSearch.trim().toLowerCase();
  const visible=profiles.filter(item=>(!selectedProject||item.project===selectedProject)&&[item.title,item.reference,item.location,item.project,...item.tags].some(value=>value.toLowerCase().includes(term)));
  const count=(kind,id)=>events.filter(row=>row.kind===kind&&(!id||row.profile===id)).reduce((sum,row)=>sum+row.total,0);
  const scanDays=[...new Set(events.map(row=>row.day))].slice(-30);
  return `<main class="wrap cotiso-workspace"><div class="cotiso-dashboard">
    <nav aria-label="Workspace navigation">${Object.entries(platformSections).map(([key,label])=>`<a href="/#platform?tab=${key}" ${section===key?'aria-current="page"':''}>${label}</a>`).join('')}<button type="button" onclick="signOutLocal()">Sign out</button></nav>
    <div><div class="topline"><div><p class="cotiso-kicker">Workspace</p><h1>${platformSections[section]}</h1></div>${['overview','codes','help'].includes(section)?'<button class="btn primary" onclick="platformEditor()">Create QR code</button>':''}</div>
    ${section==='overview'?`<section class="card"><h2>${profiles.length?'Your QR workspace':'Set up your first QR code'}</h2><p class="muted">${profiles.length?`You have ${profiles.length} of 25 codes in this workspace.`:'Start with an asset, location or link that you want people to open from a printed code.'}</p>${profiles.length?'':steps}<div class="actions"><a class="btn" href="/#platform?tab=codes">Manage QR codes</a><a class="btn" href="/#platform?tab=help">Read the setup guide</a></div></section>`:''}
    ${section==='company'?platformCompanyForm():''}
    ${section==='help'?`<section class="card"><h2>From setup to your first scan</h2>${steps}<h3>When should I use the optional settings?</h3><p><strong>Projects and tags</strong> help you find codes later. <strong>Expiry</strong> closes access at a UTC date and time. <strong>Scheduled destination</strong> temporarily changes where a dynamic code sends visitors. Codes imported in bulk start paused.</p></section>`:''}
    <section id="cotiso-analytics" ${section==='analytics'?'':'hidden'}><h2>Activity in the last 30 days</h2><button class="btn small" onclick="loadPlatform()">Refresh analytics</button><div class="cotiso-metrics">${[['scan','Tracked visits'],['action','Actions selected'],['start','Forms opened'],['complete','Reports submitted']].map(([kind,label])=>`<div><strong>${count(kind)}</strong><span>${label}</span></div>`).join('')}</div><p class="fine">Tracked visits include opened links. Static codes have no visit tracking. Link selections measure clicks.</p>
    ${scanDays.length?`<details><summary>Visits and outcomes by day</summary><table class="table"><thead><tr><th>Date (UTC)</th><th>Visits</th><th>Reports</th></tr></thead><tbody>${scanDays.map(day=>`<tr><td>${esc(day)}</td>${['scan','complete'].map(kind=>`<td>${events.filter(row=>row.day===day&&row.kind===kind).reduce((sum,row)=>sum+row.total,0)}</td>`).join('')}</tr>`).join('')}</tbody></table></details>`:''}</section>
    <section id="cotiso-codes" ${section==='codes'?'':'hidden'}><h2>QR codes and profiles</h2>
    <form class="cotiso-filters" onsubmit="applyPlatformFilters(event)">
      <label>Search<input name="search" type="search" maxlength="100" value="${esc(platformSearch)}" placeholder="Title, asset reference, location or tag"></label>
      <label>Project<select name="project"><option value="">All projects</option>${projects.map(project=>`<option value="${esc(project)}" ${project===selectedProject?'selected':''}>${esc(project)}</option>`).join('')}</select></label>
      <button class="btn small">Apply filters</button>
      <button class="btn small" type="button" onclick="exportPlatformCodes()">Export codes</button>
      <button class="btn small" type="button" onclick="openPlatformImport()">Bulk import</button>
    </form>${visible.length?visible.map(item=>`<article class="cotiso-code"><div><strong>${esc(item.title)}</strong><p class="fine">${esc(item.reference||item.location||'')} · ${{profile:'Smart profile',dynamic:'Dynamic link',static:'Static link'}[item.mode]} · ${item.mode==='static'?'Fixed destination':item.status==='active'&&item.expires&&item.expires<=Date.now()?'expired':esc(item.status)} · ${count('scan',item.id)} tracked visits</p><p class="fine">${esc([item.project,...item.tags,item.expires?'Expires '+new Date(item.expires).toISOString().slice(0,16).replace('T',' ')+' UTC':''].filter(Boolean).join(' · '))}</p></div><div class="actions"><a class="btn small" href="/api/platform/${item.id}/png">PNG</a><a class="btn small" href="/api/platform/${item.id}/svg">SVG</a>${item.mode==='static'?'':`<a class="btn small" href="/q/${item.id}" target="_blank" rel="noopener noreferrer">Open</a>`}<button class="btn small" onclick="platformEditor('${item.id}')">Edit</button><button class="btn small" onclick="platformEditor('${item.id}',true)">Clone</button><button class="btn small" onclick="platformHistory('${item.id}')">History</button></div></article>`).join(''):profiles.length?'<p>No codes match the selected filters.</p>':'<p>Create a static code, an editable destination, or a Smart QR profile with multiple actions.</p>'}</section>
    <section id="cotiso-inbox" ${section==='reports'?'':'hidden'}><h2>Recent reports</h2><p class="muted">Reports submitted through active Smart QR profiles appear here with the asset reference and location.</p><button class="btn small" onclick="loadPlatform()">Refresh reports</button>${reports.length?reports.map(report=>`<article class="cotiso-code"><div><strong>${esc(report.title)}</strong><p class="fine">${esc([report.reference,report.location,new Date(report.created).toLocaleString()].filter(Boolean).join(' · '))}</p><p class="cotiso-report">${esc(report.message)}</p></div></article>`).join(''):'<p>No reports yet. To test the flow, open an active Smart QR profile with the issue form enabled and submit a test report.</p>'}</section></div>
  </div></main>`;
}
async function loadPlatformCompany(){
  if(companyPending)return;
  companyPending=true;
  companyError='';
  try{companyRecord=await api('platform/company')}catch(error){companyError=error.message}
  finally{companyPending=false;if(view==='platform'&&platformSection()==='company')render()}
}
function platformCompanyForm(){
  if(companyError)return `<section class="card"><p role="alert">${esc(companyError)}</p><button class="btn" onclick="loadPlatformCompany()">Retry</button></section>`;
  if(!companyRecord)return '<section class="card"><p>Loading billing details…</p></section>';
  const company=companyRecord.company||{};
  const input=(name,label,max,{required=false,type='text',autocomplete='off',hint=''}={})=>
    `<label>${label}<input name="${name}" maxlength="${max}" type="${type}" autocomplete="${autocomplete}" ${required?'required':''} value="${esc(company[name]||'')}" ${hint?'placeholder="'+hint+'"':''}></label>`;
  return `<section class="card"><h2>Invoice details</h2><p class="muted">Enter the legal name and billing address you want recorded for your company. These details are private to your account.</p>
    <p class="fine">Cotiso QR platform checkout and automated invoices are not active yet.</p>
    <form onsubmit="savePlatformCompany(event)">
      ${input('company','Legal company name',120,{required:true,autocomplete:'organization'})}
      ${input('address','Address line 1',200,{required:true,autocomplete:'address-line1'})}
      ${input('addressLine2','Address line 2 (optional)',200,{autocomplete:'address-line2'})}
      <div class="formgrid">${input('city','Town or city',80,{required:true,autocomplete:'address-level2'})}
      ${input('postalCode','Postcode',20,{required:true,autocomplete:'postal-code'})}</div>
      ${input('country','Country code',2,{required:true,autocomplete:'country',hint:'GB or RO'})}
      <div class="formgrid">${input('registration','Company registration number (optional)',140)}
      ${input('vatNumber','VAT number (optional)',40)}</div>
      ${input('billingEmail','Billing email (optional)',254,{type:'email',autocomplete:'email'})}
      <button class="btn primary" type="submit">Save billing details</button>
      <p role="status">${companyRecord.updated?'Last saved '+esc(new Date(companyRecord.updated).toLocaleString()):''}</p>
    </form></section>`;
}
async function savePlatformCompany(event){
  event.preventDefault();
  const form=event.currentTarget,button=form.querySelector('button'),status=form.querySelector('[role=status]');
  button.disabled=true;
  try{
    companyRecord=await api('platform/company','PUT',Object.fromEntries(new FormData(form)));
    form.elements.country.value=companyRecord.company.country;
    status.textContent='Company billing details saved.';
  }catch(error){status.textContent=error.message}
  finally{button.disabled=false}
}
function applyPlatformFilters(event){
  event.preventDefault();
  const fields=new FormData(event.currentTarget);
  platformSearch=String(fields.get('search')||'');
  selectedProject=String(fields.get('project')||'');
  render();
}
function exportPlatformCodes(){
  const file=new Blob([JSON.stringify({version:1,exportedAt:new Date().toISOString(),codes:platformData.profiles},null,2)],{type:'application/json'});
  const link=document.createElement('a');
  link.href=URL.createObjectURL(file);
  link.download='cotiso-qr-codes.json';
  link.click();
  setTimeout(()=>URL.revokeObjectURL(link.href),1000);
}
function openPlatformImport(){
  modal(`<h2>Bulk import QR codes</h2>
    <p>Choose a CSV asset list or a Cotiso QR JSON export. Every code will receive a new identity. Dynamic links and profiles start paused. Expiry dates, destination schedules, reports and scan history are excluded.</p>
    <p><a class="btn small" href="/cotiso-asset-import.csv" download>Download CSV template</a></p>
    <label>CSV or JSON file<input type="file" accept=".csv,.json,text/csv,application/json" onchange="previewPlatformImport(this)"></label>
    <div data-import-preview aria-live="polite"></div>`);
}
function platformCodesFromCsv(text){
  const source=text.replace(/^\uFEFF/,'').trim();
  const header=source.split(/\r?\n/,1)[0];
  const delimiter=header.includes(';')&&!header.includes(',')?';':',';
  const [columns,...rows]=parseCSV(source,delimiter);
  if(!columns)throw Error('The CSV is empty.');
  const keys=columns.map(value=>value.trim().toLowerCase());
  if(!keys.includes('title')||new Set(keys).size!==keys.length)throw Error('Include a title column and use each column name once.');
  if(!rows.length||rows.length>25)throw Error('Use 1–25 asset rows per CSV.');
  return rows.map((row,index)=>{
    const get=key=>row[keys.indexOf(key)]?.trim()||'';
    const title=get('title'),url=get('url');
    if(row.length!==keys.length||!title)throw Error('CSV record '+(index+2)+': check the title and column count.');
    return {title,description:get('description'),reference:get('reference'),location:get('location'),project:get('project'),
      tags:get('tags').split('|').map(tag=>tag.trim()).filter(Boolean),mode:'profile',report:true,
      actions:url?[{label:get('action_label')||'View information',url}]:[]};
  });
}
async function previewPlatformImport(input){
  const preview=input.closest('.modal').querySelector('[data-import-preview]');
  preview.replaceChildren();
  const file=input.files[0];
  if(!file)return;
  try{
    if(file.size>250000)throw Error('Choose a CSV or JSON file under 250 KB.');
    let data;
    const contents=await file.text();
    if(/\.csv$/i.test(file.name))data={version:1,codes:platformCodesFromCsv(contents)};
    else try{data=JSON.parse(contents)}catch{throw Error('Choose a valid CSV or JSON file.')}
    if(!input.isConnected||input.files[0]!==file)return;
    if(data?.version!==1||!Array.isArray(data.codes)||!data.codes.length||data.codes.length>25)throw Error('Choose a CSV with 1–25 assets or a Cotiso QR version 1 export.');
    if(platformData.profiles.length+data.codes.length>25)throw Error('This batch exceeds the workspace limit of 25 codes.');
    preview.innerHTML=`<h3>Review ${data.codes.length} new codes</h3><ol>${data.codes.map(code=>`<li>${esc(code?.title||'Untitled')} · ${esc(code?.mode||'Unknown type')}</li>`).join('')}</ol><p role="alert"></p><button class="btn primary">Create new codes</button>`;
    const button=preview.querySelector('button');
    button.onclick=async()=>{
      button.disabled=true;
      input.disabled=true;
      try{
        const {ids}=await api('platform/import','POST',data);
        closeModal();
        selectedProject='';
        platformSearch='';
        await loadPlatform();
        toast(ids.length+' QR codes created.');
      }catch(error){preview.querySelector('[role=alert]').textContent=error.message;button.disabled=false;input.disabled=false}
    };
  }catch(error){if(input.isConnected&&input.files[0]===file)preview.textContent=error.message}
}
function platformEditor(id,clone=false){
  const source=platformData.profiles.find(profile=>profile.id===id);
  const item=clone?null:source;
  const values=clone&&source?{...source,title:(source.title.slice(0,92)+' (copy)'),status:'paused',expires:null,schedule:null}:item||{title:'',description:'',reference:'',location:'',mode:'profile',status:'active',actions:[],report:true};
  modal(`<h2>${item?'Edit QR experience':'Create QR experience'}</h2>
    <form onsubmit="savePlatform(event)" data-id="${item?.id||''}" data-revision="${item?.revision||0}" data-mode="${item?.mode||''}">
      <label>Title<input name="title" required maxlength="100" value="${esc(values.title)}"></label>
      <label>Type<select name="mode" ${item?'disabled':''} onchange="platformEditorMode(this.form)">${[['profile','Smart QR profile'],['dynamic','Dynamic link'],['static','Static link']].map(([key,label])=>`<option value="${key}" ${values.mode===key?'selected':''}>${label}</option>`).join('')}</select></label>
      <p data-hint class="fine"></p>
      <div data-profile-fields><label>Description<textarea name="description" maxlength="700">${esc(values.description)}</textarea></label>
      <label>Asset reference<input name="reference" maxlength="80" value="${esc(values.reference)}"></label>
      <label>Location<input name="location" maxlength="120" value="${esc(values.location)}"></label>
      <label><input type="checkbox" name="report" ${values.report?'checked':''}> Enable the issue report form</label></div>
      <label data-state>Status<select name="status">${['active','paused','archived'].map(key=>`<option ${values.status===key?'selected':''}>${key}</option>`).join('')}</select></label>
      <div data-destinations>${Array.from({length:6},(_,i)=>`<div><label data-action-label>Action ${i+1} label<input name="label" maxlength="60" value="${esc(values.actions[i]?.label||'')}"></label><label>HTTPS destination<input name="url" type="url" maxlength="1000" placeholder="https://example.com" value="${esc(values.actions[i]?.url||'')}" ${values.mode==='static'&&item?'readonly':''}></label></div>`).join('')}</div>
      <details class="cotiso-advanced"><summary>Optional settings</summary>
      <label>Project<input name="project" list="cotiso-projects" maxlength="80" value="${esc(values.project||'')}" placeholder="e.g. Riverside maintenance"></label>
      <datalist id="cotiso-projects">${[...new Set(platformData.profiles.map(profile=>profile.project).filter(Boolean))].map(project=>`<option value="${esc(project)}"></option>`).join('')}</datalist>
      <label>Tags (comma separated)<input name="tags" maxlength="359" value="${esc((values.tags||[]).join(', '))}"></label>
      <label data-expiry>Expiry (UTC)<input name="expires" type="datetime-local" max="2099-12-31T23:59" value="${values.expires?new Date(values.expires).toISOString().slice(0,16):''}"></label>
      <fieldset data-schedule><legend>Scheduled destination</legend>
        <p class="fine">During this window the QR opens the temporary URL. Outside it, the QR opens the main URL. Enter times in UTC.</p>
        <label>Temporary HTTPS destination<input type="url" name="schedule-url" maxlength="1000" value="${esc(values.schedule?.url||'')}"></label>
        <label>Starts (UTC)<input type="datetime-local" name="schedule-start" value="${values.schedule?new Date(values.schedule.starts).toISOString().slice(0,16):''}"></label>
        <label>Ends (UTC)<input type="datetime-local" name="schedule-end" max="2099-12-31T23:59" value="${values.schedule?new Date(values.schedule.ends).toISOString().slice(0,16):''}"></label>
      </fieldset>
      </details><p role="alert"></p><button class="btn primary">Save experience</button>
    </form>`);
  platformEditorMode(document.querySelector('#overlay form'));
}
function platformEditorMode(form){
  const mode=form.dataset.mode||form.elements.mode.value;
  form.querySelector('[data-profile-fields]').hidden=mode!=='profile';
  form.querySelector('[data-state]').hidden=mode==='static';
  form.querySelector('[data-expiry]').hidden=mode==='static';
  const schedule=form.querySelector('[data-schedule]');
  schedule.hidden=mode!=='dynamic';
  schedule.disabled=mode!=='dynamic';
  form.querySelectorAll('[data-destinations] > div').forEach((row,index)=>{
    row.hidden=mode!=='profile'&&index>0;
    row.querySelectorAll('input').forEach(input=>{input.disabled=row.hidden});
  });
  form.querySelector('[data-destinations] input[name=url]').required=mode!=='profile';
  form.querySelectorAll('[data-action-label]').forEach(label=>{label.hidden=mode!=='profile'});
  form.querySelector('[data-hint]').textContent=mode==='static'?'Printed static codes open their destination directly. The destination cannot be edited or paused after printing.':mode==='dynamic'?'Edit this destination later without reprinting.':'Add up to six actions, turn on the issue form, or use both. Anyone with the QR can see active profile content.';
}
async function savePlatform(event){
  event.preventDefault();
  const form=event.currentTarget,data=new FormData(form),id=form.dataset.id;
  const mode=form.dataset.mode||data.get('mode');
  const links=data.getAll('url'),labels=data.getAll('label');
  const actions=mode==='profile'?links.map((url,i)=>({url,label:labels[i]})).filter(action=>action.url||action.label):[{url:links[0],label:'Open destination'}];
  const button=form.querySelector('button');
  button.disabled=true;
  try{
    const scheduleFields=['url','start','end'].map(name=>String(data.get('schedule-'+name)||'').trim());
    const [url,start,end]=scheduleFields;
    const schedule=mode==='dynamic'&&scheduleFields.some(Boolean)?{url,starts:Date.parse(start+'Z'),ends:Date.parse(end+'Z')}:null;
    if(schedule&&(!url||!Number.isFinite(schedule.starts)||!Number.isFinite(schedule.ends)))throw Error('Enter the temporary URL, start and end together.');
    const saved=await api('platform'+(id?'/'+id:''),id?'PUT':'POST',{title:data.get('title'),description:data.get('description'),reference:data.get('reference'),location:data.get('location'),mode,status:mode==='static'?'active':data.get('status'),actions,schedule,project:data.get('project'),tags:String(data.get('tags')||'').split(',').map(tag=>tag.trim()).filter(Boolean),expires:mode!=='static'&&data.get('expires')?Date.parse(data.get('expires')+'Z'):null,report:data.has('report'),revision:Number(form.dataset.revision)});
    closeModal();
    await loadPlatform();
    const active=data.get('status')==='active'&&(!data.get('expires')||Date.parse(data.get('expires')+'Z')>Date.now());
    modal(`<h2>QR code saved</h2><p>${mode==='static'?'Download the image and test it with your phone camera.':active?'Open the public page to test it, then download the QR image for printing.':'Activate this code before sharing it. You can change its status in Edit.'}</p><div class="actions">
      ${mode!=='static'&&active?`<a class="btn" href="/q/${saved.id}" target="_blank" rel="noopener noreferrer">Open and test</a>`:''}
      <a class="btn primary" href="/api/platform/${saved.id}/png">Download PNG</a>
      <a class="btn" href="/api/platform/${saved.id}/svg">Download SVG</a>
      <a class="btn" href="/#platform?tab=codes" onclick="closeModal()">Go to QR codes</a>
    </div>`);
  }catch(error){form.querySelector('[role=alert]').textContent=error.message}
  finally{button.disabled=false}
}
async function platformHistory(id){
  try{
    const {history}=await api('platform/'+id+'/history');
    modal(`<h2>Version history</h2>${history.map(entry=>`<details class="card"><summary>Version ${entry.revision} · ${esc(new Date(entry.created).toLocaleString())}</summary><p>${esc(entry.profile.title+' · '+entry.profile.status)}</p><p class="fine">${esc([entry.profile.project,...(entry.profile.tags||[]),entry.profile.expires?'Expires '+new Date(entry.profile.expires).toISOString():''].filter(Boolean).join(' · '))}</p><p class="cotiso-report">${entry.profile.schedule?esc('Scheduled: '+entry.profile.schedule.url+' · '+new Date(entry.profile.schedule.starts).toISOString()+' to '+new Date(entry.profile.schedule.ends).toISOString()):''}</p><ul>${entry.profile.actions.map(action=>`<li class="cotiso-report">${esc(action.label+': '+action.url)}</li>`).join('')}</ul></details>`).join('')}`);
  }catch(error){toast(error.message)}
}
const beforePlatformRender=render;
render=function(){
  if(ready&&!loadError&&['platform','platform-demo','hospitality'].includes(view)){
    const content=view==='platform'?platformWorkspace():view==='platform-demo'?platformDemo():home();
    document.getElementById('root').innerHTML=header()+content;
    document.title='Cotiso QR | '+({'platform':'Workspace','platform-demo':'How it works','hospitality':'Hospitality'}[view]);
    return;
  }
  beforePlatformRender();
  if(view==='home')document.title='Cotiso QR | Physical touchpoints, digital workflows';
};
const beforePlatformRoute=route;
route=async function(){
  await beforePlatformRoute();
  if(view==='platform'&&session){
    if(platformSection()==='company')await Promise.all([platformData?null:loadPlatform(),loadPlatformCompany()]);
    else await loadPlatform();
  }
};
if(ready)render();
