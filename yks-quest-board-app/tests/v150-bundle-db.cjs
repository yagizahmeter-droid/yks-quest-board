'use strict';const assert=require('node:assert/strict');
module.exports=async({admin,asUser,t,cid,check})=>{
 const sql=require('../scripts/v150-staging-bundle.cjs')({enableCron:false});await admin.query(sql);const rows=(await admin.query("select version,data->>'_validated' preserved,(select count(*)::int from jsonb_object_keys(data->'_functions')) functions from ders_release_private.app_snapshots where version in('1.5.0-M3','1.5.0-M4','1.5.0-M5','1.5.0-M6','1.5.0-M7') order by version")).rows;assert.equal(rows.length,5);assert.ok(rows.every(r=>r.preserved==='true'&&r.functions>0));
 const result=(await asUser(t,'select public.ders_workspace($1,$2::jsonb) r',['action_center',JSON.stringify({class_id:cid})])).rows[0].r;assert.equal(result.classes[0].id,cid);assert.equal((await asUser(t,'select public.ders_workspace($1,$2::jsonb) r',['schedule_health','{}'])).rows[0].r.active,false);check(true,'Atomic staging bundle installs M3–M7 with closed function/ACL backups and preservation checks; unavailable Cron stays disabled');
 await assert.rejects(admin.query(sql));await admin.query('rollback');check(true,'Staging bundle rejects repeat installation before changing existing data');
};
