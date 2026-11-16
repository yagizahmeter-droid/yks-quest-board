(() => {
 'use strict';
 const motion=window.DersMotion;if(!motion)return;
 const {durations:d,easing:e}=motion,$=id=>document.getElementById(id),enabled=()=>motion.enabled();
 const ghosts=new Set(),tabStates=new Map(),modalJobs=new Map(),presses=new Map(),indicators=new Map();
 let routeJob=null,routeState={route:null,page:null,owner:null},hint=null,hintOwner=null,hintJob=null,hintVersion=0,sequence=0;
 const order=['home','program','exams','classes','teacher','workspace','history','focus','account','account/signup'];
 const safe=fn=>(...args)=>{try{return fn(...args);}catch{return undefined;}};
 const settle=(animation,fn)=>{if(animation)animation.finished.then(fn,fn);else fn();};
 const rect=el=>el?.getBoundingClientRect();
 const owner=()=>window.DersBoard?.user?.id||null;
 function snapshot(host){
  if(!enabled()||!host?.isConnected||host.hidden||host.closest('[hidden]'))return null;
  const r=rect(host);if(!r?.width||!r.height)return null;
  const stage=document.createElement('div');stage.className='motion-snapshot';stage.setAttribute('aria-hidden','true');stage.inert=true;
  Object.assign(stage.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:Math.min(r.height,innerHeight+Math.max(0,-r.top))+'px'});
  const copy=host.cloneNode(true);copy.classList.remove('page-view');copy.removeAttribute('hidden');copy.style.width=r.width+'px';copy.style.margin='0';copy.style.transform='none';copy.style.opacity=getComputedStyle(host).opacity;
  for(const node of [copy,...copy.querySelectorAll('*')]){node.removeAttribute('id');node.removeAttribute('name');node.removeAttribute('data-page');node.removeAttribute('data-dirty');node.removeAttribute('data-draft');node.removeAttribute('data-motion-quest');node.removeAttribute('autofocus');node.removeAttribute('aria-live');if(node.tagName==='FORM')node.dataset.autoSave='';}
  copy.querySelectorAll('script,iframe,dialog,[popover]').forEach(node=>node.remove());stage.append(copy);
  const modal=host.closest('dialog,.modal-backdrop');if(modal){const m=rect(modal),ratio=m.width?modal.offsetWidth/m.width:1;Object.assign(stage.style,{position:'absolute',left:((r.left-m.left)*ratio+modal.scrollLeft)+'px',top:((r.top-m.top)*ratio+modal.scrollTop)+'px',width:r.width*ratio+'px',height:r.height*ratio+'px'});copy.style.width=r.width*ratio+'px';modal.append(stage);}else document.body.append(stage);
  ghosts.add(stage);return stage;
 }
 function removeGhost(ghost){if(ghost){ghosts.delete(ghost);ghost.remove();}}
 function clearGhosts(){for(const ghost of ghosts)ghost.remove();ghosts.clear();}
 function routeBefore(nextPage,route){
  if(routeState.owner!==owner()){clearGhosts();hideHint(true);routeJob=null;routeState={route:null,page:null,owner:owner()};return;}
  if(routeState.page===nextPage&&routeState.route===route)return;
  clearGhosts();hideHint(true);
  const previous=document.querySelector('.page-view:not([hidden])');
  routeJob={ghost:previous&&previous!==nextPage?snapshot(previous):null,from:routeState.route,to:route,page:nextPage};
 }
 function routeAfter(page,route){
  const job=routeJob;routeJob=null;
  if(routeState.page===page&&routeState.route===route){removeGhost(job?.ghost);return;}
  const old=routeState.route;routeState={page,route,owner:owner()};hideHint(true);
  if(!page||!enabled()){removeGhost(job?.ghost);return;}
  const direction=(order.indexOf(route)>=order.indexOf(job?.from||old)?1:-1),distance=Math.min(52,innerWidth*.09);
  const incoming=motion.animate(page,[{transform:`translateX(${direction*distance}px)`,opacity:.72},{transform:'none',opacity:1}],{duration:d.page,easing:e.out});
  if(job?.ghost){const outgoing=motion.animate(job.ghost,[{transform:'none',opacity:1},{transform:`translateX(${-direction*distance}px)`,opacity:0}],{duration:d.page,easing:e.out});settle(outgoing,()=>removeGhost(job.ghost));}
  settle(incoming,()=>{});
 }
 function selectedIndex(nav){if(!nav)return -1;return [...nav.querySelectorAll('.tab,[role="tab"],[data-exam-filter],[data-class-action="tab"],[data-history-view]')].findIndex(el=>el.getAttribute('aria-pressed')==='true'||el.getAttribute('aria-selected')==='true'||el.classList.contains('is-active'));}
 function moveIndicator(nav,index,key){
  if(!nav)return;const items=[...nav.querySelectorAll('.tab,[role="tab"],[data-exam-filter],[data-class-action="tab"],[data-history-view]')],target=items[index];if(!target)return;
  nav.classList.add('motion-tabs');const r=rect(target),n=rect(nav);if(!r.width||!n.width)return;
  const old=indicators.get(key),current=old?.node?.isConnected?rect(old.node):old?.rect;
  let node=nav.querySelector(':scope > .motion-tab-indicator');if(!node){node=document.createElement('span');node.className='motion-tab-indicator';node.setAttribute('aria-hidden','true');nav.append(node);}
  const x=r.left-n.left+nav.scrollLeft+6,y=r.bottom-n.top+nav.scrollTop-3,w=Math.max(12,r.width-12);Object.assign(node.style,{left:x+'px',top:y+'px',width:w+'px'});
  if(current&&enabled()&&(Math.abs(current.left-(r.left+6))>1||Math.abs(current.width-w)>1))motion.animate(node,[{transform:`translateX(${current.left-r.left-6}px) scaleX(${current.width/w})`},{transform:'none'}],{duration:d.tab,easing:e.out});
  indicators.set(key,{node,rect:{left:r.left+6,width:w}});if(indicators.size>128)indicators.delete(indicators.keys().next().value);
 }
 function beginTabs(host,{key,value,index=0,nav=null}={}){
  key ||= host;if(!key)return null;
  let state=tabStates.get(key);const oldIndex=state?.index??selectedIndex(nav),changed=state?state.value!==value:oldIndex>=0&&oldIndex!==index;
  if(!state){state={epoch:0,host,value,index,baseOverflow:host?.style.overflow||''};tabStates.set(key,state);}
  const active=state.incoming&&['running','paused'].includes(state.incoming.playState),style=active&&state.host?.isConnected?getComputedStyle(state.host):null;
  const token={key,state,epoch:++state.epoch,value,index,host,nav,changed,direction:index>=oldIndex?1:-1,ghost:changed?snapshot(host):null,height:host?.isConnected?rect(host).height:0,frame:style?{transform:style.transform,opacity:style.opacity}:null,remaining:active?Math.max(1,d.tab-Number(state.incoming.currentTime||0)):d.tab};
  if(changed&&state.ghost)removeGhost(state.ghost);state.value=value;state.index=index;state.ghost=token.ghost||state.ghost;
  if(tabStates.size>128)tabStates.delete(tabStates.keys().next().value);return token;
 }
 function endTabs(token,host=token?.host,nav=token?.nav){
  if(!token||token.state.epoch!==token.epoch){removeGhost(token?.ghost);return;}
  const state=token.state,selected=selectedIndex(nav);moveIndicator(nav,selected>=0?selected:token.index,token.key);
  if(!host?.isConnected||!enabled()){removeGhost(token.ghost);return;}
  const transplant=Boolean(!token.changed&&token.frame&&state.host!==host);
  if(!token.changed&&!transplant){state.host=host;return;}
  hideHint(true);const distance=Math.min(38,innerWidth*.08);
  state.incoming?.cancel();host.style.overflow=state.baseOverflow;const targetHeight=rect(host).height;
  const first=token.frame||{transform:`translateX(${token.direction*distance}px)`,opacity:.72},frames=[first,{transform:'none',opacity:1}];
  if(token.height&&Math.abs(token.height-targetHeight)>3){first.height=token.height+'px';frames[1].height=targetHeight+'px';host.style.overflow='clip';}
  const incoming=motion.animate(host,frames,{duration:transplant?token.remaining:d.tab,easing:e.out});state.incoming=incoming;state.host=host;
  settle(incoming,()=>{if(state.incoming===incoming)host.style.overflow=state.baseOverflow;});
  if(token.ghost){const ghost=token.ghost;settle(motion.animate(ghost,[{transform:'none',opacity:1},{transform:`translateX(${-token.direction*distance}px)`,opacity:0}],{duration:d.tab,easing:e.out}),()=>removeGhost(ghost));}
 }
 function modalEnter(root){
  if(!root||root.tagName!=='DIALOG'&&!root.classList.contains('modal-backdrop'))return;
  const old=modalJobs.get(root);if(old?.phase==='open'||old?.phase==='enter')return;
  if(old){old.cancelled=true;modalJobs.delete(root);}
  root.classList.add('motion-dialog');root.dataset.motionState='enter';hideHint(true);clearGhosts();
  const face=root.tagName==='DIALOG'?root:root.querySelector('.modal'),job={phase:'enter',cancelled:false,animation:null};modalJobs.set(root,job);
  job.animation=motion.animate(face,[{transform:'translateY(34px) scale(.975)',opacity:.55},{transform:'translateY(-2px) scale(1.005)',opacity:1,offset:.78},{transform:'none',opacity:1}],{duration:d.modalEnter,easing:e.out});
  settle(job.animation,()=>{if(!job.cancelled&&modalJobs.get(root)===job){job.phase='open';root.dataset.motionState='open';}});
 }
 function modalExit(root,finish,{immediate=false}={}){
  if(!root)return finish();const old=modalJobs.get(root);if(old?.phase==='exit')return true;
  if(!enabled()||immediate||root.tagName==='DIALOG'&&!root.open){if(old)old.cancelled=true;old?.animation?.cancel();modalJobs.delete(root);delete root.dataset.motionState;finish();return true;}
  if(old)old.cancelled=true;root.classList.add('motion-dialog');root.dataset.motionState='exit';hideHint(true);clearGhosts();
  const face=root.tagName==='DIALOG'?root:root.querySelector('.modal'),job={phase:'exit',cancelled:false,animation:null,finish};modalJobs.set(root,job);
  job.animation=motion.animate(face,[{transform:'none',opacity:1},{transform:'translateY(28px) scale(.98)',opacity:0}],{duration:d.modalExit,easing:e.in});
  settle(job.animation,()=>{if(job.cancelled||modalJobs.get(root)!==job)return;modalJobs.delete(root);delete root.dataset.motionState;finish();});return true;
 }
 const controlSelector='button,.main-nav a,.destination,summary,.quest[role="button"],label.button';
 function faceFor(root){
  if(root.classList.contains('quest'))return root.querySelector('.check');
  if(root.classList.contains('destination'))return root.querySelector(':scope > span');
  let face=root.querySelector(':scope > .motion-face');if(!face){face=document.createElement('span');face.className='motion-face';while(root.firstChild)face.append(root.firstChild);root.append(face);}return face;
 }
 function decorate(root){if(!root?.querySelectorAll||root.closest?.('.motion-snapshot'))return;const items=[...(root.matches?.(controlSelector)?[root]:[]),...root.querySelectorAll(controlSelector)];for(const el of items){if(el.closest('.motion-snapshot'))continue;el.classList.add('motion-control');faceFor(el);}}
 function releasePress(id){const job=presses.get(id);if(!job)return;presses.delete(id);const {root,face}=job;job.cancelled=true;
  const animation=motion.animate(face,[{scale:'1'},{scale:'.955',offset:.35},{scale:'1'}],{duration:d.release,easing:e.spring});settle(animation,()=>{if(![...presses.values()].some(p=>p.root===root))root.removeAttribute('data-motion-pressed');});}
 function press(root,id){if(!enabled()||!root||root.disabled||root.getAttribute('aria-disabled')==='true'||root.closest('[inert]')||presses.has(id))return;const face=faceFor(root);root.dataset.motionPressed='';const job={root,face,cancelled:false};presses.set(id,job);motion.animate(face,[{scale:'1'},{scale:'.955'}],{duration:d.press,easing:e.out});}
 document.addEventListener('pointerdown',event=>{if(event.button!==0)return;const root=event.target.closest?.(controlSelector);if(root)press(root,'p'+event.pointerId);if(hintOwner&&!hintOwner.contains(event.target))hideHint();},{capture:true,passive:true});
 document.addEventListener('pointerup',event=>releasePress('p'+event.pointerId),{capture:true,passive:true});document.addEventListener('pointercancel',event=>releasePress('p'+event.pointerId),{capture:true,passive:true});
 document.addEventListener('keydown',event=>{if(!event.repeat&&['Enter',' '].includes(event.key)&&event.target.matches?.(controlSelector))press(event.target,'k'+event.key);},true);
 document.addEventListener('keyup',event=>releasePress('k'+event.key),true);
 function hintTarget(target){return target.closest?.('[title],[data-motion-hint]');}
 function positionHint(){if(!hint||!hintOwner?.isConnected)return;const r=rect(hintOwner),h=rect(hint),view=window.visualViewport,ox=view?.offsetLeft||0,oy=view?.offsetTop||0,w=view?.width||innerWidth,bottom=oy+(view?.height||innerHeight);let y=r.top-h.height-10;if(y<oy+10)y=r.bottom+10;hint.style.left=Math.max(ox+10,Math.min(ox+w-h.width-10,r.left+(r.width-h.width)/2))+'px';hint.style.top=Math.max(oy+10,Math.min(bottom-h.height-10,y))+'px';}
 function showHint(root){
  if(!root||root.closest('.motion-snapshot')||root.disabled)return;const text=root.getAttribute('title')||root.dataset.motionHint;if(!text?.trim())return;
  if(hintOwner===root&&hint?.isConnected){if(hint.dataset.state==='exit'){const version=++hintVersion;hint.dataset.state='enter';hintJob=motion.animate(hint,[{opacity:0,transform:'translateY(6px) scale(.97)'},{opacity:1,transform:'none'}],{duration:d.tooltip,easing:e.out});settle(hintJob,()=>{if(version===hintVersion&&hint)hint.dataset.state='open';});}return;}
  hideHint(true);root.dataset.motionHint=text;root.removeAttribute('title');hintOwner=root;const version=++hintVersion;
  hint=document.createElement('div');hint.id='dersMotionHint';hint.className='motion-hint';hint.setAttribute('role','tooltip');hint.setAttribute('popover','manual');hint.textContent=text;hint.dataset.state='enter';document.body.append(hint);
  const ids=(root.getAttribute('aria-describedby')||'').split(/\s+/).filter(Boolean);if(!ids.includes(hint.id))ids.push(hint.id);root.setAttribute('aria-describedby',ids.join(' '));
  try{hint.showPopover?.();}catch{}positionHint();hintJob=motion.animate(hint,[{opacity:0,transform:'translateY(6px) scale(.97)'},{opacity:1,transform:'none'}],{duration:d.tooltip,easing:e.out});settle(hintJob,()=>{if(version===hintVersion&&hint)hint.dataset.state='open';});
 }
 function hideHint(immediate=false){
  if(!hint||!immediate&&hint.dataset.state==='exit')return;const node=hint,root=hintOwner,version=++hintVersion;
  const finish=()=>{if(hint!==node||version!==hintVersion)return;try{node.hidePopover?.();}catch{}node.remove();hint=null;hintOwner=null;if(root){root.setAttribute('title',root.dataset.motionHint||'');const ids=(root.getAttribute('aria-describedby')||'').split(/\s+/).filter(id=>id&&id!==node.id);if(ids.length)root.setAttribute('aria-describedby',ids.join(' '));else root.removeAttribute('aria-describedby');}};
  if(immediate||!enabled()){hintJob?.cancel();finish();return;}node.dataset.state='exit';hintJob=motion.animate(node,[{opacity:1,transform:'none'},{opacity:0,transform:'translateY(4px) scale(.98)'}],{duration:d.tooltip,easing:e.in});settle(hintJob,finish);
 }
 document.addEventListener('pointerover',event=>{if(event.pointerType==='touch')return;const root=hintTarget(event.target);if(root&&!root.contains(event.relatedTarget))showHint(root);},{passive:true});
 document.addEventListener('pointerout',event=>{if(hintOwner?.contains(event.target)&&!hintOwner.contains(event.relatedTarget)&&document.activeElement!==hintOwner)hideHint();},{passive:true});
 document.addEventListener('focusin',event=>{const root=hintTarget(event.target);if(root)showHint(root);});document.addEventListener('focusout',event=>{if(hintOwner?.contains(event.target)&&!hintOwner.contains(event.relatedTarget))hideHint();});
 window.addEventListener('scroll',()=>hideHint(),{capture:true,passive:true});window.addEventListener('resize',positionHint,{passive:true});
 function stop(){clearGhosts();routeJob=null;hideHint(true);for(const job of presses.values())job.root.removeAttribute('data-motion-pressed');presses.clear();for(const state of tabStates.values())if(state.host?.isConnected)state.host.style.overflow=state.baseOverflow;for(const [root,job] of [...modalJobs])if(job.phase==='exit'){job.cancelled=true;modalJobs.delete(root);delete root.dataset.motionState;job.finish();}else if(job.phase==='enter'){job.cancelled=true;job.phase='open';root.dataset.motionState='open';}if(routeState.owner!==owner()){tabStates.clear();for(const {node} of indicators.values())node.remove();indicators.clear();}}
 motion.onStop(stop);
 motion.ui={routeBefore:safe(routeBefore),routeAfter:safe(routeAfter),beginTabs:safe(beginTabs),endTabs:safe(endTabs),modalEnter:safe(modalEnter),modalExit:safe(modalExit),hideHint:safe(hideHint)};
 decorate(document.body);new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes)if(node.nodeType===1)decorate(node);}).observe(document.body,{childList:true,subtree:true});
})();
