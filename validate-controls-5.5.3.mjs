import fs from 'node:fs';
const html=fs.readFileSync('index.html','utf8');
const core=fs.readFileSync('app-core.js','utf8');
const all=html+'\n'+core;
const ids=[...html.matchAll(/<(button|input|select|textarea)\b([^>]*)>/gis)]
 .map(m=>({tag:m[1].toLowerCase(),attrs:m[2],id:(m[2].match(/\bid=["']([^"']+)/i)||[])[1],type:(m[2].match(/\btype=["']([^"']+)/i)||[])[1]})).filter(x=>x.id);
let failures=[];
for(const x of ids){
 const count=(all.match(new RegExp(x.id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g'))||[]).length;
 const inline=/\bon(?:click|input|change)=/i.test(x.attrs);
 if(x.tag==='button'&&!inline&&count<2)failures.push('button '+x.id);
 if(x.tag==='input'&&x.type==='range'&&!inline&&count<2)failures.push('range '+x.id);
}
for(const attr of ['data-co','data-go','data-ms','data-unit']){
 const prop=attr.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase());
 if(html.includes(attr+'=')&&!all.includes('dataset.'+prop))failures.push('data family '+attr);
}
for(const id of ['abBtnA','abBtnB','abBtnDelta','abBtnOff']){
 if(!html.includes("const map={abBtnA:'A',abBtnB:'B',abBtnDelta:'delta',abBtnOff:'off'}"))failures.push('AB widget '+id);
}
if(failures.length){console.error('FAIL',failures);process.exit(1)}
console.log(`Control wiring validation passed (${ids.length} ID controls + data-driven groups).`);
