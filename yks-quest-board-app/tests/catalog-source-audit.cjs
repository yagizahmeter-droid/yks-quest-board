const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const out=path.join(__dirname,'../test-results/mebi');
async function main(){
 fs.mkdirSync(out,{recursive:true});
 const page=await(await fetch('https://ogmmateryal.eba.gov.tr/mebi-konu-ozetleri')).text();
 const asset=page.match(/src="(\/assets\/index-[^"]+\.js)"/)[1];
 const js=await(await fetch('https://ogmmateryal.eba.gov.tr'+asset)).text();
 const base=js.match(/\bgt="([^"]+)"/)[1],key=js.match(/\bSi="([^"]+)"/)[1];
 const get=async p=>{const r=await fetch(base+p,{headers:{'X-Api-Key':key}});if(!r.ok)throw Error(r.status);return(await r.json()).data;};
 const records=[];
 for(const category of [13,11]){
  for(const cls of await get('/SinifPublic/ByDersKategori/'+category))for(const exam of await get(`/DersPublic/BySinifAndKategori/${cls.id}/${category}`)){
   if(!['TYT','AYT'].includes(exam.ad))continue;
   for(const b of await get(`/KitapPublic/BySinifAndDers/${cls.id}/${exam.id}`)){
    const url='https://ogm-large-cdn.eba.gov.tr/materyal/Etkilesimlikitap/'+encodeURIComponent(b.klasoradi)+'/pdf.pdf',file=`${category}-${exam.ad}-${b.id}.pdf`,target=path.join(out,file);
    if(!fs.existsSync(target)&&!process.argv.includes('--metadata-only')){const r=await fetch(url,{signal:AbortSignal.timeout(90000)});if(!r.ok)throw Error(url+': '+r.status);const bytes=Buffer.from(await r.arrayBuffer());if(bytes.subarray(0,5).toString()!=='%PDF-')throw Error('Expected PDF: '+url);fs.writeFileSync(target,bytes);}
    const bytes=fs.existsSync(target)?fs.readFileSync(target):null;records.push({kind:category===13?'summary':'screening',exam:exam.ad,lesson:b.baslik,url,file,sha256:bytes?crypto.createHash('sha256').update(bytes).digest('hex'):null});console.log('SOURCE',category,exam.ad,b.baslik,bytes?.length||'metadata');
   }
  }
 }
 fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(records,null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
