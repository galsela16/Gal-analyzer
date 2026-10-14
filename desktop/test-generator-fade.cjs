module.exports=async({window})=>window.webContents.executeJavaScript(`(async()=>{
 const previous={ctx:audioCtx,running,type:genType,hz:genHz,db:genDb};
 const offline=new OfflineAudioContext(1,Math.ceil(48000*1.25),48000);
 const wrapper={state:'running',destination:offline.destination,sampleRate:offline.sampleRate,get currentTime(){return offline.currentTime},createGain:offline.createGain.bind(offline),createOscillator:offline.createOscillator.bind(offline),createBuffer:offline.createBuffer.bind(offline),createBufferSource:offline.createBufferSource.bind(offline)};
 let ratios;
 try{
  audioCtx=wrapper;running=true;genType='sine';genHz=1000;genDb=-20;genStart({autoSync:false,preserveTfSync:true});running=false;
  const result=await offline.startRendering(),data=result.getChannelData(0);
  const rms=(a,b)=>{let sum=0;const first=Math.floor(a*48000),last=Math.floor(b*48000);for(let i=first;i<last;i++)sum+=data[i]*data[i];return Math.sqrt(sum/(last-first))};
  const full=rms(1.1,1.2);ratios={early:rms(.01,.03)/full,half:rms(.49,.51)/full,settled:rms(1.01,1.1)/full};
  if(full<.069||full>.072||ratios.early>.04||Math.abs(ratios.half-.5)>.03||Math.abs(ratios.settled-1)>.01)throw Error('Generator fade is not one second: '+JSON.stringify(ratios));
 }finally{genStop();audioCtx=previous.ctx;running=previous.running;genType=previous.type;genHz=previous.hz;genDb=previous.db;syncInlineGenBtns();}
 const originalStart=genStart,originalSet=window.setTimeout,originalClear=window.clearTimeout;
 const delays=[],options=[];try{
  genStart=o=>options.push(o);window.setTimeout=(fn,delay)=>{delays.push(delay);return 123};window.clearTimeout=()=>{};
  runWithSource('pink',()=>{},3000);if(delays[0]!==1100||delays[1]!==4400)throw Error('Noise capture includes fade or stops early');
  delays.length=0;runWithSource('sweep',()=>{},3000);if(delays[0]!==1100||options.at(-1).sweepDelayMs<1600||delays[1]<genSweepDur*1000+1650)throw Error('Sweep pre-roll/capture timing invalid');
 }finally{managedSourceStartTimer=null;managedSourceRestoreTimer=null;genStart=originalStart;window.setTimeout=originalSet;window.clearTimeout=originalClear;genType=previous.type;genSweepSingleShot=false;setGenTypeUI(genType);}
 return {fadeSeconds:1,ratios,noiseCaptureDelayMs:1100,sweepStartDelayMs:1650,offlineNoPlayback:true};
})()`);
