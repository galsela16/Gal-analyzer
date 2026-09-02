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
const config=await readFile('js/core/config.js','utf8');
for(const id of ['cv','v52IODock','v52OpenMicCal','v53AnalysisToggle','v5TraceList','tfWorkflowSteps','tfAutoDelayBtn','tfVerifyBtn','tfUtilityBtns','dlyLoopbackBtn','dlyUnitSeg','dlyKnownDistance','dlyDistanceCalBtn','phWorkflowSteps','phSyncBtn','phRecommendation']){
  if(!html.includes(`id="${id}"`)) throw new Error(`Missing UI anchor: ${id}`);
}
for(const asset of ['app.js','js/app-core.js','js/core/config.js','js/core/diagnostics.js']){
  if(!worker.includes(asset)) throw new Error(`Service worker does not cache ${asset}`);
}

// Every asset named in the offline cache must exist in the release folder.
const cachedAssets=[...worker.matchAll(/'\.\/([^']+)'/g)].map(match=>match[1].split('?')[0]);
for(const asset of cachedAssets) await access(asset,constants.R_OK);

// Keep all literal UI hookups honest. The two entries below are optional
// legacy fallbacks and are intentionally guarded in app-core.js.
const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]));
const core=await readFile('js/app-core.js','utf8');
for(const workflowCheck of [
  "safeOn('tfVerifyBtn','click',()=>pickSource(verifyTfWorkflow,3000))",
  "verify.disabled=busy||!tfDelayReady",
  "trace.disabled=busy||!tfWorkflowVerified",
  "eq.disabled=busy||!tfWorkflowVerified",
  "tfWorkflowVerifyTimer=setTimeout",
  "st.dataset.delayResult==='path'",
  "st.dataset.delayResult==='speaker'",
  "safeOn('phSyncBtn','click',tfAutoDelay)",
  "safeOn('phSubBtn','click',()=>pickSource(()=>capturePhase('sub'),3200",
  "safeOn('phTopBtn','click',()=>pickSource(()=>capturePhase('top'),3200",
  "sub.disabled=phMeasuring||!tfDelayReady",
  "top.disabled=phMeasuring||!tfDelayReady||!phaseSub",
  "if(which==='top'&&!phaseSub)"
]){
  if(!core.includes(workflowCheck)) throw new Error(`Sub/Top workflow guard missing: ${workflowCheck}`);
}
if(html.includes('id="phPinkBtn"')||core.includes("safeOn('phPinkBtn'")) throw new Error('Legacy Sub/Top Pink button must stay removed');
if(!core.includes("const keepExpanded=expanded===true||(expanded==null&&wasVisible&&!dock.classList.contains('collapsed'))")) throw new Error('EQ dock does not preserve its expanded state during recalculation');
if(!core.includes("if(this.closest('#geqCutMode'))" )||!core.includes('event.stopPropagation();')) throw new Error('EQ graph-mode controls can bubble into the dock collapse action');
if(!core.includes("if(!eqCorrectionVisible||!eqCurveData||!eqCurveData.freqs||!eqCurveData.corr)return")) throw new Error('EQ display toggle does not hide the proposed correction ribbon');
if(!core.includes('function hideGeqDock(){ eqCorrectionVisible=false;')) throw new Error('EQ display toggle does not hide the complete correction workspace');
for(const delaySafetyCheck of [
  'const maxFft=1<<19',
  'while(N<seg+pad)N<<=1',
  'const guardMs=Math.min(12,Math.max(.6,resolutionMs*1.5))',
  "if(signalType==='sweep'&&sweepResult)return sweepResult"
]){
  if(!core.includes(delaySafetyCheck)) throw new Error(`Sweep-delay safety guard missing: ${delaySafetyCheck}`);
}
if(core.includes("signalType!=='noise')sweepResult=computeSweepDelay")) throw new Error('Unknown external audio can still fall through to the sweep estimator');
if(!html.includes('GAL Analyzer V5.5.20')||!config.includes("version:'5.5.20-waterfall-surface'")||!worker.includes('v5-5-20-waterfall-surface')) throw new Error('V5.5.20 release identifiers are inconsistent');
const recorder=await readFile('recorder-worklet.js','utf8');
if(!recorder.includes('e.data.micChannel')||!recorder.includes('e.data.refChannel')) throw new Error('Delay recorder does not follow I/O channel mapping');
if(!core.includes("micChannel:measChannel, refChannel:refChannel")) throw new Error('Delay capture does not pass selected I/O channels');
const optionalLegacyIds=new Set(['autoCalBtn','fft','v3CalChip']);
const wiredIds=[...core.matchAll(/safeOn\(['"]([^'"]+)['"]/g)].map(match=>match[1]);
for(const id of wiredIds){
  if(!ids.has(id) && !optionalLegacyIds.has(id)) throw new Error(`Handler has no matching UI element: ${id}`);
}
const inlineHandlers=[...html.matchAll(/on(?:click|change|input)="([A-Za-z_$][\w$]*)\(/g)].map(match=>match[1]);
for(const name of inlineHandlers){
  const exists=new RegExp(`(?:function\\s+${name}\\s*\\(|window\\.${name}\\s*=)`).test(core);
  if(!exists) throw new Error(`Inline UI handler is not implemented: ${name}`);
}

// PWA icon references must resolve in a clean GitHub Pages upload.
const manifest=JSON.parse(await readFile('manifest.webmanifest','utf8'));
for(const icon of manifest.icons||[]) await access(icon.src,constants.R_OK);
console.log('GAL Foundation validation passed.');
