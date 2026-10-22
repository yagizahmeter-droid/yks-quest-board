(() => {
  if (typeof HTMLElement.prototype.showPopover !== 'function') { window.DersSelect = { close() {}, refresh() {} }; return; }
  const controls = new Map(); let opened = null, sequence = 0;
  const fold = value => value.toLocaleLowerCase('tr-TR');
  function close(restore = false) {
    if (!opened) return;
    const c = opened; opened = null;
    if (c.popup.matches(':popover-open')) c.popup.hidePopover();
    c.wrap.classList.remove('select-open', 'select-up'); c.trigger.setAttribute('aria-expanded','false');
    c.trigger.removeAttribute('aria-activedescendant'); c.search?.removeAttribute('aria-activedescendant');
    if (restore && c.trigger.isConnected) c.trigger.focus();
  }
  function position(c) {
    const r = c.trigger.getBoundingClientRect(), space = innerHeight-r.bottom-12;
    const up = space < 180 && r.top > space; c.wrap.classList.toggle('select-up',up);
    c.popup.style.width = r.width+'px'; c.popup.style.left = Math.max(8,Math.min(r.left,innerWidth-r.width-8))+'px';
    c.popup.style.maxHeight = Math.max(100,Math.min(320,up ? r.top-12 : space))+'px';
    c.popup.style.top = up ? 'auto' : r.bottom-1+'px'; c.popup.style.bottom = up ? innerHeight-r.top-1+'px' : 'auto';
    c.popup.classList.toggle('select-up',up);
  }
  function select(c, index) {
    const o = c.items[index]; if (!o || o.disabled) return;
    if(o.group){const id=o.group.dataset.weekId;if(c.expanded.has(id))c.expanded.delete(id);else c.expanded.add(id);draw(c,c.search?.value||'');active(c,c.items.findIndex(item=>item.group===o.group));return;}
    c.native.value = o.value; close(true); update(c);
    c.native.dispatchEvent(new Event('input',{bubbles:true})); c.native.dispatchEvent(new Event('change',{bubbles:true}));
  }
  function active(c, index) {
    if (!c.items.length) return;
    c.index = Math.max(0,Math.min(index,c.items.length-1));
    c.list.querySelectorAll('[data-select-index]').forEach(el => { const i=Number(el.dataset.selectIndex);el.classList.toggle('option-active',i===c.index); if (i===c.index) {
      (c.search || c.trigger).setAttribute('aria-activedescendant',el.id);
      // Scroll only the options, never the search field, dialog or page.
      const item=el.getBoundingClientRect(), box=c.list.getBoundingClientRect();
      if(item.top<box.top)c.list.scrollTop+=item.top-box.top;
      else if(item.bottom>box.bottom)c.list.scrollTop+=item.bottom-box.bottom;
    } });
  }
  function draw(c, query = '') {
    if(c.native.hasAttribute('data-week-groups')){drawWeeks(c,query);return;}
    c.items = [...c.native.options].filter(o=>!o.hidden && (!query || fold(o.label).includes(fold(query)))); c.list.replaceChildren();
    c.items.forEach((o,i) => { const el = document.createElement('div'); el.id=c.id+'-option-'+i; el.setAttribute('role','option'); el.setAttribute('aria-selected',String(o.selected)); el.setAttribute('aria-disabled',String(o.disabled)); el.textContent=o.label;
      // Keep combobox focus until click commits; a modal otherwise steals focus and closes the popup on mousedown.
      el.dataset.selectIndex=i;el.onmousedown=e=>e.preventDefault();
      // The popup lives inside a label: do not forward this click to its hidden native select.
      el.onclick=e=>{e.preventDefault();select(c,i);}; c.list.append(el); });
    if (!c.items.length) { const empty=document.createElement('p'); empty.className='select-empty'; empty.textContent='Sonuç bulunamadı'; c.list.append(empty); }
    active(c,Math.max(0,c.items.findIndex(o=>o.selected)));
  }
  function drawWeeks(c,query){
    const previous=c.query||'';c.query=query;if(previous&&!query)c.expanded.clear();
    c.items=[];c.list.replaceChildren();
    function row(item,label,heading=false,expanded=false){
      const index=c.items.push(item)-1,el=document.createElement(heading?'button':'div');el.id=c.id+'-item-'+index;el.dataset.selectIndex=index;el.setAttribute('role','treeitem');el.setAttribute('aria-level',heading||!item.parent? '1':'2');
      if(heading){el.type='button';el.tabIndex=-1;el.className='select-week-heading';el.setAttribute('aria-expanded',String(expanded));el.dataset.weekId=item.group.dataset.weekId;const span=document.createElement('span');span.textContent=label;const icon=document.createElement('i');icon.dataset.lucide=expanded?'chevron-down':'chevron-right';el.append(span,icon);}
      else {el.textContent=label;el.setAttribute('aria-selected',String(item.selected));if(item.parent)el.className='select-week-task';}
      el.onmousedown=e=>e.preventDefault();el.onclick=e=>{e.preventDefault();select(c,index);};return el;
    }
    for(const child of c.native.children){
      if(child.tagName==='OPTION'){if(!query||fold(child.label).includes(fold(query)))c.list.append(row(child,child.label));continue;}
      if(child.tagName!=='OPTGROUP')continue;
      const options=[...child.children].filter(o=>!query||fold(child.label+' '+o.label).includes(fold(query)));if(!options.length)continue;
      const expanded=Boolean(query)||c.expanded.has(child.dataset.weekId),heading=row({group:child},child.label,true,expanded);c.list.append(heading);
      if(expanded){const group=document.createElement('div');group.id=heading.id+'-tasks';group.dataset.weekId=child.dataset.weekId;group.setAttribute('role','group');group.setAttribute('aria-labelledby',heading.id);heading.setAttribute('aria-owns',group.id);for(const o of options){const item={value:o.value,selected:o.selected,disabled:o.disabled,parent:child};group.append(row(item,o.label));}c.list.append(group);}
    }
    if(!c.items.length){const empty=document.createElement('p');empty.className='select-empty';empty.textContent='Sonuç bulunamadı';c.list.append(empty);}
    window.lucide?.createIcons(c.list);active(c,Math.max(0,c.items.findIndex(o=>o.selected)));
  }
  function open(c) {
    if (c.native.disabled) return;
    if (opened === c) { close(true); return; } close(); update(c); opened=c;
    c.expanded=new Set();c.query='';if (c.search) c.search.value=''; draw(c); c.wrap.classList.add('select-open'); c.trigger.setAttribute('aria-expanded','true');
    position(c); c.popup.showPopover(); if(c.search)c.search.focus(); else c.trigger.focus(); active(c,c.index);
  }
  function key(c, e) {
    if (e.key==='Escape' && opened===c) { e.preventDefault(); e.stopPropagation(); close(true); return; }
    if (e.key==='Tab') { close(true); return; }
    if(opened===c&&['ArrowLeft','ArrowRight'].includes(e.key)&&c.items[c.index]?.group){e.preventDefault();const group=c.items[c.index].group,id=group.dataset.weekId;if((e.key==='ArrowRight')!==c.expanded.has(id))select(c,c.index);return;}
    if (['ArrowDown','ArrowUp','Home','End','Enter',' '].includes(e.key) && !(e.target===c.search && e.key===' ' && (c.search.value || !c.items[c.index]?.group))) {
      e.preventDefault();
      if (opened!==c) { open(c); return; }
      if (['Enter',' '].includes(e.key)) select(c,c.index);
      else active(c,e.key==='Home'?0:e.key==='End'?c.items.length-1:c.index+(e.key==='ArrowDown'?1:-1));
    } else if (opened===c && !c.search && e.key.length===1) { const n=c.items.findIndex(o=>fold(o.label).startsWith(fold(e.key))); if(n>=0)active(c,n); }
  }
  function update(c) {
    const label = c.native.selectedOptions[0]?.label || 'Seç'; if(c.text.textContent!==label)c.text.textContent=label;
    c.trigger.disabled=c.native.disabled;
    const name=c.native.getAttribute('aria-label') || c.native.labels?.[0]?.childNodes[0]?.textContent?.trim() || 'Seçim';
    c.trigger.setAttribute('aria-label',name); c.list.setAttribute('aria-label',name); if(c.search)c.search.setAttribute('aria-label',name+' ara');
  }
  function enhance(native) {
    if (controls.has(native) || native.multiple || native.size>1) return;
    const wrap=document.createElement('span'); wrap.className='select-control'; native.before(wrap); wrap.append(native);
    const trigger=document.createElement('button'); trigger.type='button'; trigger.className='select select-trigger'; trigger.setAttribute('role','combobox'); trigger.setAttribute('aria-expanded','false'); trigger.setAttribute('aria-haspopup','listbox');
    const text=document.createElement('span'), chevron=document.createElement('i'); chevron.dataset.lucide='chevron-down'; trigger.append(text,chevron); wrap.append(trigger);
    const popup=document.createElement('div'); popup.className='select-popup'; popup.setAttribute('popover','manual');
    const id='ders-select-'+(++sequence), list=document.createElement('div'); list.id=id; list.className='select-options'; list.setAttribute('role','listbox'); list.tabIndex=-1; popup.append(list); trigger.setAttribute('aria-controls',id); wrap.append(popup);
    let search=null; if(native.hasAttribute('data-searchable') || /(?:Category|Subject|category|subject|topic)/i.test(native.id)) { search=document.createElement('input'); search.type='search'; search.className='input select-search'; search.dataset.uiTransient='true'; search.placeholder='Ara…'; search.setAttribute('role','combobox'); search.setAttribute('aria-expanded','true'); search.setAttribute('aria-controls',id); search.setAttribute('aria-autocomplete','list'); popup.prepend(search); }
    const c={native,wrap,trigger,text,popup,list,search,id,items:[],index:0,expanded:new Set(),query:''}; controls.set(native,c);
    if(native.hasAttribute('data-week-groups')){list.setAttribute('role','tree');trigger.setAttribute('aria-haspopup','tree');search?.setAttribute('aria-haspopup','tree');}
    // Bare list/scrollbar clicks must not activate the containing label's hidden select.
    popup.addEventListener('click',e=>{if(e.target===popup||e.target===list)e.preventDefault();});
    list.onkeydown=e=>key(c,e);
    native.classList.add('select-native'); native.tabIndex=-1; native.setAttribute('aria-hidden','true');
    trigger.onclick=e=>{e.preventDefault();open(c);}; trigger.onkeydown=e=>key(c,e); native.addEventListener('change',()=>update(c)); native.addEventListener('focus',()=>trigger.focus());
    if(search){search.oninput=()=>draw(c,search.value);search.onkeydown=e=>key(c,e);} update(c); if(document.activeElement===native)trigger.focus();
  }
  function scan(root=document) { if(root.matches?.('select'))enhance(root); root.querySelectorAll?.('select').forEach(enhance); }
  const observer=new MutationObserver(records=>{
    for(const r of records){if(r.target.tagName==='SELECT'||r.target.closest?.('select')) { const c=controls.get(r.target.closest?.('select') || r.target); if(c)update(c); }
      for(const n of r.addedNodes)if(n.nodeType===1 && !n.closest('.select-control'))scan(n);
    }
    for(const [native,c] of controls) if(!native.isConnected){if(opened===c)close();controls.delete(native);}
    if(opened && !opened.trigger.getClientRects().length)close();
  });
  document.addEventListener('pointerdown',e=>{if(opened && !opened.wrap.contains(e.target))close();});
  document.addEventListener('focusin',e=>{if(opened && !opened.wrap.contains(e.target))close();});
  window.addEventListener('resize',()=>opened&&position(opened)); document.addEventListener('scroll',e=>{if(opened && !opened.popup.contains(e.target))position(opened);},true);
  scan(); observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled','aria-label']});
  window.DersSelect={close,refresh:()=>{scan();controls.forEach(update);if(opened){if(opened.native.disabled)close();else draw(opened,opened.search?.value||'');}}};
})();
