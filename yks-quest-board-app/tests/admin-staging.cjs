const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createClient}=require('@supabase/supabase-js'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),config=JSON.parse(fs.readFileSync(path.join(root,'.env.staging-test.json'),'utf8'));
if(config.url!=='https://hswipswqulolcwqvcjvi.supabase.co')throw Error('Only isolated staging is allowed.');
let checks=0,browser,server;const clients=[];
const pass=text=>{checks++;console.log('PASS real staging',text);};
async function run(){
 try{
  for(const user of config.users){
    const client=createClient(config.url,config.key,{auth:{persistSession:false,autoRefreshToken:false}});
    const login=await client.auth.signInWithPassword({email:user.email,password:user.password});if(login.error)throw login.error;clients.push(client);
  }
  const [admin,student,outsider]=clients;
  for(const [i,client] of clients.entries()){const result=await client.rpc('ders_admin_status');assert.ifError(result.error);assert.equal(result.data,i===0);}
  pass('Real Auth distinguishes the authorized admin from student/outsider accounts');
  const snapshot=await admin.rpc('ders_action',{p_action:'read_board',p_payload:{}});assert.ifError(snapshot.error);
  const {data:{user}}=await admin.auth.getUser(),id=crypto.randomUUID();
  const saved=await admin.from('ders_admin_notes').insert({id,user_id:user.id,kind:'test',context:'appearance',screen:'Staging görünüm testi',body:'v1.1.2 sentetik test notu'});assert.ifError(saved.error);
  const read=await admin.from('ders_admin_notes').select('*').eq('id',id).single();assert.ifError(read.error);assert.ok(Date.parse(read.data.created_at));assert.equal(read.data.kind,'test');
  const events=await admin.from('ders_admin_events').select('*').eq('action','note_saved');assert.ifError(events.error);assert.ok(events.data.length);
  assert.ok(events.data.every(event=>!('body'in event)&&!('token'in event)));
  pass('Notes persist with screen/server date; automatic event excludes note text and secrets');
  for(const client of [student,outsider]){
    const notes=await client.from('ders_admin_notes').select('*');assert.ifError(notes.error);assert.equal(notes.data.length,0);
    const denied=await client.from('ders_admin_notes').insert({kind:'bug',context:'student',screen:'forged',body:'forged'});assert.ok(denied.error);
    const event=await client.rpc('ders_admin_record_event',{p_id:crypto.randomUUID(),p_action:'sample_reset',p_context:'student'});assert.ok(event.error);
  }
  const forged=await admin.from('ders_admin_events').insert({user_id:user.id,action:'sample_reset',context:'student',created_at:'2000-01-01'});assert.ok(forged.error);
  pass('Real RLS denies unauthorized notes/events and client-forged audit rows');
  process.env.PORT='0';server=require('../scripts/server.cjs');if(!server.listening)await new Promise(resolve=>server.once('listening',resolve));
  const url=process.env.DERS_PREVIEW_URL || 'http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const context=await browser.newContext({serviceWorkers:'block'}),p=await context.newPage(),errors=[];
  p.on('pageerror',error=>errors.push(error.message));await p.goto(url+'/#/account');
  assert.equal(await p.evaluate(()=>YKS_CONFIG.supabaseUrl),config.url);
  await p.fill('#authEmail',config.users[0].email);await p.fill('#authPassword',config.users[0].password);await p.click('#signInButton');
  await p.locator('#adminButton').waitFor({state:'visible'});await p.click('#adminButton');
  await p.locator('#adminNoteList').getByText('v1.1.2 sentetik test notu',{exact:true}).first().waitFor();
  await require('./pointer-select.cjs')(p,'#adminNoteKind','test');
  await p.fill('#adminNoteScreen','Gerçek test tarayıcısı');await p.fill('#adminNoteBody','Gerçek staging UI kaydı');await p.click('#adminSaveNote');
  await p.getByText('Not kaydedildi.',{exact:true}).waitFor();
  await p.click('[data-preview-role="student"]');const frame=await(await p.locator('.admin-frame').elementHandle()).contentFrame();
  await frame.waitForFunction(()=>document.readyState==='complete'&&window.DersBoard?.user&&window.DersUI);
  assert.equal(await frame.evaluate(()=>DersBoard.user.email),'student@example.invalid');
  await p.click('#adminReturn');await p.locator('.admin-frame').waitFor({state:'detached'});
  await p.click('#adminClose');await p.evaluate(()=>DersBoard.client.auth.signOut());await p.waitForFunction(()=>!DersBoard.user);
  assert.deepEqual(errors,[]);pass('Real browser login → admin → note save → sample preview → return → logout');
  const after=await admin.rpc('ders_action',{p_action:'read_board',p_payload:{}});assert.ifError(after.error);assert.deepEqual(after.data.state,snapshot.data.state);
  pass('Existing real staging board, tasks, XP and history stay byte-for-byte unchanged');
  fs.writeFileSync(path.join(root,'test-results/v112-staging.json'),JSON.stringify({checks,errors,project:'hswipswqulolcwqvcjvi'},null,2));
 }finally{if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));for(const client of clients)await client.auth.signOut();}
}
run().catch(error=>{console.error(error.message);process.exitCode=1;});
