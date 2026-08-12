import { readFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { execFileSync } from 'node:child_process';

const required=[
  'index.html','app.js','js/app-core.js','js/core/config.js','js/core/diagnostics.js',
  'sw.js','recorder-worklet.js','manifest.webmanifest'
];
for(const file of required) await access(file,constants.R_OK);

for(const file of ['app.js','js/app-core.js','js/core/config.js','js/core/diagnostics.js','sw.js','recorder-worklet.js']){
  execFileSync(process.execPath,['--check',file],{stdio:'inherit'});
}

const html=await readFile('index.html','utf8');
const worker=await readFile('sw.js','utf8');
for(const id of ['cv','v52IODock','v52OpenMicCal','v53AnalysisToggle','v5TraceList']){
  if(!html.includes(`id="${id}"`)) throw new Error(`Missing UI anchor: ${id}`);
}
for(const asset of ['app.js','js/app-core.js','js/core/config.js','js/core/diagnostics.js']){
  if(!worker.includes(asset)) throw new Error(`Service worker does not cache ${asset}`);
}
console.log('GAL Foundation validation passed.');
