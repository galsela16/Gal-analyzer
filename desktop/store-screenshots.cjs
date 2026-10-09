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
  await evaluate(`
    await start('coreaudio:field-test');
    if(!running||chReceived!==6)throw Error('Synthetic six-channel input did not start.');
    setFft(16384);v54SetAnalysisView('rta');
    const label=document.createElement('span');label.textContent='DEMO · Synthetic audio';
    label.style.cssText='position:fixed;top:19px;left:460px;z-index:9999;display:block;color:#9bcbd4;background:#0c2028;border:1px solid #294954;border-radius:4px;padding:4px 9px;font:11px Arial;white-space:nowrap;pointer-events:none';
    label.id='storeDemoLabel';document.body.appendChild(label);
    targetVisible=false;
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
  await evaluate(`await stop();`);
  const manifest={release:release.version,date:'2026-10-09',status:'Drafts. Recapture from the accepted signed MAS release before submission.',scope:'Real application renderer; synthetic PCM from the test helper; no physical microphone or playback.',tf,shots};
  fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  return {output,count:shots.length,tf};
};
