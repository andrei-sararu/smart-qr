// Conversion-led presentation, evidence-labelled scenarios and a local product guide.
let guideOpen=false,guideHistory=[{role:'bot',text:'Welcome to Smart QR. What would make service easier at your venue? I can help you choose a plan, explore the product or understand what is available today.'}];
let pulseData=null,pulseLoading=false,pulseError='';
const evidence=[{venue:'Brewski · United Kingdom',provider:'sunday',metric:'+21%',label:'average spend',scope:'Ordering and paying from the table with sunday Hybrid.',url:'https://sundayapp.com/en-gb/clients/how-brewski-increased-average-spend-by-21-with-sunday/'},{venue:'Arcade · London',provider:'sunday',metric:'+27.3%',label:'average spend per guest',scope:'Hybrid mobile ordering and payments in a high-volume food hall.',url:'https://sundayapp.com/en-gb/clients/how-arcade-increased-average-spend-by-27-with-hybrid-ordering/'},{venue:'The ALB · Shrewsbury',provider:'Grafterr',metric:'+20%',label:'weekly sales',scope:'QR ordering as part of Grafterr’s restaurant technology setup.',url:'https://www.grafterr.com/uk/case-studies/thealb'}];
function heroScene(){const s=lab.status;return `<div class="hero-scene"><span class="scene-chip">A real product flow. Try it below. ↘</span><div class="scene-phone"><div class="scene-photo"><div><small style="font-size:9px">THE GREENHOUSE · TABLE 7</small><h3>A good choice<br>starts here.</h3></div></div><div class="scene-content"><div class="scene-dish"><div style="flex:1"><b>Wild mushroom risotto</b><span>Parmesan · fresh thyme</span><br><strong>€19.00</strong></div><img src="${seed[1].image}" alt="Illustrative dish" width="43" height="48"></div><div class="scene-dish"><div style="flex:1"><b>Burrata & tomatoes</b><span>Basil oil · sourdough</span><br><strong>€12.00</strong></div><img src="${seed[0].image}" alt="Illustrative dish" width="43" height="48"></div><button class="btn primary small" style="width:100%;font-size:11px;background:var(--brand-hover);border-color:var(--brand-hover);color:white" onclick="heroCall()">${s==='waiting'?'✓ Request sent':s==='taken'?'✓ Staff notified':'Call your waiter →'}</button><p class="fine" style="font-size:9px;margin-bottom:0">Illustrative example · no real staff contacted</p></div></div><div class="scene-board"><h4><span class="scene-dot"></span>TEAM WORKSPACE</h4>${s==='waiting'||s==='taken'?`<div class="scene-status">Table 7 · ${s==='waiting'?'Waiting for service':'Taken by staff'}</div><p>${s==='waiting'?'One clear request, visible to the team.':'The next step is clear. Mark it resolved.'}</p><button class="btn small primary" style="width:100%;background:var(--ink);color:white;border-color:var(--ink)" onclick="heroAdvance()">${s==='waiting'?'Take request':'Resolve request'} →</button>`:`<div class="scene-status">${s==='done'?'✓ Request resolved':'All caught up. Ready for service.'}</div><p>${s==='done'?'Try another call, or explore the full demo.':'Tap the button on the guest phone to see a request arrive.'}</p>`}</div></div>`}
function refreshHero(){const x=document.getElementById('hero-scene');if(x)x.innerHTML=heroScene()}
function heroCall(){if(!['waiting','taken'].includes(lab.status))labRequest();refreshHero()}
function heroAdvance(){if(lab.status==='waiting')labTake();else labResolve();refreshHero()}
function growthHero(){return `<section class="growth-hero"><div class="growth-hero-grid"><div><span class="release"><b>New</b> Service pulse + Menu health</span><h1>Less waving.<br><em>More flowing.</em></h1><p class="lead">Make your menu easy to explore. Bring table requests into one clear view. Give your team a better way to keep service moving.</p><div class="actions"><button class="btn primary" onclick="onboard()">Start my free menu ↗</button><button class="btn light" onclick="navTo('product')">Try table 7 →</button></div><div class="hero-proof"><span>No guest app</span><span>No card for the trial</span><span>Free menu after your trial</span></div></div><div id="hero-scene">${heroScene()}</div></div><div class="hero-bottom"><div><b>Make your menu work harder.</b><p>Photos, clear categories and 16 language options.</p></div><div><b>Know which table needs you.</b><p>Waiter and bill requests, with shared status.</p></div><div><b>See what to improve next.</b><p>Response-time insights and menu information checks.</p></div></div></section>`}
function impactSection(){return `<section class="marketing-section" id="opportunity">${intro('Every little friction adds up.','Better service begins<br>with the details you can fix.','A missed wave. An old price. An unanswered request. Start with clearer information and a shared view of the floor.')}<div class="impact-grid">${[['01 · THE MENU','Help guests choose with confidence.','Keep products, availability and translations up to date. Give international guests a menu they can explore without installing an app.','See the menu examples','examples'],['02 · THE FLOOR','Turn “someone should go” into “I’ve got it”.','Give the team a visible request and a way to take ownership. Open requests are shown oldest first, so the longest wait is easier to spot.','Try a service request','product'],['03 · THE NEXT IMPROVEMENT','Measure the service you can control.','Track the time from request to staff pickup. Check missing menu information and translation gaps before your next shift.','Explore Service pulse','performance']].map(x=>`<article class="impact-card"><span class="impact-number">${x[0]}</span><h3>${x[1]}</h3><p>${x[2]}</p><button class="btn small light" onclick="navTo('${x[4]}')">${x[3]} ↗</button></article>`).join('')}</div></section>`}
function performanceSection(){return `<section class="marketing-section" id="performance"><div class="insight-preview"><div>${intro('New · From visibility to action.','Your next improvement<br>shouldn’t be a guess.','Service pulse shows request volume and measured first-response times. Menu health highlights missing photos, descriptions, allergen text and incomplete translations.')}<div class="strategies"><span>Measure first pickup</span><span>Find unanswered requests</span><span>Review translation gaps</span></div><button class="btn primary" onclick="go('dashboard');tab='insights'">Open my workspace →</button><p class="fine">Uses your own records. No sales or revenue attribution is inferred.</p></div><div class="insight-visual"><div class="visual-top"><b>Service pulse</b><span class="example-tag">ILLUSTRATIVE DATA</span></div><div class="mini-metrics"><div><small>Requests today</small><strong>42</strong></div><div><small>Median first pickup</small><strong>1m 12s</strong></div><div><small>Open requests</small><strong>3</strong></div></div><div class="visual-bars" aria-label="Illustrative request volume chart">${[12,20,18,35,52,64,42,32,48,82,96,61].map(n=>`<span style="height:${n}%"></span>`).join('')}</div><div class="pulse-legend"><span>Lunch service</span><span>Evening service</span></div><h4 style="font-size:13px;margin-bottom:13px">Menu health · next actions</h4><div class="health-row"><span>Missing product photos</span><strong>4 to review</strong></div><div class="health-row"><span>German translations</span><strong>2 incomplete</strong></div><div class="health-row"><span>Allergen text</span><strong>1 field empty</strong></div><p class="fine">Example values only. Food information must be checked by the restaurant; completeness is not a safety certification.</p></div></div></section>`}
function evidenceSection(){return `<section class="marketing-section" id="evidence">${intro('The category has potential. The details matter.','What other restaurant platforms<br>report from their customers.','These are named case studies published by other providers. They are useful context, not Smart QR customers or a promise of the same result.')}<div class="case-grid">${evidence.map(x=>`<article class="case-card"><span class="eyebrow">${x.provider} · published case study</span><strong>${x.metric}</strong><b style="font-size:13px">${x.label}</b><h3>${x.venue}</h3><p>${x.scope}</p><a target="_blank" rel="noopener noreferrer" href="${x.url}">Read the provider's case study ↗</a></article>`).join('')}</div><p class="evidence-note"><b>Important scope difference:</b> these vendor-reported results involve ordering and/or payments, which Smart QR does not currently provide. They use different measures and should not be combined into one expected uplift. We have not independently audited these studies or measured a Smart QR sales increase.</p></section>`}
function potentialSection(){return `<section class="marketing-section" id="potential">${intro('Explore the numbers. Choose the assumptions.','What could a small increase<br>in average spend mean?','Keep guest volume constant and test your own assumptions. This is a scenario calculator, not a sales forecast or a Smart QR performance claim.')}<div class="potential"><div class="potential-grid"><div><div class="potential-controls"><label>Current monthly revenue (€)<input id="potential-revenue" type="number" min="0" max="10000000" step="1000" value="30000" oninput="updatePotential()"></label><label>Assumed increase in average spend<select id="potential-uplift" onchange="updatePotential()"><option value="0">0% · no uplift</option><option value="3" selected>3% · your assumption</option><option value="5">5% · your assumption</option><option value="10">10% · your assumption</option></select></label><label>Assumed gross margin (%)<input id="potential-margin" type="number" min="0" max="100" value="65" oninput="updatePotential()"></label><label>Illustrative software cost (€/month)<input id="potential-plan" type="number" min="0" max="10000" value="29" oninput="updatePotential()"></label></div><p class="fine" style="margin-top:23px">For example, a 3% increase means €30 average spend becomes €30.90, with the same number of guests. The selected uplift is an assumption you supply; it is not derived from the competitor case studies.</p><p class="fine">Gross margin excludes the cost of food/drink but not all operating costs. The contribution shown is not net profit and does not include extra labour, taxes or other changes.</p></div><div class="potential-result" id="potential-result">${potentialResult(30000,3,65,29)}</div></div></div></section>`}
function calculatePotential(revenue,lift,margin,plan){const values=[revenue,lift,margin,plan];if(values.some(x=>!Number.isFinite(x)||x<0)||revenue>10000000||lift>100||margin>100||plan>10000)throw Error('Check the scenario inputs.');const extra=revenue*lift/100,gross=extra*margin/100;return {extra,gross,contribution:gross-plan,breakEven:revenue*margin?plan/(revenue*margin/100)*100:null}}
function potentialResult(revenue,lift,margin,plan){const r=calculatePotential(revenue,lift,margin,plan),e=n=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(n);return `<span class="eyebrow" style="color:var(--brand-light)">IF YOUR ASSUMPTION HAPPENED</span><div class="potential-total">${e(r.extra)}</div><p>Additional monthly revenue at a ${lift}% assumed increase in average spend.</p><div class="potential-line"><span>Additional gross profit (${margin}%)</span><b>${e(r.gross)}</b></div><div class="potential-line"><span>Illustrative software cost</span><b>${e(plan)}</b></div><div class="potential-line"><span>Contribution after software only</span><b>${e(r.contribution)}</b></div><p>Software break-even: ${r.breakEven===null?'not calculable with these inputs':r.breakEven.toFixed(2)+'% spend increase'}, before other cost changes. This is arithmetic, not proof of product impact.</p>`}
function updatePotential(){try{const read=id=>Number(document.getElementById(id).value);document.getElementById('potential-result').innerHTML=potentialResult(read('potential-revenue'),read('potential-uplift'),read('potential-margin'),read('potential-plan'))}catch(e){document.getElementById('potential-result').textContent=e.message}}
const detailedHome=home;
home=function(){const old=detailedHome();const at=old.indexOf('<section class="marketing-section" id="product">');let rest=old.slice(at);const next=rest.indexOf('<section class="marketing-section" id="examples">');rest=rest.slice(0,next)+performanceSection()+evidenceSection()+potentialSection()+rest.slice(next);rest=rest.replace('Different venues. The same simple idea.','Your venue has a personality.<br>Your menu should too.').replace('Ready before the first guests arrive.','Your first better shift starts here.');return '<div class="wrap">'+growthHero()+impactSection()+rest};
function guideReply(question){const q=String(question||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');if(/payment|pay |stripe|plata|plati|incas|card|checkout/.test(q))return {text:'Smart QR currently offers menus, waiter calls and bill requests. It does not take food orders or guest payments. Paid restaurant subscriptions are not activated yet. You can use a 14-day Service trial without a card.',action:'pricing'};if(/sales|revenue|increase|profit|vanz|crest|results|rezultat/.test(q))return {text:'Other vendors report results such as +21% average spend at Brewski with sunday ordering and payments. Those are not Smart QR results, and our product does not currently include those ordering/payment features. You can explore your own assumptions in the scenario calculator; no sales uplift is guaranteed.',action:'evidence'};if(/language|translate|limb|traduc|german|finnish|polish|spanish/.test(q))return {text:'There are 16 menu languages, including English, Romanian, German, Spanish, French, Italian, Finnish, Swedish and Polish. Controls are translated. Your restaurant enters and verifies dish, category and allergen translations. Automatic translation is not enabled.',action:'languages'};if(/price|pricing|cost|plan|pret|abonament|free|gratuit/.test(q))return {text:'Start with Free for a menu of up to 30 products. Menu Pro is listed at €12/month; Service at €29/month adds table requests. Every new account gets a 14-day Service trial without a card. Paid subscriptions are not activated yet. Need waiter calls? Explore Service. Only need a menu? Start Free.',action:'pricing'};if(/table|waiter|service|ospatar|masa|tablet/.test(q))return {text:'Put a unique QR on each table. A guest taps Call waiter or Request bill. Your connected service board checks for updates every 4 seconds. Staff can take and resolve the request. Keep the tablet awake, online and the board open; background notifications are not included.',action:'product'};if(/health|pulse|performance|performanta|analiz|report/.test(q))return {text:'Service pulse uses your own requests to show volume and measured time until staff pickup. Menu health flags missing information and translation gaps. It does not certify allergen safety or infer revenue uplift.',action:'performance'};if(/invoice|vat|factur|tva|company/.test(q))return {text:'You can enter company billing details in the workspace. Once paid billing is activated, issued subscription invoices will appear as Stripe PDF and hosted-invoice links. Supplier and tax details must be configured before live billing.',action:'faq'};if(/start|setup|begin|incep|config|signup|account|cont/.test(q))return {text:'Sign in with ChatGPT, create your restaurant and add or import products from CSV. Check your prices and allergens, publish the menu, download table codes and test a request from another phone. No guest account is needed.',action:'start'};if(/restaurant|cafe|hotel|pensiune|bar|recommend|recomand/.test(q))return {text:'For a café or venue that only needs an updatable menu, start Free. For a restaurant or dining area that needs waiter calls and request tracking, explore Service. Hotel examples cover dining menus; room-service ordering is not included.',action:'examples'};return {text:'I’m an automated product guide, not a live agent or an AI chat service. I can explain plans, languages, setup, invoices, table service and the published competitor examples. For a question specific to your business, use the enquiry form.',action:'contact'}}
function guideMarkup(){return `<button class="floating-guide" aria-label="${guideOpen?'Close':'Open'} product guide" onclick="toggleGuide()"><span class="guide-dot"></span>${guideOpen?'Close guide':'Find my best starting point'} ${guideOpen?'×':'↗'}</button>${guideOpen?`<aside class="guide-panel" aria-label="Smart QR automated product guide"><div class="guide-header"><div><b>Smart QR guide</b><small>Automated product help · no live agent</small></div><button onclick="toggleGuide()" aria-label="Close guide">×</button></div><div class="guide-messages" id="guide-messages" aria-live="polite">${guideHistory.slice(-12).map(m=>`<div class="guide-message ${m.role==='user'?'user':''}">${esc(m.text)}${m.action?`<p style="margin-bottom:0"><button class="btn small" onclick="guideAction('${m.action}')">${m.action==='start'?'Start free':m.action==='contact'?'Contact us':'Explore this'} →</button></p>`:''}</div>`).join('')}</div><div class="guide-choices">${['Which plan fits me?','Can it increase sales?','Show me table service','Menu languages'].map(x=>`<button onclick="askGuide(this.textContent)">${x}</button>`).join('')}</div><form class="guide-input" onsubmit="sendGuide(event)"><input aria-label="Question for product guide" name="question" maxlength="400" placeholder="Ask about the product…" autocomplete="off" required><button aria-label="Send question">→</button></form><div class="guide-privacy">Messages stay in this page session and are not sent to a chat provider. Send an enquiry if you need a personal reply.</div></aside>`:''}`}
function toggleGuide(){guideOpen=!guideOpen;refreshGuide()}
function refreshGuide(){const el=document.getElementById('product-guide');if(el){el.innerHTML=guideMarkup();const list=document.getElementById('guide-messages');if(list)list.scrollTop=list.scrollHeight}}
function askGuide(q){if(!String(q).trim())return;guideHistory.push({role:'user',text:String(q).slice(0,400)},{role:'bot',...guideReply(q)});refreshGuide()}
function sendGuide(e){e.preventDefault();askGuide(new FormData(e.target).get('question'))}
function guideAction(action){guideOpen=false;refreshGuide();if(action==='start')onboard();else navTo(action)}
const growthRender=render;
render=function(){growthRender();if(ready&&['home','demo','help','privacy','service'].includes(view)){document.getElementById('root').insertAdjacentHTML('beforeend','<div id="product-guide">'+guideMarkup()+'</div>')}};
function durationLabel(seconds){if(seconds===null||seconds===undefined)return '—';return seconds<60?Math.round(seconds)+'s':Math.floor(seconds/60)+'m '+Math.round(seconds%60)+'s'}
function insightsHtml(){if(!pulseData&&!pulseLoading&&!pulseError)loadPulse();if(pulseLoading&&!pulseData)return '<div class="card"><p class="muted">Loading your service and menu information…</p></div>';if(pulseError)return `<div class="card"><p>${esc(pulseError)}</p><button class="btn" onclick="pulseError='';loadPulse()">Retry</button></div>`;if(!pulseData)return '';const s=pulseData.service,m=pulseData.menu,max=Math.max(1,...s.hourlyUTC.map(x=>x.count));return `<div class="topline"><span class="muted">Your restaurant's records · last 7 days · updated ${new Date(pulseData.generatedAt).toLocaleTimeString()}</span><button class="btn small" onclick="loadPulse()">Refresh insights ↻</button></div><div class="stats"><div class="card"><span class="muted">Requests · last 24h</span><strong>${s.requests24h}</strong><span class="fine">${s.requests7d} in the last 7 days</span></div><div class="card"><span class="muted">Median first pickup</span><strong>${durationLabel(s.medianResponseSeconds)}</strong><span class="fine">${s.measuredResponses} measured responses</span></div><div class="card"><span class="muted">Open requests</span><strong>${s.open}</strong><span class="fine">Oldest: ${s.open?durationLabel(s.oldestOpenSeconds):'none'}</span></div></div>${s.open?`<div class="pricing-notice"><b>${s.waiting} requests still need pickup.</b> Open the service board and review the oldest request first. <button class="btn small" onclick="tab='service';render()">Open board →</button></div>`:''}<div class="card"><h3>When guests ask for help</h3><p class="muted">Request counts by hour, aggregated over the last 7 days. Hours are UTC.</p><div class="pulse-bars">${s.hourlyUTC.map(x=>`<div style="height:${Math.max(2,x.count/max*100)}%" title="${x.hour}:00 UTC · ${x.count} requests"><span>${x.hour}:00 · ${x.count}</span></div>`).join('')}</div><div class="pulse-legend"><span>00:00 UTC</span><span>12:00 UTC</span><span>23:00 UTC</span></div><p class="fine">${s.measuredResponses?'First-pickup timing is recorded when staff take a request.':'No measured pickup times yet. New staff pickups will begin building this view.'} Existing requests without a recorded pickup timestamp are excluded. ${pulseData.truncated?'The summary is limited to 5,000 records.':''}</p></div><div class="card" style="margin-top:20px"><span class="eyebrow">Menu health</span><h3>Small fixes before the next service.</h3><div class="health-row"><span>Available / total products</span><strong>${m.available} / ${m.total}</strong></div><div class="health-row"><span>Available products with a photo</span><strong>${m.photoCoverage}%</strong></div><div class="health-row"><span>Missing descriptions</span><strong>${m.missingDescriptions}</strong></div><div class="health-row"><span>Empty allergen information fields</span><strong>${m.missingAllergens.length}</strong></div>${Object.entries(m.translationCoverage).map(([lang,v])=>`<div class="health-row"><span>${LOCALES[lang]?.[0]||esc(lang)} translations complete</span><strong>${v.complete} / ${v.total}</strong></div>`).join('')}<ul class="insight-action">${m.missingAllergens.length?'<li>Review allergen information for: '+m.missingAllergens.slice(0,5).map(x=>esc(x.name)).join(', ')+'.</li>':''}${m.missingPhotos?`<li>Consider adding your own photographs to ${m.missingPhotos} available products.</li>`:''}${m.missingDescriptions?`<li>Add clear descriptions to ${m.missingDescriptions} available products so guests know what to expect.</li>`:''}${!Object.keys(m.translationCoverage).length?'<li>If you serve international guests, begin with one additional language and review the wording.</li>':''}</ul><button class="btn primary small" onclick="tab='menu';render()">Improve my menu →</button><p class="fine">These are information-completeness checks, not a food-safety or legal certification. Revenue, sales conversion and guest satisfaction are not measured by this report.</p></div>`}
async function loadPulse(){pulseLoading=true;try{pulseData=await api('insights');pulseError=''}catch(e){pulseError=e.message}finally{pulseLoading=false;if(view==='dashboard'&&tab==='insights')render()}}
if(ready)render();

/* Focused marketing views, with shareable hash routes and browser history. */
const fullMarketingHome=home;
const marketingRoutes={products:[],product:['product','features','languages','how'],examples:['examples'],pricing:['pricing'],performance:['performance','opportunity'],resources:['performance','opportunity','faq'],faq:['faq'],contact:['contact'],calculator:['potential'],evidence:['evidence']};
function marketingSection(id){const t=document.createElement('template');t.innerHTML=fullMarketingHome();return t.content.querySelector('#'+id)?.outerHTML||''}
const productCatalogue=[
  {
    title:'Digital QR menu', plan:'Free, Menu Pro & Service',
    summary:'Give guests a mobile menu they can open from a printed QR code or a link. Update the menu during service and keep the same printed code.',
    features:['Organise dishes by category with photos, prices and verified allergen information.','Hide sold-out items and publish changes from the menu editor.','Choose a theme, accent colour and typography. Add your venue logo with a paid Menu Pro or Service subscription.'],
    href:'/#demo', action:'Try the guest menu'
  },
  {
    title:'Menu import & translation', plan:'Menu editor',
    summary:'Bring an existing menu into Smart QR and prepare it for guests who speak different languages.',
    features:['Import a CSV or paste spreadsheet rows, then review categories and prices.','Extract a draft from a PDF or photo and verify the results before making dishes available.','Offer menu controls in 16 languages. Generate editable translations for dish text and enter verified allergen translations yourself.'],
    href:'/#help?topic=products', action:'See the import guide'
  },
  {
    title:'Print & table QR codes', plan:'Menu PDF, general QR & table cards',
    summary:'Put the right QR code on your counter, in your window or on each table. Keep printed materials alongside your digital menu.',
    features:['Download an A4 menu PDF and include your saved venue logo when available.','Use one general QR code for browsing or table-specific codes for the Service workflow.','Configure up to 100 tables with names or numbers, seating capacity and indoor or outdoor areas.'],
    href:'/#help?topic=tables', action:'See the table setup guide'
  },
  {
    title:'Table service & staff board', plan:'Service',
    summary:'Let guests ask for service from their table and give staff one board to see which tables are waiting.',
    features:['Guests can call a waiter, request the bill or send a dish list with quantities.','Staff claim requests, confirm the dish list at the table and enter the order in the restaurant’s existing till.','The open staff board highlights unclaimed requests after three minutes and can sound an alert when enabled.'],
    href:'/#product', action:'Try the service demo'
  },
  {
    title:'Service insights', plan:'Restaurant workspace',
    summary:'Review how quickly your team picks up requests and spot menu entries that need attention.',
    features:['See request volumes and measured response times in Service pulse.','Review menu completeness, including missing photos, descriptions and allergen information.'],
    href:'/#help?topic=service', action:'See the service guide'
  }
];

function productsPage(){
  return `<main class="wrap focused-page products-page">
    <a class="breadcrumb" href="/#home">Home</a> <span class="muted"> / Products</span>
    <section class="products-hero">
      <h1>Smart QR products</h1>
      <p>Publish a digital menu, print QR codes for your venue and manage table requests on one platform. Start with a menu and add table service when you need it.</p>
      <div class="actions"><a class="btn primary" href="/#pricing">Compare plans</a><a class="btn" href="/#demo">Try the guest demo</a></div>
    </section>
    <div class="products-grid">
      ${productCatalogue.map(product=>`<article class="product-summary">
        <span class="product-scope">${product.plan}</span>
        <h2>${product.title}</h2>
        <p>${product.summary}</p>
        <ul>${product.features.map(feature=>`<li>${feature}</li>`).join('')}</ul>
        <a class="btn" href="${product.href}">${product.action}</a>
      </article>`).join('')}
    </div>
    <section class="quick-start"><div><h2>Set up your first menu</h2><p class="muted">New workspaces start with a 14-day Service trial. No card required.</p></div><button class="btn primary" onclick="onboard()">Start free</button></section>
    ${marketingFooter()}
  </main>`;
}
function marketingPage(id){if(id==='products')return productsPage();const titles={product:'Product',examples:'Example menus',pricing:'Plans & pricing',performance:'Service insights',resources:'Resources',faq:'Frequently asked questions',contact:'Contact',calculator:'Sales calculator',evidence:'Industry research'};return '<main class="wrap focused-page"><a class="breadcrumb" href="/#home">Home</a> <span class="muted"> / '+titles[id]+'</span>'+marketingRoutes[id].map(marketingSection).join('')+((id==='resources'||id==='performance')?'<div class="actions"><a class="btn" href="/#calculator">Sales calculator</a><a class="btn" href="/#evidence">Industry research</a></div>':'')+'<div class="bottom"><div><h2>Ready to create your digital menu?</h2></div><button class="btn primary" onclick="onboard()">Start free</button></div>'+marketingFooter()+'</main>'}
home=function(){return '<main class="wrap focused-home">'+growthHero()+impactSection()+'<section class="quick-start"><div><h2>Ready for your first digital menu?</h2><p class="muted">Explore the product or compare plans before you start.</p></div><div class="actions"><a class="btn" href="/#pricing">See pricing</a><button class="btn primary" onclick="onboard()">Start free</button></div></section>'+marketingFooter()+'</main>'};
navTo=function(id){go(({features:'product',languages:'product',how:'product',opportunity:'performance',potential:'calculator',confidence:'privacy'})[id]||id)};
const focusedHeader=header;
header=function(){let h=focusedHeader();h=h.replace(/href="\/#home" onclick="event.preventDefault\(\);navTo\('([^']+)'\)"/g,(_,id)=>'href="/#'+id+'"'+(view===id?' aria-current="page"':''));h=h.replace('>FAQ</a>','>FAQ</a><a class="desktop" href="/#resources">Resources</a><a class="desktop" href="/#contact">Contact</a><a class="desktop" href="/#dashboard">Log in</a>');return h};
const focusedRender=render;
render=function(){if(ready&&!loadError&&Object.hasOwn(marketingRoutes,view)){document.getElementById('root').innerHTML=header()+marketingPage(view);document.title='Smart QR | '+view.charAt(0).toUpperCase()+view.slice(1);return}focusedRender();document.title='Smart QR — Digital menus & table service'};
window.addEventListener('hashchange',()=>window.scrollTo(0,0));
if(ready)render();

/* Commercial homepage: clear value proposition, product-led visual, direct navigation. */
home=function(){return `<main class="premium-home"><section class="premium-hero wrap"><div class="premium-copy"><span class="premium-kicker"><span></span> BUILT FOR HOSPITALITY</span><h1>Great service starts<br>with a <em>smart menu.</em></h1><p>Give guests a beautiful digital menu and your team a simpler way to manage table requests. All from one QR code.</p><div class="actions"><button class="btn primary" onclick="onboard()">Create your free menu <span aria-hidden="true">→</span></button><a class="btn" href="/#products">Explore products</a></div><div class="premium-reassurance">✓ No credit card required &nbsp; · &nbsp; 14-day Service trial</div></div><div class="premium-visual"><div class="premium-visual-label">SMART QR <span>PRODUCT PREVIEW</span></div><div id="hero-scene">${heroScene()}</div></div></section><div class="premium-band"><div class="wrap premium-band-inner"><span>Designed for restaurants, cafés and bars</span><span>16 menu languages</span><span>No guest app needed</span></div></div><section class="wrap premium-features"><div class="premium-section-heading"><span class="premium-kicker">ONE PLATFORM. LESS ADMIN.</span><h2>Everything you need for a smarter service.</h2><p>Start with your menu. Add table service when you need it.</p></div><div class="premium-feature-grid">${[['01','Digital menus','Publish dishes, photographs, prices and translations. Update your menu without reprinting your QR codes.','product'],['02','Table service','Let guests request a waiter or the bill. Give staff a shared view of requests.','product'],['03','Service insights','Track response times and spot missing menu information in your workspace.','performance']].map(x=>`<article><span class="premium-number">${x[0]}</span><h3>${x[1]}</h3><p>${x[2]}</p><a href="/#${x[3]}">Learn more →</a></article>`).join('')}</div></section><section class="wrap premium-close"><div><h2>Make your next service simpler.</h2><p>Start free, then choose the plan that fits your venue.</p></div><a class="btn primary" href="/#pricing">Explore plans →</a></section><div class="wrap">${marketingFooter()}</div></main>`};
const premiumHeader=header;
header=function(){return premiumHeader().replace('href="/#faq">FAQ</a>','href="/#help">User guide</a>').replace('href="/#faq" aria-current="page">FAQ</a>','href="/#help">User guide</a>').replace('<a class="desktop" href="/#resources">Resources</a>','').replace('>Start free →','>Start free')};
if(ready)render();

const showcaseMenus={
restaurant:{name:'The Greenhouse',tag:'SEASONAL DINING',subtitle:'Modern European cuisine',theme:'fine',groups:[['To begin',[['Burrata & heirloom tomatoes','Basil oil, toasted sourdough',12],['Roasted beetroot','Goat cheese, walnuts',10]]],['From the kitchen',[['Wild mushroom risotto','Parmesan, fresh thyme',19],['Roasted sea bass','Lemon butter, seasonal greens',26]]]]},
cafe:{name:'Sunday Coffee',tag:'COFFEE • BRUNCH • BAKERY',subtitle:'Good mornings, every day.',theme:'coffee',groups:[['Coffee bar',[['Flat white','Double espresso, steamed milk',3.8],['Iced latte','Espresso, milk, ice',4.5]]],['All-day brunch',[['Avocado toast','Sourdough, chilli, poached egg',11],['Blueberry pancakes','Maple syrup, fresh berries',12]]]]},
hotel:{name:'The Olive House',tag:'BOUTIQUE HOTEL',subtitle:'Breakfast & dining',theme:'olive',groups:[['Breakfast',[['Continental breakfast','Pastries, preserves, fresh fruit',14],['Eggs Benedict','English muffin, hollandaise',15]]],['Evening dining',[['Garden salad','Seasonal vegetables, olive oil',12],['Fresh tomato pasta','Basil, aged parmesan',18]]]]}};
function showcaseMenu(key){const m=showcaseMenus[key];return `<div class="show-menu ${m.theme}"><div class="show-cover" style="background-image:linear-gradient(0deg,#0009,#0001),url('${venues[key].photo}')"><span>${m.tag}</span><h2>${m.name}</h2><p>${m.subtitle}</p></div><div class="show-body">${m.groups.map(([name,items])=>`<section><h3>${name}</h3>${items.map(([title,desc,price])=>`<div class="show-dish"><div><b>${title}</b><small>${desc}</small></div><strong>€${price.toFixed(2)}</strong></div>`).join('')}</section>`).join('')}</div></div>`}
exampleCards=function(){return Object.keys(showcaseMenus).map(key=>`<article class="show-card">${showcaseMenu(key)}<div class="show-card-bottom"><span>${venues[key].kind}</span><button class="btn" onclick="openExample('${key}')">Open demo →</button></div></article>`).join('')};
function tableWorkflowHtml(){
  return `<section class="wrap premium-features" aria-label="How Smart QR works"><div class="premium-section-heading"><h2>What happens after a guest scans?</h2></div><div class="premium-feature-grid">
  <article><h3>Printed QR menu · Free</h3><p>Add your dishes, publish the menu, then download and print a table QR code. Guests scan it with their phone camera, open the menu and choose their language. They order with your team. You can update the menu and keep using the same printed code.</p></article>
  <article><h3>Waiter and bill requests · Service</h3><p>Print the code for each table and keep the Service board open. Guests tap <b>Call waiter</b> or <b>Request bill</b>. Staff see the table number, take the request, serve the table and mark it resolved.</p></article>
  <article><h3>Ordering and payment</h3><p>With Service, guests can choose dishes and quantities, then send the list to the waiter. Staff confirm the order at the table and enter it in their usual till. Guests pay with the team.</p></article>
  </div></section>`;
}
demo=function(){const key=lab.venue in showcaseMenus?lab.venue:'restaurant';return `<main class="wrap showcase-page"><a href="/#examples" class="breadcrumb">← All examples</a><div class="showcase-heading"><h1>${showcaseMenus[key].name}</h1><p class="muted">Try a sample of what guests and staff see after a table QR is scanned.</p><div class="example-crumb">${Object.keys(showcaseMenus).map(k=>`<button class="btn small ${key===k?'active':''}" onclick="openExample('${k}')">${showcaseMenus[k].name}</button>`).join('')}</div></div><div class="showcase-detail"><div><h2>Browse the QR menu</h2><p class="muted">This is what guests can browse after scanning a printed QR. In the restaurant, they tell the waiter what they want and pay with staff.</p>${showcaseMenu(key)}</div><aside><h2>Try a waiter request</h2><ol class="muted"><li>Choose the guest menu language in the demo.</li><li>On the guest phone, tap <b>Call waiter</b> or <b>Try ready to order</b>.</li><li>On the staff tablet, take the Table 7 request, then resolve it.</li></ol><p class="muted">Try “Ready to order” to send one sample dish to Table 7’s staff board. On a live Service menu, guests choose dishes and quantities. Staff confirm the order and take payment as usual.</p><div class="lab-frame" id="product-lab">${labHtml()}</div><button class="btn primary" onclick="onboard()">Create your menu →</button></aside></div>${tableWorkflowHtml()}${marketingFooter()}</main>`};
if(ready)render();

showcaseMenu=function(key){const m=showcaseMenus[key];const cover=venues[key].photo;const money=p=>'€'+p.toFixed(2);const dish=([n,d,p])=>`<div class="show-dish"><div><b>${n}</b><small>${d}</small></div><strong>${money(p)}</strong></div>`;if(key==='restaurant')return `<div class="show-menu fine editorial-menu"><div class="editorial-title"><span>THE</span><h2>Greenhouse</h2><span>SEASONAL DINING</span><div class="editorial-rule">✦</div></div>${m.groups.map(([n,items])=>`<section><h3>${n}</h3>${items.map(dish).join('')}</section>`).join('')}<div class="editorial-end">Prepared with care · Seasonal ingredients</div></div>`;if(key==='cafe'){const photos=[seed[5].image,seed[4].image,seed[2].image,seed[0].image];return `<div class="show-menu coffee cafe-menu"><div class="cafe-title"><span>GOOD MORNINGS.</span><h2>Sunday<br>Coffee.</h2><p>All-day coffee & brunch</p></div>${m.groups.map(([n,items],i)=>`<section><h3>${n}</h3><div class="cafe-products">${items.map(([a,b,p],j)=>`<article><img src="${photos[i*2+j]}" alt="" loading="lazy"><b>${a}</b><small>${b}</small><strong>${money(p)}</strong></article>`).join('')}</div></section>`).join('')}</div>`};return `<div class="show-menu olive hotel-menu"><div class="show-cover" style="background-image:linear-gradient(0deg,#0009,#0001),url('${cover}')"><span>WELCOME TO</span><h2>The Olive House</h2><p>Dining at your leisure</p></div><div class="hotel-tabs">${m.groups.map(([n],i)=>`<button class="btn small" onclick="this.closest('.hotel-menu').querySelectorAll('.hotel-meal').forEach((el,j)=>el.hidden=j!==${i});this.parentElement.querySelectorAll('button').forEach((el,j)=>el.setAttribute('aria-pressed',String(j===${i})))" aria-pressed="${i===0}">${n}</button>`).join('')}</div>${m.groups.map(([n,items],i)=>`<section class="hotel-meal" ${i?'hidden':''}><span class="hotel-hours">${i?'EVENING MENU':'MORNING MENU'}</span><h3>${n}</h3>${items.map(dish).join('')}</section>`).join('')}</div>`};
if(ready)render();

const appearanceSettings=settingsHtml;
settingsHtml=function(){return appearanceSettings()+`<section class="card" style="margin-top:20px"><h3>Menu design</h3><p class="muted">Choose the appearance of your public QR menu. Changes apply to the published menu immediately.</p><div class="theme-picker">${[['classic','Classic','Clean and simple'],['editorial','Fine dining','Dark green and gold'],['coffee','Modern café','Warm tones and product cards'],['hotel','Boutique hotel','Elegant and understated']].map(([key,name,desc])=>`<button class="theme-option theme-${key}" onclick="saveAppearance('${key}')"><b>${name}</b><small>${desc}</small></button>`).join('')}</div><p id="appearance-status" role="status" class="fine"></p></section>`};
async function saveAppearance(theme){const status=document.getElementById('appearance-status');if(status)status.textContent='Saving…';try{await api('appearance','PUT',{theme});if(status)status.textContent='Saved: '+theme+'. Your public menu has been updated.';toast('Menu design saved')}catch(e){if(status)status.textContent=e.message;toast(e.message)}}
if(ready)render();

const clearHome=home;
home=function(){return clearHome().replace('Great service starts<br>with a <em>smart menu.</em>','QR code menus &amp;<br><em>table service.</em>').replace('Give guests a beautiful digital menu and your team a simpler way to manage table requests. All from one QR code.','Smart QR is a digital menu platform for restaurants, cafés and hotels. Create your menu, print a QR code for each table and receive waiter and bill requests on your staff’s devices.').replace('ONE PLATFORM. LESS ADMIN.','HOW SMART QR WORKS')};
let accountMode='login';
function accountForm(){return `<main class="wrap section"><div class="card" style="max-width:440px;margin:20px auto;padding:30px"><h2>${accountMode==='register'?'Create your account':'Sign in to Smart QR'}</h2><p class="muted">Manage your restaurant and digital menus.</p><form onsubmit="submitAccount(event)"><label>Email address<input name="email" type="email" required autocomplete="email" maxlength="254"></label><label>Password<input name="password" type="password" required minlength="12" maxlength="128" autocomplete="${accountMode==='register'?'new-password':'current-password'}"></label><p class="fine">Use a password of at least 12 characters.</p><button class="btn primary" type="submit">${accountMode==='register'?'Create account':'Sign in'}</button><p id="account-error" role="alert"></p></form><button class="btn" onclick="accountMode=accountMode==='login'?'register':'login';render()">${accountMode==='login'?'New here? Create an account':'Already registered? Sign in'}</button></div></main>`};
const standaloneDashboard=dashboard;
dashboard=function(){return session?standaloneDashboard():accountForm()};
const standaloneOnboard=onboard;
onboard=function(){if(!session){accountMode='register';go('dashboard');return}return standaloneOnboard()};
async function submitAccount(e){e.preventDefault();const form=e.target,button=form.querySelector('button[type=submit]');button.disabled=true;try{const data=Object.fromEntries(new FormData(form));const r=await fetch('/api/account',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...data,action:accountMode})});const result=await r.json();if(!r.ok)throw Error(result.error||'Unable to sign in');if(result.verificationRequired){document.getElementById('account-error').textContent=result.emailSent?'Check your inbox for a verification link.':result.retry?'Check your inbox, or try again in one minute.':'We could not send your verification email. Try signing in again in one minute.';button.disabled=false;return}location.reload()}catch(err){document.getElementById('account-error').textContent=err.message;button.disabled=false}}
async function signOutLocal(){await fetch('/api/account',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'logout'})});location.href='/#home';location.reload()}
const localSettings=settingsHtml;
settingsHtml=function(){return localSettings().replace(/<a class="btn small" href="\/signout-with-chatgpt[^"]*" target="_top">Sign out<\/a>/,'<button class="btn small" onclick="signOutLocal()">Sign out</button>')};
if(ready)render();

home=function(){return `<main class="premium-home"><section class="premium-hero wrap"><div class="premium-copy"><span class="premium-kicker"><span></span> DIGITAL MENUS FOR RESTAURANTS, CAFÉS & HOTELS</span><h1>Your restaurant menu.<br><em>One simple QR code.</em></h1><p>Print a QR code for each table. Guests scan to browse your menu and order with your team. With Service, they can send a list of dishes for your waiter to confirm, or request the bill from their phone.</p><div class="actions"><button class="btn primary" onclick="onboard()">Create your free menu →</button><a class="btn" href="/#examples">Try the guest demo</a></div><div class="premium-reassurance">Free plan available · 14-day Service trial · No guest app</div></div><div class="premium-visual"><div class="premium-visual-label">GUEST MENU <span>INTERACTIVE PRODUCT DEMO</span></div><div id="hero-scene">${heroScene()}</div></div></section><div class="premium-band"><div class="wrap premium-band-inner"><span>Free digital menu · up to 30 products</span><span>16 menu languages</span><span>Paid plans from €12/month</span></div></div>${tableWorkflowHtml()}<section class="wrap premium-features"><div class="premium-section-heading"><span class="premium-kicker">MAKE IT YOUR OWN</span><h2>A menu that matches your restaurant.</h2><p>Explore three distinct menu designs before creating your own.</p></div><div class="example-grid">${exampleCards()}</div></section><section class="wrap premium-close"><div><h2>Start free. Upgrade when you need more.</h2><p>Compare Free, Menu Pro and Service plans.</p></div><a class="btn primary" href="/#pricing">Compare plans →</a></section><div class="wrap">${marketingFooter()}</div></main>`};
if(ready)render();

let brandPrefs=null,brandOwner=null;
const brandSettings=settingsHtml;
settingsHtml=function(){if(brandOwner!==restaurant.id){brandOwner=restaurant.id;brandPrefs=null}const markup=brandSettings();if(!brandPrefs){const owner=brandOwner;api('appearance').then(p=>{if(brandOwner!==owner)return;brandPrefs=p;const el=document.getElementById('brand-controls');if(el)el.innerHTML=brandControls()}).catch(()=>{const el=document.getElementById('brand-controls');if(el)el.textContent='Unable to load appearance. Reopen Settings to retry.'})}return markup+`<section class="card" style="margin-top:20px"><h3>Brand identity</h3><p class="muted">Personalise the colours and typography of your guest menu.</p><div id="brand-controls">${brandPrefs?brandControls():'Loading appearance…'}</div></section>`};
function brandControls(){const p=brandPrefs;return `<form onsubmit="saveBrand(event)"><label>Accent colour <input name="accent" type="color" value="${/^#[0-9a-f]{6}$/i.test(p.accent)?p.accent:getComputedStyle(document.documentElement).getPropertyValue('--brand-accent').trim()}"></label><label><input type="checkbox" name="defaultAccent" ${p.accent?'':'checked'}> Use theme's default colour</label><label>Typography<select name="font">${[['default','Theme default'],['sans','Modern sans-serif'],['serif','Classic serif']].map(([v,n])=>`<option value="${v}" ${p.font===v?'selected':''}>${n}</option>`).join('')}</select></label><button class="btn primary">Save branding</button><p id="brand-status" role="status"></p></form>`};
saveAppearance=async function(theme){const el=document.getElementById('appearance-status');try{const p=await api('appearance');brandPrefs=await api('appearance','PUT',{...p,theme});if(el)el.textContent='Saved: '+theme;toast('Menu design saved')}catch(e){if(el)el.textContent=e.message}};
async function saveBrand(e){e.preventDefault();const form=e.target,button=form.querySelector('button');button.disabled=true;try{const d=new FormData(form),p=await api('appearance');brandPrefs=await api('appearance','PUT',{theme:p.theme,accent:d.has('defaultAccent')?'':d.get('accent'),font:d.get('font')});document.getElementById('brand-status').textContent='Branding saved.';toast('Branding saved')}catch(err){document.getElementById('brand-status').textContent=err.message}finally{button.disabled=false}}
if(ready)render();

let previewLanguage='en';
const demoCurrencies={en:['en-GB','GBP',16],ro:['ro-RO','RON',95],de:['de-DE','EUR',19],es:['es-ES','EUR',19],fr:['fr-FR','EUR',19],it:['it-IT','EUR',19],fi:['fi-FI','EUR',19],sv:['sv-SE','SEK',210],pl:['pl-PL','PLN',82],pt:['pt-PT','EUR',19],nl:['nl-NL','EUR',19],el:['el-GR','EUR',19],da:['da-DK','DKK',145],no:['nb-NO','NOK',220],cs:['cs-CZ','CZK',475],hu:['hu-HU','HUF',7500]};
function demoLocalPrice(code){const [locale,currency,amount]=demoCurrencies[code]||demoCurrencies.en;return formatMenuPrice(amount,currency,locale)}

function languagePreview(){const l=LOCALES[previewLanguage];return `<div class="language-interactive"><div><span class="premium-kicker">16 MENU LANGUAGES</span><h2>Welcome guests in their own language.</h2><p>Choose a language and watch the sample guest menu change instantly.</p><div class="language-chips">${Object.entries(LOCALES).map(([code,t])=>`<button class="language-chip" aria-pressed="${code===previewLanguage}" onclick="changePreviewLanguage('${code}')">${esc(t[0])}</button>`).join('')}</div><p class="fine">Sample translations and local illustrative prices are shown here, not live exchange rates. Restaurants choose their actual menu currency and supply verified translations.</p></div><div class="language-preview-phone" lang="${previewLanguage}" aria-live="polite"><div class="language-preview-top"><span>${esc(l[6])} 7</span><h3>The Greenhouse</h3><span>${esc(l[7])}</span></div><img src="${esc(seed[1].image)}" alt=""><div class="language-preview-body"><h3>${esc(demoDishNames[previewLanguage])}</h3><p>${esc(l[4])}: ${esc(demoAllergens[previewLanguage])}</p><strong>${esc(demoLocalPrice(previewLanguage))}</strong><div class="language-preview-actions"><span>${esc(l[1])}</span><span>${esc(l[2])}</span></div></div></div></div>`};
function changePreviewLanguage(code){if(!Object.hasOwn(LOCALES,code))return;previewLanguage=code;lab.lang=code;document.querySelectorAll('[data-language-preview]').forEach(el=>{el.innerHTML=languagePreview();el.querySelector('button[aria-pressed=true]')?.focus({preventScroll:true})});if(document.getElementById('product-lab'))renderLab()}
const languageSectionBefore=marketingSection;
marketingSection=function(id){return id==='languages'?'<section class="marketing-section" id="languages" data-language-preview>'+languagePreview()+'</section>':languageSectionBefore(id)};
const languageHomeBefore=home;
home=function(){return languageHomeBefore().replace('<section class="wrap premium-close">','<section class="wrap premium-features" data-language-preview>'+languagePreview()+'</section><section class="wrap premium-close">')};
if(ready)render();

function companyLogo(url){
  return /^\/api\/media\/[a-f0-9-]{36}$/.test(url||'')
    ? `<img src="${esc(url)}" alt="Company logo" style="display:block;width:auto;max-width:148px;height:auto;max-height:64px;object-fit:contain;background:white;border-radius:8px;padding:5px;margin:0 0 8px">`
    : '';
}

const settingsBeforeLogo=settingsHtml;
settingsHtml=function(){
  return settingsBeforeLogo()+`<section class="card" style="margin-top:20px"><h3>Company logo</h3><p class="muted">Put your logo on the digital menu, printed menus and QR cards.</p>${restaurant.paid&&restaurant.plan!=='Free'?'<button class="btn" onclick="openLogoSettings()">Manage company logo</button>':'<p class="fine">Available with a paid Menu Pro or Service subscription.</p>'}</section>`;
};
async function openLogoSettings(){
  try{
    const {url}=await api('logo');
    modal(`<h2>Company logo</h2>${companyLogo(url)}<p class="muted">Upload a PNG, JPEG or WebP image up to 5 MB.</p><form onsubmit="saveCompanyLogo(event)"><label>Logo image<input name="logo" type="file" accept="image/png,image/jpeg,image/webp" required></label><button class="btn primary">Save logo</button> ${url?'<button class="btn" type="button" onclick="saveCompanyLogo(event,true)">Remove logo</button>':''}</form>`);
  }catch(e){toast(e.message)}
}
async function saveCompanyLogo(e,remove=false){
  e.preventDefault();
  const form=remove?e.currentTarget.form:e.currentTarget;
  const file=form.elements.logo.files[0];
  if(!remove&&(!file||file.size>5000000))return toast('Choose an image up to 5 MB.');
  const buttons=[...form.querySelectorAll('button')];
  buttons.forEach(button=>button.disabled=true);
  try{
    const {url}=remove?{url:''}:await api('upload','POST',file);
    await api('logo','PUT',{url});
    closeModal();
    toast(remove?'Logo removed.':'Logo saved to your guest menu.');
  }catch(err){toast(err.message)}
  finally{buttons.forEach(button=>button.disabled=false)}
}
async function openPrintDownload(kind='menu',token=''){
  try{
    const {url}=restaurant.paid&&restaurant.plan!=='Free'?await api('logo'):{url:''};
    const table=tables.find(t=>t.token===token&&t.enabled);
    const title=kind==='qr'?(table?(table.label||'Table '+table.number)+' QR card':'Menu QR card'):'Printable menu';
    modal(`<h2>${esc(title)}</h2><p class="muted">Download an A4 PDF ready to print.</p><form id="print-download-form"><label><input type="checkbox" name="includeLogo" ${url?'checked':'disabled'}> Include company logo</label>${url?'':'<p class="fine">Add your logo in Settings with paid Menu Pro or Service.</p>'}<button class="btn primary">Download PDF ↓</button></form>`);
    document.getElementById('print-download-form').onsubmit=e=>downloadPrintable(e,kind,table,url);
  }catch(e){toast(e.message)}
}
async function printableImage(url){
  const response=await fetch(url);
  if(!response.ok)throw Error('Could not load artwork for the download.');
  const blob=await response.blob();
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(reader.result);
    reader.onerror=()=>reject(Error('Could not read the image.'));
    reader.readAsDataURL(blob);
  });
}
async function downloadPrintable(e,kind,table,logo){
  e.preventDefault();
  const form=e.currentTarget,button=form.querySelector('button');
  button.disabled=true;
  try{
    const {jsPDF}=await import('https://cdn.jsdelivr.net/npm/jspdf@4.2.1/+esm');
    const pdf=new jsPDF({format:'a4',compress:true});
    const canvas=document.createElement('canvas');
    canvas.width=1240;canvas.height=1754;
    const ctx=canvas.getContext('2d');
    const left=85,right=1155,bottom=1665;
    let y,page=0;
    const newPage=()=>{
      ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.fillStyle='#191919';ctx.textAlign='left';ctx.textBaseline='top';y=85;
    };
    const finishPage=()=>{
      if(page++)pdf.addPage('a4');
      pdf.addImage(canvas.toDataURL('image/jpeg',.96),'JPEG',0,0,210,297);
    };
    const font=(size,weight=400)=>{ctx.font=weight+' '+size+'px system-ui, sans-serif'};
    const line=(value,size,weight=400)=>{
      font(size,weight);
      for(const text of wrapPDFText(ctx,value,right-left)){
        if(y+size+12>bottom){finishPage();newPage();font(size,weight)}
        ctx.fillText(text,left,y);y+=size+12;
      }
    };
    newPage();
    if(form.elements.includeLogo.checked&&logo){
      const image=await loadMenuImage(await printableImage(logo));
      const scale=Math.min(290/image.naturalWidth,120/image.naturalHeight);
      ctx.drawImage(image,left,y,image.naturalWidth*scale,image.naturalHeight*scale);
      y+=image.naturalHeight*scale+24;
    }
    line(restaurant.name,56,700);
    y+=20;
    if(kind==='qr'){
      const query=new URLSearchParams({r:restaurant.slug});
      if(table)query.set('t',table.token);
      const qr=await loadMenuImage(await printableImage('/api/qr?'+query));
      line(table?(table.label||'Table '+table.number):'Menu',38,700);
      line('Scan to view the menu',30);
      ctx.imageSmoothingEnabled=false;
      ctx.drawImage(qr,left,y+22,700,700);
    }else{
      const grouped=new Map();
      for(const item of state.items.filter(item=>item.available).slice(0,restaurant.limit)){
        if(!grouped.has(item.category))grouped.set(item.category,[]);
        grouped.get(item.category).push(item);
      }
      if(!grouped.size)line('No available dishes.',30);
      for(const [category,items] of grouped){
        if(y+160>bottom){finishPage();newPage()}
        line(category,38,700);
        for(const item of items){
          if(y+120>bottom){finishPage();newPage()}
          line(item.name+' — '+money(item.price),30,700);
          if(item.desc)line(item.desc,25);
          if(item.allergens)line('Allergens: '+item.allergens,23);
          y+=12;
        }
        y+=20;
      }
    }
    finishPage();
    pdf.save(restaurant.slug+(kind==='menu'?'-menu':table?'-table-'+table.number:'-menu-qr')+'.pdf');
    closeModal();
  }catch(err){toast(err.message)}
  finally{button.disabled=false}
}
function wrapPDFText(ctx,value,width){
  const lines=[];
  let current='';
  for(const word of String(value).split(/\s+/)){
    const next=current?current+' '+word:word;
    if(current&&ctx.measureText(next).width>width){lines.push(current);current=word}
    else current=next;
    if(ctx.measureText(current).width>width){
      let chunk='';
      for(const char of current){
        if(chunk&&ctx.measureText(chunk+char).width>width){lines.push(chunk);chunk=''}
        chunk+=char;
      }
      current=chunk;
    }
  }
  if(current)lines.push(current);
  return lines;
}

const homeBeforeLogo=home;
home=function(){
  return homeBeforeLogo().replace('<section class="wrap premium-close">',`<section class="wrap premium-features"><div class="premium-section-heading"><h2>Your logo, from the table to the phone</h2><p>With Menu Pro or Service, add your company logo once. Show it on the digital menu and include it when you download printable menus and QR cards.</p><a class="btn" href="/#pricing">Compare plans →</a></div></section><section class="wrap premium-close">`);
};
if(ready)render();
