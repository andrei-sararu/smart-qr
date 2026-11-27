const restaurantWalkthrough=[
  ['Scan the QR at Table 7','The table code opens the menu in the guest’s browser and identifies the table.','Menu opens','Table 7 · The Greenhouse','Ready for requests','The service board is open on the staff tablet.'],
  ['Choose dishes and send the list','The guest picks mushroom risotto and adds extra Parmesan. Smart QR sends the selections and table number to the board.','Dish list sent','1 × Mushroom risotto · extra Parmesan','New dish list · Table 7','Mushroom risotto + extra Parmesan · waiting for staff'],
  ['The waiter receives the request','The waiter sees the new request on the service board. If sound is enabled on the open board, it can play an alert.','Waiting for confirmation','Table 7 · your list is with the team','Table 7 needs attention','The waiter takes the request and checks the dish list with the guest.'],
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
function workflowWalkthrough(kind){
  const restaurant=kind==='restaurant',steps=restaurant?restaurantWalkthrough:assetWalkthrough;
  const photo=restaurant?venues[lab.venue]?.photo||venues.restaurant.photo:'';
  const dish=restaurant?seed[1].image:'';
  return `<main class="wrap workflow-demo" data-walkthrough="${kind}">
    <p class="workflow-kicker">Automatic product walkthrough</p>
    <h1>${restaurant?'From table scan to closed bill':'From equipment scan to resolved fault'}</h1>
    <p class="muted">Follow ${restaurant?'the guest’s phone and the waiter’s service board':'the resident’s phone and the maintenance workspace'} side by side. Illustrative journey.</p>
    <ol class="workflow-progress" aria-label="Walkthrough chapters">${steps.map(([title],i)=>`<li ${i===0?'aria-current="step"':''}><span>${i+1}</span> ${title}</li>`).join('')}</ol>
    <section class="workflow-scene" aria-label="Current chapter">
      <div class="workflow-photo ${photo?'':'workflow-equipment'}" ${photo?`style="background-image:linear-gradient(0deg,#111b2fc9,#111b2f22),url('${photo}')"`:''}>
        <div><span data-walk-step>Step 1 of ${steps.length}</span><h2 data-walk-title>${steps[0][0]}</h2><p data-walk-copy>${steps[0][1]}</p></div>
      </div>
      <div class="workflow-devices">
        <div class="workflow-phone"><span>${restaurant?'Guest phone':'Resident phone'}</span>
          ${dish?`<img src="${dish}" alt="Mushroom risotto, illustrated with a sample dish">`:'<div class="workflow-asset-label">Asset B1024</div>'}
          <h3 data-walk-guest>${steps[0][2]}</h3><p data-walk-guest-detail>${steps[0][3]}</p>
        </div>
        <div class="workflow-board"><span>${restaurant?'Waiter’s service board':'Maintenance workspace'}</span>
          <div class="workflow-ticket"><h3 data-walk-board>${steps[0][4]}</h3><p data-walk-board-detail>${steps[0][5]}</p></div>
        </div>
      </div>
    </section>
    <div class="actions"><button type="button" class="btn" onclick="toggleWalkthrough(this)">Pause</button><button type="button" class="btn" onclick="replayWalkthrough(this)">Replay</button>
    <a class="btn" href="${restaurant?'/#help?topic=service':'/#platform-guide?topic=profiles'}">Open setup guide</a></div>
    <details class="workflow-transcript"><summary>Read all steps</summary><ol>${steps.map(([title,copy])=>`<li><strong>${title}</strong><p>${copy}</p></li>`).join('')}</ol></details>
  </main>`;
}
let activeWalkthrough;
function updateWalkthrough(player,index){
  player.index=index;
  const [title,copy,guest,guestDetail,board,boardDetail]=player.steps[index];
  const values={step:'Step '+(index+1)+' of '+player.steps.length,title,copy,guest,'guest-detail':guestDetail,board,'board-detail':boardDetail};
  for(const [key,value] of Object.entries(values))player.root.querySelector('[data-walk-'+key+']').textContent=value;
  player.root.querySelectorAll('.workflow-progress li').forEach((item,i)=>{
    if(i===index)item.setAttribute('aria-current','step');
    else item.removeAttribute('aria-current');
  });
}
function startWalkthrough(player){
  clearTimeout(player.timer);
  player.paused=false;
  player.toggle.textContent='Pause';
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
  else{player.paused=true;clearTimeout(player.timer);button.textContent='Play'}
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
    activeWalkthrough={root:scene,view,index:0,steps:kind==='restaurant'?restaurantWalkthrough:assetWalkthrough,toggle:scene.querySelector('button')};
    startWalkthrough(activeWalkthrough);
    return;
  }
  clearTimeout(activeWalkthrough?.timer);
  activeWalkthrough=null;
  beforeWalkthroughRender();
};
if(ready)render();
