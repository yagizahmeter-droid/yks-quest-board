const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..');
let deps = require;
try { require.resolve('pg'); } catch { deps = createRequire(path.resolve(root, '../ders-test-runtime/package.json')); }
const ids = ['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333','44444444-4444-4444-8444-444444444444','55555555-5555-4555-8555-555555555555'];
const [teacher, student, outsider, teacher2] = ids;
const personal = { categories:[{id:'math',name:'Matematik',color:'#63d6d6',sortOrder:0}],weeks:[{id:'original',name:'7-14 Ekim',range:'7-14 Ekim',quests:[{id:'personal',subject:'math',categoryId:'math',title:'Temel Kavramlar',detail:'30 soru ve analiz',xp:100,done:false,sortOrder:0}]}],activeWeekId:'original',studyHistory:[] };
let database, admin, checks = 0;
function check(value, message) { assert.ok(value,message); checks++; console.log('PASS',message); }
async function asUser(id, sql, params=[]) {
  const client = database.getPgClient('postgres','127.0.0.1');
  if(process.env.DEBUG_TEST) console.log('CONNECT',sql.slice(0,50));
  await client.connect();
  if(process.env.DEBUG_TEST) console.log('CONNECTED');
  try {
    await client.query('begin'); await client.query('set local role authenticated');
    await client.query("select set_config('request.jwt.claim.sub',$1,true)",[id || '']);
    if(process.env.DEBUG_TEST) console.log('QUERY',params[0]);
    const result = await client.query(sql,params); await client.query('commit'); return result;
  } catch(error) { await client.query('rollback'); throw error; }
  finally { if(process.env.DEBUG_TEST) console.log('ENDING'); await client.end(); if(process.env.DEBUG_TEST) console.log('ENDED'); }
}
async function action(id, name, payload={}) { return (await asUser(id,'select public.ders_action($1,$2::jsonb) as result',[name,JSON.stringify(payload)])).rows[0].result; }
async function denied(promise, message) { await assert.rejects(promise); checks++; console.log('PASS',message); }
async function board(id) { return (await admin.query('select state,version from public.quest_board_states where user_id=$1',[id])).rows[0]; }
async function main() {
  const {default:EmbeddedPostgres} = await import(pathToFileURL(deps.resolve('embedded-postgres')).href);
  database = new EmbeddedPostgres({databaseDir:path.join(root,'.test-db',`run-${Date.now()}`),port:55439,user:'postgres',password:'local-test-only',persistent:true,createPostgresUser:false,initdbFlags:['--locale=C','--encoding=UTF8'],postgresFlags:['-h','127.0.0.1'],onLog:()=>{},onError:()=>{}});
  database.stop = async () => {
    if (!database.process || database.process.exitCode !== null) { database.process=undefined; return; }
    const binary=path.resolve(deps.resolve('@embedded-postgres/windows-x64'),'../../native/bin/pg_ctl.exe');
    await require('node:util').promisify(require('node:child_process').execFile)(binary,['-D',database.options.databaseDir,'-m','fast','-w','stop'],{windowsHide:true});
    database.process=undefined;
  };
  try {
    await database.initialise(); await database.start(); admin=database.getPgClient('postgres','127.0.0.1'); await admin.connect();
    await admin.query(`create role anon; create role authenticated; create schema auth; create schema extensions;
      create extension pgcrypto with schema extensions; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth,public to authenticated; grant execute on function auth.uid() to authenticated;`);
    await admin.query(fs.readFileSync(path.join(root,'supabase-schema.sql'),'utf8'));
    await admin.query('grant select,insert,update on public.quest_board_states to authenticated');
    for(const id of ids) await admin.query('insert into auth.users values($1)',[id]);
    await admin.query('insert into public.quest_board_states(user_id,state,version) values($1,$2,100)',[student,personal]);
    const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
    const seedCode=html.slice(html.indexOf('const seedWeek ='),html.indexOf('const els ='));
    const seed=JSON.parse(require('node:vm').runInNewContext(seedCode+';JSON.stringify(seedWeek)'));
    check(seed.quests.length===35 && seed.quests.reduce((n,q)=>n+q.xp,0)===3595,'Original 35 quests and 3595 possible XP retained');
    const legacy={weeks:[seed],activeWeekId:seed.id};
    await admin.query('insert into public.quest_board_states(user_id,state,version) values($1,$2,100)',[teacher2,legacy]);
    const before=await board(student);
    await admin.query(fs.readFileSync(path.join(root,'migrations/20261012_teacher_workflows.sql'),'utf8'));
    assert.deepEqual(await board(student),before); check(true,'Migration preserves existing JSON and version');
    assert.deepEqual((await board(teacher2)).state,legacy);check(true,'Original legacy board preserved byte-for-byte as JSON');
    check((await admin.query('select count(*)::int n from ders_private.board_backups')).rows[0].n===2,'Full pre-migration backup captured');
    const repeatBefore=await board(student);
    await admin.query(fs.readFileSync(path.join(root,'migrations/20261014_teacher_quest_repeats.sql'),'utf8'));
    assert.deepEqual(await board(student),repeatBefore);check(true,'Repeat migration preserves existing board JSON and version');
    await admin.query(fs.readFileSync(path.join(root,'migrations/20261015_competitive_xp.sql'),'utf8'));
    assert.deepEqual(await board(student),repeatBefore);check(true,'XP provenance migration preserves original JSON and version');
    await admin.query(fs.readFileSync(path.join(root,'migrations/20261015180312_teacher_topic_fields.sql'),'utf8'));
    assert.deepEqual(await board(student),repeatBefore);check(true,'Topic metadata migration preserves original JSON and version');
    for(const [id,role,name] of [[teacher,'teacher','Test Teacher'],[student,'student','Test Student'],[outsider,'student','Unrelated Student'],[teacher2,'teacher','Unrelated Teacher']]) await action(id,'init_profile',{role,name});
    if(process.env.V112_ONLY==='1'){
      await require('./admin-security.cjs')({root,admin,asUser,check,denied,ids});
      await require('./browser.cjs')({root,deps,action,asUser,admin,ids,personal});
      console.log(`RESULT: ${checks} focused v1.1.2 database/security checks passed`); return;
    }
    await action(student,'init_profile',{role:'teacher',name:'Fake'});
    check((await action(student,'overview')).profile.role==='student','Role cannot be escalated after registration');
    await denied(action(student,'create_invite'),'Students cannot issue teacher codes');
    await denied(action(null,'overview'),'Anonymous RPC access denied');
    await denied(asUser(student,'select * from ders_private.board_backups'),'Private backups inaccessible');
    check((await asUser(outsider,'select * from public.quest_board_states')).rows.length===0,'Students cannot read other boards');
    await denied(asUser(student,"update public.user_profiles set role='teacher' where id=$1",[student]),'Direct profile role edits denied');
    await denied(action(teacher,'student_board',{student_id:student}),'Unlinked teachers cannot see progress');
    const old=await action(teacher,'create_invite'), invite=await action(teacher,'create_invite');
    check(invite.code.length===24 && old.code!==invite.code,'Random 96-bit invitation code rotated');
    check(Boolean((await action(student,'request_connection',{code:old.code})).error),'Rotated invitation code revoked');
    await action(student,'request_connection',{code:invite.code});
    let connection=(await action(teacher,'overview')).connections[0];
    await denied(action(student,'respond_connection',{id:connection.id,status:'approved'}),'Students cannot approve their own connection');
    await action(teacher,'respond_connection',{id:connection.id,status:'rejected'});
    check((await action(student,'overview')).connections[0].status==='rejected','Teacher can reject connection');
    await action(student,'request_connection',{code:invite.code});
    await action(teacher,'respond_connection',{id:connection.id,status:'approved'});
    check((await action(teacher,'student_board',{student_id:student})).state.weeks.length===1,'Approved teacher sees assigned student progress');
    await denied(action(teacher2,'student_board',{student_id:student}),'Other teachers remain unauthorized');
    const program={student_id:student,week_name:'14-21 Ekim',week_range:'14-21 Ekim',quests:[{category:'Biyoloji',title:'Canlıların Ortak Özellikleri',detail:'30 soru ve analiz',xp:150}]};
    await action(teacher,'assign_program',program);
    let assignment=(await action(student,'overview')).assignments[0];
    await action(student,'respond_assignment',{id:assignment.id,status:'rejected'});
    assert.deepEqual((await board(student)).state,personal); check(true,'Rejected program does not change personal board');
    await action(teacher,'assign_program',{...program,week_name:'Accepted Program'});
    assignment=(await action(student,'overview')).assignments.find(a=>a.status==='pending');
    await denied(action(outsider,'respond_assignment',{id:assignment.id,status:'accepted'}),'Other students cannot accept another student program');
    await action(student,'respond_assignment',{id:assignment.id,status:'accepted'});
    let saved=await board(student); const accepted=saved.state;
    assert.deepEqual(accepted.weeks[0],personal.weeks[0]); check(accepted.weeks.length===2,'Accepted program appended without deleting personal tasks');
    const quest=accepted.weeks[1].quests[0]; check(quest.lockedForStudent && quest.source==='teacher_assigned','Teacher tasks carry canonical source and lock');
    const tamper=structuredClone(accepted); tamper.weeks[1].quests[0].xp=9999;
    await denied(action(student,'sync_board',{state:tamper,expected_version:saved.version}),'Crafted JSON cannot alter teacher task XP');
    tamper.weeks.pop(); await denied(action(student,'sync_board',{state:tamper,expected_version:saved.version}),'Crafted JSON cannot delete teacher week');
    const completion=structuredClone(accepted); completion.weeks[1].quests[0].done=true;
    const sync=await action(student,'sync_board',{state:completion,expected_version:saved.version});
    check(Boolean(sync.version),'Student can complete teacher quest on any day');
    check((await action(student,'sync_board',{state:accepted,expected_version:saved.version})).conflict,'Stale devices receive conflict instead of overwriting changes');
    await action(student,'request_change',{quest_id:quest.assignedQuestId,changes:{title:'Adjusted topic',detail:'40 soru ve analiz',xp:180}});
    let request=(await action(teacher,'overview')).requests[0];
    await denied(action(teacher2,'resolve_change',{id:request.id,status:'approved'}),'Unrelated teacher cannot resolve change requests');
    await action(teacher,'resolve_change',{id:request.id,status:'rejected'});
    check((await board(student)).state.weeks[1].quests[0].xp===150,'Rejected changes preserve task');
    await action(student,'request_change',{quest_id:quest.assignedQuestId,changes:{title:'Adjusted topic',detail:'40 soru ve analiz',xp:180}});
    request=(await action(teacher,'overview')).requests.find(r=>r.status==='pending');
    await action(teacher,'resolve_change',{id:request.id,status:'approved'});
    check((await board(student)).state.weeks[1].quests[0].xp===180,'Approved change updates canonical task and student board');
    check((await asUser(outsider,'select * from public.teacher_assigned_quests')).rows.length===0,'RLS hides assigned tasks from other students');
    await action(teacher,'remove_connection',{id:connection.id});
    await denied(action(teacher,'student_board',{student_id:student}),'Revocation immediately denies teacher progress access');
    check((await asUser(teacher,'select * from public.teacher_plan_assignments')).rows.length===0,'Revocation removes assignment SELECT access');
    await denied(action(student,'request_change',{quest_id:quest.assignedQuestId,changes:{title:'Later',xp:90}}),'Revoked connections cannot submit new changes');
    for(let i=0;i<21;i++) await action(outsider,'request_connection',{code:'invalid'});
    check((await action(outsider,'request_connection',{code:invite.code})).error.includes('10 dakika'),'Invitation guessing rate limited');
    const {mergeState}=require('../sync.js'), base=structuredClone(personal), local=structuredClone(base), remote=structuredClone(base);
    local.weeks[0].quests[0].done=true; local.weeks[0].quests[0].completionId='event1'; local.studyHistory=[{id:'event1'}];
    remote.weeks.push(accepted.weeks[1]);
    const merged=mergeState(base,local,remote);
    check(merged.weeks.length===2 && merged.weeks[0].quests[0].done && merged.studyHistory.length===1,'Offline completion and remote program merge without data loss');
    const malicious=structuredClone(remote); malicious.weeks[1].quests[0].title='Edited offline';
    check(mergeState(remote,malicious,remote).weeks[1].quests[0].title===quest.title,'Merge preserves server-controlled teacher fields');
    await require('./repeats.cjs')({admin,action,asUser,board,check,denied});
    await require('./xp-provenance.cjs')({admin,action,asUser,board,check,denied});
    await require('./teacher-topics.cjs')({admin,action,asUser,board,check,denied});
    await require('./admin-security.cjs')({root,admin,asUser,check,denied,ids});
    if(process.env.SKIP_BROWSER!=='1') await require('./browser.cjs')({root,deps,action,asUser,admin,ids,personal});
    console.log(`RESULT: ${checks} database/security/sync checks passed`);
  } catch(error) { console.error('TEST FAILURE',error); throw error; }
  finally { if(admin) await admin.end(); if(database) await database.stop(); }
}
main().catch(error=>{console.error(error);process.exitCode=1;});

