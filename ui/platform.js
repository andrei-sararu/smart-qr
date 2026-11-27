const platformHospitality=home;
let companyRecord=null,companyError='',companyPending=false;
let selectedProject='',platformSearch='';
let platformData=null,platformError='',platformPending=false;
const cotisoOffers=[
  {
    title:'QR menus & table service',
    description:'For restaurants and cafés. Publish a digital menu and put a QR code on each table. Add waiter requests and table ordering when you need them.',
    href:'/#hospitality',
    action:'Explore restaurant QR',
    secondaryHref:'/#pricing',
    secondaryAction:'See restaurant plans'
  },
  {
    title:'QR labels & issue reporting',
    description:'For teams managing equipment and locations. Add a QR label that opens instructions or an issue form. See submitted reports against the right asset or location.',
    href:'/#platform-demo',
    action:'See equipment QR in action',
    secondaryHref:'/#platform-guide?topic=profiles',
    secondaryAction:'Read the setup guide'
  }
];

function cotisoOfferCards(){
  return `<div class="cotiso-offers">${cotisoOffers.map(({title,description,href,action,secondaryHref,secondaryAction})=>`<article>
    <h2>${title}</h2><p>${description}</p>
    <div class="actions"><a class="btn primary" href="${href}">${action}</a><a class="btn" href="${secondaryHref}">${secondaryAction}</a></div>
  </article>`).join('')}</div>`;
}

home=function(){
  if(view==='hospitality')return platformHospitality();
  return `<main class="cotiso-home">
    <section class="cotiso-hero"><div class="wrap cotiso-overview">
      <h1>QR software for restaurants, equipment and locations</h1>
      <p>Put a menu on the table or give people a way to report an issue where it happens. Choose the QR tools that fit your business.</p>
    </div></section>
    <section class="wrap cotiso-use-cases" aria-label="Cotiso QR products">${cotisoOfferCards()}</section>
    <footer class="wrap cotiso-footer"><a href="/#home">Cotiso QR</a><a href="/#hospitality">Hospitality</a><a href="/#contact">Contact</a><a href="/#privacy">Privacy</a></footer>
  </main>`;
};
const cotisoNavigation=[
  ['/#platform-products','Products',['platform-products','products']],
  ['/#hospitality','Hospitality',['hospitality']],
  ['/#demo','Demos',['demo','product','platform-demo','examples']],
  ['/#platform-guide','Guides',['platform-guide','help']],
  ['/#pricing','Pricing',['pricing']]
];
header=function(){
  const links=cotisoNavigation.map(([href,label,views])=>`<a href="${href}" ${views.includes(view)?'aria-current="page"':''}>${label}</a>`).join('');
  return `<div class="wrap"><header class="cotiso-header unified-header">
    <a class="brand" href="/#home"><img class="brand-icon" src="/favicon.svg?v=2" width="36" height="36" alt="">Cotiso QR</a>
    <nav class="unified-nav" aria-label="Main navigation">${links}</nav>
    <details class="unified-mobile-nav"><summary>Menu</summary><nav aria-label="Mobile navigation">${links}</nav></details>
    <div class="unified-account">${session?`<details><summary>Workspace</summary><div><a href="/#platform">QR workspace</a><a href="/#dashboard">Restaurant workspace</a></div></details>`:''}
    ${session?'':'<a class="btn primary small" href="/#platform">Start free / sign in</a>'}</div>
  </header></div>`;
};
function platformDemo(){
  return `<main class="wrap cotiso-workspace"><a class="breadcrumb" href="/#home">Home</a><h1>From boiler label to repair report</h1><p>Example asset · B1024 · Riverside House</p>
  <section class="cotiso-demo-grid">
    <div class="card"><h2>Guest phone</h2><button class="btn primary" type="button" onclick="openAssetDemo()">Scan equipment QR</button>
      <div id="asset-demo-profile" hidden><h3>Boiler B1024</h3><p>Plant room · Riverside House</p>
      <details><summary>View example instructions</summary><p>Read the equipment label and contact maintenance if the unit displays a fault.</p></details>
      <details id="asset-demo-form"><summary>Report an issue</summary><form onsubmit="sendAssetDemoReport(event)">
        <label>What happened?<textarea name="message" required maxlength="180" placeholder="Example: Boiler is displaying an error"></textarea></label>
        <button class="btn primary">Submit sample report</button></form></details></div>
    </div>
    <div class="card"><h2>Maintenance inbox</h2><p>Sample data stays in this page and is cleared on reload.</p>
      <p id="asset-demo-status" role="status">Waiting for a scan</p><p id="asset-demo-message"></p>
      <button id="asset-demo-progress" class="btn" type="button" hidden onclick="progressAssetDemo(this)">Start work</button>
    </div>
  </section>
  <section class="card"><h2>Try an editable QR destination</h2><p>Change the destination, then simulate a scan. The example QR reference stays the same.</p>
    <label>Example destination<select id="cotiso-demo-destination"><option>Equipment instructions</option><option>Weekend maintenance notice</option></select></label>
    <button class="btn" type="button" onclick="document.getElementById('cotiso-demo-result').textContent='Example QR B1024 opens: '+document.getElementById('cotiso-demo-destination').value">Simulate scan</button>
    <p id="cotiso-demo-result" role="status"></p>
    <p class="fine">Live dynamic codes can switch destinations automatically on a UTC schedule. Codes can also be grouped, cloned and imported in bulk.</p>
  </section>
  <p><a class="btn primary" href="/#platform">Create a real profile</a> <a class="btn" href="/#demo">Try the restaurant demo</a></p></main>`;
}
function openAssetDemo(){
  document.getElementById('asset-demo-profile').hidden=false;
  const status=document.getElementById('asset-demo-status');
  if(status.textContent==='Waiting for a scan')status.textContent='Scan recorded · B1024';
}
function sendAssetDemoReport(event){
  event.preventDefault();
  const message=String(new FormData(event.currentTarget).get('message')).trim();
  if(!message)return;
  document.getElementById('asset-demo-message').textContent=message;
  document.getElementById('asset-demo-status').textContent='New report · B1024 · Riverside House';
  const next=document.getElementById('asset-demo-progress');
  next.hidden=false;
  next.disabled=false;
  next.textContent='Start work';
}
function progressAssetDemo(button){
  const started=button.textContent==='Start work';
  document.getElementById('asset-demo-status').textContent=started?'In progress · B1024':'Resolved · B1024';
  button.textContent=started?'Mark resolved':'Resolved';
  button.disabled=!started;
}
const equipmentFeatures=[
  ['QR codes','Create static or editable links. Schedule a temporary destination, group codes into projects and import or export them in bulk.','codes'],
  ['Smart QR Profiles','Give an asset or location a public page with links and an issue form. Keep the same printed code when you edit the profile.','profiles'],
  ['Reports and analytics','See tracked visits, actions and reports. Move a report from New to In progress to Resolved and export the filtered list.','reports']
];
function platformProducts(){
  return `<main class="wrap cotiso-workspace">
    <div class="cotiso-overview"><h1>Choose your QR product</h1><p>Find the tools for serving guests or managing QR labels across equipment and locations.</p></div>
    ${cotisoOfferCards()}
    <section class="cotiso-equipment-features"><h2>What QR labels &amp; issue reporting includes</h2>
      <div class="cotiso-cases">${equipmentFeatures.map(([title,description,key])=>`<article><h3>${title}</h3><p>${description}</p><a class="btn small" href="/#platform-guide?topic=${key}">View guide</a></article>`).join('')}</div>
      <p>Use the reports inbox to review submissions and update their status.</p>
      <a class="btn primary" href="/#platform">Open QR workspace</a>
    </section>
  </main>`;
}
const platformGuideTopics={
  codes:[['Choose a code type','Pick Dynamic link if you expect its destination to change. A Static link always opens its original address.'],['Save the destination','Enter the HTTPS address. Use Optional settings for an expiry or scheduled destination.'],['Test and download','Open the saved code to check the destination. Download PNG or SVG and test the printed code before distributing it.']],
  profiles:[['Identify the asset','Choose Smart QR Profile and enter an asset title, reference and location.'],['Add actions','Add links to public instructions or information. Enable the issue form to receive reports.'],['Activate and test','Set the profile to Active, open the public page and submit a sample issue. Check Reports before printing.']],
  reports:[['Open the inbox','In Workspace, select Reports. Find the entry by asset title, reference or location.'],['Update its status','Change New to In progress when you start work and to Resolved when finished.'],['Review outcomes','Use Analytics to review scans, actions and submissions. Export the filtered reports to CSV when you need a copy.']]
};
function platformGuide(){
  const requested=new URLSearchParams(location.hash.split('?')[1]).get('topic');
  const topic=Object.hasOwn(platformGuideTopics,requested)?requested:'codes';
  return `<main class="wrap cotiso-workspace"><h1>Cotiso QR user guide</h1>
    <nav class="actions" aria-label="Guide topics">${equipmentFeatures.map(([title,,key])=>`<a class="btn ${topic===key?'primary':''}" ${topic===key?'aria-current="page"':''} href="/#platform-guide?topic=${key}">${title}</a>`).join('')}<a class="btn" href="/#help">Restaurant guide</a></nav>
    <div class="cotiso-guide-steps">${platformGuideTopics[topic].map(([title,copy],index)=>`<details class="card" ${index===0?'open':''}><summary><span>${index+1}</span> ${title}</summary><p>${copy}</p></details>`).join('')}</div>
    <div class="actions"><a class="btn primary" href="/#platform-demo">Practice in the demo</a><a class="btn" href="/#platform">Open workspace</a></div></main>`;
}
async function loadPlatform(){
  if(!session||platformPending)return;
  platformPending=true;
  try{platformData=await api('platform');platformError=''}catch(error){platformError=error.message}
  finally{platformPending=false;if(view==='platform')render()}
}
const platformSections={overview:'Overview',codes:'QR codes',reports:'Reports',analytics:'Analytics',help:'Getting started',restaurants:'Restaurants & locations',company:'Company & billing'};
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
  return `<main class="wrap cotiso-workspace"><div class="cotiso-dashboard">
    <nav aria-label="Workspace navigation">${Object.entries(platformSections).map(([key,label])=>`<a href="/#platform?tab=${key}" ${section===key?'aria-current="page"':''}>${label}</a>`).join('')}<button type="button" onclick="signOutLocal()">Sign out</button></nav>
    <div><div class="topline"><div><p class="cotiso-kicker">Workspace</p><h1>${platformSections[section]}</h1></div>${['overview','codes','help'].includes(section)?'<button class="btn primary" onclick="platformEditor()">Create QR code</button>':''}</div>
    ${section==='overview'?`<section class="card"><h2>${profiles.length?'Your QR workspace':'Set up your first QR code'}</h2><p class="muted">${profiles.length?`You have ${profiles.length} of 25 codes in this workspace.`:'Start with an asset, location or link that you want people to open from a printed code.'}</p>${profiles.length?'':steps}<div class="actions"><a class="btn" href="/#platform?tab=codes">Manage QR codes</a><a class="btn" href="/#platform-guide">Read the setup guide</a></div></section>`:''}
    ${section==='restaurants'?`<section class="card"><h2>Your hospitality locations</h2><p class="muted">Each location has its own menu, table QR codes, orders and subscription.</p><div class="actions"><a class="btn primary" href="/#dashboard?locations=1">Manage restaurants & locations</a></div></section>`:''}
    ${section==='company'?platformCompanyForm():''}
    ${section==='help'?`<section class="card"><h2>From setup to your first scan</h2>${steps}<h3>When should I use the optional settings?</h3><p><strong>Projects and tags</strong> help you find codes later. <strong>Expiry</strong> closes access at a UTC date and time. <strong>Scheduled destination</strong> temporarily changes where a dynamic code sends visitors. Codes imported in bulk start paused.</p></section>`:''}
    <section id="cotiso-analytics" ${section==='analytics'?'':'hidden'}>${section==='analytics'?platformAnalytics(profiles,events):''}</section>
    <section id="cotiso-codes" ${section==='codes'?'':'hidden'}><h2>QR codes and profiles</h2>
    <form class="cotiso-filters" onsubmit="applyPlatformFilters(event)">
      <label>Search<input name="search" type="search" maxlength="100" value="${esc(platformSearch)}" placeholder="Title, asset reference, location or tag"></label>
      <label>Project<select name="project"><option value="">All projects</option>${projects.map(project=>`<option value="${esc(project)}" ${project===selectedProject?'selected':''}>${esc(project)}</option>`).join('')}</select></label>
      <button class="btn small">Apply filters</button>
      <button class="btn small" type="button" onclick="exportPlatformCodes()">Export codes</button>
      <button class="btn small" type="button" onclick="openPlatformImport()">Bulk import</button>
    </form>${visible.length?visible.map(item=>`<article class="cotiso-code"><div><strong>${esc(item.title)}</strong><p class="fine">${esc(item.reference||item.location||'')} · ${{profile:'Smart profile',dynamic:'Dynamic link',static:'Static link'}[item.mode]} · ${item.mode==='static'?'Fixed destination':item.status==='active'&&item.expires&&item.expires<=Date.now()?'expired':esc(item.status)} · ${count('scan',item.id)} tracked visits</p><p class="fine">${esc([item.project,...item.tags,item.expires?'Expires '+new Date(item.expires).toISOString().slice(0,16).replace('T',' ')+' UTC':''].filter(Boolean).join(' · '))}</p></div><div class="actions"><a class="btn small" href="/api/platform/${item.id}/png">PNG</a><a class="btn small" href="/api/platform/${item.id}/svg">SVG</a>${item.mode==='static'?'':`<a class="btn small" href="/q/${item.id}" target="_blank" rel="noopener noreferrer">Open</a>`}<button class="btn small" onclick="platformEditor('${item.id}')">Edit</button><button class="btn small" onclick="platformEditor('${item.id}',true)">Clone</button><button class="btn small" onclick="platformHistory('${item.id}')">History</button></div></article>`).join(''):profiles.length?'<p>No codes match the selected filters.</p>':'<p>Create a static code, an editable destination, or a Smart QR profile with multiple actions.</p>'}</section>
    <section id="cotiso-inbox" ${section==='reports'?'':'hidden'}>${section==='reports'?platformReports(reports):''}</section></div>
  </div></main>`;
}
const analyticsMetrics=[['scan','Tracked visits'],['action','Actions selected'],['start','Forms opened'],['complete','Reports submitted']];
let analyticsDays=30,analyticsLocation='';
function analyticsData(profiles,events,days,location,now=Date.now()){
  const dates=Array.from({length:days},(_,i)=>new Date(now-(days-1-i)*86400000).toISOString().slice(0,10));
  const included=profiles.filter(item=>item.mode!=='static'&&(!location||item.location===location));
  const tally=()=>({scan:0,action:0,start:0,complete:0});
  const byCode=new Map(included.map(item=>[item.id,{label:item.title,location:item.location,reference:item.reference,...tally()}]));
  const byDay=new Map(dates.map(date=>[date,tally()]));
  const byLocation=new Map(),total=tally();
  for(const event of events){
    const code=byCode.get(event.profile),day=byDay.get(event.day);
    if(!code||!day||!Object.hasOwn(total,event.kind))continue;
    const location=code.location;
    if(!byLocation.has(location))byLocation.set(location,{label:location||'No location set',...tally()});
    for(const row of [code,day,total,byLocation.get(location)])row[event.kind]+=event.total;
  }
  const ranked=items=>[...items].sort((a,b)=>b.complete-a.complete||b.scan-a.scan||a.label.localeCompare(b.label));
  return {total,dates,byDay,codes:ranked(byCode.values()),locations:ranked(byLocation.values())};
}
function platformAnalytics(profiles,events){
  const report=analyticsData(profiles,events,analyticsDays,analyticsLocation);
  const locations=[...new Set(profiles.filter(item=>item.mode!=='static').map(item=>item.location).filter(Boolean))].sort();
  const table=(title,rows,kind)=>`<section><h3>${title}</h3><div class="cotiso-analytics-table"><table class="table"><thead><tr><th scope="col">${kind}</th>${analyticsMetrics.map(([,label])=>`<th scope="col">${label}</th>`).join('')}</tr></thead><tbody>
    ${rows.map(row=>`<tr><th scope="row">${esc(row.label)}${row.reference||row.location?`<div class="fine">${esc([row.reference,row.location].filter(Boolean).join(' · '))}</div>`:''}</th>${analyticsMetrics.map(([key])=>`<td>${row[key]}</td>`).join('')}</tr>`).join('')}
    </tbody></table></div></section>`;
  const hasActivity=Object.values(report.total).some(Boolean);
  return `<h2>Visits and outcomes</h2><div class="cotiso-filters">
    <label>Period<select onchange="analyticsDays=Number(this.value);render()"><option value="7" ${analyticsDays===7?'selected':''}>Last 7 calendar days</option><option value="30" ${analyticsDays===30?'selected':''}>Last 30 calendar days</option></select></label>
    <label>Location<select onchange="analyticsLocation=this.value;render()"><option value="">All locations</option>${locations.map(location=>`<option value="${esc(location)}" ${location===analyticsLocation?'selected':''}>${esc(location)}</option>`).join('')}</select></label>
    <button class="btn small" onclick="loadPlatform()">Refresh analytics</button><button class="btn small" onclick="exportPlatformAnalytics()" ${hasActivity?'':'disabled'}>Export analytics CSV</button>
    </div><div class="cotiso-metrics">${analyticsMetrics.map(([key,label])=>`<div><strong>${report.total[key]}</strong><span>${label}</span></div>`).join('')}</div>
    <p class="fine">Dates use UTC and include today. Visits include opened links and repeat visits. Static codes are excluded. Location comes from the code’s current location field.</p>
    ${hasActivity?`<details><summary>Daily breakdown</summary>${table('Activity by day',report.dates.map(label=>({label,...report.byDay.get(label)})),'Date (UTC)')}</details>
    ${table('Performance by QR code',report.codes,'Code')}${table('Performance by location',report.locations,'Location')}`:'<p>No activity yet for this selection. Open an active dynamic code or profile to record a visit.</p>'}`;
}
function exportPlatformAnalytics(){
  const {profiles,events}=platformData;
  const report=analyticsData(profiles,events,analyticsDays,analyticsLocation);
  const row=(type,label,reference,location,metrics)=>[type,label,reference,location,...analyticsMetrics.map(([key])=>metrics[key])];
  downloadPlatformCsv('cotiso-analytics.csv',[
    ['Breakdown','Name or date (UTC)','Reference','Location',...analyticsMetrics.map(([,label])=>label)],
    ...report.dates.map(date=>row('Date',date,'','',report.byDay.get(date))),
    ...report.codes.map(code=>row('QR code',code.label,code.reference,code.location,code)),
    ...report.locations.map(location=>row('Location',location.label,'','',location))
  ]);
}
const reportStates={new:'New',in_progress:'In progress',resolved:'Resolved'};
let reportFilter='';
function platformReports(reports){
  const visible=reports.filter(report=>!reportFilter||report.status===reportFilter);
  return `<h2>Recent reports</h2><p class="muted">Review the latest 100 reports submitted through Smart QR profiles.</p>
    <div class="cotiso-filters"><label>Status<select onchange="reportFilter=this.value;render()"><option value="">All statuses</option>${Object.entries(reportStates).map(([key,label])=>`<option value="${key}" ${key===reportFilter?'selected':''}>${label}</option>`).join('')}</select></label>
      <button class="btn small" onclick="loadPlatform()">Refresh reports</button>
      <button class="btn small" ${visible.length?'':'disabled'} onclick="exportPlatformReports()">Export filtered CSV</button></div>
    ${visible.length?visible.map(report=>`<article class="cotiso-code"><div><strong>${esc(report.title)}</strong>
      <p class="fine">${esc([report.reference,report.location,new Date(report.created).toLocaleString()].filter(Boolean).join(' · '))}</p>
      <p class="cotiso-report">${esc(report.message)}</p></div>
      <form data-report="${esc(report.id)}" onsubmit="savePlatformReport(event)"><label>Status<select name="status">${Object.entries(reportStates).map(([key,label])=>`<option value="${key}" ${key===report.status?'selected':''}>${label}</option>`).join('')}</select></label>
      <button class="btn small">Update status</button><p role="status"></p></form></article>`).join(''):`<p>${reports.length?'No reports match this status.':'No reports yet. Submit a test report from an active Smart QR profile to try the inbox.'}</p>`}`;
}
async function savePlatformReport(event){
  event.preventDefault();
  const form=event.currentTarget,button=form.querySelector('button'),status=form.querySelector('[role=status]');
  const report=platformData.reports.find(item=>item.id===form.dataset.report);
  button.disabled=true;
  try{
    const saved=await api('platform/reports/'+report.id,'PUT',{status:new FormData(form).get('status'),updated:report.updated});
    Object.assign(report,saved);
    render();
    toast('Report status updated.');
  }catch(error){status.textContent=error.message}
  finally{button.disabled=false}
}
function exportPlatformReports(){
  const reports=platformData.reports.filter(report=>!reportFilter||report.status===reportFilter);
  downloadPlatformCsv('cotiso-reports.csv',[['Report ID','Received (UTC)','Asset','Reference','Location','Status','Message'],
    ...reports.map(r=>[r.id,new Date(r.created).toISOString(),r.title,r.reference,r.location,reportStates[r.status],r.message])]);
}
function downloadPlatformCsv(filename,data){
  const escapeCell=value=>{
    const text=String(value??'');
    const safe=/^[\s]*[=+@-]|^[\t\r\n]/.test(text)?"'"+text:text;
    return '"'+safe.replaceAll('"','""')+'"';
  };
  const link=document.createElement('a');
  link.href=URL.createObjectURL(new Blob(['\uFEFF',data.map(row=>row.map(escapeCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));
  link.download=filename;
  link.click();
  setTimeout(()=>URL.revokeObjectURL(link.href),1000);
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
    const current=history[0]?.revision;
    modal(`<h2>Version history</h2><p class="muted">Restoring creates a new version. Your printed QR, current status and expiry stay the same.</p>
      ${history.map(entry=>`<details class="card"><summary>Version ${entry.revision}${entry.revision===current?' · Current':''} · ${esc(new Date(entry.created).toLocaleString())}</summary>
      <p>${esc(entry.profile.title+' · '+entry.profile.status)}</p>
      ${entry.profile.restoredFrom?`<p class="fine">Restored from version ${entry.profile.restoredFrom}</p>`:''}
      <p class="fine">${esc([entry.profile.project,...(entry.profile.tags||[]),entry.profile.expires?'Expires '+new Date(entry.profile.expires).toISOString():''].filter(Boolean).join(' · '))}</p>
      <p class="cotiso-report">${entry.profile.schedule?esc('Scheduled: '+entry.profile.schedule.url+' · '+new Date(entry.profile.schedule.starts).toISOString()+ ' to '+new Date(entry.profile.schedule.ends).toISOString()):''}</p>
      <ul>${entry.profile.actions.map(action=>`<li class="cotiso-report">${esc(action.label+': '+action.url)}</li>`).join('')}</ul>
      ${entry.revision===current?'':`<button class="btn small" type="button" onclick="restorePlatformVersion(this,'${esc(id)}',${current},${entry.revision})">Restore this version</button><p role="status"></p>`}</details>`).join('')}`);
  }catch(error){toast(error.message)}
}
async function restorePlatformVersion(button,id,revision,restoreRevision){
  if(!confirm('Restore version '+restoreRevision+'? This changes what people see when they scan an active QR code.'))return;
  button.disabled=true;
  try{
    await api('platform/'+id+'/restore','POST',{revision,restoreRevision});
    await loadPlatform();
    await platformHistory(id);
    toast('Version restored.');
  }catch(error){button.nextElementSibling.textContent=error.message;button.disabled=false}
}
const beforePlatformRender=render;
render=function(){
  if(ready&&!loadError&&['platform','platform-demo','platform-products','platform-guide','hospitality'].includes(view)){
    const content=view==='platform'?platformWorkspace():view==='platform-demo'?platformDemo():view==='platform-products'?platformProducts():view==='platform-guide'?platformGuide():home();
    document.getElementById('root').innerHTML=header()+content;
    document.title='Cotiso QR | '+({'platform':'Workspace','platform-demo':'How it works','platform-products':'Products','platform-guide':'User guide','hospitality':'Hospitality'}[view]);
    return;
  }
  beforePlatformRender();
  if(view==='home')document.title='Cotiso QR | Restaurant menus and equipment labels';
};
const beforePlatformRoute=route;
let lastCotisoRoute=location.hash;
history.scrollRestoration='manual';
route=async function(){
  const routeHash=location.hash;
  const changed=routeHash!==lastCotisoRoute;
  lastCotisoRoute=routeHash;
  const pending=beforePlatformRoute();
  if(changed)window.scrollTo({top:0,left:0,behavior:'instant'});
  await pending;
  if(view==='platform'&&session){
    if(platformSection()==='company')await Promise.all([platformData?null:loadPlatform(),loadPlatformCompany()]);
    else await loadPlatform();
  }
};
if(ready)render();

const existingHospitalityDemo=demo;
demo=function(){
  return `<section class="wrap cotiso-workspace"><h2>Try a table order with options</h2>
    <p>Example restaurant · Table 7. This demo runs in your browser.</p>
    <form class="card" onsubmit="previewHospitalityOrder(event)">
      <label>Size<select name="size"><option value="4.50">Half pint · £4.50</option><option value="7.00">Pint · £7.00</option></select></label>
      <label><input type="checkbox" name="extra"> Add a side of crisps · £1.50</label>
      <p><strong>Allergen declaration</strong> · Cereals containing gluten</p>
      <button class="btn primary">Send example dish list</button>
      <p role="status"></p>
      <div data-demo-order hidden><button class="btn" type="button" onclick="advanceHospitalityDemo(this)">Confirm order</button></div>
    </form></section>`+existingHospitalityDemo();
};
function previewHospitalityOrder(event){
  event.preventDefault();
  const form=event.currentTarget,values=new FormData(form),size=values.get('size');
  const amount=Number(size)+(values.has('extra')?1.5:0);
  const details=(size==='7.00'?'Pint':'Half pint')+(values.has('extra')?' + crisps':'')+' · £'+amount.toFixed(2);
  form.dataset.order=details;
  form.querySelector('[role=status]').textContent='Staff board · Table 7 · '+details+' · Waiting for confirmation.';
  const next=form.querySelector('[data-demo-order] button');
  next.parentElement.hidden=false;
  next.textContent='Confirm order';
  next.disabled=false;
}
function advanceHospitalityDemo(button){
  const form=button.form,status=form.querySelector('[role=status]');
  const next={'Confirm order':['Order confirmed','Start preparation'],'Start preparation':['Preparing','Mark served'],'Mark served':['Served · Added to the open table bill','Request bill'],'Request bill':['Bill requested · Take payment through the till','Record till payment'],'Record till payment':['Bill closed · Example payment recorded','Finished']}[button.textContent];
  if(!next)return;
  status.textContent='Table 7 · '+form.dataset.order+' · '+next[0];
  button.textContent=next[1];
  button.disabled=next[1]==='Finished';
}
