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
 ['waterfall renderer has bounded ridge workload',core.includes('maxRows:85')&&core.includes('const N=240,raw=[]')&&core.includes('for(let rr=rows.length-1;rr>=0;rr--)')],
 ['waterfall default motion follows global normal speed',core.includes('intervalMs:120')&&core.includes("normal:{rta:420,wf:120,tf:.93")],
 ['waterfall builds a continuous surface between measured slices',core.includes('Join adjacent measurements into a translucent 3D surface')&&core.includes('if(rr<rows.length-1)')&&core.includes('for(let i=rowB.length-1;i>=0;i--)')],
 ['waterfall uses about eighty percent of canvas height',core.includes('depth=span*.72,amp=span*.20')&&core.includes('backLeft=left+58,backRight=right-88')],
 ['waterfall history stays at ten seconds at every speed',core.includes('maxRows:85')&&core.includes('Math.ceil(10000/preset.wf)+1')&&core.includes('const timeSpan=Math.max(.1,(Math.max(1,wf3d.maxRows-1)*wf3d.intervalMs)/1000)')],
 ['waterfall exposes frequency cursor',core.includes('drawWaterfallFrequencyCursor(W,specH,nyquist)')&&core.includes("hz.toFixed(1)+' Hz'")],
 ['generator close clears workspace drawer',core.includes("label.textContent.trim()==='GENERATOR'")&&core.includes("document.body.classList.remove('ui-workspace-drawer')")],
 ['generator has dual-channel meters',html.includes('id="gainMicFill"')&&html.includes('id="gainRefFill"')&&core.includes("document.getElementById('gainRefGain')")],
 ['right tools exposes every auxiliary measurement',Array.from(['tf','delay','rt60','spleq','align']).every(t=>html.includes('data-tool="'+t+'"'))],
 ['right tools has no duplicate settings',!html.includes('data-tool="settings"')],
 ['bottom bar contains only canonical actions',Array.from(['capture','traces','settings']).every(t=>html.includes('data-tcb="'+t+'"'))],
 ['session reset is accessible in bottom bar',html.includes('class="tcb danger" id="v5ResetSession"')&&!html.includes('id="v5ResetSession" class="v5RailTool"')],
 ['right tools fill the rail in measurement order',(()=>{const rail=html.slice(html.indexOf('<aside id="uiRightTools"'),html.indexOf('</aside>',html.indexOf('<aside id="uiRightTools"')));return html.includes('grid-template-columns:1fr!important;grid-template-rows:22px repeat(5,minmax(0,1fr))')&&rail.indexOf('data-tool="tf"')<rail.indexOf('data-tool="delay"')&&rail.indexOf('data-tool="delay"')<rail.indexOf('data-tool="rt60"')&&rail.indexOf('data-tool="rt60"')<rail.indexOf('data-tool="spleq"')&&rail.indexOf('data-tool="spleq"')<rail.indexOf('data-tool="align"')})()],
 ['measurement health is embedded in header',html.indexOf('id="measurementHealth"')<html.indexOf('</header>')&&html.includes('header.uiRefreshed #measurementHealth')],
 ['accent colors are available in settings',Array.from(['#3ea6ff','#40d17a','#b57bff','#ff9d3c']).every(c=>html.includes('data-ui-color="'+c+'"'))],
 ['day theme covers canonical workspace surfaces',html.includes('Complete daylight palette')&&html.includes('body.sun-mode #targetMeasurementPanel')&&html.includes('body.sun-mode #targetCommandBar')&&html.includes('body.sun-mode #uiMenu')],
 ['bottom bar removes dead display controls',Array.from(['startstop','freeze','average','smooth','hold','peak']).every(t=>!html.includes('data-tcb="'+t+'"'))],
 ['I/O drawer has compact responsive grid',html.includes('body.ui-workspace-drawer #v52IODock .v52IOGrid')&&html.includes('width:min(500px,calc(100vw - 24px))')&&html.includes('grid-template-columns:88px minmax(0,1fr)')],
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
 ,['TF graph separates input comparison and system difference',core.includes('INPUT COMPARISON')&&core.includes('DETAILED SYSTEM DIFFERENCE · MIC − REF')&&core.includes('drawInput(\'refDb\'')&&core.includes('drawInput(\'micDb\'')]
 ,['TF graph shades the live input gap',core.includes('audible system difference between mixer reference and microphone')&&core.includes("p.delta>=0?'rgba(239,82,104,.15)':'rgba(51,198,222,.15)'")]
 ,['TF cursor reports both inputs and delta',core.includes("'  REF '+rd.toFixed(1)+'  MIC '+md.toFixed(1)+'  Δ '+s.mag[k].toFixed(1)+' dB'")]
 ,['TF difference uses dense frequency columns',core.includes('Dense deviation columns expose narrow peaks')&&core.includes('for(let px=0;px<=W;px+=2)')&&core.includes('path.moveTo(px,zeroY);path.lineTo(px,y)')]
 ,['TF difference colors show direction and severity',core.includes('TF_DELTA_COLORS')&&core.includes('function tfDeltaBucket')&&core.includes('rgba(239,68,68,.82)')&&core.includes('rgba(37,99,235,.82)')]
 ,['TF dense columns are batched for smooth rendering',core.includes('TF_DELTA_COLORS.map(()=>new Path2D())')&&core.includes('deviationBars.forEach')]
 ,['TF detailed contour remains clearly visible',core.includes("ctx.strokeStyle='#b7f34a'")&&core.includes('Math.floor(plotH*.52)')]
 ,['TF tab is not gated by hidden workflow state',core.includes('if(tfHasReferenceSignal()) tfDrawMagnitudeView(W,plotH,nyquist)')&&!core.includes('if(tfOpen && tfDelayReady) tfDrawMagnitudeView')]
 ,['TF mic-only fallback uses dense FFT detail',core.includes('A dense FFT silhouette stays useful')&&core.includes('for(let x=0;x<=W;x+=2,visualIndex++)')&&core.includes('ctx.createLinearGradient(0,0,W,0)')]
 ,['TF mic-only fallback has frequency colors and contour',Array.from(['#ef4444','#f97316','#facc15','#84cc16','#22d3ee','#0ea5e9','#2563eb']).every(color=>core.includes(color))&&core.includes("ctx.strokeStyle='#b7f34a'")]
 ,['one global speed control replaces per-graph controls',Array.from(['data-analysis-speed="slow"','data-analysis-speed="normal"','data-analysis-speed="fast"']).every(x=>html.includes(x))&&!html.includes('data-rta-speed=')&&!html.includes('data-wf-speed=')]
 ,['global speed persists and drives every graph',core.includes("prefSet('analysis_speed',key)")&&core.includes('rtaResponseMs=preset.rta')&&core.includes('window.wf3d.intervalMs=preset.wf')&&core.includes('tfSmoothA=preset.tf')]
 ,['global speed affects TF mic-only rendering',core.includes('let tfLiveVisualDb=[]')&&core.includes('previous*tfSmoothA+raw*(1-tfSmoothA)')&&core.includes('tfLiveVisualDb=[];')]
 ,['TF graph tab does not open measurement panel',core.includes("setMode('rta');setTfOverlay(true)")&&!core.includes("v5SetTab('tf');\n    v5OpenTf();")]
 ,['TF measurement panel is available from tools',html.includes('data-tool="tf"')&&html.includes("if(t==='tf'&&typeof v5OpenTf==='function')v5OpenTf()")]
 ,['right tool icons use reference-scale sizing',html.includes('#uiRightTools .rtIcon{font-size:30px!important')]
 ,['workspace drawers keep the live graph visible',html.includes('Workspace drawers are non-modal')&&html.includes('body.ui-workspace-drawer #uiWorkspaceBackdrop,body.ui-workspace-drawer #uiTraceBackdrop{display:none!important')]
 ,['traces are permanently embedded in the left rail',html.includes('id="targetTraceCard"')&&html.includes('id="persistentTraceHost"')&&html.includes('host.append(list,add)')&&!html.includes('data-tls-open="traces"')]
 ,['bottom traces action focuses and reopens the persistent rail',html.includes("if(a==='traces'){window.focusPersistentTraces?.()}")&&html.includes("setRail('left',true)")]
 ,['tool cards place centered icon below label',html.includes('flex-direction:column!important;gap:8px!important')&&html.includes('<span>TF Measurement</span><span class="rtIcon">◎</span>')&&html.includes('text-align:center!important;justify-content:center!important')]
 ,['desktop generator and I/O cannot resize the canvas',html.includes('#stage.v52-io-open>canvas#cv,#stage.v53-gen-open>canvas#cv')&&html.includes('height:calc(100% - 48px)!important')&&html.includes('#stage.v52-io-open .meter,#stage.v53-gen-open .meter{bottom:8px!important}')]
 ,['all traces entry points focus the persistent rail',html.includes("if(kind==='traces'){")&&html.includes('window.focusPersistentTraces?.()')]
 ,['desktop rails have independent collapse controls',html.includes('id="leftRailToggle"')&&html.includes('id="rightRailToggle"')&&html.includes("side+'-rail-collapsed'")]
 ,['collapsed rails release canvas space',html.includes('body.left-rail-collapsed #stage{margin-left:12px!important}')&&html.includes('body.right-rail-collapsed #stage{margin-right:12px!important}')]
 ,['rail collapse preferences persist',html.includes("gal_'+side+'_rail_open")&&html.includes("setAttribute('aria-expanded'")]
 ,['TF trace capture cannot silently fall back to RTA',core.includes("if(v5WorkspaceMode==='tf')")&&core.includes('לכידת TF דורשת ערוץ Reference פעיל')]
 ,['analysis selector uses compact single-surface styling',html.includes('width:min(390px,48vw)!important')&&html.includes('#v53AnalysisGroup button.on::after')&&html.includes('background:rgba(31,183,201,.11)')]
 ,['rail controls are slim attached edge handles',html.includes('top:50%;width:22px;height:52px')&&html.includes('border-radius:0 11px 11px 0')&&html.includes('border-radius:11px 0 0 11px')]
 ,['graph selector keeps exactly one graph segment active',core.includes("document.querySelectorAll('#v5ModeTabs > button[data-v5mode]')")&&core.includes("rtaBtn?.classList.toggle('on',view==='rta')")&&core.includes("wfBtn?.classList.toggle('on',view==='spec')")]
];
let bad=0;for(const [n,ok] of checks){console.log((ok?'PASS ':'FAIL ')+n);if(!ok)bad++}
if(bad)process.exit(1);
console.log(`V5.5.33 regression validation passed (${checks.length} checks).`);
