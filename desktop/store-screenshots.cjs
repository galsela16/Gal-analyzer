// Developer-only captures of the real renderer with isolated synthetic PCM.
// Never opens hardware, plays a signal, or reads the user's saved measurements.
const fs=require('node:fs');
const path=require('node:path');
module.exports=async({window,release})=>{
  const output=path.join(__dirname,'build','store-submission',release.version,'screenshots');
  fs.mkdirSync(output,{recursive:true});
  window.setContentSize(1440,900);
  const evaluate=code=>window.webContents.executeJavaScript(`(async()=>{${code}})()`);
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const shots=[];
  console.log("Generator fade:",JSON.stringify(await require("./test-generator-fade.cjs")({window})));
  await evaluate(`
    const s={sr:16000,ph:Float32Array.from([0,179,-179,30,20,30,40,50],d=>d*Math.PI/180),coh:Float32Array.from([1,1,1,.01,1,1,1,1])};
    const frequency=x=>(x/2+1)*s.sr/TF_FFT_N;
    const wrapped=tfPhasePlotPoints(s,12,{},frequency);if(!wrapped[1].start||!wrapped.find(p=>p.x===6)?.start||wrapped.some(p=>p.x===4))throw Error('Phase wraps or coherence gaps were connected');
    const unwrapped=tfPhasePlotPoints(s,12,{unwrap:true},frequency);if(unwrapped[1].start||Math.abs(unwrapped[1].deg-181)>.01)throw Error('Phase unwrap failed');
    s.coh.fill(.01);if(tfPhasePlotPoints(s,12,{},frequency).length)throw Error('Low-coherence phase is displayed');
    if(!tfPhasePlotPoints(s,12,{gateOn:false},frequency).length)throw Error('Diagnostic mode unavailable');
    const button=document.getElementById('tfPhaseGate');button.click();await new Promise(r=>setTimeout(r,200));if(button.getAttribute('aria-pressed')!=='false'||!button.textContent.includes('Diagnostic'))throw Error('Phase gate state is misleading');button.click();await new Promise(r=>setTimeout(r,200));if(button.getAttribute('aria-pressed')!=='true')throw Error('Phase gate reset failed');
  `);

  console.log("Key Commands:",JSON.stringify(await require("./test-keycommands.cjs")({window})));
  const menu=require('electron').Menu.getApplicationMenu();
  if(!menu.getMenuItemById('target-curve'))throw Error('Native target menu missing.');
  await evaluate(`
    if(!document.body.classList.contains('desktop-native-menus')||getComputedStyle(document.getElementById('uiMenuBtn')).display!=='none')throw Error('Desktop still shows the in-app menu.');
    if(!document.getElementById('targetMeasurementPanel').contains(document.getElementById('uiLivePill')))throw Error('Audio control is outside Measurement.');
    if(document.querySelectorAll('.tlsPatchActions button').length!==2)throw Error('Generator must have exactly two buttons.');
    const audioRect=document.getElementById('uiLivePill').getBoundingClientRect(),readoutRect=document.querySelector('#targetMeasurementPanel .tmpValue').getBoundingClientRect();
    if(Math.abs(audioRect.width-readoutRect.width)>1||Math.abs(audioRect.left-readoutRect.left)>1)throw Error('Audio button and readout widths do not align.');
    if(document.getElementById('bottomSweepDuration'))throw Error('Sweep duration is still visible.');
    const stageTop=document.getElementById('stage').getBoundingClientRect().top;for(const id of ['targetLeftStatus','targetMeasurementPanel'])if(Math.abs(document.getElementById(id).getBoundingClientRect().top-stageTop)>1)throw Error('Side panel does not align with graph: '+id);
    const lower=document.getElementById('studioBottom');
    if(!lower.contains(document.getElementById('v5TraceList'))||!lower.contains(document.getElementById('tlsGenToggle')))throw Error('Lower workspace controls not moved.');
    const lowerRect=lower.getBoundingClientRect(),graphRect=document.getElementById('stage').getBoundingClientRect();
    if(getComputedStyle(document.getElementById('meter')).display!=='none')throw Error('Duplicate graph meter is visible.');
    if(lowerRect.height<120||lowerRect.height>150||graphRect.bottom>lowerRect.top)throw Error('Lower workspace overlaps graph.');
    const type=document.getElementById('bottomSignalType'),level=document.getElementById('bottomSignalLevel');
    type.value='sine';type.dispatchEvent(new Event('change'));if(genType!=='sine'||genOn)throw Error('Signal type sync failed or unexpectedly played.');
    level.value='-38';level.dispatchEvent(new Event('change'));if(genDb!==-38)throw Error('Signal level sync failed.');
    type.value='pink';type.dispatchEvent(new Event('change'));level.value='-34';level.dispatchEvent(new Event('change'));
    for(const view of ['tf','rta','mr','spec','overview','tf']){
      v54SetAnalysisView(view);setMode(view==='spec'?'spec':'rta');
      const active=[...document.querySelectorAll('#v53AnalysisGroup button.on')];
      if(active.length!==1||active[0].id!==({tf:'v54TfGraphToggle',rta:'v53AnalysisToggle',mr:'v54MrToggle',spec:'v54WaterfallToggle',overview:'overviewToggle'})[view])throw Error('Mode selectors are not exclusive: '+view);
    }
  `);

  await evaluate(`
    await start('coreaudio:field-test');
    if(!running||chReceived!==6)throw Error('Synthetic six-channel input did not start.');
    const labelSyntheticDevice=()=>{const sourceDevice=document.getElementById('v52DeviceSelect');if(![...sourceDevice.options].some(o=>o.value===activeInId)){const option=document.createElement('option');option.value=activeInId;option.textContent='Synthetic six-channel test interface';sourceDevice.append(option);}sourceDevice.value=activeInId;};labelSyntheticDevice();
    await new Promise(r=>setTimeout(r,200));
    const settle=async()=>{await new Promise(r=>setTimeout(r,100));const deadline=performance.now()+5000;while(!running){if(performance.now()>deadline)throw Error('Footer I/O restart timed out');await new Promise(r=>setTimeout(r,20));}await new Promise(r=>setTimeout(r,200));};
    const choose=async(id,value)=>{const select=document.getElementById(id);select.value=value;select.dispatchEvent(new Event('change',{bubbles:true}));await settle();};
    await choose('bottomMicInput','3');if(measChannel!==3||document.getElementById('v52MeasSelect').value!=='3')throw Error('Footer MIC routing failed');
    await choose('bottomRefInput','4');if(refChannel!==4||document.getElementById('v52RefSelect').value!=='4')throw Error('Footer REF routing failed');
    await choose('bottomMicInput','0');await choose('bottomRefInput','1');labelSyntheticDevice();await new Promise(r=>setTimeout(r,200));
    const io=document.getElementById('bottomIo'),traces=document.getElementById('bottomTraces'),gen=document.getElementById('bottomGenerator');
    if(traces.getBoundingClientRect().right>io.getBoundingClientRect().left||io.getBoundingClientRect().right>gen.getBoundingClientRect().left)throw Error('Footer I/O order or overlap incorrect');
    setFft(16384);v54SetAnalysisView('rta');
    const label=document.createElement('span');label.textContent='DEMO · Synthetic audio';
    label.style.cssText='position:fixed;top:19px;left:460px;z-index:9999;display:block;color:#9bcbd4;background:#0c2028;border:1px solid #294954;border-radius:4px;padding:4px 9px;font:11px Arial;white-space:nowrap;pointer-events:none';
    label.id='storeDemoLabel';document.body.appendChild(label);
    if(targetVisible)throw Error('Target must be hidden by default.');
    document.getElementById('uiSetTarget').click();
    await new Promise(resolve=>setTimeout(resolve,100));
    if(!targetVisible)throw Error('Target cannot be enabled from settings.');
    document.getElementById('uiSetTarget').click();
    await new Promise(resolve=>setTimeout(resolve,100));
    if(targetVisible)throw Error('Target cannot be hidden from settings.');
  `);
  await wait(100);
  if(menu.getMenuItemById('target-curve').checked)throw Error('Native target menu does not mirror state.');
  menu.getMenuItemById('target-curve').click();await wait(150);
  if(!await evaluate('return targetVisible;'))throw Error('Native target menu does not enable the target.');
  menu.getMenuItemById('target-curve').click();await wait(150);
  if(await evaluate('return targetVisible;'))throw Error('Native target menu does not disable the target.');
  await evaluate(`
    document.getElementById('uiLivePill').click();
    while(document.getElementById('uiLivePill').disabled)await new Promise(r=>setTimeout(r,20));
    if(running||document.getElementById('uiLivePill').getAttribute('aria-pressed')!=='false')throw Error('Audio button does not stop capture.');
    activeInId='coreaudio:field-test';document.getElementById('uiLivePill').click();
    while(document.getElementById('uiLivePill').disabled)await new Promise(r=>setTimeout(r,20));
    if(!running||chReceived!==6||document.getElementById('uiLivePill').getAttribute('aria-pressed')!=='true')throw Error('Audio button does not restart the selected input.');
    for(const side of ['left','right']){
      setWorkspaceRail(side,false);await new Promise(r=>setTimeout(r,360));
      if(!document.body.classList.contains(side+'-rail-collapsed'))throw Error('Sidebar did not collapse.');
      setWorkspaceRail(side,true);await new Promise(r=>setTimeout(r,360));
      if(document.body.classList.contains(side+'-rail-collapsed'))throw Error('Sidebar did not expand.');
    }
  `);
  const capture=async(file,view,description)=>{
    await wait(2800);
    await evaluate(`const r=document.getElementById('storeDemoLabel').getBoundingClientRect();if(r.width<100||r.height<10||r.top<0||r.bottom>100)throw Error('Demo label is not visible in the header.');`);
    const image=await window.webContents.capturePage();
    if(image.isEmpty())throw Error('Empty capture.');
    const jpeg=image.resize({width:1440,height:900,quality:'best'}).toJPEG(94);
    fs.writeFileSync(path.join(output,file),jpeg);
    shots.push({file,view,description,width:1440,height:900,syntheticAudio:true,finalSignedMas:false});
  };
  await wait(2000);
  await evaluate(`
    if(measureBusy())throw Error('Expected idle measurement state.');
    errBox.style.display='none';
    window.dispatchEvent(new CustomEvent('gal-input-discontinuity'));
    if(errBox.style.display!=='none')throw Error('Idle recovery displayed measurement error.');
    tfState='measuring';
    window.dispatchEvent(new CustomEvent('gal-input-discontinuity'));
    if(errBox.style.display!=='block'||tfState!=='idle')throw Error('Interrupted measurement was not cancelled and reported.');
    errBox.style.display='none';
  `);
  const motion=await evaluate(`
    const results=[];
    for(const side of ['left','right']){
      const rail=document.getElementById(side==='left'?'targetLeftStatus':'uiRightTools');
      const width=cv.width,initialClientWidth=cv.clientWidth;setWorkspaceRail(side,false);
      await new Promise(r=>setTimeout(r,110));
      const shift=new DOMMatrix(getComputedStyle(rail).transform).m41;
      if(!workspaceRailAnimating||cv.width!==width||Math.abs(shift)<1||Math.abs(shift)>=rail.offsetWidth+12)throw Error('Panel does not slide progressively: '+side);
      results.push({side,shift,canvasStayedStable:cv.width===width});
      await new Promise(r=>setTimeout(r,250));
      const canvasRect=cv.getBoundingClientRect(),expectedScale=Math.max(1,Math.min(devicePixelRatio||1,2,1440/Math.max(1,canvasRect.width),760/Math.max(1,canvasRect.height)));if(workspaceRailAnimating||cv.clientWidth===initialClientWidth||cv.width!==Math.round(canvasRect.width*expectedScale)||Math.abs(ctx.getTransform().a-expectedScale)>.001)throw Error('Canvas did not settle at the capped render resolution.');
      setWorkspaceRail(side,true);await new Promise(r=>setTimeout(r,80));
      const opening=new DOMMatrix(getComputedStyle(rail).transform).m41;
      if(Math.abs(opening)<=0||Math.abs(opening)>=rail.offsetWidth+12||rail.inert)throw Error('Opening does not slide: '+side);
      const panelRect=rail.getBoundingClientRect(),stageRect=document.getElementById('stage').getBoundingClientRect();
      if(side==='left'?stageRect.left<panelRect.right-2:stageRect.right>panelRect.left+2)throw Error('Panel overlaps graph during slide.');
      setWorkspaceRail(side,false);await new Promise(r=>setTimeout(r,80));setWorkspaceRail(side,true);
      await new Promise(r=>setTimeout(r,360));
      if(workspaceRailAnimating||document.body.classList.contains(side+'-rail-collapsed'))throw Error('Rapid reversal did not settle.');
    }
    setInterfaceMotion('reduced');setWorkspaceRail('left',false);await new Promise(r=>setTimeout(r,40));
    if(workspaceRailAnimating||getComputedStyle(document.getElementById('targetLeftStatus')).transitionDuration!=='0s')throw Error('Reduced motion is not respected.');
    setWorkspaceRail('left',true);await new Promise(r=>setTimeout(r,40));setInterfaceMotion('full');
    return results;
  `);
  console.log('Sidebar motion passed:',JSON.stringify(motion));
  for(const side of ['left','right']){
    await evaluate(`setWorkspaceRail('${side}',false);`);await wait(80);
    fs.writeFileSync(path.join(output,'ui-motion-'+side+'-closing.jpg'),(await window.webContents.capturePage()).resize({width:1440,height:900}).toJPEG(94));
    await wait(300);await evaluate(`setWorkspaceRail('${side}',true);`);await wait(80);
    fs.writeFileSync(path.join(output,'ui-motion-'+side+'-opening.jpg'),(await window.webContents.capturePage()).resize({width:1440,height:900}).toJPEG(94));
    await wait(300);
  }
  await evaluate(`captureWorkspaceTrace();v552RenameTrace(0,'Input 1');measChannel=2;await switchInput('coreaudio:field-test');`);
  await wait(1800);
  await evaluate(`captureWorkspaceTrace();v552RenameTrace(1,'Input 3');measChannel=0;await switchInput('coreaudio:field-test');v54SetAnalysisView('rta');`);
  await evaluate(`
    const viewport=document.getElementById('v5TraceList').getBoundingClientRect();
    const rows=[...document.querySelectorAll('#v5TraceList .v5TraceRow')];
    if(rows.length!==2)throw Error('Expected two lower trace cards.');
    for(const row of rows){const name=row.querySelector('input').getBoundingClientRect(),controls=row.querySelector('.v5TraceControls').getBoundingClientRect();if(name.top<viewport.top||name.bottom>viewport.bottom||name.right>controls.left||Math.abs((name.top+name.bottom-controls.top-controls.bottom)/2)>5)throw Error('Lower trace name or controls clipped/misaligned.');}
  `);
  await capture('01-rta-traces.jpg' ,'RTA','Live spectrum and two named, colored captured traces.');
  await evaluate(`v54SetAnalysisView('mr');`);
  await evaluate(`
    const off=document.createElement('canvas');off.width=1000;off.height=650;const c=off.getContext('2d'),colors=[],texts=[];const stroke=c.stroke.bind(c),text=c.fillText.bind(c),line=c.lineTo.bind(c);c.stroke=()=>{colors.push(c.strokeStyle);stroke()};c.fillText=(v,...rest)=>{texts.push(v);text(v,...rest)};c.lineTo=(x,y)=>{if(!Number.isFinite(x)||!Number.isFinite(y))throw Error('Invalid M/R point');line(x,y)};
    GalMr.render(c,1000,650,{cursorX:500});if(!colors.includes('#18daf4')||!colors.includes('#ffb744')||colors.includes('#62e3ad')||texts.some(v=>v.startsWith('Δ ')))throw Error('M/R input curves missing or removed difference remains');
    const previousRef=refChannel;try{refChannel=-1;colors.length=0;texts.length=0;GalMr.render(c,1000,650);if(colors.includes('#ffb744')||colors.includes('#62e3ad')||!texts.includes('Assign REF in I/O to compare inputs'))throw Error('M/R fabricated a missing reference');}finally{refChannel=previousRef}
  `);
  await capture('02-input-comparison.jpg','M/R','Full-height MIC and REF spectra with a shared frequency cursor.');
  await evaluate(`v54SetAnalysisView('spec');`);
  await wait(10500);
  await capture('03-waterfall.jpg','Waterfall','Frequency history from the live synthetic input.');
  await evaluate(`v54SetAnalysisView('overview');`);await wait(1600);fs.writeFileSync(path.join(output,'ui-overview.jpg'),(await window.webContents.capturePage()).resize({width:1440,height:900}).toJPEG(94));
  await evaluate(`
    v5OpenTf();await new Promise(r=>setTimeout(r,100));
    const dock=document.getElementById('tfPanel');
    for(const expanded of [false,true,false]){
      dock.classList.toggle('expanded',expanded);updateMeasureDockHeight();await new Promise(r=>setTimeout(r,100));
      const panel=dock.getBoundingClientRect(),graph=document.getElementById('stage').getBoundingClientRect(),lower=document.getElementById('studioBottom').getBoundingClientRect();
      if(panel.width<320||panel.width>360||panel.right>graph.left||panel.bottom>lower.top||dock.scrollWidth>dock.clientWidth+2)throw Error('Floating TF panel overlaps or clips horizontally: '+JSON.stringify({panelWidth:panel.width,panelRight:panel.right,graphLeft:graph.left,scroll:dock.scrollWidth,client:dock.clientWidth,offenders:[...dock.querySelectorAll('*')].filter(e=>e.getBoundingClientRect().right>panel.right-4&&e.getBoundingClientRect().width>0).map(e=>e.id||e.className).slice(0,15)}));
      if(document.getElementById('cv').getBoundingClientRect().height<graph.height-80)throw Error('Floating panel still reduces graph height.');
      if(!dock.querySelector('.floatingDockHead .dockClose'))throw Error('Floating panel close missing');
    }
    const delay=await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(Error('TF sync timed out.')),12000);
      runDelayCapture(null,result=>{clearTimeout(timer);resolve(result);},{signalType:'noise',maxDelayMs:50});
    });
    if(!delay?.reliable||Math.abs(delay.ms-5)>.1)throw Error('TF screenshot sync did not measure the known delay.');
    tfDelayMs=delay.ms;tfDelaySamples=delay.samples;tfDelayReady=true;
    verifyTfWorkflow('external');
  `);
  await wait(5200);
  const tf=await evaluate(`
    if(!tfWorkflowVerified||tfAverageFrames<18)throw Error('TF demo did not verify.');
    captureTfTrace();v552RenameTrace(tfTraces.length-1,'TF pair');
    if(!tfTraces.at(-1).verified)throw Error('TF trace was not verified.');
    setTfViewMode('magnitude');return {delayMs:tfDelayMs,verified:tfWorkflowVerified};
  `);
  await capture('04-transfer-function.jpg','TF magnitude','Actual measured and verified synthetic 5 ms loopback.');
  await evaluate(`setTfViewMode('phase');`);
  await evaluate(`const tools=document.getElementById('tfPhaseTools'),read=tools.querySelector('.phaseRead').getBoundingClientRect(),actions=tools.querySelector('.tfPhaseActions').getBoundingClientRect(),bounds=tools.getBoundingClientRect();if(bounds.width<100||read.bottom>actions.top||tools.scrollWidth>tools.clientWidth+1)throw Error('Phase values and controls overlap');for(const button of tools.querySelectorAll('.tfPhaseActions button')){const r=button.getBoundingClientRect();if(r.left<bounds.left||r.right>bounds.right||r.top<read.bottom)throw Error('Phase control outside its row');}`);
  await capture('05-phase.jpg','TF phase','Delay-compensated phase from the same selected input pair.');
  await evaluate(`
    document.getElementById('sunBtn').click();
    if(!document.body.classList.contains('sun-mode'))throw Error('Day theme did not activate.');
    for(const selector of ['header.uiRefreshed','#v5ModeTabs','.tlsCard','#targetMeasurementPanel','.tmpValue','#uiRightTools','#meter','#displayResolutionBar']){
      const color=getComputedStyle(document.querySelector(selector)).backgroundColor;
      const values=color.match(/[0-9.]+/g).map(Number);
      if(values[0]<100&&values[1]<100&&values[2]<100&&(values[3]??1)>.5)throw Error('Dark day surface: '+selector+' '+color);
    }
    v54SetAnalysisView('rta');
  `);
  await wait(500);
  const saveUi=async name=>fs.writeFileSync(path.join(output,name),(await window.webContents.capturePage()).resize({width:1440,height:900}).toJPEG(94));
  if(require('electron').nativeTheme.themeSource!=='light')throw Error('Native window did not switch to the day theme.');
  await saveUi('ui-day.jpg');
  await evaluate(`v5OpenTf();`);await wait(300);await saveUi('ui-tf-day.jpg');
  await evaluate(`v54SetAnalysisView('rta');document.querySelector('#v5ModeTabs [data-v5mode="delay"]').click();`);await wait(300);await saveUi('ui-delay-day.jpg');
  await evaluate(`closeModals();v54SetAnalysisView('rta');`);await wait(350);
  await evaluate(`
    const before=document.getElementById('stage').getBoundingClientRect();
    document.getElementById('uiSetOpenIo').click();
    await new Promise(r=>setTimeout(r,100));
    const dialog=document.getElementById('audioPreferences');
    if(!dialog.open||!dialog.contains(document.getElementById('v52DeviceSelect')))throw Error('Audio preferences did not open.');
    if(document.body.classList.contains('ui-drawer-io')||document.getElementById('stage').getBoundingClientRect().width!==before.width)throw Error('Preferences still alter the graph layout.');
    for(const page of ['analysis','calibration','audio']){
      document.querySelector('[data-audio-page="'+page+'"]').click();
      if(![...dialog.querySelectorAll('[data-preferences-page]')].some(c=>!c.hidden&&c.dataset.preferencesPage===page))throw Error('Preferences section missing: '+page);
    }
    await new Promise(r=>setTimeout(r,300));
    const values=getComputedStyle(document.getElementById('v52DeviceSelect')).backgroundColor.match(/[0-9.]+/g).map(Number);if(values.slice(0,3).some(v=>v<150))throw Error('Day preferences contain dark selects.');
    if(document.querySelector('.multiInputRead').textContent==='NO SIGNAL')throw Error('Preferences meters are not updating.');
    const r=dialog.getBoundingClientRect();if(r.left<10||r.top<10||r.bottom>innerHeight)throw Error('Preferences overflow window.');
  `);
  await saveUi('ui-audio-preferences-day.jpg');
  await evaluate(`document.getElementById('audioPreferencesClose').click();if(document.getElementById('audioPreferences').open||v52IoOpen)throw Error('Preferences did not close.');document.getElementById('sunBtn').click();document.getElementById('uiSetOpenIo').click();`);
  await wait(100);if(require('electron').nativeTheme.themeSource!=='dark')throw Error('Native window did not switch to the night theme.');
  await saveUi('ui-audio-preferences-night.jpg');
  await evaluate(`document.querySelector('[data-audio-page="keys"]').click();`);
  await saveUi('ui-key-commands.jpg');
  await evaluate(`document.getElementById('audioPreferencesClose').click();await stop();`);
  window.setContentSize(1000,650);await wait(300);
  await saveUi('ui-minimum-window.jpg');
  await evaluate(`for(const id of ['bottomTraces','bottomIo','bottomGenerator']){const card=document.getElementById(id);if(card.scrollWidth>card.clientWidth+1||card.scrollHeight>card.clientHeight+1)throw Error('Footer card overflows at minimum window size: '+id+' '+JSON.stringify({width:card.clientWidth,scrollWidth:card.scrollWidth,height:card.clientHeight,scrollHeight:card.scrollHeight}));}if(getComputedStyle(document.getElementById('meter')).display!=='none')throw Error('Duplicate meter returned');`);
  await saveUi('ui-minimum-window.jpg');window.setContentSize(1440,900);
  const manifest={release:release.version,date:'2026-10-13',status:'Drafts. Recapture from the accepted signed MAS release before submission.',scope:'Real application renderer; synthetic PCM from the test helper; no physical microphone or playback.',tf,shots};
  fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  return {output,count:shots.length,tf};
};
