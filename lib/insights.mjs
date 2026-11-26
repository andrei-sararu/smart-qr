export function analyseMenu(items,originalLanguage='en'){
 const visible=items.filter(x=>x.available!==false),missingAllergens=visible.filter(x=>!String(x.allergens||'').trim()),missingPhotos=visible.filter(x=>!x.image),missingDescriptions=visible.filter(x=>!String(x.desc||'').trim());
 const languages=[...new Set(visible.flatMap(x=>Object.keys(x.translations||{})))].filter(x=>x!==originalLanguage);
 const coverage=Object.fromEntries(languages.map(lang=>[lang,{complete:visible.filter(x=>x.translations?.[lang]?.name&&(!x.desc||x.translations?.[lang]?.desc)&&(!x.allergens||x.translations?.[lang]?.allergens)&&x.translations?.[lang]?.category).length,total:visible.length}]));
 return {total:items.length,available:visible.length,hidden:items.length-visible.length,missingAllergens:missingAllergens.map(x=>({id:x.id,name:x.name})),missingPhotos:missingPhotos.length,missingDescriptions:missingDescriptions.length,photoCoverage:visible.length?Math.round((visible.length-missingPhotos.length)/visible.length*100):0,translationCoverage:coverage};
}
export function serviceSummary(rows,clock=Date.now()){
 const day=86400000,recent=rows.filter(r=>r.created_at>=clock-7*day),today=recent.filter(r=>r.created_at>=clock-day),pending=rows.filter(r=>r.status!=='done'),waits=recent.filter(r=>Number.isFinite(r.taken_at)&&r.taken_at>=r.created_at).map(r=>(r.taken_at-r.created_at)/1000).sort((a,b)=>a-b),hourly=Array.from({length:24},(_,hour)=>({hour,count:0}));
 for(const r of recent)hourly[new Date(r.created_at).getUTCHours()].count++;
 const m=Math.floor(waits.length/2),median=waits.length?(waits.length%2?waits[m]:(waits[m-1]+waits[m])/2):null;
 return {requests7d:recent.length,requests24h:today.length,open:pending.length,waiting:pending.filter(r=>r.status==='new').length,oldestOpenSeconds:pending.length?Math.max(0,...pending.map(r=>Math.floor((clock-r.created_at)/1000))):0,medianResponseSeconds:median===null?null:Math.round(median),measuredResponses:waits.length,hourlyUTC:hourly};
}
export function planningScenario({requestsPerDay,secondsPerRequest,daysPerMonth,hourlyCost,monthlyPlan}){
 const vals=[requestsPerDay,secondsPerRequest,daysPerMonth,hourlyCost,monthlyPlan];if(vals.some(x=>typeof x!=='number'||!Number.isFinite(x)||x<0))throw Error('Use non-negative numbers.');
 if(requestsPerDay>1000||secondsPerRequest>600||daysPerMonth>31||hourlyCost>200||monthlyPlan>1000)throw Error('Inputs exceed the planning range.');
 const hours=requestsPerDay*secondsPerRequest*daysPerMonth/3600,timeValue=hours*hourlyCost;
 return {hours:Math.round(hours*10)/10,timeValue:Math.round(timeValue),plan:monthlyPlan,breakEvenMinutes:hourlyCost?Math.round(monthlyPlan/hourlyCost*60):null};
}
