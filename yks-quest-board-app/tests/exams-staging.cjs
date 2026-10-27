const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createClient}=require('@supabase/supabase-js'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),config=JSON.parse(fs.readFileSync(path.join(root,'.env.staging-test.json'),'utf8'));
if(new URL(config.url).hostname!=='hswipswqulolcwqvcjvi.supabase.co')throw Error('Only the isolated staging database is allowed.');
(async()=>{let browser,server;const clients=[],users=[],mapping=new Map();let originalIds=new Set();try{
 for(const u of config.users.slice(0,3)){const client=createClient(config.url,config.key,{auth:{persistSession:false,autoRefreshToken:false}}),result=await client.auth.signInWithPassword({email:u.email,password:u.password});if(result.error)throw result.error;clients.push(client);users.push({...result.data.user,password:u.password});mapping.set(result.data.user.id,client);}
 const call=async(client,action,payload={})=>{const r=await client.rpc('ders_exams',{p_action:action,p_payload:payload});if(r.error)throw Error(r.error.message);return r.data;};
 originalIds=new Set((await call(clients[1],'list')).map(e=>e.id));assert.equal(originalIds.size,0,'Use fresh synthetic staging exams for this workflow');
 const action=async(id,name,payload={})=>{const client=mapping.get(id);if(!client)throw Error('Unknown synthetic user');const r=await client.rpc('ders_action',{p_action:name,p_payload:payload});if(r.error)throw Error(r.error.message);if(r.data?.error)throw Error(r.data.error);return r.data;};
 let url=process.env.DERS_EXAMS_URL;if(!url){process.env.PORT='0';server=require('../scripts/server.cjs');if(!server.listening)await new Promise(r=>server.once('listening',r));url='http://127.0.0.1:'+server.address().port;}
 const site=new URL(url);if(!['http:','https:'].includes(site.protocol))throw Error('HTTP(S) origin required');
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 let productionRequests=0;const create=browser.newContext.bind(browser);browser.newContext=async options=>{const context=await create(options);await context.route('**/jswgagzbetwviamiwcck.supabase.co/**',r=>{productionRequests++;return r.abort();});if(site.search)await context.request.get(url);return context;};
 await require('./exams-browser.cjs')({root,browser,siteUrl:site.origin+site.pathname.replace(/\/$/,''),apiUrl:config.url,publicKey:config.key,users,ids:users.map(u=>u.id),action});
 const rows=await call(clients[1],'list'),sid=users[1].id;
 assert.equal(rows.length,2);const outsider=await clients[2].rpc('ders_exams',{p_action:'list',p_payload:{student_id:sid}});assert.ok(outsider.error);const hidden=await clients[2].from('practice_exams').select('*').eq('user_id',sid);assert.equal(hidden.data.length,0);
 const teacher=await call(clients[0],'list',{student_id:sid});assert.equal(teacher.length,2);
 const update=await clients[0].from('practice_exams').update({name:'Forbidden'}).eq('user_id',sid).select();assert.equal(update.data.length,0);assert.equal(productionRequests,0);
 console.log('PASS hosted staging Auth, cross-device UI, teacher read-only and outsider RLS; zero production requests');
 fs.writeFileSync(path.join(root,'test-results/exams-staging.json'),JSON.stringify({passed:true,productionRequests,teacherReadOnly:true,realUserWrites:false},null,2));
}finally{
 if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));
 if(clients[1]){const r=await clients[1].rpc('ders_exams',{p_action:'list',p_payload:{}});for(const row of r.data||[])if(!originalIds.has(row.id)){const removed=await clients[1].rpc('ders_exams',{p_action:'delete',p_payload:{id:row.id,revision:row.revision}});if(removed.error)console.error('Synthetic cleanup failed: '+removed.error.message);}}
 for(const client of clients)await client.auth.signOut();
}})().catch(error=>{console.error(error.message);process.exitCode=1;});
