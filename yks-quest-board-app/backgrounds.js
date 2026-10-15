(() => {
  const presets={industrial:{name:'Endüstriyel',color:null},black:{name:'Siyah',color:'#111315'},white:{name:'Beyaz',color:'#fafafa'},gray:{name:'Gri',color:'#777d81'},pink:{name:'Pembe',color:'#d8a6b9'}};
  const root=document.documentElement,key='ders-background';let selected='industrial',objectUrl=null,custom=null,dbPromise;
  const db=()=>dbPromise ||= new Promise((resolve,reject)=>{const r=indexedDB.open('ders-appearance',1);r.onupgradeneeded=()=>r.result.createObjectStore('backgrounds');r.onsuccess=()=>{r.result.onversionchange=()=>r.result.close();resolve(r.result);};r.onerror=()=>reject(r.error);r.onblocked=()=>reject(new Error('Arka plan deposu başka sekmede açık.'));});
  async function storage(mode,action){const database=await db();return new Promise((resolve,reject)=>{const tx=database.transaction('backgrounds',mode),r=action(tx.objectStore('backgrounds'));tx.oncomplete=()=>resolve(r.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('Arka plan saklanamadı.'));});}
  function apply(){
    if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl=null;}
    root.dataset.background=selected;
    if(selected==='custom'&&custom){objectUrl=URL.createObjectURL(custom);root.style.setProperty('--wallpaper',`url("${objectUrl}")`);root.style.removeProperty('--background-color');}
    else if(presets[selected]?.color){root.style.setProperty('--wallpaper','none');root.style.setProperty('--background-color',presets[selected].color);}
    else {root.style.removeProperty('--wallpaper');root.style.removeProperty('--background-color');}
    window.dispatchEvent(new Event('dersbackgroundchange'));
  }
  function set(value){if(!presets[value]&&!(value==='custom'&&custom))throw new Error('Önce özel arka plan fotoğrafını seç.');localStorage.setItem(key,value);selected=value;apply();}
  async function upload(file){
    const bitmap=await window.DersProgramImport.decode(file);let blob;
    try{if(bitmap.width*bitmap.height>50000000)throw new Error('Görsel çok büyük. Daha küçük bir görsel seç.');const scale=Math.min(1,2560/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.9));canvas.width=canvas.height=1;if(!blob)throw new Error('Görsel okunamadı.');}finally{bitmap.close();}
    const previous=custom;try{await storage('readwrite',s=>s.put(blob,'custom'));}catch{throw new Error('Arka plan saklanamadı. Cihazın depolama alanını kontrol et.');}custom=blob;
    try{set('custom');}catch(error){custom=previous;await storage('readwrite',s=>previous?s.put(previous,'custom'):s.delete('custom'));throw error;}
  }
  async function remove(){await storage('readwrite',s=>s.delete('custom'));custom=null;if(selected==='custom')set('industrial');else apply();}
  const ready=(async()=>{try{custom=await storage('readonly',s=>s.get('custom'));const saved=localStorage.getItem(key);if(presets[saved]||(saved==='custom'&&custom))selected=saved;}catch{selected='industrial';}apply();})();
  const container=document.getElementById('backgroundOptions'),file=document.getElementById('backgroundFile'),status=document.getElementById('backgroundStatus');
  if(container){
    for(const [value,item] of Object.entries(presets)){const label=document.createElement('label');label.className='background-swatch';label.innerHTML=`<input type="radio" name="backgroundChoice" value="${value}"><span style="background:${item.color||'var(--wallpaper) center / cover'}"></span><small>${item.name}</small>`;container.append(label);}
    const refresh=()=>{container.querySelectorAll('input').forEach(i=>i.checked=i.value===selected);document.getElementById('removeBackground').disabled=!custom;document.getElementById('useCustomBackground').disabled=!custom;document.getElementById('useCustomBackground').setAttribute('aria-pressed',String(selected==='custom'));};
    container.onchange=e=>{try{set(e.target.value);status.textContent='';}catch(error){status.textContent=error.message;}refresh();};
    file.onchange=async()=>{file.disabled=true;status.textContent='Görsel hazırlanıyor…';try{await upload(file.files[0]);status.textContent='Yalnızca bu cihazda saklanır. Tarayıcı verileri temizlenirse silinir.';}catch(error){status.textContent=error.message;}finally{file.disabled=false;file.value='';refresh();}};
    document.getElementById('removeBackground').onclick=async()=>{try{await remove();status.textContent='Özel arka plan kaldırıldı.';}catch{status.textContent='Arka plan kaldırılamadı. Yeniden dene.';}};
    document.getElementById('useCustomBackground').onclick=()=>set('custom');window.addEventListener('dersbackgroundchange',refresh);ready.then(refresh);
    document.getElementById('resetAppearance').addEventListener('click',()=>set('industrial'));
  }
  window.addEventListener('pagehide',()=>{if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl=null;}});
  window.addEventListener('pageshow',event=>{if(event.persisted)apply();});
  window.DersBackgrounds={presets,set,upload,remove,ready,get selected(){return selected;},get hasCustom(){return Boolean(custom);}};
})();
