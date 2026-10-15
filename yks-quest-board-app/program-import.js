(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.DersProgramImport=api;})(typeof window==='undefined'?globalThis:window,()=>{
  const fold=s=>String(s||'').toLocaleUpperCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/İ/g,'I').replace(/\s+/g,' ').trim();
  const lessons=['Türkçe','Matematik','Fizik','Kimya','Biyoloji','Tarih','Coğrafya','Geometri','Felsefe','Din Kültürü'];
  function lessonName(s){const n=fold(s).replace(/[.:]/g,'');if(n==='MAT')return 'Matematik';if(n==='TURK')return 'Türkçe';return lessons.find(l=>fold(l)===n)||'';}
  function cell(text,lesson,day='',cellId='',confidence=100){
    const raw=String(text||'').trim();if(!raw)return null;
    const normalized=fold(raw), count=normalized.match(/(\d+)\s*SORU/);
    const teaching=/KONU\s*ANLATIM/.test(normalized),analysis=/ANALIZ/.test(normalized),solving=/COZUM/.test(normalized),parts=[];
    if(teaching)parts.push('Konu anlatımı');
    if(count)parts.push(count[1]+' soru'+(analysis?' ve analiz':solving?' çözümü':''));
    else {if(solving)parts.push('soru çözümü');if(analysis)parts.push('analiz');}
    const title=raw.split(/\n+/).map(line=>line.replace(/\b\d+\s*SORU.*$/iu,'').replace(/KONU\s*ANLATIMI?.*$/iu,'').replace(/SORU\s*(?:ÇÖZÜMÜ|COZUMU).*$/iu,'').trim()).filter(line=>line&&!/^(KONU|ANLATIM|COZUM|COZIMI|SORU|\d+ SORU|VE ANALIZ)/.test(fold(line).replace(/©/g,'C'))).join(' ').replace(/\s+/g,' ').trim();
    let xp=lesson==='Tarih'?50:85;if(count)xp+=Math.min(80,Number(count[1])*1.2);if(analysis)xp+=35;if(teaching)xp+=15;
    return {categoryName:lesson,subject:'',title:title||raw.replace(/\s+/g,' '),detail:parts.join(' / ')||raw,xp:Math.ceil(xp/5)*5,sourceDay:day||'Fotoğraftan',cellId,ocrRaw:raw,needsReview:!lesson||!title||confidence<75||/^(YAPI\/EKLER|\?)$/.test(fold(title))};
  }
  function parseText(text){
    const found=[];let lesson='',day='',pending=[];
    const flush=()=>{if(pending.length){const q=cell(pending.join('\n'),lesson,day);if(q)found.push(q);pending=[];}};
    for(const line of String(text||'').split(/\n/).map(s=>s.trim()).filter(Boolean)){
      const columns=line.split(/\t|\s*\|\s*/);
      if(columns.length>=3){const at=columns.findIndex(s=>lessonName(s));if(at>=0){flush();const q=cell(columns.slice(at+1).join('\n'),lessonName(columns[at]),columns.slice(0,at).join(' '));if(q)found.push(q);continue;}}
      const next=lessonName(line);if(next){flush();lesson=next;continue;}
      if(/^(\d{1,2}\s+(OCAK|SUBAT|MART|NISAN|MAYIS|HAZIRAN|TEMMUZ|AGUSTOS|EYLUL|EKIM|KASIM|ARALIK)|PAZARTESI|SALI|CARSAMBA|PERSEMBE|CUMA|CUMARTESI|PAZAR)/.test(fold(line))){flush();day=line;continue;}
      pending.push(line);
      if(/SORU.*(?:COZUM|ANALIZ)|VIDEO/.test(fold(line)))flush();
    }flush();return found;
  }
  function grid(image){
    const {data,width,height}=image;
    const lines=vertical=>{const length=vertical?width:height,span=vertical?height:width,hits=[];for(let p=0;p<length;p++){let ink=0;for(let k=0;k<span;k++){const i=(vertical?k*width+p:p*width+k)*4;if(data[i]*.299+data[i+1]*.587+data[i+2]*.114<180)ink++;}if(ink/span>.62)hits.push(p);}const groups=[];for(const p of hits){const last=groups.at(-1);if(last&&p-last.at(-1)<=2)last.push(p);else groups.push([p]);}return groups.map(g=>Math.round((g[0]+g.at(-1))/2));};
    const x=lines(true),y=lines(false);
    if(x.length>=3&&y.length>=3){
      const median=list=>{const d=list.slice(1).map((n,i)=>n-list[i]).sort((a,b)=>a-b);return d[Math.floor(d.length/2)];};
      const column=median(x),row=median(y);
      // Cropped screenshots often omit the outer rules while retaining the internal grid.
      if(x[0]>column*.5)x.unshift(0);if(width-1-x.at(-1)>column*.5)x.push(width-1);
      if(y[0]>2)y.unshift(0);if(height-1-y.at(-1)>row*.5)y.push(height-1);
    }
    return {x,y};
  }
  function validate(file){if(!file||!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('PNG, JPEG veya WebP fotoğraf seç.');if(file.size>12*1024*1024)throw new Error('Fotoğraf en fazla 12 MB olabilir.');}
  async function decode(file){validate(file);let image;try{image=await createImageBitmap(file,{imageOrientation:'from-image'});}catch{throw new Error('Görsel okunamadı. Geçerli bir PNG, JPEG veya WebP fotoğraf seç.');}if(image.width*image.height>50000000){image.close();throw new Error('Görsel çok büyük. Daha küçük bir fotoğraf seç.');}return image;}
  async function read(file,{worker,progress=()=>{},rotation=0}={}){
    const image=await decode(file);let canvas;
    try{
      const scale=Math.min(2.5,2400/Math.max(image.width,image.height)),w=Math.round(image.width*scale),h=Math.round(image.height*scale);
      canvas=document.createElement('canvas');canvas.width=rotation%180?h:w;canvas.height=rotation%180?w:h;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.translate(canvas.width/2,canvas.height/2);ctx.rotate(rotation*Math.PI/180);ctx.drawImage(image,-w/2,-h/2,w,h);ctx.setTransform(1,0,0,1,0,0);
      const pixels=ctx.getImageData(0,0,canvas.width,canvas.height),bounds=grid(pixels),found=[],raw=[];
      await worker.setParameters({tessedit_pageseg_mode:'6',preserve_interword_spaces:'1'});
      const recognize=async(left,top,right,bottom)=>{const pad=Math.max(2,Math.round(scale*1.2)),inner=Math.max(4,Math.round(scale*4)),crop=document.createElement('canvas');crop.width=Math.max(1,right-left-pad*2)+20;crop.height=Math.max(1,bottom-top-pad*2)+20;let ink=0,total=0;for(let y=top+inner;y<bottom-inner;y++)for(let x=left+inner;x<right-inner;x++){const i=(y*pixels.width+x)*4;if(pixels.data[i]*.299+pixels.data[i+1]*.587+pixels.data[i+2]*.114<200)ink++;total++;}if(!total||ink/total<.001)return {text:'',confidence:100,blank:true};const c=crop.getContext('2d');c.fillStyle='white';c.fillRect(0,0,crop.width,crop.height);c.drawImage(canvas,left+pad,top+pad,crop.width-20,crop.height-20,10,10,crop.width-20,crop.height-20);return {...(await worker.recognize(crop)).data,blank:false};};
      if(bounds.x.length>=4&&bounds.y.length>=3&&bounds.x.length*bounds.y.length<=500){
        const headers=[];let headerRow=-1;
        for(let row=0;row<Math.min(3,bounds.y.length-1);row++){
          for(let col=0;col<bounds.x.length-1;col++){const d=await recognize(bounds.x[col],bounds.y[row],bounds.x[col+1],bounds.y[row+1]);const lesson=lessonName(d.text);if(lesson)headers[col]=lesson;}
          if(headers.filter(Boolean).length>=2){headerRow=row;break;}
        }
        if(headerRow>=0){
          const firstSubject=headers.findIndex(Boolean),total=(bounds.y.length-headerRow-2)*(bounds.x.length-firstSubject-1);let done=0;
          for(let row=headerRow+1;row<bounds.y.length-1;row++){
            let day='';for(let col=0;col<firstSubject;col++){const d=await recognize(bounds.x[col],bounds.y[row],bounds.x[col+1],bounds.y[row+1]);day+=' '+d.text.trim().replace(/\s+/g,' ');}
            for(let col=firstSubject;col<bounds.x.length-1;col++){
              const d=await recognize(bounds.x[col],bounds.y[row],bounds.x[col+1],bounds.y[row+1]);progress(++done,total);const id=`r${row}:c${col}`;if(!d.blank){const q=cell(d.text||'?',headers[col]||'',day.trim(),id,d.text?d.confidence:0);found.push(q);raw.push(`${day.trim()} | ${headers[col]||'?'} | ${d.text.trim().replace(/\n/g,' / ')}`);}
            }
          }
          return {quests:found,text:raw.join('\n'),table:true,warnings:found.filter(q=>q.needsReview).length};
        }
      }
      const data=(await worker.recognize(canvas)).data;return {quests:parseText(data.text).map(q=>({...q,needsReview:true})),text:data.text,table:false,warnings:1};
    }finally{image.close();if(canvas){canvas.width=1;canvas.height=1;}}
  }
  return {lessons:[...lessons],fold,lessonName,cell,parseText,grid,validate,decode,read};
});
