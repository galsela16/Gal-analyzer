module.exports=async({window})=>window.webContents.executeJavaScript(`(()=>{
 const saved={ctx:audioCtx,running,analyser,ref:analyserRef,ready:tfDelayReady,delay:tfDelaySamples,sub:phaseSub,top:phaseTop,source:subTopSourceKind,xover:xoverF,frame:computeComplexTf.frame,interval:window.setInterval,clear:window.clearInterval,capture:runDelayCapture};
 let tick,callback;const n=TF_FFT_N/2;
 const snapshot=c=>({sr:48000,fftN:TF_FFT_N,ph:new Float32Array(n),mag:new Float32Array(n),coh:new Float32Array(n).fill(c),refPower:new Float32Array(n).fill(10),micPower:new Float32Array(n).fill(10)});
 try{
  running=true;audioCtx={sampleRate:48000};analyser={};analyserRef={};tfDelayReady=true;tfDelaySamples=0;xoverF=90;phaseSub=null;phaseTop=null;subTopSourceKind=null;
  window.setInterval=fn=>{tick=fn;return 123};window.clearInterval=()=>{};
  let coherence=.18;runDelayCapture=(button,fn,options)=>{if(!options.phaseSnapshot||options.delaySamples!==tfDelaySamples)throw Error('Missing PCM alignment options');callback=fn};
  const complete=()=>{const snap=snapshot(coherence);snap.frames=60;callback(snap)};
  coherence=.18;capturePhase('sub','crossover-sweep');complete();
  if(phaseSub||!document.getElementById('phTopBtn').disabled||document.getElementById('phSubBtn').classList.contains('on')||!document.getElementById('phStatus').textContent.includes('not saved'))throw Error('Low coherence accepted');
  coherence=.95;capturePhase('sub','crossover-sweep');complete();if(!phaseSub||document.getElementById('phTopBtn').disabled||!document.getElementById('phSubBtn').textContent.includes('ready'))throw Error('Good Sub rejected');
  capturePhase('top','crossover-sweep');complete();if(!phaseTop)throw Error('Good Top rejected');
  capturePhase('sub','crossover-sweep');if(phaseTop)throw Error('Old Top retained during recapture');complete();
  const empty=snapshot(.99);empty.frames=60;empty.refPower.fill(0);if(subTopCaptureQuality(empty,90,.4).ok)throw Error('Silent reference accepted');
  const sparse=snapshot(.99);sparse.frames=1;if(subTopCaptureQuality(sparse,90,.4).ok)throw Error('One frame accepted');
  coherence=.95;capturePhase('sub','crossover-sweep');tfDelaySamples=100;complete();if(phaseSub)throw Error('Changed sync accepted');tfDelaySamples=0;
  capturePhase('sub','crossover-sweep');cancelTimedMeasurements();if(phMeasuring||phMeasureTimer||document.getElementById('xoverF').disabled)throw Error('Cancelled capture left active timer');
  return {lowCoherenceRejected:true,validSubAndTopAccepted:true,oldTopInvalidated:true,silentReferenceRejected:true,singleFrameRejected:true,changedSyncRejected:true,cancellation:true};
 }finally{
  clearSubTopSnapshots();audioCtx=saved.ctx;running=saved.running;analyser=saved.analyser;analyserRef=saved.ref;tfDelayReady=saved.ready;tfDelaySamples=saved.delay;phaseSub=saved.sub;phaseTop=saved.top;subTopSourceKind=saved.source;xoverF=saved.xover;computeComplexTf.frame=saved.frame;window.setInterval=saved.interval;window.clearInterval=saved.clear;runDelayCapture=saved.capture;syncSubTopWorkflowUi();
 }
})()`);
