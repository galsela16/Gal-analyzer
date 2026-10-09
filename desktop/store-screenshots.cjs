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
  const menu=require('electron').Menu.getApplicationMenu();
  if(!menu.getMenuItemById('target-curve'))throw Error('Native target menu missing.');
  await evaluate(`
    if(!document.body.classList.contains('desktop-native-menus')||getComputedStyle(document.getElementById('uiMenuBtn')).display!=='none')throw Error('Desktop still shows the in-app menu.');
    if(!document.getElementById('targetMeasurementPanel').contains(document.getElementById('uiLivePill')))throw Error('Audio control is outside Measurement.');
    if(document.querySelectorAll('.tlsPatchActions button').length!==2)throw Error('Generator must have exactly two buttons.');
    for(const view of ['tf','rta','mr','spec','tf']){
      v54SetAnalysisView(view);setMode(view==='spec'?'spec':'rta');
      const active=[...document.querySelectorAll('#v53AnalysisGroup button.on')];
      if(active.length!==1||active[0].id!==({tf:'v54TfGraphToggle',rta:'v53AnalysisToggle',mr:'v54MrToggle',spec:'v54WaterfallToggle'})[view])throw Error('Mode selectors are not exclusive: '+view);
    }
  `);

  await evaluate(`
    await start('coreaudio:field-test');
    if(!running||chReceived!==6)throw Error('Synthetic six-channel input did not start.');
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
  const motion=await evaluate(`
    const results=[];
    for(const side of ['left','right']){
      const rail=document.getElementById(side==='left'?'targetLeftStatus':'uiRightTools');
      const width=cv.width;setWorkspaceRail(side,false);
      await new Promise(r=>setTimeout(r,110));
      const clip=getComputedStyle(rail).clipPath;
      if(!workspaceRailAnimating||cv.width!==width||clip==='none'||clip.includes('100%'))throw Error('Sidebar does not reveal progressively: '+side+' '+clip+' transition='+getComputedStyle(rail).transition+' reduced='+matchMedia('(prefers-reduced-motion:reduce)').matches);
      results.push({side,clip,canvasStayedStable:cv.width===width});
      await new Promise(r=>setTimeout(r,250));
      if(workspaceRailAnimating||cv.width===width)throw Error('Canvas did not settle after collapse.');
      setWorkspaceRail(side,true);await new Promise(r=>setTimeout(r,80));
      const opening=getComputedStyle(rail).clipPath;
      const clips=opening.slice(opening.indexOf('(')+1,opening.indexOf(' round')).split(' ');
      const amount=parseFloat(clips[side==='left'?1:3]);
      if(amount<=0||amount>=100||rail.inert)throw Error('Opening jumps instead of revealing: '+side+' '+opening);
      const panelRect=rail.getBoundingClientRect(),stageRect=document.getElementById('stage').getBoundingClientRect();
      const edge=side==='left'?panelRect.right-amount/100*panelRect.width:panelRect.left+amount/100*panelRect.width;
      if(side==='left'?stageRect.left<edge-2:stageRect.right>edge+2)throw Error('Panel overlaps graph during reveal.');
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
  await capture('01-rta-traces.jpg','RTA','Live spectrum and two named, colored captured traces.');
  await evaluate(`v54SetAnalysisView('mr');`);
  await capture('02-input-comparison.jpg','M/R','Selected microphone and reference spectra.');
  await evaluate(`v54SetAnalysisView('spec');`);
  await wait(10500);
  await capture('03-waterfall.jpg','Waterfall','Frequency history from the live synthetic input.');
  await evaluate(`
    v5OpenTf();
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
  await evaluate(`closeModals();v54SetAnalysisView('rta');`);
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
  await evaluate(`document.getElementById('audioPreferencesClose').click();await stop();`);
  const manifest={release:release.version,date:'2026-10-10',status:'Drafts. Recapture from the accepted signed MAS release before submission.',scope:'Real application renderer; synthetic PCM from the test helper; no physical microphone or playback.',tf,shots};
  fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  return {output,count:shots.length,tf};
};
