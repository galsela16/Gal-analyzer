const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const input=path.join(__dirname,'assets/gal-analyzer-logo-final.jpeg');
const out=path.join(__dirname,'build');
const iconset=path.join(out,'GAL Analyzer.iconset');
fs.mkdirSync(iconset,{recursive:true});
for (const size of [16,32,128,256,512]) {
  for (const scale of [1,2]) {
    const pixels=size*scale;
    const name=`icon_${size}x${size}${scale===2?'@2x':''}.png`;
    execFileSync('sips',['-s','format','png','-z',String(pixels),String(pixels),input,'--out',path.join(iconset,name)],{stdio:'pipe'});
  }
}
execFileSync('iconutil',['-c','icns',iconset,'-o',path.join(out,'GAL Analyzer.icns')],{stdio:'inherit'});
console.log('Prepared GAL Analyzer sound icon.');
