const restaurantWalkthrough=[
  ['Scan the QR at Table 7','The table code opens the menu in the guest’s browser and identifies the table.','Menu opens','Table 7 · The Greenhouse','Ready for requests','The service board is open on the staff tablet.'],
  ['Choose your dishes and call the waiter','Add mushroom risotto with extra Parmesan. At the bottom of the menu, tap Ready to order to call the waiter with your dish list.','Dish list sent','1 × Mushroom risotto · extra Parmesan','New dish list · Table 7','Mushroom risotto + extra Parmesan · waiting for staff'],
  ['The waiter receives the request','The waiter sees Table 7 and the selected dishes on the service board. The guest sees Order list sent.','Order list sent','Table 7 · confirm your order with the waiter','Table 7 needs attention','The waiter takes the request and checks the dish list with the guest.'],
  ['Confirm, prepare and serve','After confirming the order at the table, staff move it through preparation and mark it served.','Order served','The waiter brings the risotto to Table 7.','Served · Table 7','The confirmed order is included in the open table bill.'],
  ['The guest requests the bill','The guest selects Request bill. A new request appears on the same service board for Table 7.','Bill requested','The team has received your request.','New bill request · Table 7','The waiter opens the table bill and takes payment at the till.'],
  ['Staff close the table bill','After payment at the till, staff close the bill in Smart QR.','Paid at the till','The guest’s visit is complete.','Bill closed · Table 7','Payment recorded by staff after taking it at the till.']
];
const assetWalkthrough=[
  ['Scan the equipment label','A resident scans the QR on boiler B1024. The printed code opens its current profile.','Boiler B1024','Plant room · Riverside House','Visit recorded','Analytics records a visit for this QR code.'],
  ['Open the issue form','The resident can read the instructions or choose Report an issue.','Report an issue','The form is linked to boiler B1024.','Form opened','Cotiso tracks that the form was opened.'],
  ['Submit the fault','The resident reports the fault. Cotiso saves the report with the asset reference and location.','Report received','The boiler displays an error.','New report · B1024','Riverside House · The boiler displays an error.'],
  ['The team resolves the issue','The owner moves the report to In progress and then marks it Resolved.','Report saved','The resident sees a submission confirmation.','Resolved · B1024','The report remains available in the workspace.']
];
function walkthroughScreens(kind,index){
  const dining=kind==='restaurant';
  const [, ,guest,guestDetail,board,boardDetail]=(dining?restaurantWalkthrough:assetWalkthrough)[index];
  const control=(label,tap=false)=>`<div class="walk-control ${tap?'walk-tap':''}">${label}</div>`;
  const ticket=(tone='open',extra='')=>`<div class="workflow-ticket walk-ticket--${tone}"><h3>${board}</h3><p>${boardDetail}</p>${extra}</div>`;
  const scan=(label)=>`<div class="walk-viewfinder walk-tap"><span>${label}</span><i></i></div>`;
  const dish=`<img class="walk-food" src="${seed[1].image}" alt="Illustrative mushroom risotto">`;
  let phone,staff,transfer='';
  if(dining){
    switch(index){
      case 0:
        phone=scan('Table 7 QR')+`<h3>Table 7 menu</h3>`+control('Open menu');
        staff=`<div class="walk-board-tabs"><span>Requests</span><span>Orders</span><span>Bills</span></div>`+ticket('quiet');
        break;
      case 1:
        phone=dish+`<h3>Mushroom risotto</h3><p>1 serving · Extra Parmesan</p>`+control('Ready to order (1)',true);
        staff=ticket('arrival','<span class="walk-badge">New request</span>');
        transfer='Table 7 and dish list sent to staff';
        break;
      case 2:
        phone=`<div class="walk-confirm"><span>✓</span><h3>${guest}</h3><p>${guestDetail}</p></div>`;
        staff=ticket('attention',control('Take request',true));
        break;
      case 3:
        phone=dish+`<h3>${guest}</h3><p>${guestDetail}</p>`;
        staff=`<div class="walk-order-track"><span>Confirmed</span><span>Preparing</span><strong>Served</strong></div>`+ticket('open',control('Mark served',true));
        break;
      case 4:
        phone=`<h3>Table 7</h3><p>Your table order</p>`+control('Request bill',true)+`<p>${guestDetail}</p>`;
        staff=ticket('arrival','<span class="walk-badge">Bill request</span>');
        transfer='Bill request sent to staff';
        break;
      case 5:
        phone=`<div class="walk-receipt"><h3>Table 7 bill</h3><p>Mushroom risotto</p><p>Extra Parmesan</p><strong>Paid at the till</strong></div>`;
        staff=ticket('done',control('Close bill',true));
        break;
    }
  }else{
    switch(index){
      case 0:
        phone=scan('Equipment QR')+`<h3>${guest}</h3><p>${guestDetail}</p>`;
        staff=ticket('quiet','<span class="walk-badge">Visit tracked</span>');
        break;
      case 1:
        phone=`<h3>Boiler B1024</h3>`+control('View instructions')+control('Report an issue',true);
        staff=ticket('open');
        break;
      case 2:
        phone=`<h3>Report an issue</h3><div class="walk-field">The boiler displays an error.</div>`+control('Submit report',true);
        staff=ticket('arrival','<span class="walk-badge">New</span>');
        transfer='Report sent to maintenance';
        break;
      case 3:
        phone=`<div class="walk-confirm"><span>✓</span><h3>${guest}</h3><p>${guestDetail}</p></div>`;
        staff=`<div class="walk-order-track"><span>New</span><span>In progress</span><strong>Resolved</strong></div>`+ticket('done',control('Mark resolved',true));
        break;
    }
  }
  return `<div class="workflow-phone"><span class="walk-device-label">${dining?'Guest phone':'Resident phone'}</span>${phone}</div>
    <div class="workflow-board"><span class="walk-device-label">${dining?'Waiter’s service board':'Maintenance workspace'}</span>
    ${transfer?`<div class="walk-transfer"><span aria-hidden="true">→</span> ${transfer}</div>`:''}${staff}</div>`;
}
function workflowWalkthrough(kind){
  const restaurant=kind==='restaurant',steps=restaurant?restaurantWalkthrough:assetWalkthrough;
  const photo=restaurant?venues[lab.venue]?.photo||venues.restaurant.photo:'';
  return `<main class="wrap workflow-demo" data-walkthrough="${kind}">
    <nav class="actions" aria-label="Demo journeys"><a class="btn ${restaurant?'primary':''}" href="/#demo" ${restaurant?'aria-current="page"':''}>Restaurant service</a><a class="btn ${restaurant?'':'primary'}" href="/#platform-demo" ${restaurant?'':'aria-current="page"'}>Asset reporting</a></nav>
    <p class="workflow-kicker">Automatic product walkthrough</p>
    <h1>${restaurant?'From table scan to waiter service':'From equipment scan to resolved fault'}</h1>
    <p class="muted">Follow ${restaurant?'the guest’s phone and the waiter’s service board':'the resident’s phone and the maintenance workspace'} side by side. Illustrative journey.</p>
    <ol class="workflow-progress" aria-label="Walkthrough chapters">${steps.map(([title],i)=>`<li ${i===0?'aria-current="step"':''}><button type="button" data-chapter="${i}" onclick="seekWalkthrough(this,Number(this.dataset.chapter))"><span>${i+1}</span> ${title}</button></li>`).join('')}</ol>
    <section class="workflow-scene" aria-label="Current chapter">
      <div class="workflow-photo ${photo?'':'workflow-equipment'}" ${photo?`style="background-image:linear-gradient(0deg,#111b2fc9,#111b2f22),url('${photo}')"`:''}>
        <div><span data-walk-step>Step 1 of ${steps.length}</span><h2 data-walk-title>${steps[0][0]}</h2><p data-walk-copy>${steps[0][1]}</p></div>
      </div>
      <div class="workflow-devices" data-walk-devices>${walkthroughScreens(kind,0)}</div>
    </section>
    <div class="actions"><button type="button" class="btn" data-walk-toggle onclick="toggleWalkthrough(this)">Pause</button><button type="button" class="btn" onclick="replayWalkthrough(this)">Replay</button>
    <button type="button" class="btn" data-walk-prev onclick="stepWalkthrough(this,-1)" disabled>Previous</button>
    <button type="button" class="btn" data-walk-next onclick="stepWalkthrough(this,1)">Next</button>
    <a class="btn" href="${restaurant?'/#help?topic=service':'/#platform-guide?topic=profiles'}">Open setup guide</a></div>
    <details class="workflow-transcript"><summary>Read all steps</summary><ol>${steps.map(([title,copy])=>`<li><strong>${title}</strong><p>${copy}</p></li>`).join('')}</ol></details>
  </main>`;
}
let activeWalkthrough;
function updateWalkthrough(player,index){
  player.index=index;
  player.root.querySelector('[data-walk-prev]').disabled=index===0;
  player.root.querySelector('[data-walk-next]').disabled=index===player.steps.length-1;
  const [title,copy]=player.steps[index];
  const values={step:'Step '+(index+1)+' of '+player.steps.length,title,copy};
  for(const [key,value] of Object.entries(values))player.root.querySelector('[data-walk-'+key+']').textContent=value;
  player.root.querySelector('[data-walk-devices]').innerHTML=walkthroughScreens(player.kind,index);
  player.root.querySelectorAll('.workflow-progress li').forEach((item,i)=>{
    if(i===index)item.setAttribute('aria-current','step');
    else item.removeAttribute('aria-current');
  });
}
function startWalkthrough(player){
  clearTimeout(player.timer);
  player.paused=false;
  player.toggle.textContent='Pause';
  player.root.removeAttribute('data-paused');
  if(player.root.hasAttribute('data-still')){
    player.root.removeAttribute('data-still');
    updateWalkthrough(player,player.index);
  }
  player.timer=setTimeout(function advance(){
    if(!player.root.isConnected||player.paused)return;
    if(!document.hidden)updateWalkthrough(player,(player.index+1)%player.steps.length);
    player.timer=setTimeout(advance,6500);
  },6500);
}
function toggleWalkthrough(button){
  const player=activeWalkthrough;
  if(!player||!player.root.contains(button))return;
  if(player.paused)startWalkthrough(player);
  else{player.paused=true;clearTimeout(player.timer);player.root.setAttribute('data-paused','');button.textContent='Play'}
}
function seekWalkthrough(button,index){
  const player=activeWalkthrough;
  if(!player||!player.root.contains(button)||!Number.isInteger(index)||index<0||index>=player.steps.length)return;
  clearTimeout(player.timer);
  player.paused=true;
  player.toggle.textContent='Play';
  player.root.removeAttribute('data-paused');
  player.root.setAttribute('data-still','');
  updateWalkthrough(player,index);
}
function stepWalkthrough(button,offset){
  if(activeWalkthrough)seekWalkthrough(button,activeWalkthrough.index+offset);
}
function replayWalkthrough(button){
  const player=activeWalkthrough;
  if(!player||!player.root.contains(button))return;
  updateWalkthrough(player,0);
  startWalkthrough(player);
}
const beforeWalkthroughRender=render;
render=function(){
  if(ready&&!loadError&&['demo','product','platform-demo'].includes(view)){
    const kind=view==='platform-demo'?'asset':'restaurant';
    const root=document.querySelector('[data-walkthrough]');
    if(root&&activeWalkthrough?.root===root&&activeWalkthrough.view===view)return;
    clearTimeout(activeWalkthrough?.timer);
    document.getElementById('root').innerHTML=header()+workflowWalkthrough(kind);
    document.title='Cotiso QR | '+(kind==='restaurant'?'Restaurant walkthrough':'Asset walkthrough');
    const scene=document.querySelector('[data-walkthrough]');
    activeWalkthrough={root:scene,view,kind,index:0,steps:kind==='restaurant'?restaurantWalkthrough:assetWalkthrough,toggle:scene.querySelector('[data-walk-toggle]')};
    if(matchMedia('(prefers-reduced-motion: reduce)').matches)seekWalkthrough(activeWalkthrough.toggle,0);
    else startWalkthrough(activeWalkthrough);
    return;
  }
  clearTimeout(activeWalkthrough?.timer);
  activeWalkthrough=null;
  beforeWalkthroughRender();
};
if(ready)render();
