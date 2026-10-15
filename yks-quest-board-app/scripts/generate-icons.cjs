const fs=require('node:fs'),path=require('node:path'),sharp=require('sharp');
const root=path.resolve(__dirname,'..');
const logo=fs.readFileSync(path.join(root,'assets/brand-mark.svg'),'utf8').replaceAll('currentColor','#158567');
const mark=logo.slice(logo.indexOf('<g '),logo.lastIndexOf('</svg>'));
const svg=scale=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f4f7f5"/><g transform="translate(${256-128*scale} ${256-128*scale}) scale(${scale})">${mark}</g></svg>`;
(async()=>{
  fs.writeFileSync(path.join(root,'icons/ders-v2.svg'),svg(1.6));
  for(const [name,size,scale] of [['192',192,1.6],['512',512,1.6],['maskable',512,1.2],['apple',180,1.6]])
    await sharp(Buffer.from(svg(scale))).resize(size,size).png().toFile(path.join(root,`icons/ders-${name}-v2.png`));
  console.log('Static D.E.R.S. icons generated; logo proportion preserved.');
})().catch(e=>{console.error(e);process.exitCode=1;});
