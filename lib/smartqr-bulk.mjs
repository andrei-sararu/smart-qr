import {destination} from './smartqr.mjs';
export function bulkRows(input){
 if(typeof input!=='string'||input.length>50000)throw Error('Enter up to 25 HTTPS URLs, one per line.');
 const lines=input.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
 if(!lines.length||lines.length>25)throw Error('Enter up to 25 HTTPS URLs, one per line.');
 return lines.map((line,i)=>({filename:'smartqr-'+String(i+1).padStart(2,'0')+'.svg',url:destination(line)}));
}
export async function bulkGenerate(input,render){const rows=bulkRows(input),out=[];for(const row of rows)out.push({...row,svg:await render(row.url)});return out}
