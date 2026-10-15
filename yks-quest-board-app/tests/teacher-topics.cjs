const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
module.exports=async({admin,action,asUser,board,check,denied})=>{
 const t=randomUUID(),s=randomUUID();for(const id of [t,s])await admin.query('insert into auth.users values($1)',[id]);
 await action(t,'init_profile',{role:'teacher',name:'Topic Teacher'});await action(s,'init_profile',{role:'student',name:'Topic Student'});
 const invite=await action(t,'create_invite');await action(s,'request_connection',{code:invite.code});const link=(await action(t,'overview')).connections.find(c=>c.student_id===s);await action(t,'respond_connection',{id:link.id,status:'approved'});
 check((await action(t,'overview')).capabilities.topicCatalog,'Server advertises separate topic metadata capability');
 const base={exam_type:'TYT',category:'Matematik',topic_category:'Problemler',title:'Ignored client title',detail:'',xp:100};
 const a=await action(t,'assign_program',{student_id:s,week_name:'Topic scopes',quests:[{...base,topic_scope:'topic',topic_name:'Yaş Problemleri'},{...base,topic_scope:'category',topic_name:null,xp:125,repeat_kind:'weekly',repeat_target:2}]});
 const tasks=(await action(s,'overview')).assignments.find(x=>x.id===a.assignment_id).quests;
 assert.equal(tasks[0].title,'Yaş Problemleri');assert.equal(tasks[1].title,'Problemler');assert.equal(tasks[1].topic_name,null);check(true,'Server derives title from subtopic or category, ignoring supplied display title');
 assert.equal(tasks[0].exam_type,'TYT');assert.equal(tasks[0].category_name,'Matematik');assert.equal(tasks[0].topic_category,'Problemler');assert.equal(tasks[0].topic_name,'Yaş Problemleri');check(true,'Exam, lesson, category, subtopic and scope persist separately');
 for(const extra of [{topic_scope:'category',topic_name:'Genel'},{topic_scope:'topic',topic_name:''},{topic_scope:'invalid',topic_name:'A'},{topic_scope:null,topic_name:'A'}])await denied(action(t,'assign_program',{student_id:s,week_name:'Invalid scope',quests:[{...base,...extra}]}),'Malformed scope cannot create a program');
 await action(s,'respond_assignment',{id:a.assignment_id,status:'accepted'});let saved=await board(s);const qs=saved.state.weeks[0].quests;
 assert.equal(qs[0].topicName,'Yaş Problemleri');assert.equal(qs[1].topicScope,'category');assert.equal(qs[1].topicName,null);check(true,'Student board receives canonical scope fields and derived names');
 for(const field of ['topicCategory','topicName','topicScope']){const bad=structuredClone(saved.state);bad.weeks[0].quests[0][field]='Forged';await denied(action(s,'sync_board',{state:bad,expected_version:saved.version}),'Student cannot forge teacher '+field);}
 await denied(action(s,'request_change',{quest_id:tasks[0].id,changes:{title:'New manual name',detail:'',xp:100}}),'Derived name cannot be replaced by manual change request');
 await action(s,'request_change',{quest_id:tasks[0].id,changes:{title:'Yaş Problemleri',detail:'40 soru çöz, yanlışlarını analiz et.',xp:150}});const request=(await action(t,'overview')).requests.find(r=>r.status==='pending');await action(t,'resolve_change',{id:request.id,status:'approved'});
 saved=await board(s);assert.equal(saved.state.weeks[0].quests[0].title,'Yaş Problemleri');assert.equal(saved.state.weeks[0].quests[0].xp,150);assert.match(saved.state.weeks[0].quests[0].detail,/40 soru/);check(true,'Description and XP change approval still works without altering derived title');
 const op={quest_id:tasks[1].id,request_id:randomUUID()};await action(s,'complete_repeat',op);await action(s,'complete_repeat',op);await action(s,'complete_repeat',{quest_id:tasks[1].id,request_id:randomUUID()});
 const xp=(await action(s,'read_board')).xpBreakdown;assert.equal(xp.competitive,250);assert.equal(xp.personal,0);check(true,'Category-wide recurring quest preserves idempotency and competitive XP');
 const legacy=await action(t,'assign_program',{student_id:s,week_name:'Legacy protocol',quests:[{category:'Fizik',title:'Eski özel görev',xp:75}]});const old=(await action(s,'overview')).assignments.find(x=>x.id===legacy.assignment_id).quests[0];assert.equal(old.title,'Eski özel görev');assert.equal(old.topic_scope,null);check(true,'Old clients and legacy task names remain compatible');
 await denied(asUser(s,"select ders_private.action_before_topics('overview','{}')"),'Previous action wrapper is not exposed to clients');
 await action(t,'remove_connection',{id:link.id});await denied(action(t,'student_board',{student_id:s}),'New scope metadata does not bypass connection revocation');
};
