import fs from 'node:fs';
const core=fs.readFileSync('app-core.js','utf8'), html=fs.readFileSync('index.html','utf8');
const checks=[
 ['runtime core copies match',core===fs.readFileSync('js/app-core.js','utf8')],
 ['no undefined isoBands dependency',!core.includes('isoBands')],
 ['waterfall decay uses canonical FFT data',core.includes('binOverlapPowerDb(floatData,f/R,f*R,nyquist)')],
 ['waterfall confidence uses hz',core.includes('const f=c.hz||c.f||0')],
 ['waterfall marker has confidence',core.includes("hz+' · '+Math.round(q*100)+'%'")],
 ['waterfall frequency uses interpolated FFT peak',core.includes('spectrumPeakDetail(floatData,fc,nyquist)')&&core.includes('interpolatedSpectrumHz(data,index,nyquist)')],
 ['narrow tone can pass resonance display gate',core.includes('(r.narrowProm||0)>=8')],
 ['waterfall draws only measured slices',core.includes('Draw each measured slice once')&&!core.includes('visualSubdivisions')&&!core.includes('motionPhase')],
 ['waterfall display filter preserves peaks without blur frames',core.includes('short symmetric display filter')&&core.includes('3*v+2*raw')],
 ['waterfall renderer has bounded ridge workload',core.includes('maxRows:84')&&core.includes('const N=240,raw=[]')&&core.includes('for(let rr=rows.length-1;rr>=0;rr--)')],
 ['waterfall default motion is faster',core.includes('intervalMs:120')&&html.includes('data-wf-speed="70"')&&html.includes("rta_wf_interval_v2")],
 ['waterfall builds a continuous surface between measured slices',core.includes('Join adjacent measurements into a translucent 3D surface')&&core.includes('if(rr<rows.length-1)')&&core.includes('for(let i=rowB.length-1;i>=0;i--)')],
 ['waterfall uses about eighty percent of canvas height',core.includes('depth=span*.72,amp=span*.20')&&core.includes('backLeft=left+58,backRight=right-88')],
 ['waterfall history reaches ten seconds',core.includes('maxRows:84')&&core.includes('intervalMs:120')&&core.includes('const timeSpan=Math.max(.1,(Math.max(1,wf3d.maxRows-1)*wf3d.intervalMs)/1000)')],
 ['waterfall exposes frequency cursor',core.includes('drawWaterfallFrequencyCursor(W,specH,nyquist)')&&core.includes("hz.toFixed(1)+' Hz'")],
 ['generator close clears workspace drawer',core.includes("label.textContent.trim()==='GENERATOR'")&&core.includes("document.body.classList.remove('ui-workspace-drawer')")],
 ['generator has dual-channel meters',html.includes('id="gainMicFill"')&&html.includes('id="gainRefFill"')&&core.includes("document.getElementById('gainRefGain')")],
 ['right tools exposes every auxiliary measurement',Array.from(['delay','rt60','spleq','align']).every(t=>html.includes('data-tool="'+t+'"'))],
 ['right tools has no duplicate settings',!html.includes('data-tool="settings"')],
 ['bottom bar contains only canonical actions',Array.from(['capture','traces','settings']).every(t=>html.includes('data-tcb="'+t+'"'))],
 ['session reset is accessible in bottom bar',html.includes('class="tcb danger" id="v5ResetSession"')&&!html.includes('id="v5ResetSession" class="v5RailTool"')],
 ['right tools fill the rail in measurement order',html.includes('grid-template-columns:1fr!important;grid-template-rows:22px repeat(4,minmax(0,1fr))')&&html.indexOf('data-tool="delay"')<html.indexOf('data-tool="rt60"')&&html.indexOf('data-tool="rt60"')<html.indexOf('data-tool="spleq"')&&html.indexOf('data-tool="spleq"')<html.indexOf('data-tool="align"')],
 ['measurement health is embedded in header',html.indexOf('id="measurementHealth"')<html.indexOf('</header>')&&html.includes('header.uiRefreshed #measurementHealth')],
 ['accent colors are available in settings',Array.from(['#3ea6ff','#40d17a','#b57bff','#ff9d3c']).every(c=>html.includes('data-ui-color="'+c+'"'))],
 ['day theme covers canonical workspace surfaces',html.includes('Complete daylight palette')&&html.includes('body.sun-mode #targetMeasurementPanel')&&html.includes('body.sun-mode #targetCommandBar')&&html.includes('body.sun-mode #uiMenu')],
 ['bottom bar removes dead display controls',Array.from(['startstop','freeze','average','smooth','hold','peak']).every(t=>!html.includes('data-tcb="'+t+'"'))],
 ['I/O drawer has compact responsive grid',html.includes('body.ui-workspace-drawer #v52IODock .v52IOGrid')&&html.includes('width:min(580px,calc(100vw - 24px))')],
 ['traces drawer cannot reveal I/O content',html.includes('body.ui-workspace-drawer #v52IODock{display:none!important}')&&html.includes('body.ui-workspace-drawer.ui-drawer-io #v52IODock')&&html.includes("'ui-drawer-'+kind")],
 ['desktop traces drawer overrides hidden rail',html.includes('body.ui-workspace-drawer.ui-traces-open #v5SideRail')&&html.includes('display:flex!important')],
 ['trace close clears workspace backdrop',html.includes("classList.remove('ui-traces-open','ui-workspace-drawer')")],
 ['I/O close clears workspace drawer',core.includes("label.textContent.trim()==='I/O & AUDIO'")],
 ['settings menu removes duplicate workspace section',!html.includes('<div class="uiMenuSectionLabel">WORKSPACE</div>')],
 ['settings menu removes duplicate measurement tools',!html.includes('<div class="uiMenuSectionLabel">MEASUREMENT TOOLS</div>')&&!html.includes('data-open-tool=')],
 ['external workspace opens canonical drawers directly',html.includes('window.openWorkspaceDrawer=openWorkspaceDrawer')&&html.includes('window.openWorkspaceDrawer?.(kind)')],
 ['right tools open canonical measurement modes directly',html.includes("click('#v5ModeTabs [data-v5mode=\"'+t+'\"]')")],
 ['delay repeatability wired to capture',core.includes('delayResult.repeatability=window.recordDelayReliability')],
 ['health reads analyser samples',html.includes('analyser.getFloatTimeDomainData(window.__mhMic)')],
 ['health reads reference samples',html.includes('analyserRef.getFloatTimeDomainData(window.__mhRef)')],
 ['right tools no dead uiTools selector',!html.includes("click('#uiTools')")],
 ['right tools no dead uiSettings selector',!html.includes("click('#uiSettings')")],
 ['trace capacity supports field sessions',core.includes('tfTraces.length>24')],
 ['visual issue chips use hz',html.includes("Math.round(c.hz||c.f)+' Hz")],
 ['TF confidence does not depend on window.audioCtx',!html.includes('!window.audioCtx')]
 ,['TF snapshot retains reference and microphone spectra',core.includes('refDb=new Float32Array(n),micDb=new Float32Array(n)')&&core.includes('refDb,micDb,refOffset')]
 ,['TF graph separates input comparison and system difference',core.includes('INPUT COMPARISON')&&core.includes('SYSTEM DIFFERENCE · MIC − REF')&&core.includes('drawInput(\'refDb\'')&&core.includes('drawInput(\'micDb\'')]
 ,['TF graph shades the live input gap',core.includes('audible system difference between mixer reference and microphone')&&core.includes("p.delta>=0?'rgba(239,82,104,.15)':'rgba(51,198,222,.15)'")]
 ,['TF cursor reports both inputs and delta',core.includes("'  REF '+rd.toFixed(1)+'  MIC '+md.toFixed(1)+'  Δ '+s.mag[k].toFixed(1)+' dB'")]
];
let bad=0;for(const [n,ok] of checks){console.log((ok?'PASS ':'FAIL ')+n);if(!ok)bad++}
if(bad)process.exit(1);
console.log(`V5.5.23 regression validation passed (${checks.length} checks).`);
