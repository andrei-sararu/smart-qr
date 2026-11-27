let staffData=null,staffError='',staffTimer,staffRefreshPending=false;
let notificationsEnabled=false;
const notifiedRequests=new Set();

function notifyServiceRequests(requests){
  if(!notificationsEnabled||!document.hidden||Notification.permission!=='granted')return;
  for(const entry of requests){
    if(entry.status!=='new')continue;
    const overdue=isOverdue(entry);
    const key=entry.id+':'+(overdue?'overdue':'new');
    if(notifiedRequests.has(key))continue;
    notifiedRequests.add(key);
    const table=entry.tableLabel||'Table '+entry.table;
    try{
      new Notification(overdue?'Smart QR · Waiting over 3 minutes':'Smart QR · New table request',{
        body:table+' · '+requestLabel(entry.type),tag:entry.id,icon:'/favicon.svg'
      });
    }catch{
      notificationsEnabled=false;
      break;
    }
  }
}
function requestLabel(type){
  return {Waiter:'Waiter requested',Bill:'Bill requested',OrderReady:'Dish list received'}[type]||'Table request';
}
function enableServiceNotifications(){
  if(!window.Notification)return toast('This browser does not support desktop notifications.');
  Notification.requestPermission().then(permission=>{
    notificationsEnabled=permission==='granted';
    toast(notificationsEnabled?'Desktop notifications enabled while the board stays open.':'Notification permission was not granted.');
  }).catch(()=>toast('Notifications are unavailable in this browser.'));
}

function staffParams(){
  return new URLSearchParams(location.hash.split('?')[1]);
}
async function loadStaffView(){
  if(staffRefreshPending||!session||!['staff','team'].includes(view))return;
  const currentHash=location.hash;
  const venue=staffParams().get('venue');
  staffRefreshPending=true;
  try{
    const data=await api(view==='team'?'team':venue?'team/board/'+encodeURIComponent(venue):'team/venues');
    if(location.hash!==currentHash)return;
    staffData=data;
    staffError='';
    if(venue)notifyServiceRequests(staffData.requests);
  }catch(error){
    if(location.hash!==currentHash)return;
    staffData=null;
    staffError=error.message;
  }finally{
    staffRefreshPending=false;
    if(location.hash===currentHash&&!document.hidden&&!document.querySelector('#overlay .modal')&&!document.activeElement?.closest('.staff-page form'))render();
  }
}
function startStaffView(){
  clearInterval(staffTimer);
  staffData=null;
  staffError='';
  if(['staff','team'].includes(view)&&session){
    loadStaffView();
    if(view==='staff'&&staffParams().get('venue'))staffTimer=setInterval(loadStaffView,4000);
  }
}
const suiteRoute=route;
route=async function(){
  const pendingRoute=suiteRoute();
  startStaffView();
  await pendingRoute;
};
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&view==='staff')loadStaffView()});

async function inviteStaff(event){
  event.preventDefault();
  const form=event.currentTarget,button=form.querySelector('button');
  button.disabled=true;
  try{
    const {token}=await api('team','POST',{label:new FormData(form).get('label')});
    const link=new URL('/#staff?invite='+token,location.origin).href;
    modal(`<h2>Share this invitation</h2><p class="muted">Anyone with this link can accept it once after signing in. Send it privately to the intended staff member. It expires in 24 hours.</p><label>Invitation link<input readonly value="${esc(link)}" onclick="this.select()"></label><button class="btn primary" onclick="navigator.clipboard.writeText(this.previousElementSibling.querySelector('input').value).then(()=>toast('Invitation copied.')).catch(()=>toast('Select and copy the link above.'))">Copy invitation</button>`);
    form.reset();
    await loadStaffView();
    render();
  }catch(error){toast(error.message)}
  finally{button.disabled=false}
}
async function removeStaff(button){
  if(!confirm('Remove this invitation or staff member’s access?'))return;
  try{await api('team/'+encodeURIComponent(button.dataset.member),'DELETE',{});await loadStaffView()}
  catch(error){toast(error.message)}
}
async function acceptStaffInvite(button){
  button.disabled=true;
  try{
    const {restaurantId}=await api('team/join','POST',{token:staffParams().get('invite')});
    history.replaceState(null,'','/#staff');
    go('staff?venue='+encodeURIComponent(restaurantId));
  }catch(error){toast(error.message)}
  finally{button.disabled=false}
}
async function staffAdvance(button){
  const venue=staffParams().get('venue');
  button.disabled=true;
  try{
    await api('request/'+encodeURIComponent(button.dataset.id),'PATCH',{status:button.dataset.next,restaurantId:venue});
    await loadStaffView();
  }catch(error){toast(error.message);await loadStaffView()}
  finally{button.disabled=false}
}
async function changeOrder(button,action){
  button.disabled=true;
  const staff=view==='staff';
  const restaurantId=staff?staffParams().get('venue'):undefined;
  try{
    if(action==='confirm'){
      if(!confirm('Confirm this dish list as an order? Check with the guest first.'))return;
      await api('orders/confirm','POST',{requestId:button.dataset.id,restaurantId});
    }else{
      await api('orders/'+encodeURIComponent(button.dataset.id),'PATCH',{status:action,restaurantId});
    }
    if(staff)await loadStaffView();else await workspace();
  }catch(error){toast(error.message)}
  finally{button.disabled=false}
}
function confirmOrderButton(entry){
  if(entry.type!=='OrderReady'||entry.status!=='taken'||!entry.items?.length)return '';
  return `<button class="btn primary small" data-id="${esc(entry.id)}" onclick="changeOrder(this,'confirm')">Confirm order</button>`;
}
function orderQueue(orders){
  return `<section class="suite-orders"><h2>Confirmed orders</h2>
    ${orders.length?orders.map(order=>{
      const next=order.status==='confirmed'?'preparing':order.status==='preparing'?'served':'';
      return `<article class="staff-row"><div><strong>${esc(order.tableLabel||'Table '+order.tableNumber)} · ${esc(order.status)}</strong><ul>${order.items.map(item=>`<li>${orderLineText(item)}</li>`).join('')}</ul></div>
        ${next?`<button class="btn small" data-id="${esc(order.id)}" onclick="changeOrder(this,'${next}')">${next==='preparing'?'Start preparation':'Mark served'}</button>`:''}
      </article>`;
    }).join(''):'<p class="muted">No confirmed orders yet.</p>'}
  </section>`;
}
function tableBills(bills){
  return `<section class="suite-orders"><h2>Open table bills</h2>
    <p class="muted">Confirmed orders are grouped by table. Take payment through your till, then close the bill here.</p>
    ${bills.length?bills.map(bill=>`<article class="staff-row"><div><strong>${esc(bill.tableLabel||'Table '+bill.tableNumber)}</strong>
      <p>${bill.orders.length} confirmed ${bill.orders.length===1?'order':'orders'}</p>
      ${bill.hasUnpricedItems?'<p>Some orders have no recorded price. Check the total in your till.</p>':`<p>${Object.entries(bill.totals).map(([currency,value])=>esc(formatMenuPrice(value/100,currency,'en-GB'))).join(' + ')}</p>`}</div>
      <button class="btn small" data-table="${esc(bill.tableId)}" onclick="settleTableBill(this)" ${bill.orders.some(order=>order.status!=='served')?'disabled':''}>Close after payment</button></article>`).join(''):'<p class="muted">No open table bills.</p>'}
  </section>`;
}
async function settleTableBill(button){
  const staff=view==='staff';
  const bill=(staff?staffData.bills:ownerBills).find(item=>item.tableId===button.dataset.table);
  if(!bill||!confirm('Confirm that this table’s bill has been paid in your till.'))return;
  button.disabled=true;
  try{
    await api('orders/settle','POST',{restaurantId:staff?staffParams().get('venue'):undefined,tableId:bill.tableId,orderIds:bill.orders.map(order=>order.id)});
    if(staff)await loadStaffView();else await workspace();
  }catch(error){toast(error.message)}
  finally{button.disabled=false}
}
function staffPage(){
  if(!session)return accountForm();
  if(view==='team'){
    if(!restaurant)return '<main class="wrap staff-page"><h1>Manage your team</h1><p>Create a restaurant workspace first.</p><a class="btn" href="/#dashboard">Open workspace</a></main>';
    const members=staffData?.members||[];
    return `<main class="wrap staff-page"><a class="breadcrumb" href="/#dashboard">Workspace</a><h1>Team access</h1>
      <p class="muted">Invite staff to claim and resolve table requests. Staff access is limited to the service board.</p>
      ${restaurant.service?`<form class="card" onsubmit="inviteStaff(event)"><label>Staff name<input name="label" required maxlength="60"></label><button class="btn primary">Create invitation</button></form>`:'<p>Team invitations are included with Service.</p>'}
      ${staffError?`<p role="alert">${esc(staffError)}</p>`:!staffData?'<p>Loading team…</p>':!members.length?'<p>No staff invitations yet.</p>':members.map(member=>`<div class="staff-row"><div><strong>${esc(member.label)}</strong><div class="muted">${member.active?'Active staff account':'Invitation pending'}</div></div><button class="btn small" data-member="${esc(member.id)}" onclick="removeStaff(this)">Remove access</button></div>`).join('')}
    </main>`;
  }
  const params=staffParams();
  if(params.get('invite'))return '<main class="wrap staff-page"><h1>Join a service team</h1><p>Accept the invitation to open this restaurant’s staff board.</p><button class="btn primary" onclick="acceptStaffInvite(this)">Accept invitation</button></main>';
  const venue=params.get('venue');
  const header=`<a class="breadcrumb" href="/#staff">Staff workspace</a><h1>${esc(staffData?.name||(venue?'Service board':'Staff workspace'))}</h1>`;
  if(staffError)return `<main class="wrap staff-page">${header}<p role="alert">${esc(staffError)}</p><button class="btn" onclick="loadStaffView()">Retry</button></main>`;
  if(!staffData)return `<main class="wrap staff-page">${header}<p>Loading…</p></main>`;
  if(!venue)return `<main class="wrap staff-page">${header}${staffData.venues.length?staffData.venues.map(place=>`<p><a class="btn" href="/#staff?venue=${encodeURIComponent(place.id)}">${esc(place.name)}</a></p>`).join(''):'<p>Open the invitation link shared by your restaurant owner.</p>'}<button class="btn" onclick="signOutLocal()">Sign out</button></main>`;
  const pending=staffData.requests.filter(entry=>entry.status!=='done');
  return `<main class="wrap staff-page">${header}<div class="actions"><button class="btn" onclick="enableServiceNotifications()">Enable desktop alerts</button><button class="btn" onclick="downloadDishLists(staffData.requests)">Export dish lists CSV</button></div>
    <p class="muted">Keep the board open. Confirm dish lists at the table. Use the order queue to track preparation and service.</p>
    ${pending.length?pending.map(entry=>`<article class="staff-row"><div><strong>${esc(entry.tableLabel||'Table '+entry.table)} · ${requestLabel(entry.type)}</strong>
      <p class="muted">${entry.status==='taken'?'Claimed by staff':isOverdue(entry)?'Waiting over 3 minutes':'Waiting for staff'}</p>
      ${entry.items.length?`<ul>${entry.items.map(item=>`<li>${orderLineText(item)}</li>`).join('')}</ul>`:''}</div>
      <div class="actions">${confirmOrderButton(entry)}<button class="btn ${entry.status==='new'?'primary':''}" data-id="${esc(entry.id)}" data-next="${entry.status==='new'?'taken':'done'}" onclick="staffAdvance(this)">${entry.status==='new'?'Take request':'Mark resolved'}</button></div>
    </article>`).join(''):'<p>No open requests.</p>'}${orderQueue(staffData.orders)}${tableBills(staffData.bills)}</main>`;
}
function downloadDishLists(requests){
  const csvValue=value=>{
    const text=String(value);
    return '"'+(/^[\s]*[=+\-@]|^[\t\r\n]/.test(text)?"'"+text:text).replaceAll('"','""')+'"';
  };
  const rows=requests.filter(entry=>entry.type==='OrderReady'&&entry.status!=='new').flatMap(entry=>(entry.items||[]).map(item=>[
    entry.id,entry.tableLabel||'Table '+entry.table,new Date(entry.at).toISOString(),entry.status,item.name,item.quantity,item.unitPrice??'',item.currency??''
  ]));
  if(!rows.length)return toast('There are no claimed or resolved dish lists to export.');
  const csv=[['Request ID','Table','Received (UTC)','Status','Product','Quantity','Unit price','Currency'],...rows].map(row=>row.map(csvValue).join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  Object.assign(document.createElement('a'),{href:url,download:'smart-qr-dish-lists.csv'}).click();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
}

function showGuestAssistant(){
  modal('<h2>Find something on the menu</h2><p class="muted">Ask for a dish, flavour or price range. For allergies or dietary safety, check with the restaurant team.</p><form onsubmit="searchGuestAssistant(event)"><label>What would you like?<input name="question" required maxlength="180" placeholder="A warm main under 20"></label><button class="btn primary">Find dishes</button><div id="guest-assistant-results" aria-live="polite"></div></form>');
}
async function searchGuestAssistant(event){
  event.preventDefault();
  const form=event.currentTarget,button=form.querySelector('button'),out=form.querySelector('#guest-assistant-results');
  button.disabled=true;
  out.textContent='Searching…';
  try{
    const {ids}=await api('guest-assistant/'+encodeURIComponent(guest.slug),'POST',{question:new FormData(form).get('question'),language:publicLanguage});
    const results=ids.map(id=>guest.items.find(item=>item.id===id)).filter(Boolean);
    out.innerHTML=results.length?`<ul>${results.map(item=>`<li><strong>${esc(item.translations?.[publicLanguage]?.name||item.name)}</strong> · ${esc(formatMenuPrice(item.price,guest.currency,publicLanguage))}</li>`).join('')}</ul>`:'<p>No matching dishes found. Check the menu or ask the restaurant team.</p>';
  }catch(error){out.textContent=error.message}
  finally{button.disabled=false}
}

const suiteGuestMenu=liveMenu;
liveMenu=function(){
  return suiteGuestMenu().replace('<div class="qr-menu-content">','<div class="qr-menu-content">'+(guest.assistant?'<button class="btn small qr-guest-assistant" onclick="showGuestAssistant()">Ask the menu assistant</button>':''));
};
const suiteServiceHtml=serviceHtml;
serviceHtml=function(pending){
  const board=suiteServiceHtml(pending);
  if(!restaurant.service)return board;
  const ready=pending.filter(entry=>entry.status==='taken'&&entry.type==='OrderReady'&&entry.items?.length);
  return `<div class="actions"><a class="btn small" href="/#team">Manage team</a><button class="btn small" onclick="enableServiceNotifications()">Enable desktop alerts</button><button class="btn small" onclick="downloadDishLists(state.calls)">Export dish lists CSV</button></div>
    ${ready.length?`<section class="card"><h3>Dish lists ready to confirm</h3>${ready.map(entry=>`<div class="staff-row"><div><strong>${esc(entry.tableLabel||'Table '+entry.table)}</strong><ul>${entry.items.map(item=>`<li>${orderLineText(item)}</li>`).join('')}</ul></div>${confirmOrderButton(entry)}</div>`).join('')}</section>`:''}
    ${board}${orderQueue(ownerOrders)}${tableBills(ownerBills)}`;
};
const suiteSettings=settingsHtml;
settingsHtml=function(){
  return suiteSettings()+`<section class="card" style="margin-top:20px"><h3>Team access</h3><p class="muted">Invite staff to work from their own accounts on the Service plan.</p><a class="btn" href="/#team">Manage team</a><a class="btn" href="/#staff">Staff workspace</a></section>`;
};
async function confirmEmail(button){
  button.disabled=true;
  const status=document.getElementById('email-verification-result');
  try{
    const r=await fetch('/api/account',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'verify',token:staffParams().get('token')})});
    const result=await r.json();
    if(!r.ok)throw Error(result.error||'Verification failed.');
    history.replaceState(null,'','/#verify');
    status.textContent='Email verified. You can now sign in.';
    button.remove();
  }catch(error){status.textContent=error.message;button.disabled=false}
}

const suiteRender=render;
render=function(){
  if(ready&&!loadError&&view==='verify'){
    document.title='Smart QR | Verify email';
    document.getElementById('root').innerHTML=header()+'<main class="wrap staff-page"><h1>Verify your email</h1><p id="email-verification-result" aria-live="polite"></p>'+(staffParams().has('token')?'<button class="btn primary" onclick="confirmEmail(this)">Verify email address</button> ':'')+'<a class="btn" href="/#dashboard">Sign in</a></main>';
    return;
  }
  if(ready&&!loadError&&['staff','team'].includes(view)){
    document.getElementById('root').innerHTML=header()+staffPage();
    document.title='Smart QR | '+(view==='team'?'Team access':'Staff workspace');
    return;
  }
  suiteRender();
};


const suitePlans=[
  {name:'Free',price:0,description:'For a venue publishing its first QR menu.',features:['30 products with photos and allergen fields','Menu link, printable menu PDF and QR codes','Menu themes, imports and translations']},
  {name:'Menu Pro',price:12,description:'For a venue that wants a larger, branded menu.',features:['1,000 products','Venue logo on digital and printed menus','AI menu assistant for guests','Smart QR branding removed from the guest menu']},
  {name:'Service',price:29,description:'For a floor team handling requests across multiple tables.',features:['Everything in Menu Pro','Guest requests, dish lists and confirmed orders','Separate staff accounts and shared service board','Desktop alerts while the board is open','Dish-list CSV export and service response tracking']}
];
function suitePlanComparison(){
  const included=['Included','Included','Included'];
  const paid=['—','Included','Included'];
  const service=['—','—','Included'];
  const sections=[
    ['Digital QR menu',[
      ['Products per venue',['30','1,000','1,000']],
      ['Photos, variants, extras and UK allergen declarations',included],
      ['Menu themes and brand colours',included],
      ['Venue logo on digital and printed menus',paid],
      ['Smart QR branding removed from the guest menu',paid]
    ]],
    ['Menu import & translation',[
      ['CSV and spreadsheet imports',included],
      ['Guest language selector and saved translations',included],
      ['PDF or photo import and AI translation drafts',assistantReady?included:['Temporarily unavailable','Temporarily unavailable','Temporarily unavailable']]
    ]],
    ['Print & table QR codes',[
      ['Menu PDF and general QR code',included],
      ['Named table QR codes for browsing (up to 100)',included]
    ]],
    ['Guest menu assistant',[
      ['AI search of the published menu',assistantReady?paid:['—','Temporarily unavailable','Temporarily unavailable']]
    ]],
    ['Table service & staff board',[
      ['Waiter and bill requests from table QR codes',service],
      ['Dish lists, confirmed orders and open table bills',service],
      ['Staff accounts, desktop alerts and dish-list CSV export',service]
    ]],
    ['Service insights',[
      ['Menu completeness and menu view count',included],
      ['Request volumes and response times',service]
    ]]
  ];
  return `<section class="suite-comparison" aria-labelledby="compare-plans-title">
    <h2 id="compare-plans-title">Compare plan features</h2>
    <div class="suite-comparison-scroll" role="region" aria-labelledby="compare-plans-title" tabindex="0">
      <table>
        <thead><tr><th scope="col">Product and features</th>${suitePlans.map(plan=>`<th scope="col">${plan.name}</th>`).join('')}</tr></thead>
        ${sections.map(([title,rows])=>`<tbody><tr class="suite-comparison-group"><th colspan="4" scope="rowgroup">${title}</th></tr>${rows.map(([feature,values])=>`<tr><th scope="row">${feature}</th>${values.map(value=>`<td>${value==='—'?'<span aria-label="Not included">—</span>':value}</td>`).join('')}</tr>`).join('')}</tbody>`).join('')}
      </table>
    </div>
    <p class="muted">Want to see how each feature works? <a href="/#products">Explore the products</a>.</p>
  </section>`;
}
function suitePricing(){
  return `<div class="suite-pricing"><div class="suite-section-head">
    <div><h1>Smart QR plans</h1><p>One plan per venue. Start with a 14-day Service trial and keep a Free menu afterwards.</p></div>
    <div><label>Billing currency<select onchange="billingCurrency=this.value;render()"><option value="gbp" ${billingCurrency==='gbp'?'selected':''}>GBP (£)</option><option value="eur" ${billingCurrency==='eur'?'selected':''}>EUR (€)</option></select></label><div class="switcher" aria-label="Billing period"><button class="${annual?'':'active'}" aria-pressed="${!annual}" onclick="annual=false;render()">Monthly</button><button class="${annual?'active':''}" aria-pressed="${annual}" onclick="annual=true;render()">Yearly</button></div></div>
  </div>
  ${billingReady?'':`<p class="suite-plan-notice">Paid checkout is currently unavailable. You can start a Free menu and try Service for 14 days.</p>`}
  <div class="suite-plan-grid">${suitePlans.map(plan=>`<article class="suite-plan ${plan.name==='Service'?'suite-plan-service':''}">
    <h2>${plan.name}</h2><p>${plan.description}</p>
    <div class="suite-plan-price">${billingCurrency==='gbp'?'£':'€'}${plan.price&&annual?plan.price*10:plan.price}<span> / ${plan.price&&annual?'year':'month'}</span></div>
    <ul>${plan.features.filter(item=>assistantReady||item!=='AI menu assistant for guests').map(item=>`<li>${item}</li>`).join('')}</ul>
    ${plan.price&&billingReady?`<button class="btn primary" onclick="choose('${plan.name}')">Choose ${plan.name}</button>`:!plan.price?'<button class="btn primary" onclick="onboard()">Start free</button>':'<a class="btn" href="/#contact">Ask about '+plan.name+'</a>'}
  </article>`).join('')}</div>${suitePlanComparison()}</div>`;
}
pricingHtml=suitePricing;

productCatalogue.find(product=>product.title==='Table service & staff board').features.push(
  'Confirm dish lists, track preparation and group orders into an open table bill. Take payment through your till.',
  'Invite staff to a service-only workspace and revoke access from the owner account.',
  'Export claimed and resolved dish lists to CSV. Enable desktop notifications while the board stays open.'
);
productCatalogue.push({
  title:'Guest menu assistant',plan:'From Menu Pro',
  summary:'Help guests find dishes and drinks by describing what they want directly from the menu.',
  features:['Search the published menu by dish, flavour or budget.','See suggestions with the restaurant’s published name and price.','Ask the restaurant team about allergies and dietary safety.'],
  href:'/#pricing',action:'Compare plans'
});
const suiteProducts=productsPage;
productsPage=function(){
  const assistant=productCatalogue.find(product=>product.title==='Guest menu assistant');
  assistant.plan=assistantReady?'From Menu Pro':'From Menu Pro · temporarily unavailable';
  return suiteProducts().replace('<section class="quick-start">',`<section class="suite-integration"><h2>Integrations and availability</h2>
    <p>Use the Service board beside your existing POS. Staff confirm the guest’s list in Smart QR and can enter the order in their till for billing. Export dish lists to CSV for follow-up.</p>
    <p>Guests can request the bill and pay the restaurant directly. Contact us about POS integrations, QR payments or alerts that continue after closing the board.</p>
    <a class="btn" href="/#contact">Contact Smart QR</a></section><section class="quick-start">`);
};

home=function(){
  return `<main class="suite-home">
    <section class="suite-home-hero"><div class="wrap suite-hero-layout">
      <div class="suite-hero-copy"><h1>Digital menus and table service for hospitality</h1>
        <p>Publish your menu, print QR codes for your venue and give your team one place to manage guest requests.</p>
        <div class="actions"><button class="btn primary" onclick="onboard()">Create your free menu</button><a class="btn" href="/#products">Explore products</a></div>
        <p class="suite-hero-note">Free menu plan · 14-day Service trial · No card required</p>
      </div>
      <div class="suite-hero-demo" id="hero-scene">${heroScene()}</div>
    </div></section>
    <div class="wrap">
      <section class="suite-home-products">
        <div class="suite-section-head"><div><h2>From the first scan to the bill request</h2><p>Choose the tools that fit the way your venue serves.</p></div><a class="btn" href="/#products">View all products</a></div>
        <div class="suite-home-grid">
          ${[productCatalogue[0],productCatalogue[2],productCatalogue[3]].map(product=>`<article class="product-summary"><h3>${product.title}</h3><p>${product.summary}</p><a class="suite-text-link" href="${product.href}">${product.action}</a></article>`).join('')}
        </div>
      </section>
      <section class="suite-launch"><div><h2>See a guest scan in action</h2><p>Browse a sample menu, send a table request and see what the team receives.</p></div><a class="btn" href="/#product">Open the service demo</a></section>
      ${marketingFooter()}
    </div>
  </main>`;
};
const suiteHeader=header;
header=function(){
  return suiteHeader().replace('<header>','<header class="suite-header">');
};
if(ready)render();


const dashboardWithSingleLocation=dashboard;
dashboard=function(){
  const content=dashboardWithSingleLocation();
  if(!session||!restaurant)return content;
  const selected=locationChoices.find(item=>item.id===restaurant.id);
  const options=locationChoices.map(item=>`<option value="${esc(item.id)}" ${item.id===restaurant.id?'selected':''}>${esc(item.name)}</option>`).join('');
  return `<section class="wrap cotiso-location-switch" aria-label="Restaurant locations">
    <label>Current restaurant or location<select onchange="switchRestaurantLocation(this.value)">${selected?options:`<option selected>${esc(restaurant.name)}</option>`}</select></label>
    <button class="btn small" onclick="openRestaurantLocationForm()">Add restaurant or location</button>
    <a class="btn small" href="/#platform">QR workspace</a>
  </section>`+content;
};
function switchRestaurantLocation(id){
  localStorage.setItem('cotiso-restaurant-location',id);
  location.reload();
}
function openRestaurantLocationForm(){
  modal('<h2>Add restaurant or location</h2><p class="muted">Use the venue and branch name, for example Greenhouse · Camberley. Your new location starts on Free with its own private menu.</p><form onsubmit="saveRestaurantLocation(event)"><label>Restaurant or location name<input name="name" required maxlength="80"></label><button class="btn primary">Create location</button><p role="alert"></p></form>');
}
async function saveRestaurantLocation(event){
  event.preventDefault();
  const form=event.currentTarget,button=form.querySelector('button');
  button.disabled=true;
  try{
    const result=await api('restaurant/location','POST',{name:new FormData(form).get('name')});
    switchRestaurantLocation(result.restaurant.id);
  }catch(error){form.querySelector('[role=alert]').textContent=error.message;button.disabled=false}
}
if(ready)render();
