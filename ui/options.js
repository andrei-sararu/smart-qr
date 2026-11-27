const configuredGuestLines=new Map();

function editOptionRow(group,option={id:crypto.randomUUID(),name:'',price:''}){
  return `<div class="menu-option-row">
    <input type="hidden" name="${group}-id" value="${esc(option.id)}">
    <label>Option name<input name="${group}-name" value="${esc(option.name)}" maxlength="60" required></label>
    <label>${group==='variant'?'Price':'Extra price'}<input type="number" name="${group}-price" value="${esc(option.price)}" min="0" max="100000" step=".01" required></label>
    <button class="btn small" type="button" aria-label="Remove option" onclick="this.closest('.menu-option-row').remove()">Remove</button>
  </div>`;
}
function addEditorOption(button){
  const group=button.dataset.group,rows=button.previousElementSibling;
  if(rows.children.length>=12)return toast('Use up to 12 options per group.');
  rows.insertAdjacentHTML('beforeend',editOptionRow(group));
  rows.lastElementChild.querySelector('input:not([type=hidden])').focus();
}
function productOptionsEditor(dish){
  const groups=[['variant','Variants','The guest picks one size or variant. Enter its full price.',dish.variants],['extra','Extras','The guest can select extras. Enter the amount to add to the price.',dish.extras]];
  return `<details class="menu-product-options" ${dish.variants?.length||dish.extras?.length?'open':''}><summary>Variants and extras</summary>
    ${groups.map(([key,title,help,options])=>`<fieldset><legend>${title}</legend><p class="fine">${help}</p>
      <div>${(options||[]).map(option=>editOptionRow(key,option)).join('')}</div>
      <button class="btn small" type="button" data-group="${key}" onclick="addEditorOption(this)">Add ${key}</button>
    </fieldset>`).join('')}
  </details>
  <details class="menu-product-options" ${dish.allergenCodes!=null?'open':''}><summary>UK allergen declaration</summary>
    <p class="fine">Verify the ingredients for the dish, including its options. Record the allergens you can confirm. Use the allergen notes above for details by variant, ingredient or cross-contact.</p>
    <label><input type="checkbox" name="allergens-reviewed" ${dish.allergenCodes!=null?'checked':''}> Restaurant has reviewed this declaration</label>
    <div class="allergen-select-grid">${Object.entries(UK_ALLERGENS).map(([code,name])=>`<label><input type="checkbox" name="allergen-code" value="${code}" ${dish.allergenCodes?.includes(code)?'checked':''}> ${name}</label>`).join('')}</div>
  </details>`;
}
function readProductOptions(form){
  const group=key=>{
    const names=form.getAll(key+'-name'),prices=form.getAll(key+'-price');
    return form.getAll(key+'-id').map((id,index)=>({id,name:names[index],price:Number(prices[index])}));
  };
  const codes=form.getAll('allergen-code');
  return {variants:group('variant'),extras:group('extra'),allergenCodes:form.has('allergens-reviewed')||codes.length?codes:null};
}
function allergenDisplay(dish,notes){
  const names=(dish.allergenCodes||[]).map(code=>UK_ALLERGENS[code]).filter(Boolean);
  if(names.length)return [names.join(', '),notes].filter(Boolean).join(' · ');
  if(notes)return notes;
  return dish.allergenCodes==null?'Information not provided. Ask the restaurant team.':'No listed allergens declared. Ask the restaurant team if you have an allergy.';
}
function menuProductPrice(dish,currency,lang){
  const amount=dish.variants?.length?Math.min(...dish.variants.map(option=>option.price)):dish.price;
  const price=formatMenuPrice(amount,currency,lang==='no'?'nb':lang);
  if(dish.variants?.length>1&&dish.variants.some(option=>option.price!==amount))return (lang==='ro'?'De la ':'From ')+price;
  return price;
}
function browseProductOptions(dish,currency,lang){
  if(!dish.variants?.length&&!dish.extras?.length)return '';
  const money=amount=>formatMenuPrice(amount,currency,lang==='no'?'nb':lang);
  return `<details class="menu-product-options"><summary>Variants and extras</summary>
    <ul>${(dish.variants||[]).map(option=>`<li>${esc(option.name)} · ${esc(money(option.price))}</li>`).join('')}
    ${(dish.extras||[]).map(option=>`<li>${esc(option.name)} · +${esc(money(option.price))}</li>`).join('')}</ul></details>`;
}
function guestConfiguredButton(dish,name){
  const count=[...guestOrder].filter(([key])=>key.startsWith(dish.id+'|')).reduce((total,[,qty])=>total+qty,0);
  return `<button class="btn small" type="button" data-dish="${esc(dish.id)}" aria-label="${esc('Choose options for '+name)}" onclick="openDishChoices(this.dataset.dish)">Choose options${count?' ('+count+')':''}</button>`;
}
function openDishChoices(id){
  const dish=guest?.items.find(item=>item.id===id);
  if(!dish)return;
  const lang=publicLanguage==='no'?'nb':publicLanguage;
  const money=amount=>formatMenuPrice(amount,guest.currency,lang);
  const options=new Map([...(dish.variants||[]),...(dish.extras||[])].map(option=>[option.id,option.name]));
  const rows=[...guestOrder].filter(([key])=>key.startsWith(id+'|')).map(([key,quantity])=>{
    const choice=configuredGuestLines.get(key);
    const names=[choice?.variantId,...(choice?.extraIds||[])].filter(Boolean).map(option=>options.get(option)||'Unavailable option');
    return `<li>${quantity} × ${esc(names.join(', ')||'Standard')} <button type="button" class="btn small" data-line="${esc(key)}" data-dish="${esc(id)}" onclick="removeConfiguredLine(this)">Remove one</button></li>`;
  });
  modal(`<h2>${esc(dish.translations?.[publicLanguage]?.name||dish.name)}</h2>
    <form data-dish="${esc(id)}" onsubmit="addConfiguredLine(event)" onchange="updateOptionsPrice(this)">
    ${dish.variants?.length?`<label>Variant<select name="variant" required><option value="">Select a variant</option>${dish.variants.map(option=>`<option value="${esc(option.id)}">${esc(option.name)} · ${esc(money(option.price))}</option>`).join('')}</select></label>`:''}
    ${dish.extras?.length?`<fieldset><legend>Extras</legend>${dish.extras.map(option=>`<label><input type="checkbox" name="extra" value="${esc(option.id)}"> ${esc(option.name)} · +${esc(money(option.price))}</label>`).join('')}</fieldset>`:''}
    <p class="fine">${esc(allergenDisplay(dish,dish.translations?.[publicLanguage]?.allergens||dish.allergens))}</p>
    <p aria-live="polite" class="configured-price"></p><button class="btn primary">Add to list</button></form>
    ${rows.length?`<h3>Already in your list</h3><ul>${rows.join('')}</ul>`:''}`);
  updateOptionsPrice(document.querySelector('#overlay form'));
}
function updateOptionsPrice(form){
  const dish=guest.items.find(item=>item.id===form.dataset.dish);
  if(!dish)return;
  const fields=new FormData(form),variant=dish.variants?.find(option=>option.id===fields.get('variant'));
  const selected=fields.getAll('extra');
  const total=(variant?.price??dish.price)+(dish.extras||[]).filter(option=>selected.includes(option.id)).reduce((sum,option)=>sum+option.price,0);
  form.querySelector('.configured-price').textContent=dish.variants?.length&&!variant?'Choose a variant to see its price.':formatMenuPrice(total,guest.currency,publicLanguage==='no'?'nb':publicLanguage);
}
function addConfiguredLine(event){
  event.preventDefault();
  const form=event.currentTarget,fields=new FormData(form),id=form.dataset.dish;
  const variantId=fields.get('variant')||'',extraIds=fields.getAll('extra').sort();
  const key=id+'|'+JSON.stringify([variantId,extraIds]);
  const count=guestOrder.get(key)||0;
  if(count>=20||(!count&&guestOrder.size>=30))return toast('The dish list has reached its limit.');
  guestOrder.set(key,count+1);
  configuredGuestLines.set(key,{variantId,extraIds});
  closeModal();
  render();
}
function removeConfiguredLine(button){
  const key=button.dataset.line,count=guestOrder.get(key)||0;
  if(count>1)guestOrder.set(key,count-1);
  else{guestOrder.delete(key);configuredGuestLines.delete(key)}
  render();
  openDishChoices(button.dataset.dish);
}
function orderLineText(item){
  const price=item.unitPrice!=null&&item.currency?' · '+formatMenuPrice(item.unitPrice,item.currency,'en-GB')+' each':'';
  return item.quantity+' × '+esc(item.name+price);
}


function passwordRecoveryPage(){
  const token=new URLSearchParams(location.hash.split('?')[1]).get('token');
  return `<main class="wrap staff-page"><h1>${token?'Choose a new password':'Reset your password'}</h1>
    <form class="card" onsubmit="passwordRecovery(event)">
      ${token?`<label>New password<input name="password" type="password" required autocomplete="new-password" minlength="12" maxlength="128"></label>`:`<label>Account email<input name="email" type="email" required autocomplete="email" maxlength="254"></label>`}
      <button class="btn primary">${token?'Save new password':'Send reset link'}</button>
      <p role="status"></p>
    </form><a class="btn" href="/#dashboard">Sign in</a></main>`;
}
async function passwordRecovery(event){
  event.preventDefault();
  const form=event.currentTarget,token=new URLSearchParams(location.hash.split('?')[1]).get('token');
  const button=form.querySelector('button'),status=form.querySelector('[role=status]');
  button.disabled=true;
  try{
    const body={...Object.fromEntries(new FormData(form)),action:token?'reset':'forgot',token};
    const res=await fetch('/api/account',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const result=await res.json();
    if(!res.ok)throw Error(result.error);
    if(token){
      history.replaceState(null,'','/#reset-password');
      form.reset();
      form.querySelector('label').remove();
      button.remove();
      status.textContent='Your password has been updated. Sign in with your new password.';
    }else status.textContent='If this address is registered, you will receive a reset link.';
  }catch(error){status.textContent=error.message}
  finally{button.disabled=false}
}
const optionsRender=render;
render=function(){
  if(ready&&!loadError&&view==='reset-password'){
    document.title='Smart QR | Reset password';
    document.getElementById('root').innerHTML=header()+passwordRecoveryPage();
    return;
  }
  optionsRender();
};
if(ready)render();
