const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createClient}=require('@supabase/supabase-js'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),config=JSON.parse(fs.readFileSync(path.join(root,'.env.staging-test.json'),'utf8'));
if(new URL(config.url).hostname!=='hswipswqulolcwqvcjvi.supabase.co')throw Error('Only isolated synthetic staging accounts are permitted');
(async()=>{let browser,server;const clients=[],users=[],mapping=new Map();let otherLinkWasApproved=false;try{
 for(const u of config.users.slice(0,3)){const c=createClient(config.url,config.key,{auth:{persistSession:false,autoRefreshToken:false}}),r=await c.auth.signInWithPassword({email:u.email,password:u.password});if(r.error)throw r.error;clients.push(c);users.push({...r.data.user,password:u.password});mapping.set(r.data.user.id,c);}
 const action=async(id,name,payload={})=>{const c=mapping.get(id);if(!c)throw Error('Unknown synthetic account');const r=await c.rpc('ders_action',{p_action:name,p_payload:payload});if(r.error)throw r.error;if(r.data?.error)throw Error(r.data.error);return r.data;};
 const id=users[2].id;otherLinkWasApproved=(await action(users[0].id,'overview')).connections.some(c=>c.student_id===id&&c.status==='approved');
 let url=process.env.DERS_V1141_URL;if(!url){process.env.PORT='0';server=require('../scripts/server.cjs');if(!server.listening)await new Promise(r=>server.once('listening',r));url=`http://127.0.0.1:${server.address().port}`;}
 const site=new URL(url);if(!['http:','https:'].includes(site.protocol))throw Error('An HTTP(S) test origin is required');
 // The workflow harness replaces the public config in each test context; never route these logins to production.
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const newContext=browser.newContext.bind(browser);let productionRequests=0;browser.newContext=async options=>{const c=await newContext(options);await c.route('**/jswgagzbetwviamiwcck.supabase.co/**',r=>{productionRequests++;return r.abort();});if(site.search)await c.request.get(url);return c;};
 const expanded=[users[0],users[1],users[2],null,users[2]],ids=expanded.map(u=>u?.id);
 await require('./v1141-browser.cjs')({root,browser,siteUrl:site.origin+site.pathname.replace(/\/$/,''),apiUrl:config.url,publicKey:config.key,users:expanded,ids,action});assert.equal(productionRequests,0);console.log('PASS Hosted Supabase Auth, RLS and complete v1141 teacher/student flows: zero production requests');
}finally{
 if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));
 if(clients[0]&&users[2]&&!otherLinkWasApproved){const r=await clients[0].rpc('ders_action',{p_action:'overview',p_payload:{}});const link=r.data?.connections.find(c=>c.student_id===users[2].id&&c.status==='approved');if(link)await clients[0].rpc('ders_action',{p_action:'remove_connection',p_payload:{id:link.id}});}
 for(const c of clients)await c.auth.signOut();
}})().catch(e=>{console.error(e.message);process.exitCode=1;});
