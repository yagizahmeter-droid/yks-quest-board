'use strict';const assert=require('node:assert/strict');
module.exports=async({admin,asUser,rpc,classes,t,other,students,cid,check,denied})=>{
 await admin.query(require('../scripts/v150-workspace-migration.cjs')('M7'));const result=await rpc(t,'action_center',{class_id:cid});assert.equal(result.classes[0].id,cid);assert.ok(Number.isInteger(result.classes[0].pending));assert.equal(result.time_zone,'Europe/Istanbul');assert.equal(JSON.stringify(result).includes('quests'),false);assert.equal(JSON.stringify(result).includes('results'),false);check(true,'Action center contains scoped counts and targets, not full task or exam histories');
 await denied(rpc(students[0],'action_center',{class_id:cid}),'Student cannot read teacher action center');await denied(rpc(other,'action_center',{class_id:cid}),'Unrelated teacher cannot read class action counts');await denied(asUser(t,'select ders_workspace_private.action_center($1)',[cid]),'Private action-center helper cannot bypass dispatcher authorization');
 await admin.query('insert into ders_admin_private.members(user_id) values($1) on conflict do nothing',[t]);
};
