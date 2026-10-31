(() => {
  const script = document.currentScript, role = script.dataset.role === 'teacher' ? 'teacher' : 'student';
  const appearance = JSON.parse(script.dataset.appearance || '{}');
  function signal(state) {
    if (script.dataset.previewChannel && script.dataset.parentOrigin) parent.postMessage({type:'ders-admin-preview',channel:script.dataset.previewChannel,state},script.dataset.parentOrigin);
  }
  window.addEventListener('error',()=>signal('error'),{once:true});
  const memory = () => {
    const values = new Map();
    return {getItem:k=>values.get(String(k)) ?? null,setItem:(k,v)=>values.set(String(k),String(v)),removeItem:k=>values.delete(String(k)),clear:()=>values.clear(),key:i=>[...values.keys()][i]??null,get length(){return values.size;}};
  };
  // This adapter is used only inside the opaque-origin frame; it never receives a token.
  Object.defineProperty(window,'localStorage',{value:memory()});
  Object.defineProperty(window,'sessionStorage',{value:memory()});
  for (const [key,value] of Object.entries({'ders-theme':appearance.choice,'ders-appearance-style':appearance.style,'ders-appearance-accent':appearance.accent,'ders-appearance-monochrome':appearance.monochrome,'ders-background':appearance.background === 'custom' ? 'industrial' : appearance.background}))
    if (value !== undefined) localStorage.setItem(key,value);
  window.confirm = () => true;
  for (const name of ['pushState','replaceState']) {
    const original = history[name].bind(history);
    history[name] = (state,title) => original(state,title);
  }
  const student = '00000000-0000-4000-8000-000000000001', teacher = '00000000-0000-4000-8000-000000000002';
  const id = role === 'teacher' ? teacher : student;
  const user = {id,email:role+'@example.invalid'};
  const profile = {id,role,display_name:role==='teacher'?'Örnek Öğretmen':'Örnek Öğrenci'};
  const now = () => new Date().toISOString();
  const clone = value => structuredClone(value);
  let version = 1;
  let state = {
    profile:{role,displayName:profile.display_name},
    categories:[{id:'preview-math',name:'Matematik',color:'#63d6d6',examType:'TYT',origin:'catalog',sortOrder:0}],
    weeks:[{id:'preview-week',name:'Örnek hafta',range:'Test programı',sortOrder:0,quests:[
      {id:'preview-personal',subject:'preview-math',categoryId:'preview-math',title:'Yaş Problemleri',detail:'20 soru ve analiz',xp:100,done:false,source:'Manuel',lockedForStudent:false,sortOrder:0,examType:'TYT'},
      {id:'preview-teacher',subject:'preview-math',categoryId:'preview-math',title:'Sayılar',detail:'30 soru çöz',xp:150,done:false,source:'teacher_assigned',lockedForStudent:true,assignedQuestId:'preview-teacher',assignedByTeacherId:teacher,sortOrder:1,examType:'TYT'}
    ]}],activeWeekId:'preview-week',studyHistory:[]
  };
  let connections = [{id:'preview-connection',student_id:student,teacher_id:teacher,status:'approved',name:role==='teacher'?'Örnek Öğrenci':'Örnek Öğretmen'}];
  let assignments = [{id:'preview-assignment',student_id:student,teacher_id:teacher,name:role==='teacher'?'Örnek Öğrenci':'Örnek Öğretmen',week_name:'Örnek öğretmen programı',week_range:'Test haftası',status:'pending',quests:[{id:'preview-offer',category_name:'Matematik',title:'Problemler',detail:'40 soru ve analiz',xp:100,exam_type:'TYT',repeat_kind:'none'}]}];
  let requests = [];
  let exams = [];
  const result = data => ({data:clone(data),error:null});
  const learning={segments:[],reviews:[],messages:[],notifications:[],preferences:{program:true,feedback:true,question:true,review:true}};
  function assignPreview(p,sid=student){const a={id:crypto.randomUUID(),student_id:sid,teacher_id:teacher,name:'Örnek Öğrenci',week_name:p.week_name,week_range:p.week_range||p.starts_on+' – '+p.ends_on,status:'pending',quests:p.quests.map(q=>({...q,id:crypto.randomUUID(),category_name:q.category,repeat_kind:q.repeat_kind||'none',repeat_target:q.repeat_target||1}))};assignments.push(a);return a;}
  const classPreview=window.DersPreviewClasses({role,id,teacher,student,profile,now,result,learning,state:()=>state,connections:()=>connections,assignments:()=>assignments,assign:assignPreview});
  function learn(action,p){
    if(action==='overview'||action==='report')return result({...learning,state:action==='report'?state:null,teachers:[{id:teacher,name:'Örnek Öğretmen'}]});
    if(action==='save_segments'){for(const s of p.segments||[])if(!learning.segments.some(x=>x.id===s.id))learning.segments.push({...s,user_id:id,duration_ms:Date.parse(s.ended_at)-Date.parse(s.started_at),category_name:s.quest_id?'Matematik':'Serbest Çalışma'});return result({saved:true});}
    if(action==='messages')return result(learning.messages.filter(m=>m.week_id===p.week_id&&m.quest_id===p.quest_id));
    if(action==='message'){if(!learning.messages.some(m=>m.id===p.id))learning.messages.push({...p,author_id:id,author_name:profile.display_name,kind:role==='student'?'question':p.kind||'feedback',created_at:now()});return result({saved:true});}
    if(action==='review'){const old=learning.reviews.find(r=>r.week_id===p.week_id);if(old)Object.assign(old,{body:p.body,updated_at:now()});else learning.reviews.push({...p,id:crypto.randomUUID(),teacher_id:teacher,teacher_name:'Örnek Öğretmen',updated_at:now()});return result({saved:true});}
    if(action==='preferences'){learning.preferences=clone(p);return result({saved:true});}
    if(action==='read_notification')return result({saved:true});
    return {data:null,error:{message:'Bu işlem örnek görünümde kullanılamaz.'}};
  }
  function read() {
    const tasks=state.weeks.flatMap(w=>w.quests), earned=q=>window.DersQuests?.earned(q)??(q.done?q.xp:0);
    return {state,version,updated_at:now(),xpBreakdown:{total:tasks.reduce((n,q)=>n+earned(q),0),personal:tasks.filter(q=>!q.lockedForStudent).reduce((n,q)=>n+earned(q),0),competitive:tasks.filter(q=>q.lockedForStudent).reduce((n,q)=>n+earned(q),0)}};
  }
  async function rpc(name,{p_action:action,p_payload:p={}}={}) {
    if(name==='ders_classes')return classPreview.rpc(action,p);
    if(name==='ders_exams'){
      if(action==='list')return result(exams.filter(e=>e.user_id===(p.student_id||id)));
      if(role!=='student')return {data:null,error:{message:'Öğretmen görünümünde denemeler salt okunurdur.'}};
      if(action==='delete'){exams=exams.filter(e=>e.id!==p.id);return result({deleted:true});}
      if(action==='save'){
        try{const score=window.DersExamsCore.validate(p),old=exams.find(e=>e.id===p.id),saved={...clone(p),user_id:id,total_net:score.totalNet,maximum:score.maximum,is_partial:!score.complete,revision:(old?.revision||0)+1,created_at:old?.created_at||now(),updated_at:now()};exams=exams.filter(e=>e.id!==p.id);exams.push(saved);return result(saved);}catch(e){return {data:null,error:{message:e.message}};}
      }
    }
    if(name==='ders_learning')return learn(action,p);
    if(name!=='ders_action') return {data:null,error:{message:'Örnek görünümde bu işlem kullanılamaz.'}};
    if(action==='overview') return result({profile,connections,assignments,requests,server_now:now(),capabilities:{topicCatalog:true,repeatQuests:true,withdrawProgram:true}});
    if(action==='read_board'||action==='student_board') return result(read());
    if(action==='sync_board') { state=clone(p.state); version++;classPreview.recordAssignments();return result(read()); }
    if(action==='create_invite') return result({code:'ORNEK-DAVET-KODU'});
    if(action==='assign_program') return result({assignment_id:assignPreview(p).id});
    if(action==='respond_assignment') {
      const a=assignments.find(a=>a.id===p.id);
      if(a&&a.status==='pending'){a.status=p.status;if(p.status==='accepted'){const w={id:'teacher-week-'+a.id,name:a.week_name,range:a.week_range,quests:a.quests.map(q=>({id:'teacher-quest-'+q.id,title:q.title,detail:q.detail,xp:q.xp,done:false,categoryId:'preview-math',subject:'preview-math',source:'teacher_assigned',lockedForStudent:true,assignedQuestId:q.id,assignedByTeacherId:teacher,repeat:{kind:q.repeat_kind||'none',target:q.repeat_target||1,...(q.repeat_kind==='daily'?{startDate:q.starts_on,endDate:q.ends_on}:{})},completions:[]}))};state.weeks.push(w);state.activeWeekId=w.id;version++;}}
      return result({});
    }
    if(action==='complete_repeat'){const q=state.weeks.flatMap(w=>w.quests).find(q=>q.assignedQuestId===p.quest_id),today=window.DersQuests.today();if(!q||!window.DersQuests.recurring(q))return {data:null,error:{message:'Örnek tekrar görevi bulunamadı.'}};q.completions ||= [];if(q.completions.some(e=>e.requestId===p.request_id)||q.done||q.repeat.kind==='daily'&&q.completions.some(e=>e.date===today))return result({status:'already_completed'});const event={id:crypto.randomUUID(),requestId:p.request_id,date:today,completedAt:now(),xp:q.xp};q.completions.push(event);q.done=window.DersQuests.isDone(q);version++;classPreview.recordAssignments();return result({status:'completed',xp:q.xp});}
    if(action==='request_change'){requests.push({id:crypto.randomUUID(),name:'Örnek Öğrenci',title:'Sayılar',status:'pending',requested_changes:p.changes});return result({});}
    if(action==='resolve_change'){const r=requests.find(r=>r.id===p.id);if(r)r.status=p.status;return result({});}
    if(action==='withdraw_assignment'){const a=assignments.find(a=>a.id===p.id);if(a)a.status='withdrawn';return result({});}
    if(action==='remove_connection'){connections=[];return result({});}
    return {data:null,error:{message:'Bu işlem örnek görünümde simüle edilmiyor.'}};
  }
  const listeners = [];
  const auth = {
    getSession:async()=>({data:{session:{user}},error:null}),
    onAuthStateChange:fn=>{listeners.push(fn);return {data:{subscription:{unsubscribe(){}}}};},
    signOut:async()=>{listeners.forEach(fn=>fn('SIGNED_OUT',null));return {error:null};},
    signInWithPassword:async()=>({error:{code:'invalid_credentials'}}),
    signUp:async()=>({error:{code:'invalid_credentials'}})
  };
  window.YKS_CONFIG={supabaseUrl:'https://preview.invalid',supabaseAnonKey:'synthetic-no-credentials'};
  window.supabase={createClient:()=>({auth,rpc})};
  document.addEventListener('DOMContentLoaded', () => {
    // Keep all navigation in this frame; a base URL must never target the parent app.
    document.querySelectorAll('a[data-route]').forEach(a=>a.setAttribute('href','#/'+a.dataset.route));
    window.DersUI.navigate(role === 'teacher' ? 'teacher' : 'program');
    const deadline = Date.now() + 10000;
    const settled = () => {
      if (window.DersBoard?.authReady && window.DersBoard.user && window.DersBoard.state.profile.role === role) signal('ready');
      else if (Date.now() < deadline) setTimeout(settled,50);
      else signal('error');
    };
    settled();
  });
})();
