export const TRIAL_MS=14*86400000;
export const PLANS=Object.freeze({Free:{limit:0,monthly:0},Starter:{limit:10,monthly:999},Business:{limit:100,monthly:1999},Agency:{limit:1000,monthly:4999}});
export function entitlement(account,now=Date.now()){
 const trial=!!account&&account.trial_end>now;
 const plan=trial?'Starter':'Free';
 return {plan,trial,trialEnd:account?.trial_end??null,limit:PLANS[plan].limit,checkoutReady:false};
}
export function qrOptions(data={}){
 const dark=data.dark??'#142d25',light=data.light??'#ffffff',size=data.size??512;
 if(!/^#[0-9a-f]{6}$/i.test(dark)||!/^#[0-9a-f]{6}$/i.test(light)||![256,512,1024].includes(size))throw Error('Invalid QR appearance');
 const lum=h=>{const c=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2]};
 if((lum(light)+.05)/(lum(dark)+.05)<4.5)throw Error('Invalid QR appearance');
 return {width:size,margin:4,errorCorrectionLevel:'M',color:{dark,light}};
}
