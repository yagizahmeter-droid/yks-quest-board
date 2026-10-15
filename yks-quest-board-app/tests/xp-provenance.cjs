const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
module.exports=async({admin,action,asUser,board,check,denied})=>{
 const [t,s,o]=[randomUUID(),randomUUID(),randomUUID()];
 for(const id of [t,s,o])await admin.query('insert into auth.users values($1)',[id]);
 await action(t,'init_profile',{role:'teacher',name:'XP Teacher'});await action(s,'init_profile',{role:'student',name:'XP Student'});await action(o,'init_profile',{role:'student',name:'XP Outsider'});
 const personal={categories:[{id:'math',name:'Matematik'}],weeks:[{id:'own',name:'Personal',range:'',quests:[{id:'own-q',categoryId:'math',subject:'math',title:'Personal task',detail:'',xp:150,done:true,completionId:'own-h'}]}],activeWeekId:'own',studyHistory:[{id:'own-h',questId:'own-q',weekId:'own',xp:150}]};
 await action(s,'sync_board',{expected_version:0,state:personal});
 const code=(await action(t,'create_invite')).code;await action(s,'request_connection',{code});const conn=(await action(t,'overview')).connections[0];await action(t,'respond_connection',{id:conn.id,status:'approved'});
 const a=await action(t,'assign_program',{student_id:s,week_name:'XP test',quests:[{category:'Matematik',title:'Weekly',xp:100,repeat_kind:'weekly',repeat_target:3},{category:'Fizik',title:'Legacy one-time',xp:75}]});await action(s,'respond_assignment',{id:a.assignment_id,status:'accepted'});
 const qs=(await action(s,'overview')).assignments[0].quests;await action(s,'complete_repeat',{quest_id:qs[0].id,request_id:randomUUID()});
 let saved=await board(s);saved.state.weeks.find(w=>w.id==='teacher-week-'+a.assignment_id).quests[1].done=true;await action(s,'sync_board',{expected_version:saved.version,state:saved.state});
 let r=await action(s,'read_board');assert.deepEqual(r.xpBreakdown,{competitive:175,personal:150,total:325});check(true,'Only canonical teacher tasks and immutable occurrences earn competitive XP');
 assert.deepEqual((await action(t,'student_board',{student_id:s})).xpBreakdown,r.xpBreakdown);check(true,'Teacher and student receive the same server-verified XP breakdown');
 for(const changes of [{source:'teacher_assigned'},{lockedForStudent:true},{assignedQuestId:qs[0].id},{assignedByTeacherId:t},{id:'teacher-quest-'+randomUUID()}]){saved=await board(s);const bad=structuredClone(saved.state);Object.assign(bad.weeks.find(w=>w.id==='own').quests[0],changes);await denied(action(s,'sync_board',{expected_version:saved.version,state:bad}),'Forged personal teacher provenance is rejected: '+Object.keys(changes)[0]);}
 saved=await board(s);const spoof=structuredClone(saved.state);spoof.xpBreakdown={competitive:999999,personal:0,total:999999};await action(s,'sync_board',{expected_version:saved.version,state:spoof});r=await action(s,'read_board');assert.equal(r.xpBreakdown.competitive,175);check(true,'Client supplied XP summary never changes competitive credit');
 await action(s,'archive_week',{week_id:'own'});await action(s,'archive_week',{week_id:'teacher-week-'+a.assignment_id});assert.deepEqual((await action(s,'read_board')).xpBreakdown,{competitive:175,personal:150,total:325});check(true,'Archival preserves personal and competitive balances');
 const other=await action(o,'read_board',{user_id:s});assert.equal(other.state,null);assert.equal(other.xpBreakdown.total,0);await denied(action(o,'student_board',{student_id:s}),'Unrelated student cannot read another XP breakdown');
 await action(t,'remove_connection',{id:conn.id});await denied(action(t,'student_board',{student_id:s}),'Disconnected teacher cannot read XP breakdown');assert.equal((await action(s,'read_board')).xpBreakdown.competitive,175);check(true,'Disconnect revokes teacher visibility without removing earned credit');
 await denied(asUser(s,"select ders_private.xp_breakdown($1,'{}')",[s]),'Private XP calculator is not directly executable');await denied(asUser(s,"select ders_private.action_repeat_base('overview','{}')"),'Previous action cannot bypass provenance guard');
};
