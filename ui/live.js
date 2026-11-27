let invoiceList=null,invoiceError='',invoiceLoading=false;
// Server-backed application. Browser storage is used only for local preferences.
let session=null,restaurant=null,tables=[],guest=null,guestCalls=[],billingReady=false,ready=false,busy=false,boardError='',lastPoll=0,publicLanguage='en';
let pollTimer,seenRequests=new Set(),soundOn=false,loadError='';
const originalHome=home,originalMenu=menu,originalEdit=edit;
state={items:[],calls:[],venue:'',currency:'EUR',plan:'Free'};
async function api(path,method='GET',data){const response=await fetch('/api/'+path,{method,credentials:'same-origin',headers:data instanceof Blob?{'Content-Type':data.type}:data?{'Content-Type':'application/json'}:{},body:data instanceof Blob?data:data?JSON.stringify(data):undefined});let result;try{result=await response.json()}catch{throw Error('The server returned an unexpected response. Please reload.')}if(!response.ok){let error=Error(result.error||'Request failed.');error.status=response.status;throw error}return result}
const signIn=()=>location.assign('/signin-with-chatgpt?return_to='+encodeURIComponent('/#dashboard'));
function applyRestaurant(r){restaurant=r;state.venue=r.name;state.currency=r.currency;state.items=r.items;state.plan=r.plan}
async function loadSession(){const s=await api('session');session=s.user;billingReady=s.billingReady;if(s.restaurant)applyRestaurant(s.restaurant);else restaurant=null;return s}
const overdueAlerted=new Set();
const guestOrder=new Map();
let guestCategory=null;
const orderLabels={
 en:['Ready to order','Send your list to the waiter. Confirm your order at the table.','No dishes selected','Order list sent','Add','Remove'],
 ro:['Sunt gata să comand','Trimite lista ospătarului. Confirmă comanda la masă.','Niciun preparat selectat','Lista a fost trimisă','Adaugă','Elimină'],
 de:['Bereit zu bestellen','Sende deine Liste und bestätige die Bestellung am Tisch.','Keine Gerichte ausgewählt','Liste gesendet','Hinzufügen','Entfernen'],
 fr:['Prêt à commander','Envoyez votre liste et confirmez la commande à table.','Aucun plat sélectionné','Liste envoyée','Ajouter','Retirer'],
 es:['Listo para pedir','Envía tu lista y confirma el pedido en la mesa.','Ningún plato seleccionado','Lista enviada','Añadir','Quitar'],
 it:['Pronto per ordinare','Invia la lista e conferma l’ordine al tavolo.','Nessun piatto selezionato','Lista inviata','Aggiungi','Rimuovi'],
 pt:['Pronto para pedir','Envie a lista e confirme o pedido à mesa.','Nenhum prato selecionado','Lista enviada','Adicionar','Remover'],
 nl:['Klaar om te bestellen','Stuur je lijst en bevestig de bestelling aan tafel.','Geen gerechten geselecteerd','Lijst verstuurd','Toevoegen','Verwijderen'],
 sv:['Redo att beställa','Skicka listan och bekräfta beställningen vid bordet.','Inga rätter valda','Listan skickad','Lägg till','Ta bort'],
 fi:['Valmis tilaamaan','Lähetä lista ja vahvista tilaus pöydässä.','Ei valittuja annoksia','Lista lähetetty','Lisää','Poista'],
 da:['Klar til at bestille','Send listen og bekræft bestillingen ved bordet.','Ingen retter valgt','Liste sendt','Tilføj','Fjern'],
 no:['Klar til å bestille','Send listen og bekreft bestillingen ved bordet.','Ingen retter valgt','Listen er sendt','Legg til','Fjern'],
 pl:['Chcę zamówić','Wyślij listę i potwierdź zamówienie przy stoliku.','Nie wybrano dań','Lista wysłana','Dodaj','Usuń'],
 cs:['Chci objednat','Pošlete seznam a potvrďte objednávku u stolu.','Nebyla vybrána žádná jídla','Seznam odeslán','Přidat','Odebrat'],
 hu:['Készen állok a rendelésre','Küldd el a listát, és erősítsd meg a rendelést az asztalnál.','Nincs kiválasztott étel','Lista elküldve','Hozzáadás','Eltávolítás'],
 el:['Έτοιμοι να παραγγείλουμε','Στείλτε τη λίστα και επιβεβαιώστε την παραγγελία στο τραπέζι.','Δεν επιλέχθηκαν πιάτα','Η λίστα στάλθηκε','Προσθήκη','Αφαίρεση']
};
const isOverdue=c=>c.status==='new'&&Date.now()-c.at>=180000;
async function workspace(refresh=true){const data=await api('workspace');applyRestaurant(data.restaurant);tables=data.tables;state.calls=data.requests.map(c=>({...c,table:c.tableNumber,tableLabel:data.tables.find(t=>t.number===c.tableNumber)?.label}));const newCalls=state.calls.filter(c=>c.status==='new'&&!seenRequests.has(c.id));const overdue=state.calls.filter(c=>isOverdue(c)&&!overdueAlerted.has(c.id));
if(lastPoll&&soundOn&&(newCalls.length||overdue.length))beep();
overdue.forEach(c=>overdueAlerted.add(c.id));state.calls.forEach(c=>seenRequests.add(c.id));lastPoll=Date.now();boardError='';if(refresh&&view==='dashboard')render()}
async function loadGuest(){const q=new URLSearchParams(location.search),slug=q.get('r'),token=q.get('t');if(!slug)throw Error('No restaurant was selected. Open a menu link or try the example menu.');const data=await api('public/'+encodeURIComponent(slug)+(token?'?table='+encodeURIComponent(token):''));const first=!guest;guest=data.restaurant;guestCalls=data.requests;const available=new Set(guest.items.map(item=>item.id));for(const id of guestOrder.keys())if(!available.has(id))guestOrder.delete(id);if(first){guestCategory=null;const preferred=read('smart-qr-menu-language:'+guest.slug,null)||navigator.language?.split('-')[0];publicLanguage=Object.hasOwn(LOCALES,preferred)?preferred:(guest.originalLanguage||'en');}return data}
route=async function(){clearInterval(pollTimer);view=location.hash.slice(1).split('?')[0]||'home';loadError='';if(!ready)return;render();try{if(view==='dashboard'&&session&&restaurant){await workspace();startPoll()}else if(view==='menu'){guest=null;render();await loadGuest();render();api('view/'+encodeURIComponent(guest.slug),'POST',{}).catch(()=>{});startPoll()}}catch(e){loadError=e.message;render()}};
function startPoll(){clearInterval(pollTimer);pollTimer=setInterval(async()=>{if(document.hidden||busy)return;try{if(view==='dashboard'&&restaurant&&['service','overview'].includes(tab)&&!document.querySelector('.modal-bg')){await workspace()}else if(view==='menu'&&guest){await loadGuest();render()} }catch(e){boardError=e.message;if(view==='dashboard'&&tab==='service')render()}},4000)}
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&ready){if(view==='dashboard'&&restaurant)workspace().catch(e=>toast(e.message));if(view==='menu'&&guest)loadGuest().then(render).catch(e=>toast(e.message))}});
go=function(v){if(location.hash==='#'+v)route();else location.hash=v};
function openGuest(t){if(!restaurant)return;const url=new URL('/',location.origin);url.searchParams.set('r',restaurant.slug);if(t)url.searchParams.set('t',t);url.hash='menu';location.assign(url.href)}
header=function(){return `<div class="wrap"><header><a class="brand" href="/#home"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="40" height="40" aria-hidden="true" focusable="false"><rect width="48" height="48" rx="12" fill="#e60000"/><g fill="none" stroke="#fff" stroke-width="3.5" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><rect x="27" y="9" width="12" height="12" rx="2"/><rect x="9" y="27" width="12" height="12" rx="2"/></g><g fill="#fff"><rect x="13" y="13" width="4" height="4" rx="1"/><rect x="31" y="13" width="4" height="4" rx="1"/><rect x="13" y="31" width="4" height="4" rx="1"/><path d="M27 27h5v5h7v7h-5v-3h-7z"/><rect x="35" y="27" width="4" height="4" rx="1"/></g></svg><span>Smart<span style="color:#e60000"> QR</span></span></a><nav class="nav"><a class="desktop" href="/#home" onclick="setTimeout(()=>document.getElementById('how')?.scrollIntoView({behavior:'smooth'}),100)">How it works</a><a class="desktop" href="/#home" onclick="setTimeout(()=>document.getElementById('pricing')?.scrollIntoView({behavior:'smooth'}),100)">Pricing</a><a href="/#demo" class="desktop">Example menu ↗</a><button class="btn small primary" onclick="go('dashboard')">${session?'My restaurant →':'Get started →'}</button></nav></header></div>`};
home=function(){return originalHome().replaceAll("go('menu')","go('demo')").replace('No card required in demo','No card required').replace('Proposed launch pricing per location. No live billing in this preview.','Per location. Start with a 14-day Service trial; your basic menu stays free.').replace('Menu analytics — planned','Menu view count').replace('Multiple-language content','Manually managed translations').replace('Your colours and identity','Your restaurant name and photos').replace('Unlimited products','Up to 1,000 products').replace('© '+new Date().getFullYear()+' Smart QR · Working concept','© '+new Date().getFullYear()+' Smart QR').replace('Try the guest menu, then pick up the request in the workspace.','Explore an example menu, then create your own restaurant.').replace('Take a seat at table 7 →','Explore an example menu →').replace('See both sides of better service.','Your next menu starts here.').replace('No app for guests','No app for guests')};
render=function(){let content='';if(!ready)content='<div class="wrap section"><h2>Opening Smart QR…</h2></div>';else if(loadError)content=`<div class="wrap section"><h2>We couldn’t open this page.</h2><p class="muted">${esc(loadError)}</p><button class="btn primary" onclick="route()">Try again</button> <a class="btn" href="/#home">Home</a></div>`;else if(view==='home')content=home();else if(view==='demo')content=demo();else if(view==='menu')content=guest?liveMenu():'<div class="wrap section"><h2>Loading your menu…</h2></div>';else content=dashboard();document.getElementById('root').innerHTML=header()+content};
function demo(){const before=state;state={items:seed,calls:[],venue:'The Greenhouse',currency:'EUR',plan:'Free'};const html=originalMenu().replace('Illustrative menu · Review allergens with the restaurant before ordering.','Example menu — not a real restaurant. All dishes and prices are illustrative.').replace("tab='service';go('dashboard')","onboard()").replace('Open staff demo to pick up your request →','Create your own restaurant →').replace('Powered by Smart QR · Interactive preview','Powered by Smart QR · Example menu');state=before;return html}
onboard=function(){if(!session)return modal(`<span class="eyebrow">Your restaurant, online</span><h2>Start with a secure account.</h2><p class="muted">Sign in with ChatGPT to create and manage your restaurant. Your menu is stored securely on the server, separate from other restaurants.</p><a href="/signin-with-chatgpt?return_to=%2F%23dashboard" target="_top" class="btn primary">Continue with ChatGPT →</a><p class="fine">No card required. A 14-day Service trial begins when you create your restaurant.</p>`);if(restaurant){closeModal();return go('dashboard')}modal(`<span class="eyebrow">Make yourself at home</span><h2>Create your restaurant.</h2><p class="muted">Your menu starts as a private draft. Publish it when it is ready.</p><form onsubmit="start(event)"><label>Restaurant name<input name="name" maxlength="80" placeholder="e.g. The Greenhouse" required></label><button class="btn primary" id="create-btn">Create restaurant →</button></form>`)};
start=async function(e){e.preventDefault();if(busy)return;busy=true;const btn=e.target.querySelector('button');btn.disabled=true;btn.textContent='Creating…';try{const result=await api('restaurant','POST',{name:String(new FormData(e.target).get('name')||'')});applyRestaurant(result.restaurant);closeModal();tab='menu';go('dashboard');await workspace();toast('Your restaurant is ready. Add products, then publish your menu.')}catch(err){toast(err.message);btn.disabled=false;btn.textContent='Create restaurant →'}finally{busy=false}};
choose=function(plan){if(!session||!restaurant)return onboard();if(plan==='Free')return go('dashboard');modal(`<h2>${esc(plan)}</h2><p class="muted">${annual?'Yearly billing: pay for 10 months, use 12.':'Monthly billing. Cancel through the billing portal.'}</p>${!billingReady?'<p class="muted">Paid subscriptions are not activated yet. You can use the Service trial now, then continue with your free menu.</p>':`<button class="btn primary" onclick="checkout('${plan}')">Continue to secure checkout →</button>`}<p class="fine">Card processing is handled by Stripe. Payment is only taken after you confirm in checkout.</p>`)};
async function checkout(plan){try{const r=await api('billing/checkout','POST',{plan,interval:annual?'year':'month'});location.assign(r.url)}catch(e){toast(e.message)}}
async function portal(){try{const r=await api('billing/portal','POST',{});location.assign(r.url)}catch(e){toast(e.message)}}
function dashboard(){if(!session)return `<div class="wrap section"><span class="eyebrow">Restaurant workspace</span><h2>Your menu deserves its own home.</h2><p class="lead">Sign in to create your restaurant, publish your menu and manage table requests.</p><a class="btn primary" href="/signin-with-chatgpt?return_to=%2F%23dashboard" target="_top">Continue with ChatGPT →</a></div>`;if(!restaurant)return `<div class="wrap section"><span class="eyebrow">Welcome to Smart QR</span><h2>Let's create your first restaurant.</h2><p class="muted">Signed in as ${esc(session.email)}. Start with an empty menu and a 14-day Service trial.</p><button class="btn primary" onclick="onboard()">Create restaurant →</button></div>`;
const pending=state.calls.filter(c=>c.status!=='done').sort((a,b)=>a.at-b.at),trialDays=Math.max(0,Math.ceil((restaurant.trialEnd-Date.now())/86400000));return `<div class="wrap app"><aside class="sidebar"><div class="venue"><span class="dot"></span>${esc(state.venue)}<p class="fine">${esc(state.plan)}${restaurant.trial?' trial · '+trialDays+' days left':''}</p></div>${[['overview','◫','Overview'],['insights','↗','Service pulse'],['menu','☷','Menu editor'],['service','♧','Service board'],['qr','▦','Tables & QR'],['billing','◇','Subscription'],...(session?.isAdmin?[['enquiries','✉','Enquiries']]:[]),['settings','⚙','Settings']].map(t=>`<button class="${tab===t[0]?'active':''}" onclick="tab='${t[0]}';render()">${t[1]} &nbsp; ${t[2]}${t[0]==='service'&&pending.length?' ('+pending.length+')':''}</button>`).join('')}</aside><main class="workspace"><div class="topline"><div><span class="eyebrow">${restaurant.published?'Published menu':'Private draft'} · ${esc(state.plan)}${restaurant.trial?' trial':''}</span><h1>${{overview:'A clear view of your day.',insights:'A better service starts with a clear view.',menu:'Make the menu your own.',service:'Every guest, taken care of.',qr:'Share your menu & QR codes',settings:'The details that make it yours.',billing:'A plan that fits your place.',enquiries:'Conversations start here.'}[tab]}</h1></div><div><button class="btn small" onclick="previewGuest()">${restaurant.published?'Open guest menu ↗':'Preview menu'}</button> ${restaurant.published?`<button class="btn primary small" onclick="showMenuCodes()">Get QR code</button>`:`<button class="btn primary small" onclick="publishMenu()">Publish menu →</button>`}</div></div>${restaurant.trial?`<p class="fine">Service trial: ${trialDays} days remaining. Afterwards, your free menu supports up to 30 products. No automatic charge.</p>`:''}${tab==='overview'?overviewHtml(pending):tab==='insights'?insightsHtml():tab==='menu'?editorHtml():tab==='service'?serviceHtml(pending):tab==='qr'?qrHtml():tab==='billing'?billingHtml():tab==='enquiries'?enquiriesHtml():settingsHtml()}</main></div>`}
function overviewHtml(pending){return `<div class="stats"><div class="card"><span class="muted">Menu products</span><strong>${state.items.length}</strong><span class="fine">${state.items.filter(d=>d.available).length} available</span></div><div class="card"><span class="muted">Open requests</span><strong>${pending.length}</strong><span class="fine">Server-saved requests</span></div><div class="card"><span class="muted">Menu opens</span><strong>${restaurant.views}</strong><span class="fine">Includes repeat visits</span></div></div><div class="card"><h2>${restaurant.published?'Your menu is on the table.':'Your first menu starts here.'}</h2><p class="muted">${restaurant.published?'Share your menu link or download table codes. Keep the service board open on a tablet to receive requests.':'Add your dishes, check the prices and allergens, then publish your menu. Your draft is visible only in your workspace.'}</p><div class="actions"><button class="btn primary" onclick="tab='menu';render()">Edit menu →</button><button class="btn" onclick="tab='qr';render()">Tables & QR</button></div>${restaurant.published?`<label>Menu link<input readonly value="${esc(menuURL())}" onclick="this.select()"></label>`:''}</div><div class="card" style="margin-top:20px"><h3>Before your first service</h3><ul class="muted" style="line-height:2"><li>Review ingredients and allergens yourself.</li><li>Scan a table QR on another phone and send a request.</li><li>Open Service board on the tablet and enable sound.</li><li>Keep the tablet awake and connected to the internet.</li></ul><p class="fine">Published menus are public. Your restaurant workspace requires sign-in.</p></div>`}
function editorHtml(){return `${menuSetupHtml()}<div class="topline"><span class="muted">${state.items.length} / ${restaurant.limit} products · saved on server</span><div><button class="btn small" onclick="importDialog()">Import products</button> ${!restaurant.published&&state.items.length?'<button class="btn small" onclick="openPrintDownload()">Download menu</button> ':''}<button class="btn primary small" onclick="edit()">+ Add product</button></div></div>${!state.items.length?`<div class="card empty"><h3>A fresh start.</h3><p>Add your first product or import your menu from a CSV file.</p><button class="btn primary" onclick="edit()">Add first product</button></div>`:`<div class="card" style="padding:12px;overflow:auto"><table class="table"><thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Available</th><th></th></tr></thead><tbody>${state.items.map(d=>`<tr><td>${d.image?`<img src="${esc(d.image)}" alt="">`:''}${esc(d.name)}</td><td>${esc(d.category)}</td><td>${money(d.price)}</td><td><button class="btn small" onclick="toggle('${d.id}')">${d.available?'Yes':'Sold out'}</button></td><td><button class="btn small" onclick="edit('${d.id}')">Edit</button></td></tr>`).join('')}</tbody></table></div>`}<p class="fine">Import from PDF, photo, CSV or pasted spreadsheet rows, then review before saving.</p>`}
function serviceHtml(pending){if(!restaurant.service)return `<div class="card"><h2>Table service needs the Service plan.</h2><p class="muted">Your menu remains available. Upgrade to enable waiter calls and bill requests.</p><button class="btn primary" onclick="choose('Service')">Explore Service</button></div>`;return `<div class="topline"><span class="muted"><span class="dot" style="background:${boardError?'#b34830':'#7eaf50'}"></span>${boardError?'Connection interrupted — retrying':lastPoll?'Updated '+new Date(lastPoll).toLocaleTimeString():'Connecting…'} · refreshes every 4 seconds</span><button class="btn small" onclick="enableSound()">${soundOn?'♬ Sound on':'♬ Enable sound'}</button></div>${boardError?`<div class="card"><b>Connection problem</b><p class="muted">${esc(boardError)}. Do not rely on this screen until it reconnects.</p></div>`:''}${pending.length?pending.map(c=>`<div class="call"><div><b>${esc(c.tableLabel||'Table '+c.table)} · ${c.type==='OrderReady'?'Ready to order':esc(c.type)}</b>${c.items?.length?`<ul>${c.items.map(item=>`<li>${item.quantity} × ${esc(item.name)}</li>`).join('')}</ul><p class="fine">Confirm the list with the guest and enter the order in your usual till.</p>`:''}${isOverdue(c)?'<strong style="color:#a52b20">Waiting 3+ minutes</strong>':''}<span class="fine">${new Date(c.at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})} · ${c.status==='taken'?'Taken by staff':'Waiting for your team'}</span></div><button class="btn ${c.status==='new'?'primary':''} small" onclick="advance('${c.id}')">${c.status==='new'?'Take request':'Mark resolved'} →</button></div>`).join(''):'<div class="card empty"><h3>All caught up.</h3><p>New requests will appear here. Scan a published table QR to test delivery from another device.</p></div>'}<h3>Resolved in the last 24 hours</h3><p class="muted">${state.calls.filter(c=>c.status==='done').length} requests.</p><p class="fine">Keep this board open, enable sound, and prevent the tablet from sleeping. Sound permission is needed again after a reload.</p>`}
function menuURL(t){const u=new URL('/',location.origin);u.searchParams.set('r',restaurant.slug);if(t)u.searchParams.set('t',t);u.hash='menu';return u.href}
function menuSetupHtml(){
  if(restaurant.published)return `<section class="card" style="margin-bottom:20px"><h2>Your menu is live</h2><p class="muted">Open it as a guest or get the QR code to print and share.</p><div class="actions"><a class="btn" href="${esc(menuURL())}" target="_blank" rel="noopener">Open guest menu ↗</a><button class="btn primary" onclick="showMenuCodes()">Get QR code</button><button class="btn" onclick="openPrintDownload()">Download menu</button></div></section>`;
  return `<section class="card" style="margin-bottom:20px"><h2>From menu to QR code</h2><p class="muted">${state.items.length?'Preview your menu, then publish it to get a QR code your guests can scan.':'Add your first product below. You can then preview and publish your menu to get its QR code.'}</p></section>`;
}
function showMenuCodes(){tab='qr';render();window.scrollTo(0,0)}
function tableConfigHtml(){
  const count=tables.filter(t=>t.enabled).length;
  return `<section class="card" style="margin-bottom:20px"><h2>Configure tables</h2><form onsubmit="saveTableCount(event)"><label>Number of active tables<input name="count" type="number" min="0" max="100" value="${count}" required></label><p class="fine">Applies to tables numbered 1 through the selected count. Higher numbers are disabled and their existing QR codes are kept.</p><button class="btn primary">Apply table count</button></form>${restaurant.published?'':`<div style="margin-top:14px">${tables.filter(t=>t.enabled).map(t=>`<button class="btn small" onclick="editTableDetails('${t.id}')">${esc(t.label||'Table '+t.number)} · Edit</button>`).join(' ')}</div>`}</section>`;
}
async function saveTableCount(event){
  event.preventDefault();
  const form=event.currentTarget,button=form.querySelector('button');
  button.disabled=true;
  try{await api('tables','PUT',{count:Number(form.elements.count.value)});await workspace();toast('Table count saved.')}
  catch(e){toast(e.message)}finally{button.disabled=false}
}
function editTableDetails(id){
  const t=tables.find(table=>table.id===id);
  if(!t)return;
  modal(`<h2>Table ${t.number} details</h2><form onsubmit="saveTableDetails(event,'${t.id}')"><label>Custom name or number<input name="label" value="${esc(t.label||'')}" placeholder="Table ${t.number}" maxlength="60"></label><label>Number of seats<input name="seats" type="number" min="1" max="100" value="${t.seats||''}"></label><label>Area<select name="area"><option value="">Unspecified</option><option value="inside" ${t.area==='inside'?'selected':''}>Inside</option><option value="outside" ${t.area==='outside'?'selected':''}>Outside</option></select></label><button class="btn primary">Save table</button></form>`);
}
async function saveTableDetails(event,id){
  event.preventDefault();
  const form=event.currentTarget,button=form.querySelector('button');
  button.disabled=true;
  try{
    await api('table/'+id,'PUT',{label:form.elements.label.value,seats:Number(form.elements.seats.value),area:form.elements.area.value});
    await workspace();closeModal();toast('Table details saved.');
  }catch(e){toast(e.message)}finally{button.disabled=false}
}
function qrHtml(){
  if(!restaurant.published)return tableConfigHtml()+menuSetupHtml()+`<button class="btn primary" onclick="tab='menu';render()">Go to menu editor →</button>`;
  const qrURL='/api/qr?r='+encodeURIComponent(restaurant.slug);
  return tableConfigHtml()+`<section class="card" style="margin-bottom:20px"><h2>Your menu QR code</h2><p class="muted">Print this code for your counter or window. Guests point their phone camera at it and tap the link to open the menu. They can choose their language at the top. No app or account is required.</p><img src="${esc(qrURL)}" width="180" height="180" alt="Scannable QR code for your public menu"><div class="actions"><a class="btn primary" href="${esc(qrURL)}" download="smart-qr-menu.svg">Download menu QR ↓</a><a class="btn" href="${esc(menuURL())}" target="_blank" rel="noopener">Open guest menu ↗</a><button class="btn" onclick="copyLink()">Copy menu link</button><button class="btn" onclick="openPrintDownload('qr')">Download printable QR card</button></div></section>
  <h2>QR codes by table</h2><p class="muted">Print each code for its matching table. With Service enabled, waiter and bill requests from a table go to your Service board.</p><div class="qrgrid">${tables.map(t=>`<div class="card"><h3>${esc(t.label||'Table '+t.number)}</h3><p class="fine">${[t.seats?t.seats+' seats':'',t.area==='inside'?'Inside':t.area==='outside'?'Outside':''].filter(Boolean).join(' · ')}</p><button class="btn small" onclick="editTableDetails('${t.id}')">Edit table</button><img src="${qrURL}&amp;t=${esc(t.token)}" alt="QR for table ${t.number}" loading="lazy"><p class="fine">${t.enabled?'Active':'Disabled'}</p>${t.enabled?`<a class="btn small" href="${qrURL}&amp;t=${esc(t.token)}" download="smart-qr-table-${t.number}.svg">Download table QR ↓</a><p><a class="btn small" href="${esc(menuURL(t.token))}" target="_blank" rel="noopener">Open table menu ↗</a> <button class="btn small" onclick="openPrintDownload('qr','${esc(t.token)}')">Printable QR card</button></p>`:''}<button class="btn small" onclick="tableAction('${t.id}',${!t.enabled})">${t.enabled?'Disable':'Enable'}</button> <button class="btn small" onclick="rotateTable('${t.id}')">Replace code</button></div>`).join('')}</div><p class="fine"><button class="btn small" onclick="publishMenu()">Unpublish menu</button></p>`;
}
function billingHtml(){if(invoiceList===null&&!invoiceLoading&&!invoiceError)loadInvoices();return `<div class="card"><h2>${esc(restaurant.plan)}${restaurant.trial?' trial':''}</h2><p class="muted">${restaurant.trial?'Your trial ends '+new Date(restaurant.trialEnd).toLocaleDateString()+'. No card is on file and no automatic charge will occur.':restaurant.paid?'Your subscription is managed securely by Stripe.':'Your basic digital menu is free, with up to 30 products.'}</p>${!billingReady?'<p class="muted">Paid subscriptions are not activated yet. The restaurant workspace and free menu are available.</p>':''}<div class="actions"><button class="btn primary" onclick="choose('Menu Pro')">Menu Pro · €12/month</button><button class="btn" onclick="choose('Service')">Service · €29/month</button></div>${restaurant.subscriptionStatus?'<button class="btn" onclick="portal()">Manage / cancel subscription ↗</button>':''}<p class="fine">Yearly billing is available from the pricing page. Order payments are not included in this release.</p></div>${billingProfileHtml()}${invoicesHtml()}`}
function settingsHtml(){return `<div class="card"><form onsubmit="settings(event)"><label>Restaurant name<input id="venue" required maxlength="80" value="${esc(state.venue)}"></label><label>Original menu language<select id="original-language">${Object.entries(LOCALES).map(([code,l])=>`<option value="${code}" ${(restaurant.originalLanguage||'en')===code?'selected':''}>${l[0]}</option>`).join('')}</select></label><p class="fine">This is the language of your original product text. Translations are entered separately in the product editor.</p><label>Menu currency<select id="currency">${Object.entries({EUR:'€',GBP:'£',RON:'lei',USD:'$',SEK:'kr',PLN:'zł',DKK:'kr',NOK:'kr',CZK:'Kč',HUF:'Ft'}).map(([code,symbol])=>`<option value="${code}" ${state.currency===code?'selected':''}>${code} — ${symbol}</option>`).join('')}</select></label><p class="fine">Changing currency changes the display symbol; it does not convert prices.</p><button class="btn primary">Save settings</button></form></div><div class="card" style="margin-top:20px"><h3>Your account</h3><p class="muted">${esc(session.email)}</p><a class="btn small" href="/api/export" download>Export restaurant data ↓</a> <a class="btn small" href="/signout-with-chatgpt?return_to=%2F" target="_top">Sign out</a></div>`}
async function persist(changes={}){if(busy)throw Error('Another save is in progress. Please wait.');busy=true;try{const result=await api('restaurant','PUT',{name:state.venue,currency:state.currency,items:state.items,published:restaurant.published,originalLanguage:restaurant.originalLanguage||'en',revision:restaurant.revision,...changes});applyRestaurant(result.restaurant);return result.restaurant}finally{busy=false}}
save=function(){return persist()};
async function saveWithMessage(changes,message){try{await persist(changes);render();toast(message);return true}catch(e){toast(e.message);if(e.status===409)await workspace();return false}}
async function publishMenu(){if(!restaurant.published&&!state.items.length)return toast('Add at least one product before publishing.');if(!restaurant.published){modal(`<h2>Publish your menu?</h2><p class="muted">Confirm that prices, ingredients and allergens are correct. Publishing enables your menu link. The site's overall sharing settings still control who can open it.</p><button class="btn primary" onclick="confirmPublish()">Publish menu</button>`)}else modal('<h2>Take your menu offline?</h2><p class="muted">Guest menu links and new table requests will stop working until you publish again.</p><button class="btn primary" onclick="confirmUnpublish()">Unpublish menu</button>')}
async function confirmPublish(){if(await saveWithMessage({published:true},'Menu published. Your QR code is ready.')){closeModal();showMenuCodes()}}
async function confirmUnpublish(){if(await saveWithMessage({published:false},'Menu unpublished.'))closeModal()}
async function previewGuest(){
  if(restaurant.published)return openGuest();
  const draft=restaurant;
  modal('<h2>Draft preview</h2><p class="muted">Loading your menu…</p>');
  const panel=document.querySelector('#overlay .modal');
  let appearance={};
  try{appearance=await api('appearance')}catch{}
  if(!panel?.isConnected||restaurant!==draft)return;
  modal('<h2>Draft preview</h2><p class="muted">Private preview · Shows the products available to guests.</p>'+
    renderRestaurantMenu({...draft,...appearance,items:draft.items.filter(item=>item.available)},draft.originalLanguage||'en',{preview:true}));
  document.querySelector('#overlay .modal')?.classList.add('menu-preview-modal');
}
edit=function(id){const d=state.items.find(x=>x.id===id)||{name:'',desc:'',price:'',category:'Mains',allergens:'',image:'',translations:{}};modal(`<h2>${id?'Edit product':'Add a delicious detail'}</h2><form onsubmit="saveDish(event,'${id||''}')"><label>Product name<input name="name" value="${esc(d.name)}" required maxlength="120"></label><div class="formgrid"><label>Price<input name="price" type="number" min="0" max="100000" step=".01" value="${d.price}" required></label><label>Category<input name="category" value="${esc(d.category)}" required maxlength="50"></label></div><label>Description<textarea name="desc" maxlength="600">${esc(d.desc)}</textarea></label><label>Allergens — verified by your restaurant<input name="allergens" value="${esc(d.allergens)}" maxlength="250"></label><label>Photo URL (HTTPS or uploaded photo)<input name="image" id="dish-image" value="${esc(d.image)}" placeholder="https://..."></label><label>Or upload JPEG / PNG / WebP (maximum 5 MB)<input type="file" accept="image/jpeg,image/png,image/webp" onchange="uploadPhoto(this)"></label><details><summary class="muted" style="cursor:pointer;margin:12px 0">Translations (optional)</summary>${Object.keys(LOCALES).filter(l=>l!==(restaurant.originalLanguage||'en')).map(lang=>`<div style="margin-top:15px"><b>${LOCALES[lang][0]}</b> <button type="button" class="btn small" data-language="${lang}" onclick="draftDishTranslation(this)">Generate translation</button><p class="fine" data-translation-status role="status"></p></div><label>Translated name<input name="${lang}-name" value="${esc(d.translations?.[lang]?.name||'')}" maxlength="120"></label><label>Category<input name="${lang}-category" value="${esc(d.translations?.[lang]?.category||'')}" maxlength="50"></label><label>Description<textarea name="${lang}-desc" maxlength="600">${esc(d.translations?.[lang]?.desc||'')}</textarea></label><label>Allergens<input name="${lang}-allergens" value="${esc(d.translations?.[lang]?.allergens||'')}" maxlength="250"></label>`).join('')}</details><button class="btn primary">Save product</button> ${id?`<button type="button" class="btn" onclick="removeDish('${id}')">Delete</button>`:''}</form>`)};
async function draftDishTranslation(button){
  const form=button.form,language=button.dataset.language,status=button.parentElement.querySelector('[role=status]');
  const fields=['name','category','desc'];
  const existing=fields.some(field=>form.elements[language+'-'+field].value.trim());
  if(existing&&button.dataset.replace!=='yes'){
    button.dataset.replace='yes';
    status.textContent='Click again to replace the existing translated name, category and description.';
    return;
  }
  button.disabled=true;
  status.textContent='Generating…';
  try{
    const values=Object.fromEntries(fields.map(field=>[field,form.elements[field].value]));
    if(!values.name.trim())throw Error('Enter the original product name first.');
    const {translation}=await api('menu-assist','POST',{action:'translate',language,...values});
    if(fields.some(field=>form.elements[field].value!==values[field]))throw Error('The original text changed. Generate a new translation.');
    for(const field of fields)form.elements[language+'-'+field].value=translation[field];
    delete button.dataset.replace;
    status.textContent='Review the draft and enter any translated allergens yourself before saving.';
  }catch(e){status.textContent=e.message}
  finally{button.disabled=false}
}
async function uploadPhoto(input){const f=input.files[0];if(!f)return;if(f.size>5000000)return toast('Maximum photo size is 5 MB.');input.disabled=true;try{const r=await api('upload','POST',f);document.getElementById('dish-image').value=r.url;toast('Photo uploaded. Save the product to use it.')}catch(e){toast(e.message)}finally{input.disabled=false}}
saveDish=async function(e,id){e.preventDefault();const f=new FormData(e.target),translations={};for(const lang of Object.keys(LOCALES).filter(l=>l!==(restaurant.originalLanguage||'en'))){if(f.get(lang+'-name'))translations[lang]={name:f.get(lang+'-name'),category:f.get(lang+'-category'),desc:f.get(lang+'-desc'),allergens:f.get(lang+'-allergens')}}const d={id:id||crypto.randomUUID(),name:String(f.get('name')).trim(),price:Number(f.get('price')),category:String(f.get('category')).trim(),desc:f.get('desc'),allergens:f.get('allergens'),image:f.get('image'),available:state.items.find(x=>x.id===id)?.available??true,translations};const items=id?state.items.map(x=>x.id===id?d:x):[...state.items,d];if(await saveWithMessage({items},'Product saved on the server.'))closeModal()};
removeDish=function(id){modal(`<h2>Delete this product?</h2><p class="muted">It will be removed from the published menu.</p><button class="btn primary" onclick="confirmRemove('${id}')">Delete product</button>`)};
async function confirmRemove(id){if(await saveWithMessage({items:state.items.filter(x=>x.id!==id)},'Product deleted.'))closeModal()}
toggle=async function(id){await saveWithMessage({items:state.items.map(x=>x.id===id?{...x,available:!x.available}:x)},'Availability updated.')};
settings=async function(e){e.preventDefault();await saveWithMessage({name:document.getElementById('venue').value.trim(),currency:document.getElementById('currency').value,originalLanguage:document.getElementById('original-language').value},'Settings saved.')};
let importDraft=[];
importDialog=function(){
  importDraft=[];
  modal(`<h2>Import your menu</h2><label>PDF or menu photo<input type="file" id="menu-document" accept="application/pdf,image/png,image/jpeg,image/webp"></label><button class="btn" onclick="extractMenuDocument(this)">Extract draft from PDF or photo</button><p id="document-status" class="fine" role="status"></p><p class="muted">For spreadsheet import, upload a UTF-8 CSV or paste a range from your spreadsheet, including the header. Required columns: <b>name, price, category</b>. Optional: description, allergens.</p><label>CSV file<input type="file" id="csv" accept=".csv,text/csv"></label><label>Paste from a spreadsheet<textarea id="menu-paste" rows="5" placeholder="name,price,category"></textarea></label><button class="btn primary" onclick="importCSV()">Review products →</button><div id="import-review" aria-live="polite"></div>`);
};
importCSV=async function(){
  const review=document.getElementById('import-review');
  importDraft=[];
  review.innerHTML='';
  try{
    const file=document.getElementById('csv').files[0], pasted=document.getElementById('menu-paste').value.trim();
    if(!file&&!pasted)throw Error('Choose a CSV file or paste spreadsheet rows.');
    if(file&&pasted)throw Error('Use either a file or pasted rows.');
    if(file?.size>1000000||pasted.length>1000000)throw Error('Maximum import size is 1 MB.');
    const source=(file?await file.text():pasted).replace(/^\uFEFF/,'');
    const rows=source.split(/\r?\n/,1)[0].includes('\t')?source.trim().split(/\r?\n/).map(row=>row.split('\t')):parseCSV(source);
    const fields=rows.shift().map(field=>field.trim().toLowerCase());
    if(!['name','price','category'].every(field=>fields.includes(field)))throw Error('Required columns: name, price, category.');
    const items=rows.filter(row=>row.some(value=>value.trim())).map((row,index)=>{
      const get=field=>row[fields.indexOf(field)]?.trim()||'';
      const name=get('name'),category=get('category'),rawPrice=get('price').replace(',','.'),price=Number(rawPrice);
      if(!name||!category||!rawPrice||!Number.isFinite(price)||price<0)throw Error('Check the name, price and category on row '+(index+2)+'.');
      return {id:crypto.randomUUID(),name,price,category,desc:get('description'),allergens:get('allergens'),image:'',available:true};
    });
    if(!items.length)throw Error('No products found.');
    if(state.items.length+items.length>restaurant.limit)throw Error('This import exceeds your plan’s product limit.');
    importDraft=items;
    review.innerHTML=`<h3>Review ${items.length} products</h3><p class="fine">${restaurant.published?'Saving adds these products to your live menu.':'Saving adds these products to your draft.'} Check prices and allergen information before saving.</p><div style="max-height:230px;overflow:auto"><table class="table"><thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Allergens</th></tr></thead><tbody>${items.map(item=>`<tr><td>${esc(item.name)}</td><td>${esc(item.category)}</td><td>${money(item.price)}</td><td>${esc(item.allergens||'Not supplied')}</td></tr>`).join('')}</tbody></table></div><button class="btn primary" onclick="saveImportDraft()">Add products</button>`;
  }catch(e){review.textContent=e.message}
};
async function extractMenuDocument(button){
  const file=document.getElementById('menu-document').files[0],status=document.getElementById('document-status');
  const review=document.getElementById('import-review');
  if(!file||file.size>15000000){status.textContent='Choose a PDF or image up to 15 MB.';return}
  button.disabled=true;
  review.innerHTML='';
  importDraft=[];
  let documentTask;
  try{
    const items=[];
    if(file.type==='application/pdf'||/\.pdf$/i.test(file.name)){
      status.textContent='Opening PDF…';
      const base='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/legacy/build/';
      const pdfjs=await import(base+'pdf.mjs');
      pdfjs.GlobalWorkerOptions.workerSrc=base+'pdf.worker.mjs';
      documentTask=pdfjs.getDocument({data:await file.arrayBuffer(),isEvalSupported:false});
      const pdf=await documentTask.promise;
      if(pdf.numPages>8)throw Error('Use a PDF with up to 8 pages.');
      for(let n=1;n<=pdf.numPages;n++){
        status.textContent='Reading page '+n+' of '+pdf.numPages+'…';
        const page=await pdf.getPage(n),original=page.getViewport({scale:1});
        const viewport=page.getViewport({scale:Math.min(3,1800/Math.max(original.width,original.height))});
        const canvas=document.createElement('canvas');
        canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
        await page.render({canvasContext:canvas.getContext('2d'),viewport,background:'#fff'}).promise;
        items.push(...await extractMenuCanvas(canvas));
      }
    }else{
      if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Use JPEG, PNG, WebP or PDF.');
      status.textContent='Reading photo…';
      const url=URL.createObjectURL(file);
      try{
        const img=await loadMenuImage(url),scale=Math.min(1,1800/Math.max(img.naturalWidth,img.naturalHeight));
        const canvas=document.createElement('canvas');
        canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
        const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
        ctx.drawImage(img,0,0,canvas.width,canvas.height);
        items.push(...await extractMenuCanvas(canvas));
      }finally{URL.revokeObjectURL(url)}
    }
    if(!items.length)throw Error('No dishes were found. Try a clearer file.');
    if(!review.isConnected)return;
    importDraft=items.map(item=>({...item,id:crypto.randomUUID(),allergens:'',image:'',available:false}));
    status.textContent='Review the extraction before saving.';
    review.innerHTML=`<h3>Review ${items.length} extracted products</h3><p class="fine">Check every name and price. Enter verified allergens separately. Saved products stay hidden until you make them available.</p><form onsubmit="saveExtractedMenu(event)"><div style="max-height:300px;overflow:auto">${importDraft.map((item,index)=>`<fieldset><legend>Product ${index+1}</legend><label><input type="checkbox" name="keep-${index}" checked> Include</label><label>Name<input name="name-${index}" value="${esc(item.name)}" maxlength="120"></label><label>Category<input name="category-${index}" value="${esc(item.category)}" maxlength="50"></label><label>Price<input name="price-${index}" type="number" step=".01" min="0" max="100000" value="${item.price??''}"></label><label>Description<textarea name="desc-${index}" maxlength="600">${esc(item.desc)}</textarea></label></fieldset>`).join('')}</div><button class="btn primary">Save hidden products</button></form>`;
  }catch(e){status.textContent=e.message}
  finally{button.disabled=false;if(documentTask)await documentTask.destroy().catch(()=>{})}
}
function loadMenuImage(url){
  return new Promise((resolve,reject)=>{
    const image=new Image();
    image.onload=()=>resolve(image);
    image.onerror=()=>reject(Error('Could not open the image.'));
    image.src=url;
  });
}
async function extractMenuCanvas(canvas){
  let data;
  for(const quality of [.86,.72,.56,.4,.28]){
    data=canvas.toDataURL('image/jpeg',quality).split(',')[1];
    if(data.length<=220000)break;
  }
  if(data.length>220000)throw Error('This page is too detailed. Try a closer crop.');
  return (await api('menu-assist','POST',{action:'extract',image:data})).items;
}
async function saveExtractedMenu(event){
  event.preventDefault();
  const data=new FormData(event.currentTarget);
  const items=importDraft.flatMap((item,index)=>{
    if(!data.has('keep-'+index))return [];
    const get=field=>String(data.get(field+'-'+index)||'').trim();
    const price=get('price');
    return [{...item,name:get('name'),category:get('category'),desc:get('desc'),price:price?Number(price):NaN}];
  });
  if(!items.length)return toast('Select at least one product.');
  if(items.some(item=>!item.name||!item.category||!Number.isFinite(item.price)||item.price<0||item.price>100000))return toast('Enter a name, category and valid price for each selected product.');
  if(state.items.length+items.length>restaurant.limit)return toast('Deselect products to stay within your plan limit.');
  if(await saveWithMessage({items:[...state.items,...items]},items.length+' hidden products saved.')){importDraft=[];closeModal()}
}
async function saveImportDraft(){
  if(!importDraft.length)return;
  if(await saveWithMessage({items:[...state.items,...importDraft]},importDraft.length+' products imported.')){
    importDraft=[];closeModal();
  }
}

enableSound=function(){try{audio=new(window.AudioContext||window.webkitAudioContext)();audio.resume();soundOn=true;beep();render();toast('Sound enabled. Keep this page open and the tablet awake.')}catch(e){toast('Sound is not supported on this browser.')}};
advance=async function(id){try{const c=state.calls.find(x=>x.id===id);await api('request/'+id,'PATCH',{status:c.status==='new'?'taken':'done'});await workspace()}catch(e){toast(e.message);workspace().catch(()=>{})}};
request=async function(type,button){if(view==='demo')return toast('Example only. A real table QR delivers this request to your restaurant.');if(!guest?.table)return toast('Scan the QR on your table to request service.');try{
  if(button)button.disabled=true;
  const items=type==='OrderReady'?[...guestOrder].map(([id,quantity])=>({id,quantity})):undefined;
  const r=await api('request','POST',{token:guest.table.token,type,items});
  if(type==='OrderReady'&&!r.alreadyOpen)guestOrder.clear();
  if(r.request&&!guestCalls.some(call=>call.id===r.request.id))guestCalls.push({...r.request,type});
  render();
  await loadGuest();render();
  toast(r.alreadyOpen?'Your request is already waiting.':type==='OrderReady'?(orderLabels[publicLanguage]||orderLabels.en)[3]:'Request sent. Your restaurant team can now see it.');
}catch(e){toast(e.message)}finally{if(button)button.disabled=false}};
function changeGuestLanguage(language){
  if(!Object.hasOwn(LOCALES,language))return;
  publicLanguage=language;
  try{localStorage.setItem('smart-qr-menu-language:'+guest.slug,JSON.stringify(language))}catch{}
  render();
  document.getElementById('guest-menu-language')?.focus({preventScroll:true});
}
function changeGuestQuantity(button,delta){
  const id=button.dataset.dish;
  const quantity=Math.min(20,Math.max(0,(guestOrder.get(id)||0)+delta));
  if(quantity&&!guestOrder.has(id)&&guestOrder.size>=30)return toast('Select up to 30 different dishes.');
  if(quantity)guestOrder.set(id,quantity);else guestOrder.delete(id);
  render();
  document.getElementById(quantity?button.id:'add-'+id)?.focus({preventScroll:true});
}
function guestDishQuantity(dish,name,labels){
  const qty=guestOrder.get(dish.id)||0;
  return `<div class="actions"><button id="remove-${esc(dish.id)}" class="btn small" data-dish="${esc(dish.id)}" aria-label="${esc(labels[5]+': '+name)}" ${qty?'':'disabled'} onclick="changeGuestQuantity(this,-1)">−</button><b aria-live="polite">${qty}</b><button id="add-${esc(dish.id)}" class="btn small" data-dish="${esc(dish.id)}" aria-label="${esc(labels[4]+': '+name)}" onclick="changeGuestQuantity(this,1)">+</button></div>`;
}
function guestOrderAction(labels){
  const open=guestCalls.some(c=>c.type==='OrderReady');
  const total=[...guestOrder.values()].reduce((sum,quantity)=>sum+quantity,0);
  return `<section class="card" style="position:sticky;bottom:8px;z-index:2;padding:12px;margin-top:12px"><p class="fine">${esc(labels[1])}</p><button class="btn primary" ${open||!total?'disabled':''} onclick="request('OrderReady',this)">${esc(open?labels[3]:total?labels[0]+' ('+total+')':labels[2])}</button></section>`;
}
function liveMenu(){
  return '<div class="wrap">'+renderRestaurantMenu(guest,publicLanguage)+'</div>';
}

function renderRestaurantMenu(menu,language,{preview=false}={}){
  const base=Object.hasOwn(LOCALES,menu.originalLanguage)?menu.originalLanguage:'en';
  const lang=Object.hasOwn(LOCALES,language)?language:base;
  const labels=LOCALES[lang];
  const orderText=orderLabels[lang]||orderLabels.en;
  const canPrepare=!preview&&menu.service&&menu.table;
  const translate=(item,key)=>lang===base?item[key]:(item.translations?.[lang]?.[key]||item[key]);
  const groups=new Map();
  for(const item of menu.items){
    if(!groups.has(item.category))groups.set(item.category,[]);
    groups.get(item.category).push(item);
  }
  const selected=!preview&&groups.has(guestCategory)?guestCategory:null;
  const theme=['editorial','coffee','hotel'].includes(menu.theme)?menu.theme:'classic';
  const accent=/^#[0-9a-f]{6}$/i.test(menu.accent||'')?menu.accent:'';
  const font=menu.font==='serif'?'Georgia,serif':menu.font==='sans'?'Arial,sans-serif':'';
  const appearance=[accent&&'--menu-accent:'+accent,font&&'--menu-heading-font:'+font].filter(Boolean).join(';');
  const groupName=items=>esc(translate(items[0],'category'));
  const product=item=>{
    const name=translate(item,'name');
    const description=translate(item,'desc');
    const allergens=translate(item,'allergens');
    const price=formatMenuPrice(item.price,menu.currency,lang==='no'?'nb':lang);
    return `<article class="qr-menu-product">
      ${item.image?`<img class="qr-menu-photo" src="${esc(item.image)}" alt="" loading="lazy" decoding="async" onerror="this.hidden=true">`:''}
      <div class="qr-menu-product-body">
        <div class="qr-menu-product-title"><h4>${esc(name)}</h4><strong class="qr-menu-price">${esc(price)}</strong></div>
        ${description?`<p>${esc(description)}</p>`:''}
        <p class="qr-menu-allergens"><strong>${labels[4]}</strong> · ${esc(allergens||'—')}</p>
        ${canPrepare?guestDishQuantity(item,name,orderText):''}
      </div>
    </article>`;
  };
  return `<div class="customer qr-menu public-theme-${theme}${accent?' custom-accent':''}" lang="${lang}" style="${appearance}">
    <div class="qr-menu-cover">
      ${menu.logo?companyLogo(menu.logo):''}
      <span>${menu.table?esc(menu.table.label||labels[6]+' '+menu.table.number):labels[5]}</span>
      <h2>${esc(menu.name)}</h2>
    </div>
    <div class="qr-menu-content">
      ${preview?'':`<div class="qr-menu-tools">
        <label for="guest-menu-language">Menu language<select id="guest-menu-language" onchange="changeGuestLanguage(this.value)">${Object.entries(LOCALES).map(([code,l])=>`<option value="${code}" ${lang===code?'selected':''}>${l[0]}${code===base?' · Original':''}</option>`).join('')}</select></label>
        ${canPrepare?`<div class="servicebar">${['Waiter','Bill'].map((type,i)=>{
          const call=guestCalls.find(x=>x.type===type);
          return `<button class="btn ${i?'':'primary'}" ${call?'disabled':''} onclick="request('${type}')">${call?'✓ '+(call.status==='taken'?labels[10]:labels[9]):labels[i+1]}</button>`;
        }).join('')}</div>`:''}
      </div>`}
      <p class="qr-menu-note">${labels[8]} ${lang!==base?labels[12]:''}</p>
      ${!preview&&groups.size>1?`<div class="categories qr-menu-categories">
        <button type="button" class="${selected===null?'active':''}" aria-pressed="${selected===null}" onclick="guestCategory=null;render()">${labels[3]}</button>
        ${[...groups].map(([key,items])=>`<button type="button" class="${selected===key?'active':''}" aria-pressed="${selected===key}" data-category="${esc(key)}" onclick="guestCategory=this.dataset.category;render()">${groupName(items)}</button>`).join('')}
      </div>`:''}
      ${groups.size?[...groups].filter(([key])=>selected===null||key===selected).map(([,items])=>`<section class="qr-menu-group"><h3>${groupName(items)}</h3><div class="qr-menu-grid">${items.map(product).join('')}</div></section>`).join(''):`<p class="empty">${labels[11]}</p>`}
      ${canPrepare?guestOrderAction(orderText):''}
      ${menu.plan==='Free'?`<p class="qr-menu-credit"><a href="/#home">Powered by Smart QR</a></p>`:''}
    </div>
  </div>`;
}
async function copyLink(){try{await navigator.clipboard.writeText(menuURL());toast('Menu link copied.')}catch{modal('<h2>Your menu link</h2><input readonly value="'+esc(menuURL())+'" onclick="this.select()">')}}
async function tableAction(id,enabled){try{await api('table/'+id,'PATCH',{enabled});await workspace();toast(enabled?'Table enabled.':'Table disabled.')}catch(e){toast(e.message)}}
function rotateTable(id){modal(`<h2>Replace this table code?</h2><p class="muted">The old QR will stop working. You must print and place the new code on the table.</p><button class="btn primary" onclick="confirmRotate('${id}')">Replace code</button>`)}
async function confirmRotate(id){try{await api('table/'+id,'PATCH',{rotate:true});closeModal();await workspace();toast('New table code created. Download and print it.')}catch(e){toast(e.message)}}
(async()=>{ready=true;view=location.hash.slice(1).split('?')[0]||'home';render();try{await loadSession();await route();const status=new URLSearchParams(location.search).get('billing');if(status==='success')toast('Checkout completed. Your subscription updates after Stripe confirmation.')}catch(e){ready=true;loadError=e.message;render()}})();

function billingProfileHtml(){const b=restaurant.billing||{};return `<div class="card" style="margin-top:20px"><h3>Company & invoice details</h3><p class="muted">These details are used for your Smart QR subscription invoices. VAT IDs are collected separately in secure Stripe Checkout.</p><form onsubmit="saveBilling(event)"><label>Legal company name<input name="company" value="${esc(b.company||'')}" maxlength="120" required></label><label>Registered billing address<input name="address" value="${esc(b.address||'')}" maxlength="200" required></label><div class="formgrid"><label>City<input name="city" value="${esc(b.city||'')}" maxlength="80" required></label><label>Postal code<input name="postalCode" value="${esc(b.postalCode||'')}" maxlength="20" required></label></div><div class="formgrid"><label>Country code (GB, RO, DE...)<input name="country" value="${esc(b.country||'')}" maxlength="2" pattern="[A-Za-z]{2}" required></label><label>Company registration / local tax reference (optional)<input name="registration" value="${esc(b.registration||'')}" maxlength="140"></label></div><button class="btn primary">Save invoice details</button></form></div>`}
async function saveBilling(e){e.preventDefault();try{const data=Object.fromEntries(new FormData(e.target));const result=await api('billing/profile','PUT',data);restaurant.billing=result.billing;toast('Invoice details saved. Changes apply to future invoices.')}catch(e){toast(e.message)}}
async function loadInvoices(){invoiceLoading=true;try{invoiceList=(await api('billing/invoices')).invoices;invoiceError=''}catch(e){invoiceError=e.message}finally{invoiceLoading=false;if(view==='dashboard'&&tab==='billing')render()}}
function invoicesHtml(){return `<div class="card" style="margin-top:20px;overflow:auto"><h3>Subscription invoices</h3>${invoiceError?`<p class="muted">${esc(invoiceError)}</p><button class="btn small" onclick="invoiceError='';loadInvoices()">Retry</button>`:invoiceLoading?'<p class="muted">Loading invoices…</p>':!invoiceList?.length?'<p class="muted">No invoices have been issued yet. Subscription invoices will appear here once billing is activated.</p>':`<table class="table"><thead><tr><th>Invoice</th><th>Date</th><th>Total</th><th>Status</th><th></th></tr></thead><tbody>${invoiceList.map(i=>`<tr><td>${esc(i.number||i.id)}</td><td>${new Date(i.created*1000).toLocaleDateString()}</td><td>${new Intl.NumberFormat('en-GB',{style:'currency',currency:i.currency}).format(i.total/100)}</td><td>${esc(i.status||'')}</td><td>${i.pdf?`<a class="btn small" target="_blank" rel="noopener" href="${esc(i.pdf)}">PDF ↓</a>`:''} ${i.url?`<a class="btn small" target="_blank" rel="noopener" href="${esc(i.url)}">View ↗</a>`:''}</td></tr>`).join('')}</tbody></table>`}</div>`}
