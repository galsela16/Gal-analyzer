import fs from 'node:fs';
const core=fs.readFileSync('app-core.js','utf8'), html=fs.readFileSync('index.html','utf8');
const checks=[
 ['runtime core copies match',core===fs.readFileSync('js/app-core.js','utf8')],
 ['no undefined isoBands dependency',!core.includes('isoBands')],
 ['waterfall decay uses canonical FFT data',core.includes('binOverlapPowerDb(floatData,f/R,f*R,nyquist)')],
 ['waterfall confidence uses hz',core.includes('const f=c.hz||c.f||0')],
 ['waterfall label has confidence',core.includes("waterfallIssueLabel(r)+' · '+Math.round(q*100)+'%'")],
 ['delay repeatability wired to capture',core.includes('delayResult.repeatability=window.recordDelayReliability')],
 ['health reads analyser samples',html.includes('analyser.getFloatTimeDomainData(window.__mhMic)')],
 ['health reads reference samples',html.includes('analyserRef.getFloatTimeDomainData(window.__mhRef)')],
 ['right tools no dead uiTools selector',!html.includes("click('#uiTools')")],
 ['right tools no dead uiSettings selector',!html.includes("click('#uiSettings')")],
 ['trace capacity supports field sessions',core.includes('tfTraces.length>24')],
 ['visual issue chips use hz',html.includes("Math.round(c.hz||c.f)+' Hz")],
 ['TF confidence does not depend on window.audioCtx',!html.includes('!window.audioCtx')]
];
let bad=0;for(const [n,ok] of checks){console.log((ok?'PASS ':'FAIL ')+n);if(!ok)bad++}
if(bad)process.exit(1);
console.log(`V5.5.3 regression validation passed (${checks.length} checks).`);
