(() => {
 'use strict';
 // Class cards retain their DOM identity. Enhanced selects are treated as one native control.
 const native=node=>node?.nodeType===1&&node.matches('.select-control')?node.querySelector('select'):node;
 function key(node){const n=native(node);if(n?.nodeType!==1)return null;return n.id?'id:'+n.id:n.dataset.classKey?'card:'+n.dataset.classKey:n.name?'field:'+n.name:n.dataset.classAction?'action:'+n.dataset.classAction+':'+(n.dataset.id||''):n.dataset.motionRank?'rank:'+n.dataset.motionRank:n.dataset.taskId?'task:'+n.dataset.taskId:n.dataset.lucide?'icon:'+n.dataset.lucide:null;}
 function compatible(old,next){const a=native(old),b=native(next);if(a?.nodeType!==b?.nodeType)return false;if(a.nodeType===3)return true;if(a.nodeType!==1)return false;if(a.dataset.lucide&&a.dataset.lucide===b.dataset.lucide)return true;return a.tagName===b.tagName&&key(old)===key(next);}
 function attributes(old,next){const enhanced=old.matches('select.select-native'),motion=[...old.classList].filter(c=>c.startsWith('motion-'));
  for(const attr of [...old.attributes])if(!next.hasAttribute(attr.name)&&!['open','style','data-dirty'].includes(attr.name)&&!attr.name.startsWith('data-motion-')&&!(enhanced&&['tabindex','aria-hidden'].includes(attr.name))){if(attr.name==='class'&&motion.length)old.setAttribute('class',motion.join(' '));else old.removeAttribute(attr.name);}
  for(const attr of next.attributes){if(attr.name==='class'){const value=[...new Set([...attr.value.split(/\s+/),...motion,...(enhanced?['select-native']:[])])].join(' ');if(old.getAttribute('class')!==value)old.setAttribute('class',value);}else if(attr.name!=='open'&&old.getAttribute(attr.name)!==attr.value)old.setAttribute(attr.name,attr.value);}
 }
 function update(old,next,options){if(old.nodeType===3){if(old.data!==next.data)old.data=next.data;return;}
  if(old.dataset.lucide&&old.dataset.lucide===next.dataset.lucide)return;
  const a=native(old),b=native(next);if(a!==old){update(a,b,options);return;}
  if(options.keepIds?.has(old.id))return;
  if(old.dataset.persistContent==='true')return;
  if(old.matches('form')&&old.dataset.dirty==='true')return;
  const editing=old===document.activeElement||old.matches('input,textarea')&&old.closest('[data-dirty="true"]');
  const value=editing?old.value:null,selection=editing&&typeof old.selectionStart==='number'?[old.selectionStart,old.selectionEnd]:null;
  attributes(old,next);
  if(old.matches('input')){if(!editing){old.checked=next.checked;if(old.type!=='file')old.value=next.value;}}
  else if(old.matches('textarea')){if(!editing&&old.value!==next.value)old.value=next.value;}
  else {const face=old.querySelector(':scope > .motion-face');children(face||old,next,options);}
  if(old.matches('select')&&!editing)old.value=next.value;
  if(editing){old.value=value;if(selection)try{old.setSelectionRange(...selection);}catch{}}
 }
 function children(host,next,options){const old=[...host.childNodes],used=new Set();let cursor=host.firstChild;
  for(const desired of [...next.childNodes]){const wanted=key(desired);let found=old.find(n=>!used.has(n)&&compatible(n,desired)&&(wanted?key(n)===wanted:!key(n)));
   if(!found){found=desired.cloneNode(true);host.insertBefore(found,cursor);}else{used.add(found);if(found!==cursor)host.insertBefore(found,cursor);update(found,desired,options);}
   cursor=found.nextSibling;
  }
  for(const node of old)if(!used.has(node)&&node.parentNode===host&&!node.matches?.('.motion-tab-indicator'))node.remove();
 }
 function patch(host,html,{keepIds=[]}={}){const template=document.createElement('template');template.innerHTML=html;children(host,template.content,{keepIds:new Set(keepIds)});return host;}
 window.DersClassDOM={patch};
})();
