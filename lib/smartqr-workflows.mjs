const q=(db,s,...a)=>db.prepare(s).bind(...a);
// Explicit operator-triggered, bounded and idempotent. No email side effects.
export async function trialFollowups(db,now=Date.now()){
 const rows=(await q(db,"SELECT owner_id,trial_end FROM smartqr_accounts WHERE trial_end>? AND trial_end<=? ORDER BY trial_end LIMIT 100",now,now+3*86400000).all()).results;
 let created=0;
 for(const row of rows){
 const key='trial-expiring:'+row.owner_id+':'+row.trial_end,task=crypto.randomUUID();
 const r=await db.batch([q(db,"INSERT OR IGNORE INTO smartqr_workflow_runs VALUES (?,?,?,?)",key,'trial-expiring',row.owner_id,now),q(db,"INSERT INTO crm_tasks (id,lead_id,title,owner_id,due_at,status,revision,created_at) SELECT ?,NULL,?,NULL,?,'open',0,? WHERE changes()>0",task,'Review expiring trial: '+row.owner_id,row.trial_end,now)]);
 created+=r[0].meta.changes;
 }
 return {examined:rows.length,created};
}
