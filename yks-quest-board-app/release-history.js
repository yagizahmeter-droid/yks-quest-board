(function(root){
 const compare=(a,b)=>{const x=a.split('.').map(Number),y=b.split('.').map(Number);for(let i=0;i<Math.max(x.length,y.length);i++){const d=(y[i]||0)-(x[i]||0);if(d)return d;}return 0;};
 const releases=[
  {version:'1.1',name:'Teacher Experience Update',date:'2026-10-15',features:['Sınav, ders, kategori ve alt konu kataloğu','Günlük ve haftalık tekrarlı öğretmen görevleri','Rekabet XP ve Kişisel XP ayrımı','Dropdown ve bildirim katmanı düzeltmeleri','Kişisel görevlerde otomatik başlık']},
  {version:'1.0.1',name:'Visualization Update',features:['Floating navigasyon ve üst çubuk','Klasik ve Bulanık görünümü','Açık, koyu ve sistem teması','Vurgu renkleri, renksiz mod ve endüstriyel arka planlar']},
  {version:'1.0',name:'Teacher & New Look',features:['D.E.R.S. ismine geçiş','Öğretmen ve öğrenci hesapları','Davet, bağlantı onayı ve program gönderme','Yenilenen mobil ve masaüstü arayüzü']},
  {version:'0',name:'Beta — YKS Quest Board',features:['Haftalık görev havuzu','XP ve seviye mekanikleri','Temel görev yönetimi']}
 ].sort((a,b)=>compare(a.version,b.version));
 root.DersReleases={releases,compare};if(typeof document==='undefined'){module.exports=root.DersReleases;return;}
 const dialog=document.createElement('dialog');dialog.id='releaseHistoryDialog';dialog.className='ders-dialog release-history';dialog.dataset.autoSave='';dialog.setAttribute('aria-labelledby','releaseHistoryTitle');
 dialog.innerHTML='<header class="appearance-heading"><h2 id="releaseHistoryTitle">Sürüm Geçmişi</h2><button type="button" class="icon-button" aria-label="Sürüm geçmişini kapat" title="Kapat"><i data-lucide="x"></i></button></header>'+releases.map(r=>`<section><h3>${r.version==='0'?'Beta':'v'+r.version} · ${r.name}</h3>${r.date?`<time datetime="${r.date}">15 Ekim 2026</time>`:''}<ul>${r.features.map(f=>`<li>${f}</li>`).join('')}</ul></section>`).join('');document.body.append(dialog);
 const trigger=document.getElementById('versionHistoryButton');function close(){dialog.close();window.DersUI.modalClosed('release-history');trigger.focus();}trigger.onclick=()=>{dialog.showModal();window.DersUI.openModal('release-history',dialog,close);};dialog.querySelector('button').onclick=close;dialog.oncancel=e=>{e.preventDefault();close();};
})(typeof window==='undefined'?globalThis:window);
