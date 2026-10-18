(() => {
  const script = document.currentScript, role = script.dataset.role === 'teacher' ? 'teacher' : 'student';
  const appearance = JSON.parse(script.dataset.appearance || '{}');
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
  const result = data => ({data:clone(data),error:null});
  function read() {
    const tasks=state.weeks.flatMap(w=>w.quests), earned=q=>q.done?q.xp:0;
    return {state,version,updated_at:now(),xpBreakdown:{total:tasks.reduce((n,q)=>n+earned(q),0),personal:tasks.filter(q=>!q.lockedForStudent).reduce((n,q)=>n+earned(q),0),competitive:tasks.filter(q=>q.lockedForStudent).reduce((n,q)=>n+earned(q),0)}};
  }
  async function rpc(name,{p_action:action,p_payload:p={}}={}) {
    if(name!=='ders_action') return {data:null,error:{message:'Örnek görünümde bu işlem kullanılamaz.'}};
    if(action==='overview') return result({profile,connections,assignments,requests,server_now:now(),capabilities:{topicCatalog:true,repeatQuests:true,withdrawProgram:true}});
    if(action==='read_board'||action==='student_board') return result(read());
    if(action==='sync_board') { state=clone(p.state); version++; return result(read()); }
    if(action==='create_invite') return result({code:'ORNEK-DAVET-KODU'});
    if(action==='assign_program') {assignments.push({id:crypto.randomUUID(),student_id:student,teacher_id:teacher,name:'Örnek Öğrenci',week_name:p.week_name,week_range:p.week_range,status:'pending',quests:p.quests.map(q=>({...q,category_name:q.category}))});return result({});}
    if(action==='respond_assignment') {
      const a=assignments.find(a=>a.id===p.id);
      if(a&&a.status==='pending'){a.status=p.status;if(p.status==='accepted'){const w={id:'preview-accepted-'+a.id,name:a.week_name,range:a.week_range,quests:a.quests.map((q,i)=>({id:a.id+'-'+i,title:q.title,detail:q.detail,xp:q.xp,done:false,categoryId:'preview-math',subject:'preview-math',source:'teacher_assigned',lockedForStudent:true,assignedQuestId:a.id+'-'+i,assignedByTeacherId:teacher}))};state.weeks.push(w);state.activeWeekId=w.id;version++;}}
      return result({});
    }
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
  });
})();
