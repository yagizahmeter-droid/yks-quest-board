'use strict';
// Real local PostgreSQL/RLS fixture for the still-supported class composer.
module.exports=({asUser,ids})=>async()=>{
 const rpc=async(uid,action,payload)=>(await asUser(uid,'select public.ders_classes($1,$2::jsonb) r',[action,JSON.stringify(payload)])).rows[0].r;
 const account=async(uid,action,payload={})=>(await asUser(uid,'select public.ders_action($1,$2::jsonb) r',[action,JSON.stringify(payload)])).rows[0].r;
 // Earlier scenarios intentionally revoke this link. Establish a fresh valid
 // fixture via the public invitation flow instead of editing connection rows.
 if(!(await account(ids[0],'overview')).connections.some(c=>c.student_id===ids[1]&&c.status==='approved')){
  const invite=await account(ids[0],'create_invite');await account(ids[1],'request_connection',{code:invite.code});const link=(await account(ids[0],'overview')).connections.find(c=>c.student_id===ids[1]);await account(ids[0],'respond_connection',{id:link.id,status:'approved'});
 }
 const cid=require('node:crypto').randomUUID();await rpc(ids[0],'create_class',{id:cid,name:'Catalog regression fixture'});await rpc(ids[0],'invite',{class_id:cid,student_ids:[ids[1]]});const request=(await rpc(ids[1],'overview',{})).requests.find(r=>r.class_id===cid&&r.status==='pending');await rpc(ids[1],'respond_requests',{class_id:cid,ids:[request.id],status:'accepted'});
 const target={id:cid,name:'Catalog regression fixture',members:[{student_id:ids[1],name:'Test Student'}]};
 return Object.assign(async page=>{await page.evaluate(target=>DersTeacher.openClassProgram(target),target);await page.locator('#assignmentForm').waitFor();},{draftKey:'class:'+cid});
};
