const fs=require('node:fs'), path=require('node:path');
const root=path.resolve(__dirname,'..'), out=path.join(root,'dist');
fs.mkdirSync(out,{recursive:true});
const assets=['index.html','config.js','sync.js','teacher.js','service-worker.js','manifest.webmanifest','icons','vendor'];
for(const asset of assets) fs.cpSync(path.join(root,asset),path.join(out,asset),{recursive:true});
console.log('Static D.E.R.S. assets prepared in dist; no account exports or tests included.');

