// Isolated, silent synthetic input. Times start at an input gain step after native delivery.
module.exports=async({window})=>window.webContents.executeJavaScript(`(async()=>{
  const wait=ms=>new Promise(r=>setTimeout(r,ms));await wait(600);
  await start('coreaudio:channels-2');setFft(16384);v54SetAnalysisView('rta');
  avgOn=false;setAnalysisSpeed('normal',false);
  const results=[];
  for(let run=0;run<3;run++){
    source.gain.value=1;await wait(1800);
    let band=0;for(let i=1;i<BANDS;i++)if(lastBandDb[i]>lastBandDb[band])band=i;
    const baselineMeter=smoothedDbfs,baselineGraph=rtaVisualDb[band];
    if(Math.abs(baselineMeter-(-15.0103))>.6)throw Error('Steady RMS level changed: '+baselineMeter);
    if(analyser.fftSize!==16384||analyserMeter.fftSize!==2048)throw Error('Measurement windows were shortened.');
    source.gain.value=0;await wait(1600);
    const startAt=performance.now();source.gain.value=1;
    let meterMs=null,graphMs=null,leftMs=null;
    while(performance.now()-startAt<2000){
      const elapsed=performance.now()-startAt;
      if(meterMs===null&&smoothedDbfs>=baselineMeter-3)meterMs=elapsed;
      const text=Number.parseFloat(document.getElementById('tlsMic').textContent);
      if(leftMs===null&&Number.isFinite(text)&&text>=baselineMeter-3)leftMs=elapsed;
      if(graphMs===null&&rtaVisualDb[band]>=baselineGraph-3)graphMs=elapsed;
      if(meterMs!==null&&graphMs!==null&&leftMs!==null)break;
      await wait(8);
    }
    if(meterMs===null||meterMs>150||graphMs===null||graphMs>350||leftMs===null||leftMs>200)throw Error('Signal response regression: '+JSON.stringify({meterMs,graphMs,leftMs}));
    results.push({meterMs,graphMs,leftMs,fft:fftSize,smoothing:Number(document.getElementById('smooth').value)});
  }
  rt60State='armed';analyser.smoothingTimeConstant=.7;abortRT60(false);
  if(analyser.smoothingTimeConstant!==0)throw Error('RT60 cancellation restored double smoothing.');
  await stop();return {timingOrigin:'Gain step after native delivery; excludes interface and native input buffer',results};
})()`);
