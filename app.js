function safeOn(id,ev,fn,opt){var el=document.getElementById(id); if(el){el.addEventListener(ev,fn,opt);} return el;}
const FMIN=20, FMAX=20000;
let viewMin=20, viewMax=20000;
let curBpo=6;
let ISO=[], BANDS=0, R=1;
let peaks=[];
let avgBuf=[], snapCurve=null, lastV=[], lastBandDb=[], frozen=false;
let refCurve=null;
let abA=null, abB=null, abView='off';
let sunMode=false;

// ---- TF Advanced Engine Variables ----
let tfDelayMs = 0;
let tfDelaySamples = 0;
let showTfPhase = false;
let showTfCoh = true;
let tfSmoothA = 0.93;   // מיצוע TF: גבוה=יציב/איטי, נמוך=מהיר/רועד
let tfCohGate = 0.4;    // סף קוהרנטיות שמתחתיו לא מציגים פאזה
let phaseSub=null, phaseTop=null;  // צילומי פאזה: {ph:Float32Array, coh:Float32Array}
let xoverF=90, showXover=false;    // סמן תדר חיתוך

const TF_FFT_N = 2048;
const tfXr = new Float32Array(TF_FFT_N);
const tfXi = new Float32Array(TF_FFT_N);
const tfYr = new Float32Array(TF_FFT_N);
const tfYi = new Float32Array(TF_FFT_N);
const tfPxx = new Float32Array(TF_FFT_N / 2);
const tfPyy = new Float32Array(TF_FFT_N / 2);
const tfPxyRe = new Float32Array(TF_FFT_N / 2);
const tfPxyIm = new Float32Array(TF_FFT_N / 2);
const tfWin = new Float32Array(TF_FFT_N);
for(let i=0; i<TF_FFT_N; i++) tfWin[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (TF_FFT_N - 1)));

function buildBands(bpo){
  curBpo=bpo;
  ISO=[];
  const n=Math.max(2,Math.round(Math.log2(viewMax/viewMin)*bpo));
  for(let k=0;k<=n;k++) ISO.push(viewMin*Math.pow(2,k/bpo));
  BANDS=ISO.length;
  R=Math.pow(2,1/(2*bpo));
  peaks=new Array(BANDS).fill(0);
  avgBuf=new Array(BANDS).fill(0);
  lastV=new Array(BANDS).fill(0);
  lastBandDb=new Array(BANDS).fill(-120);
  snapCurve=null; frozen=false;
  refCurve=null;
  { const rb=document.getElementById("refCurveBtn"); if(rb){ rb.classList.remove("on"); rb.textContent="שמור כ״לפני״"; } }
  const clr=document.getElementById('freezeBtn'); if(clr){clr.classList.remove('on');clr.textContent='הקפא';}
}
buildBands(6);

function escapeHtml(s){ return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
const dot = document.getElementById('dot');
const idle = document.getElementById('idle');
const errBox = document.getElementById('err');
const peakHzEl = document.getElementById('peakHz');
const fbPanel = document.getElementById('fbPanel');
const meterEl = document.getElementById('meter');
const meterFill = document.getElementById('meterFill');
const meterPeak = document.getElementById('meterPeak');
const meterVal = document.getElementById('meterVal');

let audioCtx, analyser, analyserMeter, source, stream, raf;
let analyserRef=null, floatDataRef=null, chReceived=1;
let workletReady=false;
let floatData;
let timeData, timeDataMeter;
const GEQ=[20,25,31.5,40,50,63,80,100,125,160,200,250,315,400,500,630,800,1000,
           1250,1600,2000,2500,3150,4000,5000,6300,8000,10000,12500,16000,20000];
let tfState='idle', tfSwap=false, tfMic=null, tfRef=null, tfFrames=0, tfResult=null, _tfCorr=0;
let running=false, mode='rta';
let peakHold=true, fbOn=true, avgOn=false;
let floorDb=-85, ceilDb=-15;
let calib=0;
let fbProm=14;
let lvlPeak=-120, lvlPeakT=0;
let weightMode='Z';
let meterUnit='SPL';
let meterMode='rms';
let activeInId='';
let weightA=null, weightC=null;
let leqSumP=0, leqN=0, splMax=-120;
let dragging=false, dragX0=0, dragX1=0, cursorX=null;
let genType='pink', genOn=false, genGain=null, genSrc=null, genOsc=null;
let genDb=-34, genHz=1000, targetMode='flat';
let fftSize=16384;
let _pfx=null;

const _D2L_LO=-140, _D2L_STEP=0.05, _D2L_N=Math.round((0-_D2L_LO)/_D2L_STEP)+1;
const _d2l=new Float64Array(_D2L_N);
for(let i=0;i<_D2L_N;i++) _d2l[i]=Math.pow(10,(_D2L_LO+i*_D2L_STEP)*0.1);
function db2lin(db){
  if(db<=_D2L_LO) return 0;
  if(db>=0) return Math.pow(10,db*0.1);
  return _d2l[(db-_D2L_LO)*(1/_D2L_STEP)|0];
}
let _pfxRef=null;
let tfOverlay=false;
let genSweepDur=4, sweepTimer=null, sweepStartT=0;
let rt60State='idle', rt60Samples=[], rt60CutT=0, rtRange=10, rt60Timer=null, rtLevel=-6;
let eqMarks=null;
let eqCurveData=null;
let eqMode='graphic', lastEqCorr=null;
let cutOnly=false;
let tfMode='graphic';
const AREA_COLORS=['#2f9bff','#ffa53b','#ff5cc8','#50e68c'];
const AREA_NAMES=['צפון','דרום','מזרח','מערב'];
let areas=[];
let areaState='idle', areaAccum=null, areaFrames=0;
let measState='idle', measAccum=null, measFrames=0;
let eqPositions=[];
let micCalList=[], activeCalId=null, micCal=null;
const CAL_KEY='rta_miccals';
let specCanvas, specCtx;

let fbTrack=new Map();
let fbFrameCounter = 0;
let smoothedDbfs = -120;

function resize(){
  const r=cv.getBoundingClientRect();
  const MAXW=1440, MAXH=760;
  const dpr=Math.max(1, Math.min(window.devicePixelRatio||1, 2, MAXW/Math.max(1,r.width), MAXH/Math.max(1,r.height)));
  cv.width=Math.round(r.width*dpr); cv.height=Math.round(r.height*dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);
  
  const oldSpec=specCanvas;
  const nc=document.createElement('canvas');
  nc.width=Math.max(2,Math.floor(Math.min(r.width,MAXW)));
  nc.height=Math.max(2,Math.floor(Math.min(r.height,MAXH)));
  const nctx=nc.getContext('2d');
  nctx.fillStyle=sunMode ? '#f8fafc' : '#0d1117'; 
  nctx.fillRect(0,0,nc.width,nc.height);
  if(oldSpec){ try{ nctx.drawImage(oldSpec,0,0,nc.width,nc.height); }catch(_){} }
  specCanvas=nc; specCtx=nctx;
}
window.addEventListener('resize',resize);

safeOn('sunBtn', 'click', function(){
  sunMode = !sunMode;
  document.body.classList.toggle('sun-mode', sunMode);
  this.classList.toggle('on', sunMode);
  prefSet('rta_sunmode', sunMode ? '1' : '0');
  if(specCtx){
    specCtx.fillStyle = sunMode ? '#f8fafc' : '#0d1117';
    specCtx.fillRect(0,0,specCanvas.width,specCanvas.height);
  }
});

safeOn('floor', 'input',e=>{
  floorDb=parseFloat(e.target.value);
  document.getElementById('floorVal').textContent=floorDb+'dB';
  prefSet('rta_floor', e.target.value);
});
safeOn('smooth', 'input',e=>{
  const v=parseFloat(e.target.value);
  document.getElementById('smoothVal').textContent=v.toFixed(2);
  if(analyser) analyser.smoothingTimeConstant=v;
  prefSet('rta_smooth', e.target.value);
});
safeOn('cal', 'input',e=>{
  calib=parseFloat(e.target.value);
  document.getElementById('calVal').textContent=(calib>=0?'+':'')+calib+'dB';
  prefSet('rta_cal', e.target.value);
});

safeOn('autoCalBtn', 'click', autoCal1kHz);

function autoCal1kHz(){
  if(!running || !analyser){ alert('קודם הפעל את המיקרופון.'); return; }
  const choice = prompt('בחר עוצמת כיול פיסטונפון (SPL):\n1 = 94 dB\n2 = 114 dB', '1');
  if(!choice) return;
  const targetSpl = choice === '2' ? 114 : 94;

  alert('חבר את המכייל למים/מיקרופון והפעל אותו על 1kHz.\nלחץ אישור כשהאות יציב.');

  analyser.getFloatFrequencyData(floatData);
  const nyq = audioCtx.sampleRate / 2, bins = floatData.length;
  const iLo = Math.floor(950 / nyq * bins), iHi = Math.ceil(1050 / nyq * bins);
  
  let peakVal = -999;
  for(let i=iLo; i<=iHi; i++){ if(floatData[i] > peakVal) peakVal = floatData[i]; }

  if(peakVal < -60){
    alert('לא זוהה אות 1kHz מספיק חזק (נקלט: '+peakVal.toFixed(1)+' dBFS).\nודא שהמכייל פועל ומחובר היטב.');
    return;
  }

  calib = Math.round(targetSpl - peakVal);
  const slider = document.getElementById('cal');
  slider.value = calib;
  document.getElementById('calVal').textContent = (calib>=0?'+':'')+calib+'dB';
  prefSet('rta_cal', calib);

  alert('✓ הכיול הושלם בהצלחה!\nנקלט אות ב: '+peakVal.toFixed(1)+' dBFS\nכיול SPL עודכן ל: +'+calib+' dB');
}

// ---- TF Controls: Auto-Delay, Phase, Coherence (floating bar only) ----

// Event Listeners for TF Quick Floating Bar
safeOn('qbAutoDelay', 'click', tfAutoDelay);
safeOn('qbCoh', 'click', function(){
  showTfCoh = !showTfCoh;
  this.classList.toggle('on', showTfCoh);
  const mainBtn = document.getElementById('tfCohToggleBtn');
  if(mainBtn) mainBtn.classList.toggle('on', showTfCoh);
});
safeOn('qbPhase', 'click', function(){
  showTfPhase = !showTfPhase;
  this.classList.toggle('on', showTfPhase);
  const mainBtn = document.getElementById('tfPhaseToggleBtn');
  if(mainBtn) mainBtn.classList.toggle('on', showTfPhase);
});

function tfAutoDelay(){
  if(!running || !analyserRef){ alert('הפעל כרטיס קול סטריאו (מיקרופון + רפרנס).'); return; }
  
  const m = tfSwap ? timeDataRef : timeData;
  const r = tfSwap ? timeData : timeDataRef;
  const sr = audioCtx.sampleRate;
  
  const res = computeDelay(r, m, sr);
  if(!res || res.ms < 0){
    alert('לא זוהה דיליי ברור. ודא ששני הערוצים מקבלים אות יציב.');
    return;
  }
  
  tfDelayMs = res.ms;
  tfDelaySamples = res.samples;
  const dist = (tfDelayMs / 1000) * 343;
  document.getElementById('tfDelayInfo').textContent = `סנכרון דיליי TF: ${tfDelayMs.toFixed(2)} ms (~${dist.toFixed(2)}m)`;
}

safeOn('fbSens', 'input',e=>{
  fbProm = 26 - parseFloat(e.target.value);
  document.getElementById('fbSensVal').textContent = fbProm>=15?'נמוכה':fbProm>=10?'בינונית':'גבוהה';
  prefSet('rta_fbSens', e.target.value);
});
safeOn('peakBtn', 'click',function(){
  peakHold=!peakHold; this.classList.toggle('on',peakHold); peaks.fill(0);
});
safeOn('fbBtn', 'click',function(){
  fbOn=!fbOn; this.classList.toggle('on',fbOn); fbTrack.clear(); fbPanel.innerHTML='';
});
safeOn('avgBtn', 'click',function(){
  avgOn=!avgOn; this.classList.toggle('on',avgOn); if(avgOn) avgBuf.fill(0);
});
safeOn('freezeBtn', 'click',function(){
  frozen=!frozen;
  if(frozen){ snapCurve=lastV.slice(); this.classList.add('on'); this.textContent='הפשר תצוגה'; }
  else { snapCurve=null; this.classList.remove('on'); this.textContent='הקפא'; }
});
safeOn('pngBtn', 'click',exportPNG);
safeOn('csvBtn', 'click',exportCSV);

function stamp(){ const d=new Date(); const p=n=>(''+n).padStart(2,'0');
  return d.getFullYear()+p(d.getMonth()+1)+p(d.getDate())+'_'+p(d.getHours())+p(d.getMinutes())+p(d.getSeconds()); }
function download(name, blobUrl){
  const a=document.createElement('a'); a.href=blobUrl; a.download=name;
  document.body.appendChild(a); a.click(); a.remove();
}
function exportPNG(){
  const W=cv.clientWidth,H=cv.clientHeight,dpr=Math.min(window.devicePixelRatio||1,2);
  const off=document.createElement('canvas'); off.width=W*dpr; off.height=H*dpr;
  const o=off.getContext('2d'); o.scale(dpr,dpr);
  o.fillStyle=sunMode ? '#f8fafc' : '#0d1117'; 
  o.fillRect(0,0,W,H);
  o.drawImage(cv,0,0,W,H);
  download('rta_'+stamp()+'.png', off.toDataURL('image/png'));
}
function exportCSV(){
  let rows='freq_hz,level_db\n';
  for(let b=0;b<BANDS;b++) rows+=Math.round(ISO[b])+','+lastBandDb[b].toFixed(1)+'\n';
  download('rta_'+stamp()+'.csv', URL.createObjectURL(new Blob([rows],{type:'text/csv'})));
}

safeOn('exportJsonBtn', 'click', exportSessionJson);
safeOn('importJsonBtn', 'click', ()=> document.getElementById('jsonFileInput').click());
safeOn('jsonFileInput', 'change', importSessionJson);

function exportSessionJson(){
  const data = {
    version: 'v179',
    timestamp: new Date().toISOString(),
    saves: saves,
    eqPositions: eqPositions.map(p=>({name:p.name, db:Array.from(p.db)})),
    areas: areas.map(a=>({name:a.name, color:a.color, db:Array.from(a.db), show:a.show})),
    dlySpeakers: dlySpeakers,
    dlyAnchor: dlyAnchor,
    micCalList: micCalList,
    activeCalId: activeCalId,
    settings: {
      calib, floorDb, curBpo, fftSize, targetMode, weightMode, sunMode, tfDelayMs
    }
  };
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], {type: 'application/json'});
  download('gal_session_'+stamp()+'.json', URL.createObjectURL(blob));
}

function importSessionJson(e){
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = function(evt){
    try {
      const data = JSON.parse(evt.target.result);
      if(!data || typeof data !== 'object'){ throw new Error('קובץ לא תקין'); }
      
      if(data.saves) saves = data.saves;
      if(data.eqPositions) eqPositions = data.eqPositions.map(p=>({name:p.name, db:Float32Array.from(p.db)}));
      if(data.areas) areas = data.areas.map(a=>({name:a.name, color:a.color, db:Float32Array.from(a.db), show:a.show!==false}));
      if(data.dlySpeakers) dlySpeakers = data.dlySpeakers;
      if(data.dlyAnchor!==undefined) dlyAnchor = data.dlyAnchor;
      if(data.micCalList) micCalList = data.micCalList;
      if(data.activeCalId!==undefined) activeCalId = data.activeCalId;
      
      if(data.settings){
        const s = data.settings;
        if(s.calib!==undefined){ calib = s.calib; document.getElementById('cal').value = calib; document.getElementById('calVal').textContent=(calib>=0?'+':'')+calib+'dB'; }
        if(s.floorDb!==undefined){ floorDb = s.floorDb; document.getElementById('floor').value = floorDb; document.getElementById('floorVal').textContent=floorDb+'dB'; }
        if(s.targetMode) setTarget(s.targetMode);
        if(s.sunMode!==undefined){ sunMode = s.sunMode; document.body.classList.toggle('sun-mode', sunMode); document.getElementById('sunBtn').classList.toggle('on', sunMode); }
        if(s.tfDelayMs!==undefined){ tfDelayMs = s.tfDelayMs; document.getElementById('tfDelayInfo').textContent = `סנכרון דיליי TF: ${tfDelayMs.toFixed(2)} ms`; }
      }

      persistSaves();
      saveCalStore();
      deriveActiveCal();
      renderSaveList();
      renderEqList();
      renderAreaList();
      renderDlySpk();
      if(eqPositions.length) computeAndShow();
      alert('✓ הסשן נטען בהצלחה!');
    } catch(err) {
      alert('שגיאה שטעינת הקובץ: ' + err.message);
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}
safeOn('wgtBtn', 'click',function(){
  weightMode = weightMode==='Z'?'A':weightMode==='A'?'C':'Z';
  this.textContent='dB'+weightMode;
  this.classList.toggle('on', weightMode!=='Z');
  document.getElementById('wLbl').textContent=weightMode;
  leqSumP=0; leqN=0; splMax=-120;
  prefSet('rta_wgt', weightMode);
});
safeOn('leqBtn', 'click',()=>{ leqSumP=0; leqN=0; splMax=-120; });
document.querySelectorAll('#unitSeg button').forEach(b=>b.addEventListener('click',function(){
  document.querySelectorAll('#unitSeg button').forEach(x=>x.classList.remove('on'));
  this.classList.add('on'); meterUnit=this.dataset.u;
}));
safeOn('inSel', 'change',e=>{ userPickedIn = e.target.value!==''; switchInput(e.target.value); });

function freqForX(px){
  const W=cv.clientWidth;
  const lmin=Math.log(ISO[0]), lmax=Math.log(ISO[BANDS-1]);
  return Math.exp(lmin + Math.max(0,Math.min(1,px/W))*(lmax-lmin));
}
function applyZoom(xa,xb){
  let fa=freqForX(Math.min(xa,xb)), fb=freqForX(Math.max(xa,xb));
  if(fb/fa < 1.2) return;
  viewMin=Math.max(FMIN,fa); viewMax=Math.min(FMAX,fb);
  buildBands(curBpo);
  document.getElementById('zoomBtn').style.display='block';
}
function resetZoom(){
  viewMin=FMIN; viewMax=FMAX; buildBands(curBpo);
  document.getElementById('zoomBtn').style.display='none';
}
cv.addEventListener('pointerdown',e=>{
  if(!running||mode!=='rta') return;
  dragging=true; dragX0=dragX1=e.offsetX;
  try{cv.setPointerCapture(e.pointerId);}catch(_){}
});
cv.addEventListener('pointermove',e=>{ cursorX=e.offsetX; if(dragging) dragX1=e.offsetX; });
cv.addEventListener('pointerleave',()=>{ cursorX=null; });
cv.addEventListener('pointerup',e=>{
  if(!dragging) return; dragging=false;
  if(Math.abs(dragX1-dragX0)>20) applyZoom(dragX0,dragX1);
});
cv.addEventListener('pointercancel',()=>{dragging=false;});
cv.addEventListener('dblclick',()=>{ if(running) resetZoom(); });
safeOn('zoomBtn', 'click',resetZoom);

function makeNoiseBuffer(type){
  const len=Math.floor(audioCtx.sampleRate*2);
  const buf=audioCtx.createBuffer(1,len,audioCtx.sampleRate);
  const d=buf.getChannelData(0);
  if(type==='white'){
    for(let i=0;i<len;i++) d[i]=Math.random()*2-1;
  } else {
    let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
    for(let i=0;i<len;i++){
      const w=Math.random()*2-1;
      b0=0.99886*b0+w*0.0555179; b1=0.99332*b1+w*0.0750759;
      b2=0.96900*b2+w*0.1538520; b3=0.86650*b3+w*0.3104856;
      b4=0.55000*b4+w*0.5329522; b5=-0.7616*b5-w*0.0168980;
      d[i]=(b0+b1+b2+b3+b4+b5+b6+w*0.5362)*0.11; b6=w*0.115926;
    }
  }
  return buf;
}
function genStop(){
  if(genGain){ try{genGain.gain.cancelScheduledValues(audioCtx.currentTime);
    genGain.gain.setTargetAtTime(0,audioCtx.currentTime,0.05);}catch(_){} }
  if(sweepTimer){ clearTimeout(sweepTimer); sweepTimer=null; }
  const g=genGain, s=genSrc, o=genOsc;
  setTimeout(()=>{
    try{ if(s) s.stop(); }catch(_){}
    try{ if(o) o.stop(); }catch(_){}
    try{ if(g) g.disconnect(); }catch(_){}
  },250);
  genSrc=null; genOsc=null; genGain=null; genOn=false;
  const btn=document.getElementById('genOnBtn'); if(btn){btn.classList.remove('on'); btn.textContent='▶ הפעל אות';}
  syncInlineGenBtns();
}
function scheduleSweepCycle(){
  if(!genOn || genType!=='sweep' || !genOsc) return;
  const t=audioCtx.currentTime;
  sweepStartT=t;
  try{
    genOsc.frequency.cancelScheduledValues(t);
    genOsc.frequency.setValueAtTime(20, t);
    genOsc.frequency.exponentialRampToValueAtTime(20000, t+genSweepDur);
  }catch(_){}
  sweepTimer=setTimeout(scheduleSweepCycle, genSweepDur*1000);
}
function genStart(){
  if(!running||!audioCtx){ alert('קודם הפעל את המיקרופון (כדי שהאודיו יהיה פעיל).'); return; }
  if(audioCtx.state==='suspended') audioCtx.resume();
  genStop();
  genGain=audioCtx.createGain(); genGain.gain.value=0;
  if(genType==='sine' || genType==='sweep'){
    genOsc=audioCtx.createOscillator(); genOsc.type='sine';
    genOsc.frequency.value = genType==='sine'? genHz : 20;
    genOsc.connect(genGain); genOsc.start();
  } else {
    genSrc=audioCtx.createBufferSource(); genSrc.buffer=makeNoiseBuffer(genType);
    genSrc.loop=true; genSrc.connect(genGain); genSrc.start();
  }
  genGain.connect(audioCtx.destination);
  const target=Math.pow(10,genDb/20);
  genGain.gain.setTargetAtTime(target,audioCtx.currentTime,0.15);
  genOn=true;
  if(genType==='sweep') scheduleSweepCycle();
  syncInlineGenBtns();
  const btn=document.getElementById('genOnBtn'); if(btn){btn.classList.add('on'); btn.textContent='⏹ עצור אות';}
}

function syncInlineGenBtns(){
  ['eqGenToggleBtn', 'areaGenToggleBtn'].forEach(id=>{
    const b = document.getElementById(id);
    if(b){
      b.classList.toggle('on', genOn && genType==='pink');
      b.textContent = (genOn && genType==='pink') ? '⏹ עצור רעש' : '▶ רעש ורוד';
    }
  });
  const pb=document.getElementById('phPinkBtn');
  if(pb){
    pb.classList.toggle('on', genOn && genType==='pink');
    pb.textContent = (genOn && genType==='pink') ? '⏹ עצור פינק נויז' : '▶ פינק נויז מהאפליקציה';
  }
}

function genApplyLevel(){
  if(genGain){ genGain.gain.setTargetAtTime(Math.pow(10,genDb/20),audioCtx.currentTime,0.1); }
}

const genPanel=document.getElementById('genPanel');
safeOn('genBtn', 'click',function(){
  const open=genPanel.classList.toggle('open');
  this.classList.toggle('on',open);
});

document.querySelectorAll('#genType button').forEach(b=>b.addEventListener('click',function(){
  document.querySelectorAll('#genType button').forEach(x=>x.classList.remove('on'));
  this.classList.add('on'); genType=this.dataset.t;
  document.getElementById('genFreqWrap').style.display = genType==='sine'?'flex':'none';
  document.getElementById('genSweepWrap').style.display = genType==='sweep'?'flex':'none';
  if(genOn) genStart();
}));
safeOn('genSweep', 'input',e=>{
  genSweepDur=parseFloat(e.target.value);
  document.getElementById('genSweepVal').textContent=genSweepDur.toFixed(1)+'ש\'';
});
safeOn('genLvl', 'input',e=>{
  genDb=parseFloat(e.target.value);
  const el=document.getElementById('genLvlVal'); el.textContent=genDb+'dB';
  el.style.color = genDb>=-16 ? 'var(--hot)' : (genDb>=-24?'var(--warn)':'var(--accent)');
  genApplyLevel();
});
function applyGenHz(hz, from){
  hz=Math.max(20,Math.min(20000, hz||0));
  genHz=hz;
  const slider=document.getElementById('genFreq'), num=document.getElementById('genFreqNum');
  if(from!=='slider') slider.value=Math.min(20000,hz);
  if(from!=='num') num.value=Math.round(hz);
  document.getElementById('genFreqVal').textContent=(genHz>=1000?(genHz/1000).toFixed(genHz%1000?2:1)+'k':genHz)+'Hz';
  if(genOsc) genOsc.frequency.setTargetAtTime(genHz,audioCtx.currentTime,0.02);
}
safeOn('genFreq', 'input',e=>applyGenHz(parseFloat(e.target.value),'slider'));
safeOn('genFreqNum', 'input',e=>applyGenHz(parseFloat(e.target.value),'num'));
safeOn('genOnBtn', 'click',()=>{ genOn?genStop():genStart(); });

['eqGenToggleBtn', 'areaGenToggleBtn'].forEach(id=>{
  const el = document.getElementById(id);
  if(el){
    el.addEventListener('click', function(){
      if(genOn && genType === 'pink'){
        genStop();
      } else {
        genType = 'pink';
        setGenTypeUI('pink');
        genStart();
      }
    });
  }
});

function setTarget(mode){
  targetMode=mode;
  prefSet('rta_target', mode);
  document.querySelectorAll('.tgtSeg button').forEach(b=>b.classList.toggle('on', b.dataset.t===mode));
  if(eqPositions.length) computeAndShow(true);
  if(areas.length) suggestAreaEQ();
  if(typeof tfFrames!=='undefined' && tfFrames) tfCompute();
}
document.querySelectorAll('.tgtSeg button').forEach(b=>b.addEventListener('click',function(){ setTarget(this.dataset.t); }));
function setCutOnly(v){
  cutOnly=v;
  document.querySelectorAll('#cutOnlySeg button, #areaCutSeg button').forEach(b=>b.classList.toggle('on', (b.dataset.co==='1')===v));
  if(eqPositions.length) computeAndShow(true);
  if(areas.length) suggestAreaEQ();
  if(typeof tfFrames!=='undefined' && tfFrames) tfCompute();
}
document.querySelectorAll('#cutOnlySeg button, #areaCutSeg button').forEach(b=>b.addEventListener('click',function(){ setCutOnly(this.dataset.co==='1'); }));

document.querySelectorAll('.tab').forEach(t=>t.addEventListener('click',function(){
  document.querySelectorAll('.tab').forEach(x=>x.classList.remove('on'));
  this.classList.add('on');
  const p=this.dataset.p;
  document.querySelectorAll('.tabpage').forEach(pg=>pg.classList.toggle('active', pg.dataset.page===p));
}));

const eqPanel=document.getElementById('eqPanel');
const savePanel=document.getElementById('savePanel');
safeOn('eqClose', 'click',closeModals);
safeOn('eqBtn', 'click',()=>{ showModal(eqPanel); updateEqUI(); });
safeOn('tfBtn', 'click',()=>{ showModal(tfPanel); if(typeof tfResult!=='undefined' && tfResult) renderTFList(); });
safeOn('measBtn','click',function(){
  const r=document.getElementById('measRow'); if(!r) return;
  const show = r.style.display==='none';
  r.style.display = show?'flex':'none';
  this.classList.toggle('on',show);
});

document.querySelectorAll('.respModeSeg button').forEach(b=>b.addEventListener('click',function(){
  if(this.dataset.rm==='dual'){ showModal(tfPanel); if(typeof tfResult!=='undefined' && tfResult) renderTFList(); }
  else { showModal(eqPanel); updateEqUI(); }
}));
document.querySelectorAll('#eqModeSwitchA button').forEach(b=>b.addEventListener('click',function(){
  if(this.dataset.go==='area'){ openAreas(); }
}));

safeOn('eqMeasBtn', 'click',()=>pickSource(measurePosition,5000));
function setEqMode(m){
  eqMode=m;
  document.querySelectorAll('#eqModeSeg button, #areaModeSeg button').forEach(b=>b.classList.toggle('on', b.dataset.m===m));
  if(lastEqCorr) renderEqResult();
  if(areas.length) suggestAreaEQ();
}
document.querySelectorAll('#eqModeSeg button, #areaModeSeg button').forEach(b=>b.addEventListener('click',function(){ setEqMode(this.dataset.m); }));
document.querySelectorAll('#tfModeSeg button').forEach(b=>b.addEventListener('click',function(){
  document.querySelectorAll('#tfModeSeg button').forEach(x=>x.classList.remove('on'));
  this.classList.add('on'); tfMode=this.dataset.m; if(tfResult) renderTFList();
}));
safeOn('eqResetBtn', 'click',()=>{ eqPositions=[]; eqMarks=null;
  { const cr=document.getElementById('combResult'); if(cr){ cr.style.display='none'; cr.innerHTML=''; } } document.getElementById('eqList').innerHTML=''; document.getElementById('eqPosList').innerHTML=''; updateEqUI(); });
safeOn('combBtn', 'click',()=>runCombCheck('combResult'));

function updateEqUI(){
  const meas = measState==='measuring';
  document.getElementById('eqSub').textContent = meas ? 'מודד… החזק יציב' : ('מיקומים שנמדדו: '+eqPositions.length);
  document.getElementById('eqMeasBtn').textContent = meas ? 'מודד…' : (eqPositions.length?'מדוד מיקום נוסף':'מדוד מיקום (5ש\')');
  document.getElementById('eqMeasBtn').style.opacity = meas?0.5:1;
}

function targetDb(f){
  if(targetMode==='house') return Math.max(-5,Math.min(6, -1.0*Math.log2(f/250)));
  return 0;
}

function clampCorrBand(f, raw){
  const maxBoost = cutOnly ? 0 : (f>500?1.5:4);
  const maxCut   = f>500?-4:-9;
  return Math.max(maxCut, Math.min(maxBoost, raw));
}
function eqOffset(resp, rel){
  let os=0,on=0;
  for(let k=0;k<GEQ.length;k++){ if(rel[k] && GEQ[k]>=200 && GEQ[k]<=4000){ os+=resp[k]-targetDb(GEQ[k]); on++; } }
  return on?os/on:0;
}
function buildCorr(resp, rel){
  const off=eqOffset(resp, rel);
  return GEQ.map((f,k)=> rel[k] ? clampCorrBand(f, -(resp[k]-targetDb(f)-off)) : null);
}

function relByLevel(resp){
  const maxR=Math.max(...resp);
  return GEQ.map((f,k)=> resp[k]>maxR-30 && f>=40 && f<=16000);
}

function corrGridHtml(corr, rel){
  let html='<div class="tfGrid">';
  for(let k=0;k<GEQ.length;k++){
    const f=GEQ[k], fStr=f>=1000?(f/1000)+'k':f+'Hz', v=corr[k];
    const hide = v==null || (rel && !rel[k]) || Math.abs(v)<0.5;
    if(hide) html+=`<div class="tfItem off"><span class="f">${fStr}</span><span class="g">—</span></div>`;
    else { const cls=v<0?'cut':(v>0?'boost':''), sign=v>0?'+':''; html+=`<div class="tfItem ${cls}"><span class="f">${fStr}</span><span class="g">${sign}${v.toFixed(1)}dB</span></div>`; }
  }
  return html+'</div>';
}
function corrParamHtml(corr){
  const list=paramFromCorr(corr);
  if(!list.length) return '<div class="sub">מאוזן 👌</div>';
  return list.map(s=>{
    const f=s.f>=1000?(s.f/1000).toFixed(2)+'kHz':Math.round(s.f)+'Hz';
    const g=(s.gain>0?'+':'')+s.gain.toFixed(1)+'dB';
    return '<div class="eqRow '+s.type+'"><span class="f">'+f+'</span><span class="g">'+g+'</span><span class="q">Q '+s.q.toFixed(1)+'</span></div>';
  }).join('');
}
function showGeqDock(title){
  const dock=document.getElementById('geqDock'); if(!dock) return;
  dock.style.display='block'; syncGeqBtn();
  const t=document.getElementById('geqDockTitle'); if(t&&title) t.textContent=title;
}
function hideGeqDock(){ const d=document.getElementById('geqDock'); if(d) d.style.display='none'; syncGeqBtn(); }
function syncGeqBtn(){
  const b=document.getElementById('geqShowBtn'), d=document.getElementById('geqDock');
  if(b&&d) b.classList.toggle('on', d.style.display!=='none');
}
safeOn('geqShowBtn', 'click',function(){
  const d=document.getElementById('geqDock');
  if(d.style.display==='none' || !d.style.display){
    if(!eqCurveData){ alert('אין עדיין תיקון להצגה — בצע מדידת תגובה קודם.'); return; }
    d.style.display='block'; d.classList.remove('collapsed');
    document.getElementById('geqDockToggle').textContent='▼';
    drawGEQ(document.getElementById('eqCurveCanvas'), eqCurveData.freqs, eqCurveData.corr);
  } else d.style.display='none';
  syncGeqBtn();
});
safeOn('geqDockToggle', 'click',function(){
  const d=document.getElementById('geqDock');
  d.classList.toggle('collapsed');
  this.textContent = d.classList.contains('collapsed') ? '▲' : '▼';
  if(!d.classList.contains('collapsed') && eqCurveData) drawGEQ(document.getElementById('eqCurveCanvas'), eqCurveData.freqs, eqCurveData.corr);
});
function drawGEQ(c, freqs, corr){
  if(c && c.parentElement && c.parentElement.classList.contains('collapsed')) return;
  const x=c.getContext('2d');
  const dpr=Math.min(window.devicePixelRatio||1,2);
  const CW=c.clientWidth||360, H=234;
  c.width=Math.round(CW*dpr); c.height=Math.round(H*dpr);
  x.setTransform(dpr,0,0,dpr,0,0);
  const W=CW;
  x.clearRect(0,0,W,H);
  const top=34, bot=H-46, mid=(top+bot)/2, scale=(bot-top)/2/9;
  const n=freqs.length, slot=W/n, kw=Math.max(9,Math.min(18,slot*0.80)), kh=11;

  x.fillStyle=sunMode ? '#f0f4f8' : '#12171f'; 
  x.fillRect(0,0,W,H);

  x.font='9px monospace'; x.textAlign='left';
  [6,0,-6].forEach(d=>{ const yy=mid-d*scale;
    x.strokeStyle = d===0 ? (sunMode?'rgba(0,0,0,.3)':'rgba(255,255,255,.30)') : (sunMode?'rgba(0,0,0,.1)':'rgba(255,255,255,.10)');
    x.setLineDash(d===0?[]:[2,3]); x.beginPath(); x.moveTo(0,yy); x.lineTo(W,yy); x.stroke();
    x.fillStyle=sunMode?'#475569':'rgba(160,175,190,.75)'; x.fillText((d>0?'+':'')+d, 2, yy-2); });
  x.setLineDash([]);

  for(let k=0;k<n;k++){
    const cx=slot*k+slot/2, v=corr[k];
    x.strokeStyle=sunMode?'rgba(0,0,0,.2)':'rgba(255,255,255,.20)'; x.lineWidth=Math.max(3,kw*0.34);
    x.lineCap='round'; x.beginPath(); x.moveTo(cx,top); x.lineTo(cx,bot); x.stroke();
    if(v==null) continue;
    const yy=mid-Math.max(-9,Math.min(9,v))*scale;
    x.strokeStyle = v>0.4?'rgba(80,230,140,.75)' : v<-0.4?'rgba(255,90,120,.75)' : (sunMode?'rgba(0,0,0,.22)':'rgba(255,255,255,.22)');
    x.beginPath(); x.moveTo(cx,mid); x.lineTo(cx,yy); x.stroke();
    const col = v>0.4?'#5ce89a' : v<-0.4?'#ff6b8b' : (sunMode?'#64748b':'#9fb0c2');
    x.save(); x.shadowColor='rgba(0,0,0,.4)'; x.shadowBlur=3; x.shadowOffsetY=1;
    x.fillStyle=col; x.strokeStyle='rgba(0,0,0,.7)'; x.lineWidth=1;
    x.beginPath();
    if(x.roundRect) x.roundRect(cx-kw/2, yy-kh/2, kw, kh, 2);
    else x.rect(cx-kw/2, yy-kh/2, kw, kh);
    x.fill(); x.stroke(); x.restore();
    x.fillStyle='rgba(0,0,0,.55)'; x.fillRect(cx-kw/2+2, yy-0.5, kw-4, 1);
    if(Math.abs(v)>=0.4){
      const txt=(v>0?'+':'')+ (Math.abs(v)>=10 ? v.toFixed(0) : v.toFixed(1));
      x.save(); x.translate(cx, v>0 ? yy-kh/2-3 : yy+kh/2+3); x.rotate(-Math.PI/2);
      x.textAlign = v>0 ? 'left' : 'right';
      x.font='9px monospace'; x.fillStyle = v>0?'#15803d':'#b91c1c';
      x.fillText(txt, 0, 3); x.restore();
    }
  }

  x.font='9px monospace';
  for(let k=0;k<n;k++){
    const f=freqs[k], cx=slot*k+slot/2;
    const lbl = f>=1000 ? (f/1000)+'k' : String(f);
    x.save(); x.translate(cx, bot+6); x.rotate(-Math.PI/2);
    x.textAlign='right'; x.fillStyle= corr[k]==null ? (sunMode?'rgba(0,0,0,.4)':'rgba(120,132,146,.6)') : (sunMode?'#0f172a':'rgba(170,185,200,.95)');
    x.fillText(lbl, 0, 3); x.restore();
  }
  let worst=null;
  for(let k=0;k<n;k++){ const v=corr[k]; if(v==null) continue; if(!worst||Math.abs(v)>Math.abs(worst.v)) worst={v,k}; }
  if(worst && Math.abs(worst.v)>=0.5){
    const f=freqs[worst.k];
    x.textAlign='right'; x.fillStyle=worst.v>0?'#16a34a':'#dc2626';
    x.fillText('הכי חריג: '+(f>=1000?(f/1000).toFixed(1)+'k':Math.round(f))+'Hz '+(worst.v>0?'+':'')+worst.v.toFixed(1)+'dB', W-4, 12);
  }
  x.textAlign='left'; x.fillStyle=sunMode?'#475569':'rgba(150,165,180,.75)';
  x.fillText('הזז כל פס לפי הידית', 4, 12);
}
function micCalAt(f){
  if(!micCal||!micCal.f.length) return 0;
  const F=micCal.f, G=micCal.g;
  if(f<=F[0]) return G[0]; if(f>=F[F.length-1]) return G[G.length-1];
  let i=1; while(i<F.length && F[i]<f) i++;
  const t=(Math.log(f)-Math.log(F[i-1]))/(Math.log(F[i])-Math.log(F[i-1]));
  return G[i-1]+(G[i]-G[i-1])*t;
}
function loadCalStore(){
  try{
    const raw=localStorage.getItem(CAL_KEY);
    if(raw){ const o=JSON.parse(raw); micCalList=o.list||[]; activeCalId=o.active||null; }
  }catch(_){ micCalList=[]; activeCalId=null; }
  deriveActiveCal();
}
function saveCalStore(){
  try{ localStorage.setItem(CAL_KEY, JSON.stringify({list:micCalList, active:activeCalId})); }catch(_){}
}
function deriveActiveCal(){
  const c=micCalList.find(x=>x.id===activeCalId);
  micCal = c ? {f:c.f, g:c.g} : null;
  const nm = c ? ('כיול פעיל: '+c.name) : 'כיול פעיל: ללא';
  const el=document.getElementById('eqCalName'); if(el) el.textContent=nm;
}

function renderCalList(){
  const box=document.getElementById('calList');
  let html='<div class="calRow'+(activeCalId===null?' on':'')+'" data-id=""><span class="nm">ללא כיול</span></div>';
  html+=micCalList.map(c=>'<div class="calRow'+(c.id===activeCalId?' on':'')+'" data-id="'+c.id+'">'+
    '<span class="nm" title="'+escapeHtml(c.name)+'">'+escapeHtml(c.name)+'</span><span class="sub">'+c.f.length+' נק\'</span><span class="del" data-del="'+c.id+'" title="מחק">🗑</span></div>').join('');
  box.innerHTML=html;
  box.querySelectorAll('.calRow').forEach(row=>row.addEventListener('click',e=>{
    if(e.target.dataset.del!==undefined) return;
    activeCalId = row.dataset.id || null;
    deriveActiveCal(); saveCalStore(); renderCalList();
    if(eqPositions.length) computeAndShow();
  }));
  box.querySelectorAll('.del').forEach(d=>d.addEventListener('click',e=>{
    e.stopPropagation();
    const id=d.dataset.del;
    const c=micCalList.find(x=>x.id===id);
    if(!confirm('למחוק את הכיול "'+(c?c.name:'')+'"?')) return;
    micCalList=micCalList.filter(c=>c.id!==id);
    if(activeCalId===id) activeCalId=null;
    deriveActiveCal(); saveCalStore(); renderCalList();
  }));
}

function parseCalText(text, fname){
  text=String(text||'').replace(/^\uFEFF/,'');
  const F=[],G=[];
  const lineRe=/^([+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)[\s,;]+([+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/;
  text.split(/\r?\n/).forEach(line=>{
    const m=line.trim().match(lineRe);
    if(m){ const f=parseFloat(m[1]), g=parseFloat(m[2]);
      if(isFinite(f)&&isFinite(g)&&f>0&&f<200000) { F.push(f); G.push(g); } }
  });
  if(F.length>1){
    const pts=F.map((f,i)=>[f,G[i]]).sort((a,b)=>a[0]-b[0]);
    const F2=[],G2=[];
    for(const [f,g] of pts){
      if(F2.length && Math.abs(f-F2[F2.length-1])<1e-9){ G2[G2.length-1]=(G2[G2.length-1]+g)/2; continue; }
      F2.push(f); G2.push(g);
    }
    const id='c'+Date.now();
    micCalList.push({id, name:(fname||'כיול').replace(/\.[^.]+$/,''), f:F2, g:G2});
    activeCalId=id; deriveActiveCal(); saveCalStore(); renderCalList();
    if(eqPositions.length) computeAndShow();
    return true;
  }
  return false;
}
async function addCalFromFile(file){
  try{
    let text=null;
    if(file.text){ text=await file.text(); }
    if(text==null){ text=await new Promise((res,rej)=>{ const r=new FileReader();
      r.onload=()=>res(r.result); r.onerror=()=>rej(r.error); r.readAsText(file); }); }
    if(!parseCalText(text, file.name)){
      alert('לא זיהיתי נתוני כיול בקובץ.\nהפורמט הצפוי: כל שורה = תדר [רווח/טאב/פסיק] dB. לדוגמה: 1000  -1.5');
    }
  }catch(err){
    alert('לא הצלחתי לקרוא את הקובץ.\nאם הוא ב־iCloud — הורד אותו מקומית קודם, ונסה קובץ בסיומת .txt / .cal / .frd.');
  }
}
const calPanel=document.getElementById('calPanel');
safeOn('calBtn', 'click',()=>{ renderCalList(); showModal(calPanel); });
safeOn('calClose', 'click',closeModals);
safeOn('calAdd', 'change',e=>{ if(e.target.files[0]) addCalFromFile(e.target.files[0]); e.target.value=''; });
safeOn('calPasteBtn', 'click',()=>{
  const t=document.getElementById('calPaste').value;
  if(!t.trim()){ alert('הדבק קודם את תוכן הקובץ.'); return; }
  if(parseCalText(t,'כיול מודבק')) document.getElementById('calPaste').value='';
  else alert('לא זיהיתי נתונים. כל שורה צריכה להיות: תדר [רווח/טאב] dB.');
});
calPanel.addEventListener('dragover',e=>{ e.preventDefault(); calPanel.style.borderColor='var(--accent)'; });
calPanel.addEventListener('dragleave',()=>{ calPanel.style.borderColor=''; });
calPanel.addEventListener('drop',e=>{ e.preventDefault(); calPanel.style.borderColor='';
  const f=e.dataTransfer.files[0]; if(f) addCalFromFile(f); });
safeOn('calResetBtn', 'click',()=>{
  if(!micCalList.length){ return; }
  if(!confirm('לאפס ולמחוק את כל קבצי הכיולים?')) return;
  micCalList=[]; activeCalId=null; deriveActiveCal(); saveCalStore(); renderCalList();
});

const modalBg=document.getElementById('modalBg');
['rtPanel','eqPanel','calPanel','tfPanel','areaPanel','dlyPanel','savePanel'].forEach(id=>{
  const p=document.getElementById(id); if(p) modalBg.appendChild(p);
});
function showModal(p){ setAlign(false); closeModals(); p.classList.add('open'); modalBg.classList.add('show'); }
function abortRT60(){
  if(rt60State!=='capture' && !rt60Timer) return;
  rt60State='idle';
  if(rt60Timer){ clearInterval(rt60Timer); rt60Timer=null; }
  if(analyser) analyser.smoothingTimeConstant=parseFloat(document.getElementById('smooth').value);
  genStop();
  if(rtStatus) rtStatus.textContent='המדידה בוטלה.';
}
function closeModals(){
  abortRT60();
  ['rtPanel','eqPanel','calPanel','tfPanel','areaPanel','dlyPanel','savePanel'].forEach(id=>document.getElementById(id).classList.remove('open'));
  modalBg.classList.remove('show');
}
modalBg.addEventListener('click',e=>{ if(e.target===modalBg) closeModals(); });
document.addEventListener('keydown',e=>{ if(e.key==='Escape') closeModals(); });

const areaPanel=document.getElementById('areaPanel');
document.querySelectorAll('#eqModeSwitchB button').forEach(b=>b.addEventListener('click',function(){
  if(this.dataset.go==='avg'){ showModal(eqPanel); updateEqUI(); }
}));
function openAreas(){
  renderAreaList();
  document.querySelectorAll('#areaModeSeg button').forEach(b=>b.classList.toggle('on', b.dataset.m===eqMode));
  document.querySelectorAll('#areaCutSeg button').forEach(b=>b.classList.toggle('on', (b.dataset.co==='1')===cutOnly));
  showModal(areaPanel);
}
safeOn('areaClose', 'click',closeModals);
safeOn('areaMeasBtn', 'click',()=>pickSource(measureArea,5000));
let pendingMeasureFn=null, pendingDur=5000;
const srcOverlay=document.getElementById('srcOverlay');
function pickSource(fn, dur){
  if(!running){ alert('קודם הפעל את המיקרופון.'); return; }
  pendingMeasureFn=fn; pendingDur=dur||5000; srcOverlay.classList.add('show');
}
srcOverlay.addEventListener('click',e=>{ if(e.target===srcOverlay) srcOverlay.classList.remove('show'); });
document.querySelectorAll('#srcBox button').forEach(b=>b.addEventListener('click',function(){
  srcOverlay.classList.remove('show');
  const src=this.dataset.src; if(src==='cancel'||!pendingMeasureFn) return;
  runWithSource(src, pendingMeasureFn, pendingDur); pendingMeasureFn=null;
}));
function setGenTypeUI(kind){
  document.querySelectorAll('#genType button').forEach(x=>x.classList.toggle('on', x.dataset.t===kind));
  document.getElementById('genFreqWrap').style.display='none';
  document.getElementById('genSweepWrap').style.display = kind==='sweep'?'flex':'none';
}
function runWithSource(kind, measureFn, durMs){
  durMs=durMs||5000;
  if(kind==='sweep') durMs=Math.max(durMs, genSweepDur*1000+600);
  if(kind==='external'){ measureFn(); return; }
  const prevOn=genOn, prevType=genType;
  genType=kind; setGenTypeUI(kind); genStart();
  setTimeout(measureFn, 450);
  setTimeout(()=>{
    if(prevOn){ genType=prevType; setGenTypeUI(prevType); genStart(); }
    else genStop();
  }, 450+durMs+300);
}

safeOn('areaCombBtn', 'click',()=>runCombCheck('areaCombResult'));
safeOn('areaResetBtn', 'click',()=>{
  areas=[];
  { const cr=document.getElementById('areaCombResult'); if(cr){ cr.style.display='none'; cr.innerHTML=''; } }
  const ac=document.getElementById('areaEqCanvas'); if(ac) ac.style.display='none';
  const al=document.getElementById('areaEqList'); if(al) al.innerHTML='';
  eqMarks=null; eqCurveData=null; hideGeqDock();
  renderAreaList();
});
safeOn('areaEqBtn', 'click',suggestAreaEQ);
function suggestAreaEQ(){
  if(!areas.length){ alert('מדוד לפחות אזור אחד.'); return; }
  const n=GEQ.length;
  const avg=new Array(n);
  for(let k=0;k<n;k++){ let p=0; areas.forEach(a=>p+=db2lin(a.db[k])); avg[k]=10*Math.log10(p/areas.length+1e-12); }
  const resp=avg.map((d,k)=> d - (micCal?micCalAt(GEQ[k]):0));
  const rel=relByLevel(resp);
  const corr=buildCorr(resp, rel);
  eqMarks=[]; for(let k=0;k<n;k++){ if(corr[k]!=null && Math.abs(corr[k])>=1.0) eqMarks.push({f:GEQ[k],gain:corr[k],type:corr[k]<0?'cut':'boost'}); }
  eqCurveData={freqs:GEQ.slice(), corr:corr.slice()};

  const cv2=document.getElementById('areaEqCanvas'); cv2.style.display='block'; drawGEQ(cv2,GEQ,corr);

  const head = '<div class="sub" style="margin-bottom:6px; color:var(--text); font-weight:600;">ממוצע ' + areas.length + ' אזורים · יעד ' + (targetMode==='house'?'House':'שטוח') + ':</div>';
  document.getElementById('areaEqList').innerHTML = head + (eqMode==='param' ? corrParamHtml(corr) : corrGridHtml(corr, null));
}

function updateAreaMeasBtn(){
  const b=document.getElementById('areaMeasBtn'), meas=areaState==='measuring';
  b.textContent = meas?'מודד… החזק יציב':'מדוד אזור חדש (5ש\')'; b.style.opacity=meas?.5:1;
}
function measureArea(){
  if(!running){ alert('קודם הפעל את המיקרופון.'); return; }
  if(areas.length>=4){ alert('הגעת ל־4 אזורים — מחק אחד כדי להוסיף.'); return; }
  if(measureBusy()){ alert('מדידה אחרת פעילה — המתן לסיומה.'); return; }
  unfreezeForMeasure();
  const srcData = floatData;
  areaAccum=new Float64Array(srcData.length); areaFrames=0; areaState='measuring';
  updateAreaMeasBtn();
  setTimeout(()=>{
    const bins=areaAccum.length, nyq=audioCtx.sampleRate/2, R6=Math.pow(2,1/6);
    const db=GEQ.map(fc=>{
      let lo=Math.floor((fc/R6)/nyq*bins), hi=Math.ceil((fc*R6)/nyq*bins);
      lo=Math.max(0,lo);hi=Math.min(bins-1,hi);if(hi<lo)hi=lo;
      let p=0; for(let i=lo;i<=hi;i++) p+=areaAccum[i]/Math.max(1,areaFrames);
      return 10*Math.log10(p+1e-12);
    });
    const idx=areas.length;
    areas.push({name:AREA_NAMES[idx], color:AREA_COLORS[idx], db, show:true});
    areaState='idle'; updateAreaMeasBtn(); renderAreaList();
  },5000);
}
function renderAreaList(){
  const box=document.getElementById('areaList');
  if(!areas.length){ box.innerHTML='<div class="sub">אין אזורים עדיין — מדוד את הראשון.</div>'; return; }
  box.innerHTML=areas.map((a,i)=>
    '<div class="areaRow"><span class="dot" style="background:'+a.color+'"></span>'+
    '<span class="nm">'+a.name+'</span>'+
    '<button data-show="'+i+'" class="'+(a.show?'on':'')+'">'+(a.show?'מוצג':'מוסתר')+'</button>'+
    '<button data-del="'+i+'">מחק</button></div>').join('');
  box.querySelectorAll('[data-show]').forEach(b=>b.addEventListener('click',()=>{
    const i=+b.dataset.show; areas[i].show=!areas[i].show; renderAreaList();
  }));
  box.querySelectorAll('[data-del]').forEach(b=>b.addEventListener('click',()=>{
    areas.splice(+b.dataset.del,1);
    areas.forEach((a,i)=>{ a.color=AREA_COLORS[i]; if(AREA_NAMES.includes(a.name)) a.name=AREA_NAMES[i]; });
    renderAreaList();
  }));
}

const tfPanel=document.getElementById('tfPanel');
safeOn('tfClose', 'click',closeModals);
safeOn('tfSwapBtn', 'click',function(){ tfSwap=!tfSwap; this.classList.toggle('on',tfSwap); });
function setTfOverlay(on){
  tfOverlay=on;
  const a=document.getElementById('tfOverlayBtn'), b=document.getElementById('tfOverlayHdr');
  if(a) a.classList.toggle('on',on);
  if(b) b.classList.toggle('on',on);
}
safeOn('tfOverlayBtn', 'click',()=>setTfOverlay(!tfOverlay));
safeOn('tfMeasBtn', 'click',()=>pickSource(tfMeasure,6000));
safeOn('tfCsvBtn', 'click',tfExportCsv);

function detectComb(){
  if(!floatData || !audioCtx) return null;
  const bins=floatData.length, nyq=audioCtx.sampleRate/2;
  const loF=200, hiF=8000, M=600;
  const grid=new Float64Array(M);
  for(let i=0;i<M;i++){ const f=loF+(hiF-loF)*i/(M-1); const b=Math.round(f/nyq*bins); grid[i]=floatData[Math.max(0,Math.min(bins-1,b))]; }
  const W=25, rip=new Float64Array(M);
  for(let i=0;i<M;i++){ let s=0,c=0; for(let j=-W;j<=W;j++){const k=i+j; if(k>=0&&k<M){s+=grid[k];c++;}} rip[i]=grid[i]-s/c; }
  let mean=0; for(let i=0;i<M;i++) mean+=rip[i]; mean/=M; for(let i=0;i<M;i++) rip[i]-=mean;
  let norm=0; for(let i=0;i<M;i++) norm+=rip[i]*rip[i];
  if(norm<1e-9) return null;
  let best={lag:0,val:0};
  for(let lag=4;lag<M/2;lag++){ let s=0; for(let i=0;i<M-lag;i++) s+=rip[i]*rip[i+lag]; const v=s/norm; if(v>best.val) best={lag,val:v}; }
  const dfPerPoint=(hiF-loF)/(M-1);
  const spacingHz=best.lag*dfPerPoint;
  const delayMs=spacingHz>0?1000/spacingHz:0;
  let depth=0; for(let i=0;i<M;i++) depth+=rip[i]*rip[i]; depth=Math.sqrt(depth/M)*2;
  const inRange = delayMs>=1.4 && delayMs<=6.5;
  return {spacingHz, delayMs, strength:best.val, depth, inRange};
}
function runCombCheck(resultId){
  const el=document.getElementById(resultId||'combResult'); if(!el) return;
  el.style.display='block';
  const r=detectComb();
  if(!r){ el.innerHTML='<span style="color:var(--dim)">אין מספיק אות. נגן רעש ורוד ונסה שוב.</span>'; return; }
  const detected = r.strength>0.28 && r.depth>1.5;
  if(detected && r.inRange){
    const dist=r.delayMs/1000*343;
    el.innerHTML='⚠ <b style="color:var(--warn)">זוהה ביטול (comb)</b><br>'+
      '<span style="font-size:11px;color:var(--dim)">מרווח ~'+Math.round(r.spacingHz)+'Hz → הפרש זמן ~'+r.delayMs.toFixed(2)+'ms (~'+dist.toFixed(2)+'מ\').<br>'+
      'מקור אפשרי: החזר מקיר/רצפה או שני רמקולים לא מיושרים.</span>';
  } else if(detected){
    el.innerHTML='⚠ <b style="color:var(--warn)">נראות אדוות בתגובה</b><br>'+
      '<span style="font-size:11px;color:var(--dim)">הפרש הזמן מחוץ לטווח שניתן למדוד כאן בוודאות (1.5–6ms).<br>'+
      'למדידת הפרש זמן מדויק השתמש בכלי הדיליי.</span>';
  } else {
    el.innerHTML='<b style="color:#39d98a">✓ לא זוהה ביטול משמעותי</b><br><span style="font-size:11px;color:var(--dim)">התגובה חלקה יחסית.</span>';
  }
}
function updateTfLevels(){
  if(!floatDataRef || !analyserRef) return;
  analyser.getFloatTimeDomainData(timeData);
  if(!timeDataRef || timeDataRef.length!==analyserRef.fftSize) timeDataRef=new Float32Array(analyserRef.fftSize);
  analyserRef.getFloatTimeDomainData(timeDataRef);
  setGainEl(document.getElementById('tfMicFill'), document.getElementById('tfMicDb'), levelDb(timeData,2048));
  setGainEl(document.getElementById('tfRefFill'), document.getElementById('tfRefDb'), levelDb(timeDataRef,2048));
  document.getElementById('tfL1').textContent = tfSwap?"כניסה 1 → רפרנס":"כניסה 1 → מיק'";
  document.getElementById('tfL2').textContent = tfSwap?"כניסה 2 → מיק'":"כניסה 2 → רפרנס";
  
  const N=1024, maxLag=Math.min(4800, timeDataRef.length-N-1);
  const oa=timeData.length-N;
  let bestAbs=0, r=0, bestLag=0, bestVa=0, bestVb=0;
  let _cVa=0, _cVb=0;
  const corrAt=(ob)=>{
    let sa=0,sb=0,saa=0,sbb=0,sab=0;
    for(let i=0;i<N;i++){ const x=timeData[oa+i], y=timeDataRef[ob+i]; sa+=x;sb+=y;saa+=x*x;sbb+=y*y;sab+=x*y; }
    const cov=sab-sa*sb/N, va=saa-sa*sa/N, vb=sbb-sb*sb/N, den=Math.sqrt(va*vb);
    _cVa=va; _cVb=vb;
    return den>1e-9 ? cov/den : 0;
  };
  for(let lag=0; lag<=maxLag; lag+=4){
    const ob=timeDataRef.length-N-lag; if(ob<0) break;
    const c=corrAt(ob); if(Math.abs(c)>bestAbs){ bestAbs=Math.abs(c); r=c; bestLag=lag; bestVa=_cVa; bestVb=_cVb; }
  }
  for(let lag=Math.max(0,bestLag-6); lag<=Math.min(maxLag,bestLag+6); lag++){
    const ob=timeDataRef.length-N-lag; if(ob<0) continue;
    const c=corrAt(ob); if(Math.abs(c)>bestAbs){ bestAbs=Math.abs(c); r=c; bestVa=_cVa; bestVb=_cVb; }
  }
  _tfCorr += ((r||0)-_tfCorr)*0.15;
  const fill=document.getElementById('tfCorrFill'), val=document.getElementById('tfCorrVal'), tip=document.getElementById('tfCorrTip');
  if(fill){
    const w=Math.abs(_tfCorr)*50;
    fill.style.width=w+'%';
    if(_tfCorr>=0){ fill.style.right='50%'; fill.style.left='auto'; } else { fill.style.left='50%'; fill.style.right='auto'; }
    const col=_tfCorr>0.4?'#39d98a':_tfCorr<-0.2?'var(--hot)':'var(--warn)';
    fill.style.background=col;
    if(val){ val.textContent=_tfCorr.toFixed(2); val.style.color=col; }
    if(tip){ tip.textContent = bestVa<1e-6||bestVb<1e-6 ? '(אין אות)' : _tfCorr<-0.2?'⚠ פולריות הפוכה?' : _tfCorr>0.6?'✓':' '; }
  }
}
function tfMeasure(){
  if(!running||!analyserRef){ alert('הפעל מיקרופון עם כרטיס קול (input סטריאו).'); return; }
  if(measureBusy()){ alert('מדידה אחרת פעילה — המתן לסיומה.'); return; }
  unfreezeForMeasure();
  const bins=floatData.length;
  tfMic=new Float64Array(bins); tfRef=new Float64Array(bins); tfFrames=0; tfState='measuring';
  const btn=document.getElementById('tfMeasBtn'); btn.textContent='מודד…'; btn.style.opacity=.5;
  setTimeout(()=>{
    tfState='idle'; btn.textContent='מדוד שוב (6ש\')'; btn.style.opacity=1;
    tfCompute();
  },6000);
}
function tfCompute(){
  if(!tfFrames){ return; }
  const bins=tfMic.length, nyq=audioCtx.sampleRate/2, R6=Math.pow(2,1/6);
  const H=[], refB=[]; let refMax=-999;
  for(let k=0;k<GEQ.length;k++){
    const fc=GEQ[k]; let lo=Math.floor((fc/R6)/nyq*bins), hi=Math.ceil((fc*R6)/nyq*bins);
    lo=Math.max(0,lo);hi=Math.min(bins-1,hi);if(hi<lo)hi=lo;
    let pm=0,pr=0; for(let i=lo;i<=hi;i++){ pm+=tfMic[i]; pr+=tfRef[i]; }
    const micDb=10*Math.log10(pm/tfFrames+1e-12);
    refB[k]=10*Math.log10(pr/tfFrames+1e-12);
    H[k]=micDb-refB[k];
    refMax=Math.max(refMax,refB[k]);
  }
  if(micCal){ for(let k=0;k<GEQ.length;k++) H[k]-=micCalAt(GEQ[k]); }
  const rel=GEQ.map((f,k)=> refB[k]>refMax-25 && f>=40 && f<=16000);
  const on=rel.filter(Boolean).length;
  const corr=buildCorr(H, rel);
  tfResult={corr,H,rel};
  document.getElementById('tfInfo').textContent = on? 'הזז בגרפיק־EQ לפי הערכים (±6dB מקס). מוצגים רק פסים אמינים עם תיקון משמעותי.' :
    'רפרנס חלש/חסר — ודא שערוץ 2 מקבל אות מהמיקסר, או לחץ "החלף ערוצים".';
  renderTFList();
}

function renderTFList(){
  const box = document.getElementById('tfGeqList');
  const cv2 = document.getElementById('tfCanvas');
  if(!tfResult){ box.innerHTML = ''; cv2.style.display = 'none'; return; }
  
  showGeqDock('תיקון EQ · דו־ערוצי');
  drawGEQ(document.getElementById('eqCurveCanvas'), GEQ, tfResult.corr);
  eqCurveData = { freqs: GEQ.slice(), corr: tfResult.corr.slice() };

  if(tfMode==='param'){
    const head='<div class="sub" style="margin-bottom:6px;color:var(--text);font-weight:600;">EQ פרמטרי (יעד '+(targetMode==='house'?'House':'שטוח')+'):</div>';
    box.innerHTML = head + corrParamHtml(tfResult.corr);
    return;
  }
  const head='<div class="sub" style="margin-bottom:6px; color:var(--text); font-weight:600;">ערכי תיקון לגרפיק-EQ (31 פסים):</div>';
  box.innerHTML = head + corrGridHtml(tfResult.corr, tfResult.rel);
}

function tfExportCsv(){
  if(!tfResult){ alert('קודם מדוד.'); return; }
  let rows='freq_hz,geq_correction_db,measured_db\n';
  GEQ.forEach((f,k)=> rows+=f+','+(tfResult.corr[k]==null?'':tfResult.corr[k].toFixed(1))+','+tfResult.H[k].toFixed(1)+'\n');
  download('tf_geq_'+stamp()+'.csv', URL.createObjectURL(new Blob([rows],{type:'text/csv'})));
}

const dlyPanel=document.getElementById('dlyPanel');
safeOn('dlyBtn', 'click',()=>{
  showModal(dlyPanel);
  if(running && !workletReady){
    const st=document.getElementById('dlyStatus');
    if(st){ st.innerHTML='<span style="color:var(--warn)">⚠ מנוע ההקלטה לא נטען — מדידת דיליי לא תעבוד. פתח את האתר דרך שרת/HTTPS (לא כקובץ מקומי).</span>'; }
  }
});
safeOn('dlyClose', 'click',closeModals);
function resetDelay(){
  dlyState='idle';
  dlySpeakers.forEach((s,i)=>{ s.ms=null; s.name=dlyName(i); });
  dlyAnchor=0;
  const st=document.getElementById('dlyStatus'); if(st) st.textContent='—';
  renderDlySpk();
}
safeOn('dlyReset', 'click',resetDelay);
safeOn('dlyMeasBtn', 'click',()=>pickSource(measureDelay,2100));

function fft(re,im,inv){
  const n=re.length;
  for(let i=1,j=0;i<n;i++){ let bit=n>>1; for(;j&bit;bit>>=1) j^=bit; j^=bit;
    if(i<j){ const tr=re[i];re[i]=re[j];re[j]=tr; const ti=im[i];im[i]=im[j];im[j]=ti; } }
  for(let len=2;len<=n;len<<=1){
    const ang=(inv?2:-2)*Math.PI/len, wr=Math.cos(ang), wi=Math.sin(ang);
    for(let i=0;i<n;i+=len){ let cwr=1,cwi=0;
      for(let k=0;k<len/2;k++){
        const a=i+k, b=i+k+len/2;
        const vr=re[b]*cwr-im[b]*cwi, vi=re[b]*cwi+im[b]*cwr;
        re[b]=re[a]-vr; im[b]=im[a]-vi; re[a]+=vr; im[a]+=vi;
        const t=cwr*wr-cwi*wi; cwi=cwr*wi+cwi*wr; cwr=t;
      }
    }
  }
  if(inv){ for(let i=0;i<n;i++){ re[i]/=n; im[i]/=n; } }
}

let dlyState='idle', timeDataRef=null;
document.querySelectorAll('#meterModeSeg button').forEach(b=>b.addEventListener('click',function(){
  document.querySelectorAll('#meterModeSeg button').forEach(x=>x.classList.remove('on'));
  this.classList.add('on'); meterMode=this.dataset.m;
}));
function levelDb(buf,n){
  const len=buf.length; n=n||len; const start=Math.max(0,len-n);
  if(meterMode==='peak'){ let m=0; for(let i=start;i<len;i++){ const a=Math.abs(buf[i]); if(a>m)m=a; } return 20*Math.log10(m+1e-9); }
  let s=0; for(let i=start;i<len;i++){ const v=buf[i]; s+=v*v; } return 20*Math.log10(Math.sqrt(s/(len-start))+1e-9);
}
function gainClass(db){
  if(db>=-1) return ['clip','קליפ!'];
  if(db>=-8) return ['hi','חזק ('+db.toFixed(0)+')'];
  if(db>=-40) return ['ok','טוב ('+db.toFixed(0)+')'];
  return ['lo','חלש ('+db.toFixed(0)+')'];
}
function setGainEl(fill,lbl,db){
  let s=db;
  if(fill){
    s=fill._sdb; if(s==null||!isFinite(s)) s=db;
    s += (db>s ? 0.55 : 0.035) * (db - s);
    fill._sdb=s;
    fill.style.width=Math.max(2,Math.min(100,(s+60)/60*100))+'%';
  }
  const [cls,txt]=gainClass(s);
  if(fill) fill.className='fill '+cls;
  if(lbl){ lbl.className='gainLbl '+cls; lbl.textContent=txt; }
}
function setGain(id, db){ setGainEl(document.getElementById(id+'Fill'), document.getElementById(id+'Gain'), db); }

function measureDelay(){ runDelayCapture(document.getElementById('dlyMeasBtn'), (res, silent)=>{
  const st=document.getElementById('dlyStatus');
  if(res==null){
    st.textContent = silent==='mic' ? 'המיקרופון לא קלט אות — בדוק גיין/חיבור.'
                   : silent==='ref' ? 'כניסה 2 (רפרנס) שקטה — ודא ניתוב רפרנס מהמיקסר.'
                   : 'לא הצלחתי — ודא שמנגן אות רחב־פס ושכניסה 2 מקבלת רפרנס.';
    return; }
  const ms=res.ms, dist=Math.abs(ms)/1000*343;
  st.innerHTML='דיליי ≈ <b>'+ms.toFixed(2)+' ms</b><br><span style="font-size:11px;color:var(--dim)">≈ '+dist.toFixed(2)+' מ\' · '+(ms>=0?'המיק\' מאחר אחרי הרפרנס':'המיק\' מקדים את הרפרנס')+'</span>';
}); }
function runDelayCapture(btn, cb){
  if(!running||!analyserRef||!source){ alert('צריך כרטיס קול עם input סטריאו (מיק\'+רפרנס).'); return; }
  if(measureBusy()){ alert('מדידה אחרת פעילה — המתן לסיומה.'); return; }
  unfreezeForMeasure();
  dlyState='measuring';
  const prevTxt=btn.textContent; btn.textContent='מקליט…'; btn.style.opacity=.5;
  const sr=audioCtx.sampleRate;
  const captureSec = (genOn && genType==='sweep') ? Math.min(10, genSweepDur+0.6) : 2.0;
  const want=Math.floor(sr*captureSec);
  const mic=new Float32Array(want), ref=new Float32Array(want); let pos=0;
  let workletNode;
  try {
    workletNode = new AudioWorkletNode(audioCtx, 'recorder-worklet');
  } catch(e) {
    alert('AudioWorklet לא נטען. פתח את האתר דרך שרת (למשל Live Server ב-VSCode) ולא כקובץ מתיקייה.');
    dlyState='idle'; btn.textContent=prevTxt; btn.style.opacity=1;
    return;
  }

  const mute=audioCtx.createGain(); mute.gain.value=0;
  source.connect(workletNode); workletNode.connect(mute); mute.connect(audioCtx.destination);
  
  workletNode.port.onmessage = e => {
    if (pos >= want) return;
    const c0 = e.data.mic, c1 = e.data.ref;
    const len = Math.min(c0.length, want - pos);
    for(let i=0; i<len; i++) { mic[pos]=c0[i]; ref[pos]=c1[i]; pos++; }
  };
  workletNode.port.postMessage({ cmd: 'start' });

  setTimeout(()=>{
    workletNode.port.postMessage({ cmd: 'stop' });
    try{ source.disconnect(workletNode); }catch(_){} try{ workletNode.disconnect(); }catch(_){} try{ mute.disconnect(); }catch(_){}
    dlyState='idle'; btn.textContent=prevTxt; btn.style.opacity=1;
    const m = tfSwap? ref: mic, r = tfSwap? mic: ref;
    const rmsOf=(a)=>{ let s=0; for(let i=0;i<a.length;i++) s+=a[i]*a[i]; return Math.sqrt(s/a.length); };
    const micRms=rmsOf(m), refRms=rmsOf(r);
    if(micRms<1e-4 || refRms<1e-4){ cb(null, micRms<1e-4?'mic':'ref'); return; }
    cb(computeDelay(r, m, sr));
  }, captureSec*1000+100);
}

const DLY_NAMES=['Top','Sub','FF'];
function dlyName(i){ return DLY_NAMES[i] || ('רמקול '+(i+1)); }
let dlySpeakers=[{name:dlyName(0),ms:null},{name:dlyName(1),ms:null}];
let dlyAnchor=0;
function setDlyCount(n){
  const cur=dlySpeakers.length;
  if(n>cur){ for(let i=cur;i<n;i++) dlySpeakers.push({name:dlyName(i),ms:null}); }
  else if(n<cur){ dlySpeakers=dlySpeakers.slice(0,n); if(dlyAnchor>=n) dlyAnchor=0; }
  renderDlySpk();
}
function renderDlySpk(){
  const box=document.getElementById('dlySpk'); if(!box) return;
  box.innerHTML=dlySpeakers.map((s,i)=>{
    let add='—';
    if(s.ms!=null && dlySpeakers[dlyAnchor] && dlySpeakers[dlyAnchor].ms!=null){
      if(i===dlyAnchor) add='<span style="color:var(--accent)">עוגן</span>';
      else{ const d=dlySpeakers[dlyAnchor].ms - s.ms;
        add = d>=0 ? '<b style="color:var(--accent)">+'+d.toFixed(2)+' ms</b>'
                   : '<span style="color:var(--warn)">'+d.toFixed(2)+' ms (מאוחר מהעוגן)</span>'; }
    }
    return '<div class="calRow" style="gap:6px">'+
      '<span class="dlyAnchor" data-a="'+i+'" title="בחר כעוגן" style="cursor:pointer;font-size:15px;color:'+(i===dlyAnchor?'var(--accent)':'var(--dim)')+'">'+(i===dlyAnchor?'◉':'◎')+'</span>'+
      '<input class="posName" data-i="'+i+'" value="'+escapeHtml(s.name||dlyName(i))+'" style="flex:1">'+
      '<span style="min-width:64px;font-size:11px;color:var(--dim)">'+(s.ms==null?'—':s.ms.toFixed(2)+'ms')+'</span>'+
      '<button class="toggle dlyMeasOne" data-i="'+i+'" style="padding:6px 10px;font-size:11px">מדוד</button>'+
      '<span style="min-width:74px;font-size:11px;text-align:end">'+add+'</span>'+
      '</div>';
  }).join('');
  box.querySelectorAll('.dlyAnchor').forEach(a=>a.addEventListener('click',function(){ dlyAnchor=+this.dataset.a; renderDlySpk(); }));
  box.querySelectorAll('.posName').forEach(inp=>inp.addEventListener('change',function(){ const i=+this.dataset.i; if(dlySpeakers[i]) dlySpeakers[i].name=this.value; }));
  box.querySelectorAll('.dlyMeasOne').forEach(b=>b.addEventListener('click',function(){
    const i=+this.dataset.i, btn=this;
    pickSource(()=>runDelayCapture(btn,(res)=>{
      if(res==null){ btn.textContent='נכשל'; setTimeout(()=>btn.textContent='מדוד',1500); return; }
      dlySpeakers[i].ms=res.ms; renderDlySpk();
    }),2100);
  }));
}
document.querySelectorAll('#dlyCountSeg button').forEach(b=>b.addEventListener('click',function(){
  document.querySelectorAll('#dlyCountSeg button').forEach(x=>x.classList.remove('on'));
  this.classList.add('on'); setDlyCount(+this.dataset.n);
}));
renderDlySpk();

function computeDelay(ref, mic, sr){
  const L = Math.min(ref.length, mic.length);
  const chunkSize = 8192;
  const hopSize = 4096;
  if(L < chunkSize) return null;

  const numChunks = Math.floor((L - chunkSize) / hopSize) + 1;
  if(numChunks < 1) return null;

  const avgRr = new Float64Array(chunkSize);
  const avgRi = new Float64Array(chunkSize);
  const xr = new Float64Array(chunkSize);
  const xi = new Float64Array(chunkSize);
  const yr = new Float64Array(chunkSize);
  const yi = new Float64Array(chunkSize);

  const win = new Float32Array(chunkSize);
  for(let i = 0; i < chunkSize; i++){
    win[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (chunkSize - 1)));
  }

  let validChunks = 0;
  for(let c = 0; c < numChunks; c++){
    const offset = c * hopSize;
    let eRef = 0, eMic = 0;

    for(let i = 0; i < chunkSize; i++){
      const rVal = ref[offset + i] * win[i];
      const mVal = mic[offset + i] * win[i];
      xr[i] = rVal; xi[i] = 0;
      yr[i] = mVal; yi[i] = 0;
      eRef += rVal * rVal;
      eMic += mVal * mVal;
    }

    if(eRef < 1e-7 || eMic < 1e-7) continue;

    fft(xr, xi, false);
    fft(yr, yi, false);

    for(let k = 0; k < chunkSize; k++){
      const cr = yr[k] * xr[k] + yi[k] * xi[k];
      const ci = yi[k] * xr[k] - yr[k] * xi[k];
      const mag = Math.hypot(cr, ci) + 1e-9;
      avgRr[k] += cr / mag;
      avgRi[k] += ci / mag;
    }
    validChunks++;
  }

  if(validChunks === 0) return null;

  for(let k = 0; k < chunkSize; k++){
    avgRr[k] /= validChunks;
    avgRi[k] /= validChunks;
  }

  fft(avgRr, avgRi, true);

  let best = -1e9, bi = 0;
  for(let k = 0; k < chunkSize; k++){
    if(avgRr[k] > best){
      best = avgRr[k];
      bi = k;
    }
  }

  let lag = bi;
  if(lag > chunkSize / 2) lag -= chunkSize;

  return { ms: (lag / sr) * 1000, samples: lag };
}

function measureBusy(){
  return measState==='measuring' || areaState==='measuring' || tfState==='measuring'
      || dlyState==='measuring' || rt60State==='capture';
}
function unfreezeForMeasure(){
  if(!frozen) return;
  frozen=false; snapCurve=null;
  const fz=document.getElementById('freezeBtn'); if(fz){ fz.classList.remove('on'); fz.textContent='הקפא'; }
}
function measurePosition(){
  if(!running){ alert('קודם הפעל את המיקרופון.'); return; }
  if(measureBusy()){ alert('מדידה אחרת פעילה — המתן לסיומה.'); return; }
  unfreezeForMeasure();
  const srcData = floatData;
  measAccum=new Float64Array(srcData.length); measFrames=0; measState='measuring';
  updateEqUI();
  setTimeout(()=>{
    const bins=measAccum.length, nyq=audioCtx.sampleRate/2, R6=Math.pow(2,1/6);
    const db=GEQ.map(fc=>{
      let lo=Math.floor((fc/R6)/nyq*bins), hi=Math.ceil((fc*R6)/nyq*bins);
      lo=Math.max(0,lo);hi=Math.min(bins-1,hi);if(hi<lo)hi=lo;
      let p=0; for(let i=lo;i<=hi;i++) p+=measAccum[i]/Math.max(1,measFrames);
      return 10*Math.log10(p+1e-12);
    });
    eqPositions.push({name:'מיקום '+(eqPositions.length+1), db}); measState='idle';
    computeAndShow(); updateEqUI(); renderEqList();
  },5000);
}
function renderEqList(){
  const box=document.getElementById('eqPosList'); if(!box) return;
  if(!eqPositions.length){ box.innerHTML=''; return; }
  box.innerHTML=eqPositions.map((p,i)=>
    '<div class="calRow"><input class="posName" data-i="'+i+'" value="'+escapeHtml(p.name||('מיקום '+(i+1)))+'">'+
    '<span class="del" data-del="'+i+'" title="מחק מיקום">🗑</span></div>').join('');
  box.querySelectorAll('.posName').forEach(inp=>inp.addEventListener('change',function(){
    const i=+this.dataset.i; if(eqPositions[i]) eqPositions[i].name=this.value; }));
  box.querySelectorAll('[data-del]').forEach(b=>b.addEventListener('click',function(){
    const i=+this.dataset.del; eqPositions.splice(i,1);
    if(eqPositions.length) computeAndShow(); else { eqMarks=null; eqCurveData=null; document.getElementById('eqList').innerHTML=''; hideGeqDock(); }
    updateEqUI(); renderEqList();
  }));
}
function avgPositions(){
  if(!eqPositions.length) return null;
  const out=new Float32Array(GEQ.length);
  for(let k=0;k<GEQ.length;k++){ let p=0; for(const pos of eqPositions) p+=db2lin(pos.db[k]); out[k]=10*Math.log10(p/eqPositions.length+1e-12); }
  return out;
}
function bandDbFromBins(bd,fLo,fHi,nyq,bins){
  let lo=Math.floor(fLo/nyq*bins), hi=Math.ceil(fHi/nyq*bins);
  lo=Math.max(0,lo);hi=Math.min(bins-1,hi);if(hi<lo)hi=lo;
  let p=0; for(let i=lo;i<=hi;i++) p+=db2lin(bd[i]);
  return 10*Math.log10(p+1e-12);
}
function computeAndShow(noModal){
  if(!eqPositions.length){ alert('מדוד לפחות מיקום אחד.'); return; }
  const band=avgPositions();
  if(!band) return;
  const resp=GEQ.map((fc,k)=> band[k] - (micCal?micCalAt(fc):0));
  {
    const inBand=resp.filter((v,k)=>GEQ[k]>=63&&GEQ[k]<=8000);
    if(Math.max(...inBand) < -62){
      const box=document.getElementById('eqList');
      if(box) box.innerHTML='<div class="sub" style="color:var(--warn)">⚠ לא זוהה אות מדידה.<br>'+
        '<span style="color:var(--dim)">ודא שרעש ורוד מנוגן דרך המערכת ושגיין המיקרופון פתוח, ומדוד שוב.</span></div>';
      hideGeqDock();
      lastEqCorr=null; eqMarks=null; eqCurveData=null;
      return;
    }
  }
  const rel=relByLevel(resp);
  const corr=buildCorr(resp, rel);
  eqCurveData={freqs:GEQ.slice(), corr:corr.slice()};
  showGeqDock('תיקון EQ · חד־ערוצי');
  drawGEQ(document.getElementById('eqCurveCanvas'), GEQ, corr);
  lastEqCorr=corr;
  renderEqResult();
  if(!noModal) showModal(eqPanel);
}
function paramFromCorr(corr){
  const cand=[];
  for(let k=1;k<GEQ.length-1;k++){ const v=corr[k], pv=corr[k-1], nv=corr[k+1];
    if(v==null||pv==null||nv==null) continue;
    const isMax=v>=pv&&v>nv&&v>1, isMin=v<=pv&&v<nv&&v<-1; if(!isMax&&!isMin) continue;
    const half=v/2; let li=k,ri=k;
    if(isMax){ while(li>0&&corr[li]!=null&&corr[li]>half)li--; while(ri<GEQ.length-1&&corr[ri]!=null&&corr[ri]>half)ri++; }
    else     { while(li>0&&corr[li]!=null&&corr[li]<half)li--; while(ri<GEQ.length-1&&corr[ri]!=null&&corr[ri]<half)ri++; }
    const q=Math.max(0.7,Math.min(8, GEQ[k]/Math.max(1,(GEQ[Math.min(GEQ.length-1,ri)]-GEQ[Math.max(0,li)]))));
    cand.push({f:GEQ[k],gain:v,q,type:v<0?'cut':'boost',prom:Math.abs(v)});
  }
  cand.sort((a,b)=>b.prom-a.prom);
  const picked=[]; cand.forEach(c=>{ if(!picked.some(p=>Math.abs(Math.log2(p.f/c.f))<0.66)) picked.push(c); });
  return picked.slice(0,6).sort((a,b)=>a.f-b.f);
}

function renderEqResult(){
  if(!lastEqCorr){ return; }
  const head='<div class="sub" style="margin-bottom:6px; color:var(--text); font-weight:600;">יעד '+(targetMode==='house'?'House':'שטוח')+
    (micCal?' · כיול פעיל':' · ללא כיול')+' · '+eqPositions.length+' מיקומים:</div>';
  const box=document.getElementById('eqList');
  box.innerHTML = head + (eqMode==='graphic' ? corrGridHtml(lastEqCorr, null) : corrParamHtml(lastEqCorr));
}

const rtPanel=document.getElementById('rtPanel'), rtStatus=document.getElementById('rtStatus');
safeOn('rtClose', 'click',closeModals);
safeOn('rtRange', 'input',e=>{
  rtRange=parseFloat(e.target.value);
  document.getElementById('rtRangeVal').textContent=rtRange+'dB';
  if(rt60Samples.length) analyzeRT60();
});
safeOn('rtLevel', 'input',e=>{
  rtLevel=parseInt(e.target.value,10);
  document.getElementById('rtLevelVal').textContent=rtLevel+'dB';
});
safeOn('rtRunBtn', 'click',startRT60);
safeOn('rtBtn', 'click',()=>{
  if(!running||!audioCtx){ alert('קודם הפעל את המיקרופון.'); return; }
  showModal(rtPanel);
  { const c=document.getElementById('rtCanvas'); if(c) c.style.display='none'; }
  rtStatus.innerHTML='כוונן עוצמה, ואז לחץ "התחל מדידה".';
});
function startRT60(){
  if(!running||!audioCtx){ alert('קודם הפעל את המיקרופון.'); return; }
  if(measureBusy()){ alert('מדידה אחרת פעילה — המתן לסיומה.'); return; }
  unfreezeForMeasure();
  rtStatus.innerHTML='מכין… משמיע רעש ורוד';
  const prevGenOn = genOn;
  const restoreType=genType; genType='pink';
  if(!genOn){ genStart(); }
  const boost=rtLevel;
  if(genGain) genGain.gain.setTargetAtTime(Math.pow(10,boost/20),audioCtx.currentTime,0.1);
  const prevSmooth=analyser.smoothingTimeConstant; analyser.smoothingTimeConstant=0;

  setTimeout(()=>{
    rtStatus.innerHTML='מודד דעיכה…';
    rt60Samples=[]; rt60State='capture';
    const nyq=audioCtx.sampleRate/2;
    const bandEdges=RT_BANDS.map(fc=>{ const bins=floatData.length;
      let lo=Math.floor((fc/1.4142)/nyq*bins), hi=Math.ceil((fc*1.4142)/nyq*bins);
      return [Math.max(0,lo),Math.min(bins-1,hi)]; });
    if(rt60Timer) clearInterval(rt60Timer);
    rt60Timer=setInterval(()=>{
      if(rt60State!=='capture' || !analyser) return;
      analyser.getFloatTimeDomainData(timeData);
      let s2=0, N=Math.min(2048,timeData.length);
      for(let i=timeData.length-N;i<timeData.length;i++){ const v=timeData[i]; s2+=v*v; }
      analyser.getFloatFrequencyData(floatData);
      const bands=bandEdges.map(([lo,hi])=>{ let p=0; for(let i=lo;i<=hi;i++) p+=db2lin(floatData[i]); return 10*Math.log10(p+1e-12); });
      rt60Samples.push({t:performance.now(), db:20*Math.log10(Math.sqrt(s2/N)+1e-9), bands});
    },10);
    setTimeout(()=>{
      const t=audioCtx.currentTime;
      if(genGain){ try{ genGain.gain.cancelScheduledValues(t);
        genGain.gain.setValueAtTime(genGain.gain.value,t);
        genGain.gain.linearRampToValueAtTime(0,t+0.005);}catch(_){} }
      rt60CutT=performance.now();
      setTimeout(()=>{
        rt60State='idle'; 
        if(rt60Timer){ clearInterval(rt60Timer); rt60Timer=null; }
        analyser.smoothingTimeConstant=prevSmooth;
        if(!prevGenOn) genStop(); 
        genType=restoreType;
        analyzeRT60();
      },2500);
    },400);
  },1200);
}

const RT_BANDS=[125,250,500,1000,2000,4000];
function analyzeDecay(series, cutT, needRange){
  const pre=series.filter(x=>x.t<cutT);
  const steady = pre.length? pre.reduce((a,x)=>a+x.db,0)/pre.length : Math.max(...series.map(x=>x.db));
  const post=series.filter(x=>x.t>=cutT).map(x=>({t:(x.t-cutT)/1000, db:x.db}));
  if(post.length<10) return null;
  const tail=post.slice(-Math.max(5,Math.floor(post.length*0.25)));
  const noise=tail.reduce((a,x)=>a+x.db,0)/tail.length;
  const hi=steady-5, lo=noise+5;
  const reg=post.filter(x=>x.db<=hi && x.db>=lo);
  if(reg.length<5 || (hi-lo)<Math.min(8,needRange)) return {rt60:null, span:hi-lo, steady, noise, post};
  let n=reg.length, st=0,sd=0,std=0,stt=0;
  reg.forEach(p=>{ st+=p.t; sd+=p.db; std+=p.t*p.db; stt+=p.t*p.t; });
  const slope=(n*std - st*sd)/(n*stt - st*st);
  const intercept=(sd - slope*st)/n;
  const rt60=-60/slope;
  return { rt60:(slope<0 && rt60>0.05 && rt60<10)?rt60:null, span:hi-lo, steady, noise, post, slope, intercept };
}
function analyzeRT60(){
  const s=rt60Samples;
  if(s.length<20){ rtStatus.innerHTML='מדידה נכשלה — נדגמו רק '+s.length+' דגימות.<br><span style="font-size:11px;color:var(--dim)">ודא שהמיקרופון פעיל ונסה שוב.</span>'; return; }
  const bb=analyzeDecay(s.map(x=>({t:x.t,db:x.db})), rt60CutT, rtRange);
  if(!bb || bb.post.length<10){ rtStatus.innerHTML='מדידה נכשלה — לא נלכדה דעיכה.'; return; }
  let bandsHtml='';
  if(s[0].bands){
    bandsHtml='<div class="tfGrid" style="margin-top:8px">';
    RT_BANDS.forEach((fc,bi)=>{
      const series=s.map(x=>({t:x.t, db:x.bands[bi]}));
      const r=analyzeDecay(series, rt60CutT, rtRange);
      const fStr=fc>=1000?(fc/1000)+'k':fc+'';
      const val=(r&&r.rt60)?r.rt60.toFixed(2)+'ש\'':'—';
      const cls=(r&&r.rt60)?(r.rt60>0.8?'cut':(r.rt60<0.3?'off':'boost')):'off';
      bandsHtml+='<div class="tfItem '+cls+'"><span class="f">'+fStr+'Hz</span><span class="g">'+val+'</span></div>';
    });
    bandsHtml+='</div>';
  }
  if(bb.rt60){
    const approx=bb.span<rtRange;
    rtStatus.innerHTML='RT60 ≈ <b>'+bb.rt60.toFixed(2)+' ש\'</b> <span style="font-size:11px;color:var(--dim)">(רחב־פס · טווח '+bb.span.toFixed(0)+'dB)</span>'+
      (approx?'<br><span style="font-size:10px;color:var(--warn)">משוער — טווח דעיכה קטן</span>':'')+bandsHtml;
    drawRTPlot(bb.post, bb.steady, bb.slope, bb.intercept);
  } else {
    rtStatus.innerHTML='אין דעיכה רחב־פס למדוד ('+(bb.span>0?bb.span.toFixed(0):'0')+'dB).'+
      '<br><span style="font-size:11px;color:var(--dim)">רמת אות: '+bb.steady.toFixed(0)+'dB · רעש רקע: '+bb.noise.toFixed(0)+'dB.<br>'+
      (bb.steady-bb.noise<15?'העלה עוצמת PA (האות קרוב מדי לרעש הרקע).':'הורד "טווח דעיכה נדרש".')+'</span>'+bandsHtml;
    drawRTPlot(bb.post, bb.steady, null, 0);
  }
}
function drawRTPlot(post, steady, slope, intercept){
  const c=document.getElementById('rtCanvas'); if(!c) return;
  c.style.display='block';
  const x=c.getContext('2d');
  const W=c.width, H=c.height; x.clearRect(0,0,W,H);
  const tMax=Math.max(0.5, post.length?post[post.length-1].t:1);
  const dbMin=steady-65, dbMax=steady+3;
  const X=t=>t/tMax*W, Y=db=>H-(db-dbMin)/(dbMax-dbMin)*H;
  x.strokeStyle=sunMode?'#cbd5e1':'#2b3646'; x.fillStyle=sunMode?'#475569':'#8b97a5'; x.font='9px monospace';
  for(let d=0;d>=-60;d-=10){ const yy=Y(steady+d); x.globalAlpha=.5;
    x.beginPath();x.moveTo(0,yy);x.lineTo(W,yy);x.stroke(); x.globalAlpha=1; x.fillText(d+'dB',2,yy-2); }
  x.strokeStyle='#2f9bff'; x.lineWidth=1.5; x.beginPath();
  post.forEach((p,i)=>{ i?x.lineTo(X(p.t),Y(p.db)):x.moveTo(X(p.t),Y(p.db)); }); x.stroke();
  if(slope!=null){
    x.strokeStyle='#50e68c'; x.lineWidth=2; x.setLineDash([5,3]); x.beginPath();
    x.moveTo(X(0),Y(intercept)); x.lineTo(X(tMax),Y(intercept+slope*tMax)); x.stroke(); x.setLineDash([]);
  }
}
safeOn('res', 'input',e=>{
  const bpo=Math.max(3,Math.min(24,parseInt(e.target.value,10)));
  document.getElementById('resVal').textContent='1/'+bpo+' אוקטבה';
  buildBands(bpo);
  prefSet('rta_res', bpo);
});
function setFft(n){
  fftSize=n;
  if(analyser){
    analyser.fftSize=n; analyserRef.fftSize=n;
    floatData=new Float32Array(analyser.frequencyBinCount);
    floatDataRef=new Float32Array(analyserRef.frequencyBinCount);
    timeData=new Float32Array(analyser.fftSize);
    timeDataRef=new Float32Array(analyserRef.fftSize);
    _pfx=null;
  }
}
document.querySelectorAll('#fftSeg button').forEach(b=>b.addEventListener('click',function(){
  document.querySelectorAll('#fftSeg button').forEach(x=>x.classList.remove('on'));
  this.classList.add('on'); setFft(parseInt(this.dataset.n,10)); prefSet('rta_fft', this.dataset.n);
}));
safeOn('mRta', 'click',()=>setMode('rta'));
safeOn('mSpec', 'click',()=>setMode('spec'));
safeOn('tfOverlayHdr', 'click',()=>setTfOverlay(!tfOverlay));
let alignOn=false;
function setAlign(on){
  alignOn=on;
  const bar=document.getElementById('alignBar'); if(bar) bar.classList.toggle('show',on);
  const stage=document.getElementById('stage');
  const b=document.getElementById('alignBtn'); if(b) b.classList.toggle('on',on);
  if(on) closeModals();
  // דחיפת הגרף: הקנבס מתכווץ לפי גובה הסרגל
  if(stage){
    const h = (on && bar) ? bar.offsetHeight : 0;   // offsetHeight מכריח חישוב layout
    stage.style.setProperty('--bar-h', h+'px');
    stage.classList.toggle('bar-open', on);
  }
  if(typeof resize==='function') resize();
}
safeOn('alignBtn','click',()=>setAlign(!alignOn));
safeOn('alignClose','click',()=>setAlign(false));
safeOn('startBtn', 'click',()=>start());
safeOn('stopBtn', 'click',resetSession);
function resetSession(){
  if(audioCtx && audioCtx.state==='suspended') audioCtx.resume();
  const tr = stream && stream.getAudioTracks && stream.getAudioTracks()[0];
  if(running && (!tr || tr.readyState==='ended')){ stop(); start(); return; }
  peaks.fill(0); avgBuf.fill(0); snapCurve=null; frozen=false;
  phaseSub=null; phaseTop=null; showXover=false; phMeasuring=false;
  { const s=document.getElementById('phSubBtn'); if(s){ s.classList.remove('on'); s.textContent='מדוד + לכוד סאב'; s.disabled=false; } }
  { const t=document.getElementById('phTopBtn'); if(t){ t.classList.remove('on'); t.textContent='מדוד + לכוד טופ'; t.disabled=false; } }
  { const st=document.getElementById('phStatus'); if(st){ st.textContent='מדוד סאב לבד, ואז טופ לבד — כל מדידה 3 שניות.'; st.style.color='var(--dim)'; } }
  abA=null; abB=null; abView='off';
  { const a=document.getElementById('abCapA'); if(a){ a.classList.remove('on'); a.textContent='לכוד לפני (A)'; } }
  { const b=document.getElementById('abCapB'); if(b){ b.classList.remove('on'); b.textContent='לכוד אחרי (B)'; } }
  refCurve=null;
  { const rc=document.getElementById('refCurveBtn'); if(rc){ rc.classList.remove('on'); rc.textContent='שמור כ״לפני״'; } }
  const fz=document.getElementById('freezeBtn'); fz.classList.remove('on'); fz.textContent='הקפא';
  eqPositions=[]; eqMarks=null; eqCurveData=null; lastEqCorr=null;
  { const pl=document.getElementById('eqPosList'); if(pl) pl.innerHTML=''; const el=document.getElementById('eqList'); if(el) el.innerHTML=''; }
  document.getElementById('eqList').innerHTML=''; hideGeqDock();
  updateEqUI();
  areas=[]; renderAreaList();
  document.getElementById('areaEqCanvas').style.display='none';
  document.getElementById('areaEqList').innerHTML='';
  tfResult=null; document.getElementById('tfGeqList').innerHTML='';
  document.getElementById('tfCanvas').style.display='none';
  resetDelay();
  fbTrack.clear(); fbPanel.innerHTML='';
  leqSumP=0; leqN=0; splMax=-120; lvlPeak=-120;
  targetMode='flat'; document.querySelectorAll('.tgtSeg button').forEach(b=>b.classList.toggle('on', b.dataset.t==='flat'));
  weightMode='Z'; const wb=document.getElementById('wgtBtn'); wb.textContent='dBZ'; wb.classList.remove('on'); document.getElementById('wLbl').textContent='Z';
  if(viewMin!==FMIN||viewMax!==FMAX){ viewMin=FMIN; viewMax=FMAX; buildBands(curBpo); document.getElementById('zoomBtn').style.display='none'; }
  if(genOn) genStop();
  closeModals();
}

function setMode(m){
  mode=m;
  document.getElementById('mRta').classList.toggle('on',m==='rta');
  document.getElementById('mSpec').classList.toggle('on',m==='spec');
  if(specCtx){
    specCtx.fillStyle=sunMode ? '#f8fafc' : '#0d1117';
    specCtx.fillRect(0,0,specCanvas.width,specCanvas.height);
  }
}

function buildWeighting(nyquist,bins){
  weightA=new Float32Array(bins); weightC=new Float32Array(bins);
  for(let i=0;i<bins;i++){
    const f=i*nyquist/bins, f2=f*f;
    const ra=(12194**2*f2*f2)/((f2+20.6**2)*Math.sqrt((f2+107.7**2)*(f2+737.9**2))*(f2+12194**2));
    weightA[i]= f>0 ? 20*Math.log10(ra)+2.00 : -120;
    const rc=(12194**2*f2)/((f2+20.6**2)*(f2+12194**2));
    weightC[i]= f>0 ? 20*Math.log10(rc)+0.06 : -120;
  }
}

async function start(deviceId){
  errBox.style.display='none';
  try{
    const audio = {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      channelCount: { ideal: 2 }
    };
    if(deviceId && typeof deviceId === 'string') audio.deviceId = { exact: deviceId };
    activeInId = deviceId || '';
    
    stream = await navigator.mediaDevices.getUserMedia({ audio });
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    if(outSinkId && typeof audioCtx.setSinkId === 'function'){ 
      try{ await audioCtx.setSinkId(outSinkId); }catch(_){} 
    }
    if(audioCtx.state === 'suspended') await audioCtx.resume();
    try {
      await audioCtx.audioWorklet.addModule('recorder-worklet.js');
      workletReady=true;
    } catch(err) {
      workletReady=false;
      console.warn('AudioWorklet failed to load.', err);
    }

    source = audioCtx.createMediaStreamSource(stream);
    source.channelCount = 2;
    source.channelCountMode = 'explicit';

    const track = stream.getAudioTracks()[0];
    track.addEventListener('ended',()=>{
      if(!running) return;
      errBox.style.display='block';
      errBox.textContent='מקור הקלט נותק. חבר מחדש ולחץ "אפס סשן".';
    });
    const settings = track.getSettings ? track.getSettings() : {};
    chReceived = settings.channelCount || source.channelCount || 1;
    const isSafari=/^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent);
    const ci = document.getElementById('chCount');
    if(ci){
      if(chReceived>=2){ ci.textContent='ערוצים: '+chReceived+' ✓ סטריאו'; ci.style.color='#39d98a'; }
      else { ci.innerHTML='ערוצים: 1 ⚠ מונו — אין ערוץ 2'+(!isSafari?' · לערוץ 2 השתמש ב-Safari':''); ci.style.color='var(--hot)'; }
    }

    analyser = audioCtx.createAnalyser();
    analyser.fftSize = fftSize;
    analyser.smoothingTimeConstant = parseFloat(document.getElementById('smooth').value);
    analyser.minDecibels = -100; 
    analyser.maxDecibels = -10;

    analyserRef = audioCtx.createAnalyser();
    analyserRef.fftSize = fftSize; 
    analyserRef.smoothingTimeConstant = 0.3;
    analyserRef.minDecibels = -100; 
    analyserRef.maxDecibels = -10;

    analyserMeter = audioCtx.createAnalyser();
    analyserMeter.fftSize = 2048;

    const splitter = audioCtx.createChannelSplitter(2);
    source.connect(splitter);

    splitter.connect(analyser, 0);
    splitter.connect(analyserRef, 1);
    source.connect(analyserMeter);

    floatData = new Float32Array(analyser.frequencyBinCount);
    floatDataRef = new Float32Array(analyserRef.frequencyBinCount);
    timeData = new Float32Array(analyser.fftSize);
    timeDataRef = new Float32Array(analyserRef.fftSize);
    timeDataMeter = new Float32Array(2048);
    
    buildWeighting(audioCtx.sampleRate / 2, analyser.frequencyBinCount);
    resize();
    peaks.fill(0); fbTrack.clear(); fbPanel.innerHTML = ''; lvlPeak = -120;
    leqSumP = 0; leqN = 0; splMax = -120;
    smoothedDbfs = -120;
    running = true; idle.style.display = 'none'; dot.classList.add('live');
    meterEl.style.display = 'flex'; document.getElementById('stats').style.display = 'flex';
    document.getElementById('stopBtn').style.display = '';
    populateInputs();
    draw();
  } catch(e) {
    errBox.style.display = 'block';
    errBox.textContent = 'לא ניתן לגשת למיקרופון: ' + (e.message || e.name) + '. יש לאשר הרשאה ולהריץ מעל HTTPS.';
  }
}

let userPickedIn=false, userPickedOut=false;
async function populateInputs(){
  try{
    const devs=await navigator.mediaDevices.enumerateDevices();
    const ins=devs.filter(d=>d.kind==='audioinput');
    const sel=document.getElementById('inSel');
    sel.innerHTML='';
    { const o=document.createElement('option'); o.value=''; o.textContent='ברירת מחדל של המערכת'; sel.appendChild(o); }
    ins.forEach((d,i)=>{
      if(d.deviceId==='default'||d.deviceId==='') return;
      const o=document.createElement('option');
      o.value=d.deviceId; o.textContent=d.label||('מיקרופון '+(i+1));
      sel.appendChild(o);
    });
    sel.value = userPickedIn ? (activeInId||'') : '';

    const outs=devs.filter(d=>d.kind==='audiooutput');
    const osel=document.getElementById('outSel');
    osel.innerHTML='';
    { const o=document.createElement('option'); o.value=''; o.textContent='ברירת מחדל של המערכת'; osel.appendChild(o); }
    outs.forEach((d,i)=>{
      if(d.deviceId==='default'||d.deviceId==='') return;
      const o=document.createElement('option');
      o.value=d.deviceId; o.textContent=d.label||('פלט '+(i+1));
      osel.appendChild(o);
    });
    osel.value = userPickedOut ? (outSinkId||'') : '';
  }catch(e){}
}
let outSinkId=null;
async function applyOutput(deviceId){
  outSinkId=deviceId;
  try{
    if(audioCtx && typeof audioCtx.setSinkId==='function'){ await audioCtx.setSinkId(deviceId||''); return true; }
  }catch(e){}
  return false;
}
safeOn('outSel', 'change',async e=>{
  userPickedOut = e.target.value!=='';
  const ok=await applyOutput(e.target.value);
  if(!ok) alert('הדפדפן לא תומך בבחירת יציאת פלט. הגדר את הפלט ב־macOS: הגדרות → סאונד → פלט.');
});

async function switchInput(deviceId){
  if(!running) return;
  if(raf) cancelAnimationFrame(raf);
  if(stream) stream.getTracks().forEach(t=>t.stop());
  if(audioCtx) await audioCtx.close();
  await start(deviceId);
}

function stop(){
  running=false; if(raf) cancelAnimationFrame(raf);
  if(rt60Timer){ clearInterval(rt60Timer); rt60Timer=null; }
  rt60State='idle'; measState='idle'; areaState='idle'; dlyState='idle';
  analyserRef=null; floatDataRef=null; tfState='idle'; eqCurveData=null;
  genSrc=null; genOsc=null; genGain=null; genOn=false;
  const gb=document.getElementById('genOnBtn'); if(gb){gb.classList.remove('on');gb.textContent='▶ הפעל אות';}
  if(stream) stream.getTracks().forEach(t=>t.stop());
  if(audioCtx) audioCtx.close();
  dot.classList.remove('live'); idle.style.display='flex';
  document.getElementById('stopBtn').style.display='none';
  meterEl.style.display='none'; document.getElementById('stats').style.display='none';
  peakHzEl.textContent='—'; fbPanel.innerHTML='';
  ctx.clearRect(0,0,cv.clientWidth,cv.clientHeight);
}

function norm(db){ return Math.max(0,Math.min(1,(db-floorDb)/(ceilDb-floorDb))); }
function heat(t){
  t=Math.max(0,Math.min(1,t));
  const r=Math.round(255*Math.max(0,Math.min(1,1.3*t-0.35)));
  const g=Math.round(255*Math.max(0,Math.min(1,1.1*t-0.05)));
  const b=Math.round(255*Math.max(0,Math.min(1,0.30+0.70*t)));
  return 'rgb('+r+','+g+','+b+')';
}
function fLabel(f){return f>=1000?(f%1000?(f/1000).toFixed(1):f/1000)+'k':''+f;}

function updateLevel(){
  if(!analyserMeter) return;
  analyserMeter.getFloatTimeDomainData(timeDataMeter);
  const dbfs = levelDb(timeDataMeter, 2048);

  if (dbfs > smoothedDbfs) {
    smoothedDbfs += (dbfs - smoothedDbfs) * 0.55;
  } else {
    smoothedDbfs += (dbfs - smoothedDbfs) * 0.035;
  }

  const now=performance.now();
  if(smoothedDbfs>lvlPeak || now-lvlPeakT>1500){ lvlPeak=smoothedDbfs; lvlPeakT=now; }
  const pct=v=>Math.max(0,Math.min(100,(v+60)/60*100));
  meterFill.style.width=pct(smoothedDbfs)+'%';
  meterPeak.style.insetInlineStart=pct(lvlPeak)+'%';
  if(meterUnit==='SPL') meterVal.textContent=(smoothedDbfs+calib).toFixed(0)+' dB SPL≈';
  else meterVal.textContent=smoothedDbfs.toFixed(1)+' dBFS';

  const w = weightMode==='A'?weightA : weightMode==='C'?weightC : null;
  let p=0;
  for(let i=1;i<floatData.length;i++){
    const wdb = w ? w[i] : 0;
    if(wdb<-100) continue;
    p += db2lin(floatData[i]+wdb);
  }
  const lvl = 10*Math.log10(p+1e-12) + calib;
  if(!frozen){ leqSumP += p; leqN++; if(lvl>splMax) splMax=lvl; }
  const leq = 10*Math.log10(leqSumP/Math.max(1,leqN)+1e-12) + calib;
  const unit = calib>0 ? ' dB'+weightMode : '';
  const fmt=x=>x.toFixed(1)+unit;
  document.getElementById('splNow').textContent=fmt(lvl);
  document.getElementById('splLeq').textContent=fmt(leq);
  document.getElementById('splMax').textContent=fmt(splMax);
}

let _lastDraw=0;
function draw(){
  raf=requestAnimationFrame(draw);
  const now=performance.now();
  if(now-_lastDraw < 32) return;
  _lastDraw=now;
  updateSignalTint();
  if(!frozen) analyser.getFloatFrequencyData(floatData);
  if(measState==='measuring' && measAccum){
    const srcData = floatData;
    for(let i=0;i<srcData.length;i++) measAccum[i]+=db2lin(srcData[i]);
    measFrames++;
  }
  if(areaState==='measuring' && areaAccum){
    const srcData = floatData;
    for(let i=0;i<srcData.length;i++) areaAccum[i]+=db2lin(srcData[i]);
    areaFrames++;
  }
  if(analyserRef && floatDataRef && (tfState==='measuring' || tfPanel.classList.contains('open'))){
    analyserRef.getFloatFrequencyData(floatDataRef);
    if(tfState==='measuring' && tfMic){
      const mic = tfSwap? floatDataRef : floatData;
      const ref = tfSwap? floatData : floatDataRef;
      for(let i=0;i<tfMic.length;i++){
        tfMic[i]+=db2lin(mic[i]);
        tfRef[i]+=db2lin(ref[i]);
      }
      tfFrames++;
    }
    if(tfPanel.classList.contains('open')) updateTfLevels();
  }
  if(analyserRef && floatDataRef && dlyPanel.classList.contains('open')){
    analyser.getFloatTimeDomainData(timeData);
    if(!timeDataRef || timeDataRef.length!==analyserRef.fftSize) timeDataRef=new Float32Array(analyserRef.fftSize);
    analyserRef.getFloatTimeDomainData(timeDataRef);
    setGain('dlyMic', levelDb(timeData,2048));
    setGain('dlyRef', levelDb(timeDataRef,2048));
  }
  if(eqPanel.classList.contains('open')){
    analyser.getFloatTimeDomainData(timeData);
    const targetData = timeData;
    setGainEl(document.getElementById('eqMicFill'), document.getElementById('eqMicGain'), levelDb(targetData,2048));
  }
  if(areaPanel.classList.contains('open')){
    analyser.getFloatTimeDomainData(timeData);
    setGainEl(document.getElementById('areaMicFill'), document.getElementById('areaMicGain'), levelDb(timeData,2048));
  }
  if(genPanel.classList.contains('open')){
    analyser.getFloatTimeDomainData(timeData);
    const micDb=levelDb(timeData,2048);
    setGainEl(document.getElementById('gainMicFill'), document.getElementById('gainMicGain'), micDb);
    const tip=document.getElementById('gainTip');
    if(tip){
      let msg, col='var(--dim)';
      if(!genOn) msg='נגן אות כדי לבדוק את הרמות.';
      else if(micDb>=-1){ msg='⚠ קליפ! הורד את גיין המיק\' במיקסר.'; col='var(--hot)'; }
      else if(micDb>=-8){ msg='חזק — אפשר להוריד מעט גיין מיק\'.'; col='var(--warn)'; }
      else if(micDb>=-40){ msg='✓ רמה טובה — אפשר למדוד.'; col='#39d98a'; }
      else { msg='חלש — הגבר גיין מיק\' במיקסר או העלה עוצמת PA.'; col='var(--warn)'; }
      tip.textContent=msg; tip.style.color=col;
    }
  }
  if(rtPanel.classList.contains('open')){
    analyser.getFloatTimeDomainData(timeData);
    setGainEl(document.getElementById('rtLvlFill'), document.getElementById('rtLvlGain'), levelDb(timeData,2048));
  }
  updateLevel();
  const W=cv.clientWidth,H=cv.clientHeight;
  const nyquist=audioCtx.sampleRate/2, bins=floatData.length;
  const logMin=Math.log(ISO[0]), logMax=Math.log(ISO[BANDS-1]);
  const xForFreq=f=>((Math.log(f)-logMin)/(logMax-logMin))*W;

  if(mode==='rta') drawRta(W,H,nyquist,bins,xForFreq);
  else drawSpec(W,H,nyquist,bins,xForFreq);

  fbFrameCounter++;
  if(fbOn && !frozen && fbFrameCounter % 4 === 0) detectFeedback(nyquist,bins);
}

function computeComplexTf(){
  if(!analyser || !analyserRef) return null;
  analyser.getFloatTimeDomainData(timeData);
  if(!timeDataRef || timeDataRef.length!==analyserRef.fftSize) timeDataRef=new Float32Array(analyserRef.fftSize);
  analyserRef.getFloatTimeDomainData(timeDataRef);

  const m = tfSwap ? timeDataRef : timeData;
  const r = tfSwap ? timeData : timeDataRef;

  const N = TF_FFT_N;
  const shift = Math.max(0, Math.min(r.length - N, tfDelaySamples));

  for(let i=0; i<N; i++){
    tfXr[i] = r[shift + i] * tfWin[i]; tfXi[i] = 0;
    tfYr[i] = m[i] * tfWin[i];        tfYi[i] = 0;
  }

  fft(tfXr, tfXi, false);
  fft(tfYr, tfYi, false);

  const halfN = N / 2;
  const alpha = tfSmoothA;

  for(let k=0; k<halfN; k++){
    const rx = tfXr[k], ix = tfXi[k];
    const ry = tfYr[k], iy = tfYi[k];

    const pxx = rx*rx + ix*ix;
    const pyy = ry*ry + iy*iy;
    const pxyRe = ry*rx + iy*ix;
    const pxyIm = iy*rx - ry*ix;

    tfPxx[k] = alpha * tfPxx[k] + (1 - alpha) * pxx;
    tfPyy[k] = alpha * tfPyy[k] + (1 - alpha) * pyy;
    tfPxyRe[k] = alpha * tfPxyRe[k] + (1 - alpha) * pxyRe;
    tfPxyIm[k] = alpha * tfPxyIm[k] + (1 - alpha) * pxyIm;
  }
}

function drawRta(W,H,nyquist,bins,xForFreq){
  ctx.clearRect(0,0,W,H);
  if(sunMode){
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0,0,W,H);
  }
  if(!_pfx || _pfx.length!==bins+1) _pfx=new Float64Array(bins+1);
  { let acc=0; _pfx[0]=0; for(let i=0;i<bins;i++){ acc+=db2lin(floatData[i]); _pfx[i+1]=acc; } }
  const bandPowDb=(fLo,fHi)=>{
    let lo=Math.floor(fLo/nyquist*bins), hi=Math.ceil(fHi/nyquist*bins);
    lo=Math.max(0,lo); hi=Math.min(bins-1,hi); if(hi<lo)hi=lo;
    return 10*Math.log10((_pfx[hi+1]-_pfx[lo])+1e-12);
  };
  const meterH = (meterEl && meterEl.style.display!=='none') ? 40 : 6;
  const plotH = H - meterH - 16;
  const labelY = H - meterH - 4;
  ctx.strokeStyle=sunMode ? '#cbd5e1' : '#2b3646'; 
  ctx.fillStyle=sunMode ? '#475569' : '#aeb9c7'; 
  ctx.font='11px monospace'; ctx.textAlign='center';
  const lo=ISO[0], hi=ISO[BANDS-1];
  [20,31.5,50,100,200,500,1000,2000,5000,10000,20000].filter(f=>f>=lo&&f<=hi).forEach(f=>{
    const x=xForFreq(f);
    ctx.globalAlpha=.6; ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,plotH);ctx.stroke(); ctx.globalAlpha=1;
    ctx.fillText(fLabel(f)+'Hz',x,labelY);
  });
  [0.25,0.5,0.75].forEach(p=>{ctx.globalAlpha=.3;ctx.strokeStyle=sunMode?'#cbd5e1':'#2b3646';ctx.beginPath();ctx.moveTo(0,plotH*p);ctx.lineTo(W,plotH*p);ctx.stroke();ctx.globalAlpha=1;});

  const bw=W/BANDS, gap=Math.max(0.5,bw*0.12);
  const tfOpen = ((tfOverlay || (typeof tfPanel!=='undefined' && tfPanel.classList.contains('open')) || alignOn) && floatDataRef && analyserRef);
  
  const qBar = document.getElementById('tfQuickBar');
  if(qBar) qBar.classList.toggle('show', tfOpen);

  let peakBand=-1,peakVal=0;
  const abCompare = (abView==='both' || abView==='delta') && (abA || abB);

  for(let b=0;b<BANDS;b++){
    const fc=ISO[b];
    const rawDb=bandPowDb(fc/R,fc*R);
    lastBandDb[b]=rawDb;
    let v=norm(rawDb);
    if(avgOn){ avgBuf[b]=avgBuf[b]*0.9+v*0.1; v=avgBuf[b]; } else { avgBuf[b]=v; }
    lastV[b]=v;
    if(v>peakVal){peakVal=v;peakBand=b;}
    
    if(!tfOpen && !abCompare){
      const x=b*bw+gap/2, barW=bw-gap;
      const barH=v*plotH, y=plotH-barH;
      let col= v<0.85?'rgba('+accentRgb[0]+','+accentRgb[1]+','+accentRgb[2]+','+(0.4+v).toFixed(2)+')' : 'var(--hot)';
      ctx.fillStyle=col; ctx.fillRect(x,y,barW,barH);
      if(peakHold){
        if(v>=peaks[b]) peaks[b]=v; else peaks[b]=Math.max(0,peaks[b]-0.005);
        const py=plotH-peaks[b]*plotH;
        ctx.fillStyle=sunMode?'#0f172a':'rgba(255,255,255,.85)'; ctx.fillRect(x,py-2,barW,2);
      }
    }
  }
  
  if(tfOpen){
    const alignView = alignOn;
    if(!frozen) analyserRef.getFloatFrequencyData(floatDataRef);
    if(!_pfxRef || _pfxRef.length!==bins+1) _pfxRef=new Float64Array(bins+1);
    { let acc=0; _pfxRef[0]=0; for(let i=0;i<bins;i++){ acc+=db2lin(floatDataRef[i]); _pfxRef[i+1]=acc; } }
    const refBandDb=(fLo,fHi)=>{ let lo=Math.floor(fLo/nyquist*bins),hi=Math.ceil(fHi/nyquist*bins); lo=Math.max(0,lo);hi=Math.min(bins-1,hi);if(hi<lo)hi=lo; return 10*Math.log10((_pfxRef[hi+1]-_pfxRef[lo])+1e-12); };
    
    const micPts=[];
    const refPts=[];
    const stepPx = 1;
    for(let px = 0; px <= W; px += stepPx){
      const f = freqForX(px);
      const fLo = f / R;
      const fHi = f * R;
      const mDb = bandPowDb(fLo, fHi);
      const rDb = refBandDb(fLo, fHi);
      micPts.push([px, plotH - norm(mDb) * plotH]);
      refPts.push([px, plotH - norm(rDb) * plotH]);
    }

    if(!alignView){
    ctx.beginPath(); micPts.forEach(([x,y],i)=> i?ctx.lineTo(x,y):ctx.moveTo(x,y)); ctx.lineTo(micPts[micPts.length-1][0],plotH); ctx.lineTo(micPts[0][0],plotH); ctx.closePath();
    ctx.fillStyle='rgba('+accentRgb.join(',')+',0.13)'; ctx.fill();
    ctx.beginPath(); micPts.forEach(([x,y],i)=> i?ctx.lineTo(x,y):ctx.moveTo(x,y));
    ctx.strokeStyle='rgb('+accentRgb.join(',')+')'; ctx.lineWidth=2; ctx.lineJoin='round'; ctx.stroke();
    
    ctx.beginPath(); refPts.forEach(([x,y],i)=> i?ctx.lineTo(x,y):ctx.moveTo(x,y));
    ctx.strokeStyle='#d97706'; ctx.lineWidth=2; ctx.lineJoin='round'; ctx.stroke();
    }

    computeComplexTf();

    if(showTfCoh && !alignView){
      ctx.beginPath();
      for(let px = 0; px <= W; px += 2){
        const f = freqForX(px);
        const k = Math.min(TF_FFT_N/2 - 1, Math.round(f / nyquist * (TF_FFT_N/2)));
        const pxx = tfPxx[k], pyy = tfPyy[k];
        const pxySq = tfPxyRe[k]*tfPxyRe[k] + tfPxyIm[k]*tfPxyIm[k];
        const coh = Math.max(0, Math.min(1, pxySq / (pxx * pyy + 1e-12)));
        const y = plotH - coh * plotH;
        px === 0 ? ctx.moveTo(px, y) : ctx.lineTo(px, y);
      }
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.75)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 2]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if(showTfPhase && !alignView){
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.9)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      let penDown=false, prevY=0;
      for(let px = 0; px <= W; px += 2){
        const f = freqForX(px);
        const k = Math.min(TF_FFT_N/2 - 1, Math.round(f / nyquist * (TF_FFT_N/2)));
        const pxx = tfPxx[k], pyy = tfPyy[k];
        const pxySq = tfPxyRe[k]*tfPxyRe[k] + tfPxyIm[k]*tfPxyIm[k];
        const coh = Math.max(0, Math.min(1, pxySq / (pxx * pyy + 1e-12)));
        if(coh < tfCohGate){ penDown=false; continue; }   // שער קוהרנטיות: מסתיר פאזה לא-אמינה
        const phaseRad = Math.atan2(tfPxyIm[k], tfPxyRe[k]);
        const phaseNorm = 0.5 - (phaseRad / (2 * Math.PI));
        const y = plotH * Math.max(0, Math.min(1, phaseNorm));
        if(penDown && Math.abs(y - prevY) > plotH*0.5){ penDown=false; } // שבירה ב-wrap ±180°
        penDown ? ctx.lineTo(px, y) : ctx.moveTo(px, y);
        penDown=true; prevY=y;
      }
      ctx.stroke();
    }

    // ---- יישור חיתוך סאב/טופ: פאזה לא-עטופה + סמן + Δφ ----
    if(alignView || (showXover && (phaseSub || phaseTop))){
      const N2 = TF_FFT_N/2;
      const toDeg=r=>r*180/Math.PI;
      const wrap=d=>{ while(d>180)d-=360; while(d<-180)d+=360; return d; };
      // ביטול עטיפה (unwrap) של צילום פאזה, מגודר בקוהרנטיות
      const unwrapSnap=(snap)=>{
        if(!snap) return null;
        const u=new Float32Array(N2); let cum=0, prev=0, have=false;
        for(let k=0;k<N2;k++){
          if(snap.coh[k] < tfCohGate){ u[k]=NaN; have=false; continue; }
          const p=snap.ph[k];
          if(have){ let d=p-prev; while(d>Math.PI)d-=2*Math.PI; while(d<-Math.PI)d+=2*Math.PI; cum+=d; }
          else cum=p;
          u[k]=cum; prev=p; have=true;
        }
        return u;
      };
      const uSub = alignView ? unwrapSnap(phaseSub) : null;
      const uTop = alignView ? unwrapSnap(phaseTop) : null;

      // קביעת טווח Y אוטומטי (רק ב-align עם unwrap)
      let yMinDeg=-180, yMaxDeg=180;
      if(alignView && (uSub || uTop)){
        let mn=1e9, mx=-1e9;
        [uSub,uTop].forEach(u=>{ if(!u) return; for(let k=0;k<N2;k++){ const v=u[k]; if(!isNaN(v)){ const d=toDeg(v); if(d<mn)mn=d; if(d>mx)mx=d; } } });
        if(mn<mx){ const pad=Math.max(30,(mx-mn)*0.15); yMinDeg=mn-pad; yMaxDeg=mx+pad; }
      }
      // ---- פריסה: תגובה (dB) למעלה, פאזה (°) למטה ----
      const magH = alignView ? plotH*0.5 : 0;
      const phBase = magH + (alignView?8:0);
      const phH = plotH - phBase;
      const degToY = deg => phBase + phH*(1-(deg-yMinDeg)/(yMaxDeg-yMinDeg));

      // קנה מידה אוטומטי למגניטודה מתוך תגובת הסאב/טופ
      let magMin=-60, magMax=0;
      if(alignView){
        let mn=1e9, mx=-1e9;
        [phaseSub,phaseTop].forEach(s=>{ if(!s||!s.mag) return; for(let k=0;k<N2;k++){ if(s.coh[k]>=tfCohGate){ const m=s.mag[k]; if(m<mn)mn=m; if(m>mx)mx=m; } } });
        if(mn<mx){ const pad=Math.max(6,(mx-mn)*0.12); magMin=mn-pad; magMax=mx+pad; }
      }
      const magToY = db => Math.max(0,Math.min(magH, magH*(1-(db-magMin)/(magMax-magMin))));

      if(alignView){
        // רשת מגניטודה + תוויות dB
        ctx.strokeStyle=sunMode?'rgba(0,0,0,.10)':'rgba(255,255,255,.08)'; ctx.lineWidth=1;
        ctx.fillStyle=sunMode?'#475569':'#64748b'; ctx.font='10px monospace';
        const mstep=(magMax-magMin)>40?12:6;
        for(let d=Math.ceil(magMin/mstep)*mstep; d<=magMax; d+=mstep){
          const y=magToY(d); if(y<0||y>magH) continue;
          ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke();
          const pd=ctx.direction; ctx.direction='ltr'; ctx.textAlign='left';
          ctx.fillText(d.toFixed(0)+'dB', 4, y-2);
          ctx.direction=pd; ctx.textAlign='start';
        }
        // קו מפריד בין תגובה לפאזה
        ctx.strokeStyle=sunMode?'rgba(0,0,0,.25)':'rgba(255,255,255,.22)'; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(0,magH); ctx.lineTo(W,magH); ctx.stroke();
        // תוויות אזור
        ctx.fillStyle=sunMode?'#94a3b8':'#94a3b8'; ctx.font='10px monospace';
        const pd2=ctx.direction; ctx.direction='rtl'; ctx.textAlign='right';
        ctx.fillText('תגובה', W-6, 12);
        ctx.fillText('פאזה', W-6, phBase+12);
        ctx.direction=pd2; ctx.textAlign='start';
        // רשת פאזה + תוויות מעלות (באזור הפאזה)
        ctx.strokeStyle=sunMode?'rgba(0,0,0,.12)':'rgba(255,255,255,.10)'; ctx.lineWidth=1;
        ctx.fillStyle=sunMode?'#475569':'#64748b'; ctx.font='10px monospace';
        const step = (yMaxDeg-yMinDeg)>540?180:90;
        for(let d=Math.ceil(yMinDeg/step)*step; d<=yMaxDeg; d+=step){
          const y=degToY(d); if(y<phBase-1||y>plotH+1) continue;
          ctx.globalAlpha = d===0?0.5:1;
          ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); ctx.globalAlpha=1;
          const pd=ctx.direction; ctx.direction='ltr'; ctx.textAlign='left';
          ctx.fillText(d+'°', 4, y-2);
          ctx.direction=pd; ctx.textAlign='start';
        }
      }

      // מגניטודה — קווים דקים (למעלה)
      const drawMag=(snap,color)=>{
        if(!alignView || !snap || !snap.mag) return;
        ctx.strokeStyle=color; ctx.lineWidth=1.5; ctx.globalAlpha=0.85; ctx.beginPath();
        let pen=false;
        for(let px=0;px<=W;px+=2){
          const f=freqForX(px), k=Math.min(N2-1, Math.round(f/nyquist*N2));
          if(snap.coh[k] < tfCohGate){ pen=false; continue; }
          const y=magToY(snap.mag[k]);
          pen?ctx.lineTo(px,y):ctx.moveTo(px,y); pen=true;
        }
        ctx.stroke(); ctx.globalAlpha=1;
      };
      drawMag(phaseSub, '#38bdf8');
      drawMag(phaseTop, '#e879f9');

      // פאזה — קווים עבים (למטה)
      const drawSnap=(snap,unw,color)=>{
        if(!snap) return;
        ctx.strokeStyle=color; ctx.lineWidth=2.5; ctx.beginPath();
        let pen=false, prevY=0;
        for(let px=0;px<=W;px+=2){
          const f=freqForX(px);
          const k=Math.min(N2-1, Math.round(f/nyquist*N2));
          if(snap.coh[k] < tfCohGate){ pen=false; continue; }
          let y;
          if(alignView){ const v=unw[k]; if(isNaN(v)){ pen=false; continue; } y=degToY(toDeg(v)); }
          else { y=plotH*Math.max(0,Math.min(1, 0.5 - snap.ph[k]/(2*Math.PI))); }
          if(pen && Math.abs(y-prevY)>phH*0.5) pen=false;
          pen?ctx.lineTo(px,y):ctx.moveTo(px,y);
          pen=true; prevY=y;
        }
        ctx.stroke();
      };
      drawSnap(phaseSub, uSub, '#38bdf8');  // סאב = תכלת
      drawSnap(phaseTop, uTop, '#e879f9');  // טופ = ורוד

      // סמן תדר החיתוך
      const mx=xForFreq(xoverF);
      ctx.strokeStyle='rgba(255,255,255,.55)'; ctx.setLineDash([5,4]); ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(mx,0); ctx.lineTo(mx,plotH); ctx.stroke(); ctx.setLineDash([]);

      const k=Math.min(N2-1, Math.round(xoverF/nyquist*N2));
      const subOk = phaseSub && phaseSub.coh[k]>=tfCohGate;
      const topOk = phaseTop && phaseTop.coh[k]>=tfCohGate;

      const boxW=228;
      const bx=Math.min(W-boxW-8, Math.max(10, mx+8)), by=10;
      ctx.fillStyle=sunMode?'rgba(255,255,255,.92)':'rgba(10,15,25,.85)';
      ctx.fillRect(bx,by,boxW,86);
      ctx.strokeStyle='rgba(148,163,184,.5)'; ctx.lineWidth=1; ctx.strokeRect(bx,by,boxW,86);
      ctx.font='12px monospace';
      const prevDir=ctx.direction; ctx.direction='rtl'; ctx.textAlign='right';
      const rx=bx+boxW-10;
      ctx.fillStyle=sunMode?'#0f172a':'#e5e7eb'; ctx.fillText('תדר חיתוך: '+xoverF+' Hz', rx, by+18);
      ctx.fillStyle='#38bdf8'; ctx.fillText('סאב: '+(subOk?toDeg(phaseSub.ph[k]).toFixed(0)+'°':'— קוה׳ נמוכה'), rx, by+36);
      ctx.fillStyle='#e879f9'; ctx.fillText('טופ: '+(topOk?toDeg(phaseTop.ph[k]).toFixed(0)+'°':'— קוה׳ נמוכה'), rx, by+54);
      if(subOk && topOk){
        const d=wrap(toDeg(phaseTop.ph[k]-phaseSub.ph[k])); const ad=Math.abs(d);
        const col = ad<30?'#22c55e' : ad>150?'#ef4444' : '#f59e0b';
        const verdict = ad<30?'מיושר ✓' : ad>150?'הפוך — פולריות' : 'כוונן דיליי';
        ctx.fillStyle=col; ctx.fillText('Δφ: '+(d>0?'+':'')+d.toFixed(0)+'°  '+verdict, rx, by+76);
      } else {
        ctx.fillStyle=sunMode?'#64748b':'#94a3b8'; ctx.fillText('לכוד סאב וטופ למדידת Δφ', rx, by+76);
      }
      ctx.direction=prevDir; ctx.textAlign='start';
    }
    
    ctx.font='11px monospace'; ctx.textAlign='start';
    ctx.fillStyle='rgb('+accentRgb.join(',')+')'; ctx.fillText('— '+(tfSwap?'רפרנס':"מיקרופון"), 10, 14);
    ctx.fillStyle='#d97706'; ctx.fillText('— '+(tfSwap?"מיקרופון":'רפרנס'), 10, 28);
    if(showTfCoh){ ctx.fillStyle='rgba(239, 68, 68, 0.9)'; ctx.fillText('- - קוהרנטיות', 10, 42); }
    if(showTfPhase){ ctx.fillStyle='rgba(34, 197, 94, 0.9)'; ctx.fillText('— פאזה', 10, showTfCoh?56:42); }
  }
  
  if(refCurve && refCurve.v && refCurve.bands===BANDS){
    ctx.strokeStyle='#b57bff'; ctx.lineWidth=2; ctx.setLineDash([5,4]); ctx.beginPath();
    for(let b=0;b<BANDS;b++){ const x=b*bw+bw/2, yy=plotH-refCurve.v[b]*plotH; b===0?ctx.moveTo(x,yy):ctx.lineTo(x,yy); }
    ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle='#b57bff'; ctx.font='11px monospace'; ctx.textAlign='start';
    ctx.fillText('- - לפני', 10, tfOpen?(showTfCoh&&showTfPhase?70:showTfCoh||showTfPhase?56:42):14);
  }

  // ---- השוואת A/B (לפני/אחרי כיוון) ----
  if(abA || abB){
    const graph=(snap,line,fill,doFill)=>{
      if(!snap || !snap.f || !snap.f.length) return;
      if(doFill){
        ctx.beginPath();
        ctx.moveTo(xForFreq(snap.f[0]), plotH);
        for(let i=0;i<snap.f.length;i++){ const x=xForFreq(snap.f[i]), yy=plotH-norm(snap.db[i])*plotH; ctx.lineTo(x,yy); }
        ctx.lineTo(xForFreq(snap.f[snap.f.length-1]), plotH);
        ctx.closePath(); ctx.fillStyle=fill; ctx.fill();
      }
      ctx.beginPath();
      for(let i=0;i<snap.f.length;i++){ const x=xForFreq(snap.f[i]), yy=plotH-norm(snap.db[i])*plotH; i===0?ctx.moveTo(x,yy):ctx.lineTo(x,yy); }
      ctx.strokeStyle=line; ctx.lineWidth=2.5; ctx.lineJoin='round'; ctx.stroke();
    };
    ctx.font='12px monospace'; ctx.textAlign='start';
    let ly = tfOpen ? 92 : 20;
    if(abView!=='off'){
      const bothOn = (abView==='both');
      if((abView==='A'||abView==='both') && abA){ graph(abA,'#f59e0b','rgba(245,158,11,0.18)',bothOn); ctx.fillStyle='#f59e0b'; ctx.fillText('■ לפני הכיוון (A)',10,ly); ly+=16; }
      if((abView==='B'||abView==='both') && abB){ graph(abB,'#22c55e','rgba(34,197,94,0.18)',bothOn); ctx.fillStyle='#22c55e'; ctx.fillText('■ אחרי הכיוון (B)',10,ly); ly+=16; }
      if(abView==='delta' && abA && abB){
        const midY=plotH/2;
        ctx.setLineDash([4,4]); ctx.strokeStyle=sunMode?'rgba(0,0,0,.25)':'rgba(255,255,255,.28)';
        ctx.beginPath(); ctx.moveTo(0,midY); ctx.lineTo(W,midY); ctx.stroke(); ctx.setLineDash([]);
        ctx.strokeStyle='#39d98a'; ctx.lineWidth=2.5; ctx.beginPath();
        const n=Math.min(abA.f.length, abB.f.length);
        for(let i=0;i<n;i++){
          const diff=abB.db[i]-abA.db[i];
          const x=xForFreq(abA.f[i]), yy=midY-(diff*(plotH/40));
          i===0?ctx.moveTo(x,yy):ctx.lineTo(x,yy);
        }
        ctx.stroke();
        ctx.fillStyle='#39d98a'; ctx.fillText('Δ אחרי−לפני · קו אמצע=0 · טווח ±20dB',10,ly); ly+=16;
      }
    }
    if(abA && !abB){
      ctx.fillStyle=sunMode?'#b45309':'#fbbf24';
      ctx.fillText('לפני (A) נלכד ✓ — כוונן את המערכת ואז לחץ ״לכוד אחרי (B)״', 10, ly);
    }
  }
  if(snapCurve && snapCurve.length===BANDS){
    ctx.strokeStyle='#ffb020'; ctx.lineWidth=2; ctx.beginPath();
    for(let b=0;b<BANDS;b++){
      const x=b*bw+bw/2, yy=plotH-snapCurve[b]*plotH;
      b===0?ctx.moveTo(x,yy):ctx.lineTo(x,yy);
    }
    ctx.stroke();
    ctx.fillStyle='#ffb020'; ctx.font='10px monospace'; ctx.textAlign='start';
    ctx.fillText('הקפאה', 8, 12);
    const peaks=[];
    for(let b=1;b<BANDS-1;b++){
      const v=snapCurve[b];
      if(v>snapCurve[b-1] && v>=snapCurve[b+1] && v>0.35) peaks.push({b,v});
    }
    peaks.sort((a,z)=>z.v-a.v);
    peaks.slice(0,6).forEach(p=>{
      const b=p.b, x=b*bw+bw/2, yy=plotH-p.v*plotH;
      const fc=ISO[b]; let lo=Math.floor((fc/R)/nyquist*bins), hi=Math.ceil((fc*R)/nyquist*bins);
      lo=Math.max(1,lo); hi=Math.min(bins-1,hi); let bMax=-999, bi=lo;
      for(let i=lo;i<=hi;i++){ if(floatData[i]>bMax){bMax=floatData[i];bi=i;} }
      const hz=bi*nyquist/bins;
      const lbl=hz>=1000?(hz/1000).toFixed(2)+'k':Math.round(hz)+'';
      ctx.fillStyle='#ffb020'; ctx.beginPath(); ctx.arc(x,yy,3,0,6.28); ctx.fill();
      ctx.font='10px monospace'; ctx.textAlign='center';
      const tw=ctx.measureText(lbl).width+6;
      ctx.fillStyle=sunMode?'#f1f5f9':'rgba(13,17,23,.9)'; ctx.fillRect(x-tw/2, yy-16, tw, 13);
      ctx.fillStyle='#b45309'; ctx.fillText(lbl, x, yy-6);
    });
  }
  if(dragging && Math.abs(dragX1-dragX0)>4){
    const xa=Math.min(dragX0,dragX1), xb=Math.max(dragX0,dragX1);
    ctx.fillStyle='rgba(47,155,255,.15)'; ctx.fillRect(xa,0,xb-xa,plotH);
    ctx.strokeStyle='rgba(47,155,255,.8)'; ctx.lineWidth=1;
    ctx.strokeRect(xa,0,xb-xa,plotH);
  }
  if(targetMode!=='off' && (!alignOn && (eqPanel.classList.contains('open')||areaPanel.classList.contains('open')||tfPanel.classList.contains('open')))){
    ctx.strokeStyle='rgba(80,230,140,.8)'; ctx.setLineDash([6,5]); ctx.lineWidth=2; ctx.beginPath();
    for(let b=0;b<BANDS;b++){
      const ty=Math.max(0.05, Math.min(0.95, 0.55 + targetDb(ISO[b])*0.03));
      const x=b*bw+bw/2, yy=plotH-ty*plotH;
      b===0?ctx.moveTo(x,yy):ctx.lineTo(x,yy);
    }
    ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle='rgba(80,230,140,.9)'; ctx.font='10px monospace'; ctx.textAlign='end';
    ctx.fillText(targetMode==='house'?'יעד House':'יעד שטוח', W-8, 12);
  }
  if(cursorX!=null && cursorX>=0 && cursorX<=W){
    const cf=freqForX(cursorX);
    const bi=Math.max(0,Math.min(BANDS-1,Math.floor(cursorX/bw)));
    ctx.strokeStyle=sunMode?'rgba(0,0,0,.55)':'rgba(255,255,255,.55)'; ctx.setLineDash([3,3]); ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(cursorX,0);ctx.lineTo(cursorX,plotH);ctx.stroke(); ctx.setLineDash([]);
    const fl=cf>=1000?(cf/1000).toFixed(2)+'kHz':Math.round(cf)+'Hz';
    const lvl=(lastBandDb[bi]!=null&&lastBandDb[bi]>-119)?('  '+Math.round(lastBandDb[bi])+'dB'):'';
    const label=fl+lvl;
    ctx.font='12px monospace'; ctx.textAlign='left';
    const tw=ctx.measureText(label).width+12;
    let tx=Math.max(2,Math.min(W-tw-2, cursorX-tw/2));
    ctx.fillStyle=sunMode?'#ffffff':'rgba(13,17,23,.92)'; ctx.fillRect(tx,plotH-22,tw,18);
    ctx.strokeStyle='rgba(47,155,255,.7)'; ctx.strokeRect(tx,plotH-22,tw,18);
    ctx.fillStyle=sunMode?'#0f172a':'#e6ecf3'; ctx.fillText(label,tx+6,plotH-9);
  }
  const visAreas=areas.filter(a=>a.show);
  if(visAreas.length){
    visAreas.forEach(a=>{
      ctx.strokeStyle=a.color; ctx.lineWidth=2; ctx.beginPath(); let started=false;
      for(let k=0;k<GEQ.length;k++){
        const f=GEQ[k]; if(f<ISO[0]||f>ISO[BANDS-1]) continue;
        const x=xForFreq(f), yy=plotH-norm(a.db[k])*plotH;
        started?ctx.lineTo(x,yy):ctx.moveTo(x,yy); started=true;
      }
      ctx.stroke();
    });
    ctx.textAlign='start'; ctx.font='11px monospace';
    visAreas.forEach((a,i)=>{
      const y=30+i*16;
      ctx.fillStyle=a.color; ctx.fillRect(8,y-8,16,3);
      ctx.fillStyle=sunMode?'#0f172a':'#e6ecf3'; ctx.fillText(a.name,28,y-2);
    });
  }
  if(fbOn && fbTrack.size){
    const flagged=[];
    for(const [,rec] of fbTrack){ if(rec.hold>=FB_CONFIRM && rec.swing<FB_MAXSWING) flagged.push(rec); }
    flagged.sort((a,b)=>b.db-a.db);
    ctx.textAlign='center';
    flagged.slice(0,4).forEach(rec=>{
      const x=xForFreq(rec.hz); if(x<0||x>W) return;
      const y=plotH-norm(rec.db)*plotH;
      ctx.fillStyle='rgba(255,59,107,.95)';
      ctx.beginPath(); ctx.arc(x,y-8,4,0,6.283); ctx.fill();
      ctx.strokeStyle='rgba(255,59,107,.9)'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(x,y-4); ctx.lineTo(x,y); ctx.stroke();
      const lbl=(rec.hz>=1000?(rec.hz/1000).toFixed(2)+'k':rec.hz+'Hz')+' −'+rec.cut+'dB';
      ctx.font='10px monospace';
      const tw=ctx.measureText(lbl).width+8;
      let tx=Math.max(2,Math.min(W-tw-2, x-tw/2));
      ctx.fillStyle=sunMode?'#fef2f2':'rgba(40,10,18,.92)'; ctx.fillRect(tx,y-26,tw,13);
      ctx.strokeStyle='rgba(255,59,107,.7)'; ctx.strokeRect(tx,y-26,tw,13);
      ctx.fillStyle='#dc2626'; ctx.fillText(lbl, tx+tw/2, y-16);
    });
  }
  let exactHz=0;
  if(peakBand>=0 && peakVal>0.05){
    const fc=ISO[peakBand];
    let lo=Math.floor((fc/R)/nyquist*bins), hi=Math.ceil((fc*R)/nyquist*bins);
    lo=Math.max(1,lo); hi=Math.min(bins-1,hi);
    let bMax=-999, bi=lo;
    for(let i=lo;i<=hi;i++){ if(floatData[i]>bMax){ bMax=floatData[i]; bi=i; } }
    let idx=bi;
    if(bi>0&&bi<bins-1){ const a=floatData[bi-1],b=floatData[bi],c=floatData[bi+1], d=a-2*b+c;
      if(d!==0) idx=bi+0.5*(a-c)/d; }
    exactHz=idx*nyquist/bins;
  }
  peakHzEl.textContent = exactHz>0
    ? (exactHz>=1000?(exactHz/1000).toFixed(3)+' kHz':Math.round(exactHz)+' Hz') : '—';
}

function drawSpec(W,H,nyquist,bins,xForFreq){
  specCtx.drawImage(specCanvas,0,-1);
  const y=specCanvas.height-1;
  for(let px=0;px<specCanvas.width;px++){
    const f=Math.exp(((px/specCanvas.width))*(Math.log(ISO[BANDS-1])-Math.log(ISO[0]))+Math.log(ISO[0]));
    const bin=Math.min(bins-1,Math.round(f/nyquist*bins));
    specCtx.fillStyle=heat(norm(floatData[bin]));
    specCtx.fillRect(px,y,1,1);
  }
  const meterH = (meterEl && meterEl.style.display!=='none') ? 40 : 6;
  const specH = H - meterH;
  ctx.clearRect(0,0,W,H);
  ctx.drawImage(specCanvas,0,0,W,specH);
  ctx.fillStyle=sunMode?'#0f172a':'#c2cbd6'; ctx.font='11px monospace'; ctx.textAlign='center';
  const lo=ISO[0], hi=ISO[BANDS-1];
  [20,31.5,50,100,200,500,1000,2000,5000,10000,20000].filter(f=>f>=lo&&f<=hi).forEach(f=>{
    const x=xForFreq(f);
    ctx.strokeStyle=sunMode?'rgba(0,0,0,.14)':'rgba(255,255,255,.14)';ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,specH);ctx.stroke();
    ctx.fillText(fLabel(f)+'Hz',x,12);
  });
  let pk=-Infinity,pkf=0;
  for(let i=1;i<bins;i++){ if(floatData[i]>pk){pk=floatData[i]; pkf=i*nyquist/bins;} }
  peakHzEl.textContent= pk>floorDb ? (pkf>=1000?(pkf/1000).toFixed(1)+' kHz':Math.round(pkf)+' Hz') : '—';
}

const FB_MINDB=-50;
const FB_MINQ=6;
const FB_CONFIRM=18;
const FB_MAXSWING=2.5;
function detectFeedback(nyquist,bins){
  const PROM=fbProm;
  const win=24;
  const seen=new Set();
  const iLo=Math.max(2,Math.floor(120/nyquist*bins));
  const iHi=Math.min(bins-2,Math.floor(10000/nyquist*bins));
  for(let i=iLo;i<=iHi;i++){
    const d=floatData[i];
    if(d<FB_MINDB) continue;
    if(!(d>floatData[i-1]&&d>=floatData[i+1])) continue;
    let sum=0,n=0;
    for(let j=i-win;j<=i+win;j++){ if(Math.abs(j-i)>2&&j>=0&&j<bins){sum+=floatData[j];n++;} }
    const avg=sum/Math.max(1,n);
    const prom=d-avg;
    if(prom<PROM) continue;
    let li=i, ri=i;
    while(li>1 && floatData[li]>d-3) li--;
    while(ri<bins-1 && floatData[ri]>d-3) ri++;
    const bw3=Math.max(1,(ri-li))*nyquist/bins;
    const hz=Math.round(i*nyquist/bins);
    const q=Math.max(2,Math.min(30, hz/bw3));
    if(q<FB_MINQ) continue;
    const cut=Math.max(3,Math.min(12, Math.round(prom*0.7)));
    const key=Math.round(hz/ (hz<300?4:hz<2000?10:40));
    seen.add(key);
    const tol = hz<300?5:hz<2000?14:50;
    const rec=fbTrack.get(key);
    if(rec){
      if(Math.abs(hz-rec.hz)<=tol) rec.hold=Math.min(FB_CONFIRM+30, rec.hold+1);
      else rec.hold=Math.max(0, rec.hold-3);
      rec.swing = rec.swing*0.8 + Math.abs(d-rec.db)*0.2;
      rec.db=d; rec.hz=hz; rec.cut=cut; rec.q=q;
    } else {
      fbTrack.set(key,{hold:1, swing:0, db:d, hz:hz, cut:cut, q:q});
    }
  }
  for(const [k,rec] of fbTrack){ if(!seen.has(k)){ rec.hold-=3; if(rec.hold<=0) fbTrack.delete(k);} }
}

loadCalStore();
document.getElementById('ver').textContent='v179';

let accentRgb=[62,166,255];
function applyAccent(hex){
  document.documentElement.style.setProperty('--accent',hex);
  document.documentElement.style.setProperty('--amber',hex);
  const m=/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if(m) accentRgb=[parseInt(m[1],16),parseInt(m[2],16),parseInt(m[3],16)];
  try{ localStorage.setItem('rta_accent',hex); }catch(_){}
}
function lsGet(k){ try{ return localStorage.getItem(k); }catch(_){ return null; } }
function prefSet(k,v){ try{ localStorage.setItem(k, v); }catch(_){} }

safeOn('refCurveBtn', 'click',function(){
  if(refCurve){ refCurve=null; this.classList.remove('on'); this.textContent='שמור כ״לפני״'; return; }
  if(!running || !lastV.length){ alert('הפעל מיקרופון ונגן אות לפני שמירת עקומת ייחוס.'); return; }
  refCurve={ v:lastV.slice(), bands:BANDS };
  this.classList.add('on'); this.textContent='נקה ״לפני״';
});

// ---- A/B: לפני/אחרי כיוון ----
function abSnapshot(){ return { f: ISO.slice(), db: lastBandDb.slice() }; }
function syncAbSeg(){ document.querySelectorAll('#abViewSeg button').forEach(x=>x.classList.toggle('on', x.dataset.v===abView)); }
function abHasData(){ return lastBandDb.length && lastBandDb.some(v=>v>-119); }
safeOn('abCapA','click',function(){
  if(!abHasData()){ alert('אין עדיין מדידה ללכוד.\nהפעל את המיקרופון, נגן אות (למשל פינק נויז), ואז לחץ שוב.'); return; }
  abA=abSnapshot(); this.classList.add('on'); this.textContent='✓ לפני (A)';
  abView = abB ? 'both' : 'A'; syncAbSeg();
});
safeOn('abCapB','click',function(){
  if(!abHasData()){ alert('אין עדיין מדידה ללכוד.\nהפעל את המיקרופון, נגן אות, ואז לחץ שוב.'); return; }
  abB=abSnapshot(); this.classList.add('on'); this.textContent='✓ אחרי (B)';
  abView = abA ? 'both' : 'B'; syncAbSeg();
});
safeOn('abClear','click',function(){
  abA=null; abB=null; abView='off';
  const a=document.getElementById('abCapA'); if(a){ a.classList.remove('on'); a.textContent='לכוד לפני (A)'; }
  const b=document.getElementById('abCapB'); if(b){ b.classList.remove('on'); b.textContent='לכוד אחרי (B)'; }
  syncAbSeg();
});
document.querySelectorAll('#abViewSeg button').forEach(b=>b.addEventListener('click',function(){ abView=this.dataset.v; syncAbSeg(); }));
safeOn('tfSmooth','input',function(e){
  tfSmoothA = Math.max(0.70, Math.min(0.98, parseInt(e.target.value,10)/100));
  const t = document.getElementById('tfSmoothVal');
  if(t) t.textContent = tfSmoothA>=0.955?'מקסימלית':tfSmoothA>=0.90?'גבוהה':tfSmoothA>=0.85?'בינונית':'מהירה';
});
safeOn('tfCohGate','input',function(e){
  tfCohGate = Math.max(0, Math.min(0.9, parseInt(e.target.value,10)/100));
  const t = document.getElementById('tfCohGateVal');
  if(t) t.textContent = tfCohGate.toFixed(2);
});

// ---- יישור חיתוך סאב/טופ ----
function tfPhaseSnapshot(){
  const n=TF_FFT_N/2, ph=new Float32Array(n), coh=new Float32Array(n), mag=new Float32Array(n);
  for(let k=0;k<n;k++){
    ph[k]=Math.atan2(tfPxyIm[k], tfPxyRe[k]);
    const pxySq=tfPxyRe[k]*tfPxyRe[k]+tfPxyIm[k]*tfPxyIm[k];
    coh[k]=Math.max(0,Math.min(1, pxySq/(tfPxx[k]*tfPyy[k]+1e-12)));
    mag[k]=10*Math.log10(tfPyy[k]+1e-12);   // תגובת המיקרופון (dB) — מראה את הבור בחיתוך
  }
  return {ph,coh,mag};
}
let phMeasuring=false;
function capturePhase(which){
  if(!analyser || !analyserRef){ alert('פאזה דורשת מדידת מיק/רפרנס פעילה (רפרנס בערוץ 2).'); return; }
  if(phMeasuring) return;
  phMeasuring=true;
  const btn=document.getElementById(which==='sub'?'phSubBtn':'phTopBtn');
  const other=document.getElementById(which==='sub'?'phTopBtn':'phSubBtn');
  const st=document.getElementById('phStatus');
  const label=which==='sub'?'סאב':'טופ';
  const baseTxt=which==='sub'?'מדוד + לכוד סאב':'מדוד + לכוד טופ';
  if(other) other.disabled=true;
  // אפס צוברים לחלון מדידה נקי
  tfPxx.fill(0); tfPyy.fill(0); tfPxyRe.fill(0); tfPxyIm.fill(0);
  let t=3;
  const tick=()=>{ if(btn) btn.textContent='מודד… '+t; if(st){ st.textContent='מודד '+label+'… '+t+' שניות'; st.style.color='var(--accent)'; } };
  tick();
  const iv=setInterval(()=>{
    t--;
    if(t>0){ tick(); return; }
    clearInterval(iv);
    const snap=tfPhaseSnapshot();
    if(which==='sub') phaseSub=snap; else phaseTop=snap;
    showXover=true;
    const N2=TF_FFT_N/2, nyq=(typeof audioCtx!=='undefined'&&audioCtx)?audioCtx.sampleRate/2:24000;
    const k=Math.min(N2-1, Math.round(xoverF/nyq*N2));
    const c=snap.coh[k];
    if(btn){ btn.classList.add('on'); btn.textContent='✓ '+label+' נלכד'; }
    if(other) other.disabled=false;
    if(st){
      if(c>=0.5){ st.textContent='✓ '+label+' נלכד · קוהרנטיות '+c.toFixed(2)+' — אמין'; st.style.color='#22c55e'; }
      else { st.textContent='⚠ '+label+' נלכד · קוהרנטיות '+c.toFixed(2)+' נמוכה — קרב מיק׳/העלה רמה ומדוד שוב'; st.style.color='#f59e0b'; }
    }
    phMeasuring=false;
  },1000);
}
safeOn('phSubBtn','click',()=>capturePhase('sub'));
safeOn('phTopBtn','click',()=>capturePhase('top'));
safeOn('phPinkBtn','click',function(){
  if(genOn && genType==='pink'){ genStop(); return; }
  genType='pink'; if(typeof setGenTypeUI==='function') setGenTypeUI('pink');
  genStart();
});
safeOn('phClearBtn','click',function(){
  phaseSub=null; phaseTop=null; showXover=false;
  const s=document.getElementById('phSubBtn'); if(s){ s.classList.remove('on'); s.textContent='מדוד + לכוד סאב'; s.disabled=false; }
  const t=document.getElementById('phTopBtn'); if(t){ t.classList.remove('on'); t.textContent='מדוד + לכוד טופ'; t.disabled=false; }
  const st=document.getElementById('phStatus'); if(st){ st.textContent='מדוד סאב לבד, ואז טופ לבד — כל מדידה 3 שניות.'; st.style.color='var(--dim)'; }
});
safeOn('xoverF','input',function(e){
  xoverF=parseInt(e.target.value,10);
  const t=document.getElementById('xoverFVal'); if(t) t.textContent=xoverF+' Hz';
});

const SAVE_KEY='rta_saves';
let saves=[];
function loadSaves(){ try{ const r=lsGet(SAVE_KEY); saves=r?JSON.parse(r):[]; }catch(_){ saves=[]; } }
function persistSaves(){ try{ localStorage.setItem(SAVE_KEY, JSON.stringify(saves)); }catch(_){ alert('לא ניתן לשמור (אחסון מלא או חסום).'); } }
function snapshotState(name){
  return {
    id:'s'+Date.now(), name:name, date:new Date().toISOString().slice(0,10),
    target:targetMode,
    positions:eqPositions.map(p=>({name:p.name, db:Array.from(p.db)})),
    areas:areas.map(a=>({name:a.name, color:a.color, db:Array.from(a.db), show:a.show})),
    speakers:dlySpeakers.map(s=>({name:s.name, ms:s.ms})),
    anchor:dlyAnchor,
    calName: micCal ? (micCalList.find(c=>c.id===activeCalId)||{}).name||null : null
  };
}
function renderSaveList(){
  const box=document.getElementById('saveList'); if(!box) return;
  if(!saves.length){ box.innerHTML='<div class="sub">אין מדידות שמורות עדיין.</div>'; return; }
  box.innerHTML=saves.map(s=>{
    const bits=[];
    if(s.positions&&s.positions.length) bits.push(s.positions.length+' מיקומים');
    if(s.areas&&s.areas.length) bits.push(s.areas.length+' אזורים');
    if(s.speakers&&s.speakers.some(x=>x.ms!=null)) bits.push('דיליי');
    return '<div class="saveRow"><span class="nm" title="'+escapeHtml(s.name)+'">'+escapeHtml(s.name)+
      '</span><span class="meta">'+s.date+(bits.length?' · '+bits.join(' · '):'')+'</span>'+
      '<button data-load="'+s.id+'">טען</button><button data-rm="'+s.id+'">מחק</button></div>';
  }).join('');
  box.querySelectorAll('[data-load]').forEach(b=>b.addEventListener('click',()=>loadSave(b.dataset.load)));
  box.querySelectorAll('[data-rm]').forEach(b=>b.addEventListener('click',()=>{
    const s=saves.find(x=>x.id===b.dataset.rm);
    if(!confirm('למחוק את "'+(s?s.name:'')+'"?')) return;
    saves=saves.filter(x=>x.id!==b.dataset.rm); persistSaves(); renderSaveList();
  }));
}
function loadSave(id){
  const s=saves.find(x=>x.id===id); if(!s) return;
  if(measureBusy()){ alert('מדידה פעילה — המתן לסיומה.'); return; }
  if((eqPositions.length||areas.length) && !confirm('לטעון "'+s.name+'"? המדידות הנוכחיות יוחלפו.')) return;
  eqPositions=(s.positions||[]).map(p=>{
    if(p.db) return {name:p.name, db:Float32Array.from(p.db)};
    if(p.data && audioCtx){
      const bd=p.data, bins=bd.length, nyq=audioCtx.sampleRate/2, R6=Math.pow(2,1/6);
      const db=GEQ.map(fc=>bandDbFromBins(bd, fc/R6, fc*R6, nyq, bins));
      return {name:p.name, db:Float32Array.from(db)};
    }
    return {name:p.name, db:new Float32Array(GEQ.length).fill(-120)};
  });
  areas=(s.areas||[]).map(a=>({name:a.name, color:a.color, db:Float32Array.from(a.db), show:a.show!==false}));
  if(s.speakers&&s.speakers.length){ dlySpeakers=s.speakers.map(x=>({name:x.name, ms:x.ms})); dlyAnchor=s.anchor||0; }
  if(s.target) setTarget(s.target);
  renderEqList(); renderDlySpk(); updateEqUI();
  if(eqPositions.length) computeAndShow();
  if(areas.length){ renderAreaList(); suggestAreaEQ(); }
  closeModals();
  if(s.calName && (!micCal || (micCalList.find(c=>c.id===activeCalId)||{}).name!==s.calName))
    alert('שים לב: המדידה נשמרה עם כיול "'+s.calName+'". ודא שאותו כיול פעיל.');
}
safeOn('saveBtn', 'click',()=>{ renderSaveList(); showModal(savePanel); });
safeOn('saveClose', 'click',closeModals);
safeOn('saveNowBtn', 'click',()=>{
  const inp=document.getElementById('saveName');
  const name=(inp.value||'').trim();
  if(!name){ alert('תן שם למדידה.'); inp.focus(); return; }
  if(!eqPositions.length && !areas.length && !dlySpeakers.some(s=>s.ms!=null)){
    alert('אין מה לשמור — בצע מדידה קודם.'); return; }
  saves.unshift(snapshotState(name));
  if(saves.length>40) saves=saves.slice(0,40);
  persistSaves(); renderSaveList(); inp.value='';
});
loadSaves();

(function initPrefs(){
  const applyInput=(id,key)=>{ const v=lsGet(key); if(v==null) return; const el=document.getElementById(id); if(!el) return; el.value=v; el.dispatchEvent(new Event('input')); };
  applyInput('res','rta_res');
  applyInput('smooth','rta_smooth');
  applyInput('floor','rta_floor');
  applyInput('cal','rta_cal');
  applyInput('fbSens','rta_fbSens');
  const fft=lsGet('rta_fft');
  if(fft){ const btn=document.querySelector('#fftSeg button[data-n="'+fft+'"]'); if(btn) btn.click(); }
  const tgt=lsGet('rta_target');
  if(tgt) setTarget(tgt);
  const wgt=lsGet('rta_wgt');
  if(wgt && wgt!=='Z'){ weightMode=wgt; const wb=document.getElementById('wgtBtn');
    wb.textContent='dB'+wgt; wb.classList.add('on'); document.getElementById('wLbl').textContent=wgt; }
  const sm = lsGet('rta_sunmode');
  if(sm === '1'){ sunMode = true; document.body.classList.add('sun-mode'); const sb = document.getElementById('sunBtn'); if(sb) sb.classList.add('on'); }
})();
(function initAccent(){
  const saved=lsGet('rta_accent');
  if(saved){ applyAccent(saved);
    document.querySelectorAll('#swatches .sw').forEach(b=>b.classList.toggle('on', b.dataset.c===saved)); }
})();
document.querySelectorAll('#swatches .sw').forEach(b=>b.addEventListener('click',function(){
  document.querySelectorAll('#swatches .sw').forEach(x=>x.classList.remove('on'));
  this.classList.add('on'); applyAccent(this.dataset.c);
}));

const sigTint=document.getElementById('sigTint');
let _lastTint='';
function updateSignalTint(){
  if(!genOn){ if(_lastTint!==''){ sigTint.classList.remove('on'); _lastTint=''; } return; }
  let rgb=null;
  if(genType==='white') rgb='rgba(235,242,250,.16)';
  else if(genType==='pink') rgb='rgba(255,120,180,.16)';
  else if(genType==='sweep'){
    const now=audioCtx?audioCtx.currentTime:0, t=((now-(sweepStartT||now))%genSweepDur)/genSweepDur;
    const hue=250-250*Math.max(0,Math.min(1,t));
    rgb='hsla('+Math.round(hue)+',90%,60%,.16)';
  }
  if(rgb){ if(rgb!==_lastTint){ sigTint.style.boxShadow='inset 0 0 140px 30px '+rgb; _lastTint=rgb; } sigTint.classList.add('on'); }
  else if(_lastTint!==''){ sigTint.classList.remove('on'); _lastTint=''; }
}
const HELP={
  mRta:'תצוגת ספקטרום — עוצמה לפי תדר, בזמן אמת.',
  mSpec:'ווטרפול — הספקטרום לאורך זמן.',
  sunBtn:'מצב אור שמש: רקע בהיר וניגודיות גבוהה לעבודה בשטח.',
  swatches:'צבע האפליקציה — משנה גם את צבע הברים בגרף.',
  helpBtn:'מצב עזרה: רחף על כל כפתור לקבל הסבר.',
  genBtn:'גנרטור אותות: רעש ורוד/לבן, סינוס או סוויפ.\nלמדידה ולכיוונון המערכת.',
  eqBtn:'מדידת תגובה: חד־ערוצי (מיק\' מול יעד)\nאו דו־ערוצי (מיק\'+רפרנס = TF).',
  calBtn:'כיולי מיקרופון: טען קובץ כיול (REW)\nלתיקון צביעת המיקרופון.',
  dlyBtn:'מדידת דיליי: זמן ההשהיה בין רמקולים.\nיישור סאב/טופ עם רמקול עוגן.',
  rtBtn:'RT60: מדידת זמן הדהוד החדר,\nלפי רצועות אוקטבה. דורש חדר אמיתי.',
  wgtBtn:'שקלול המד: dBZ (טכני), dBA (חוק/אוזן),\ndBC (עם בס). לחיצה מחליפה.',
  leqBtn:'אפס Leq: מתחיל מדידת ממוצע עוצמה\nמחדש מהרגע הזה.',
  peakBtn:'Peak Hold: משאיר את השיאים על המסך.',
  avgBtn:'מיצוע: מייצב את התצוגה לאורך זמן.',
  meterModeSeg:'מדים: RMS (ממוצע חלק) או Peak (שיאים).\nמשפיע על כל המדים.',
  fftSeg:'FFT: דיוק מול מהירות. מדויק = בס טוב יותר,\nמהיר = ביצועים טובים יותר.',
  freezeBtn:'הקפא: שומר עקומה להשוואה,\nעם סימון תדרי הפיקים.',
  fbBtn:'גלאי פידבק: מזהה תדרים שמתחילים\nלשרוק, עם המלצת חיתוך.',
  stopBtn:'אפס סשן: מנקה מדידות והגדרות\nבלי לכבות את המיקרופון.',
  pngBtn:'ייצוא תמונת מסך (PNG).',
  csvBtn:'ייצוא הנתונים כקובץ CSV.',
  inSel:'מקור קלט: בחר מיקרופון / כרטיס קול.',
  outSel:'יציאת פלט: לאן יוצא אות הגנרטור.',
  genOnBtn:'מפעיל/עוצר את אות הגנרטור.',
  floor:'רצפת רעש: הסף התחתון של התצוגה.',
  cal:'כיול SPL: התאם למד ייחוס\nכדי לקבל dB SPL אמיתי.',
  autoCalBtn:'כיול אוטומטי מול פיסטונפון 1kHz.',
  genLvl:'עוצמת אות הגנרטור. התחל נמוך!',
  genFreq:'תדר הסינוס (סליידר).',
  genFreqNum:'הקלד תדר סינוס מדויק.',
  genSweep:'משך מחזור הסוויפ.',
  smooth:'החלקה: מרכך קפיצות בתצוגה.',
  res:'רזולוציה: פסים לאוקטבה (1/3 עד 1/24).',
  respModeSeg:'חד־ערוצי (מיק\' מול יעד) או\nדו־ערוצי (מיק\'+רפרנס = TF אמיתי).',
  eqModeSeg:'תצוגת התיקון: גרפיק (31 פסים)\nאו פרמטרי (תדר/גיין/Q).',
  tfModeSeg:'תצוגת התיקון: גרפיק או פרמטרי.',
  tgtSeg:'עקומת יעד: שטוח (ניטרלי) או\nHouse (בס מעט מוגבר, טרבל יורד).',
  eqMeasBtn:'מדוד מיקום חדש (5ש\'). מדוד כמה\nמיקומים — התיקון הוא הממוצע.',
  eqResetBtn:'נקה את כל המיקומים.',
  areaMeasBtn:'מדוד אזור חדש (עד 4). להשוואת\nצדדים שונים של המעגל.',
  areaEqBtn:'חשב תיקון EQ ממוצע לכל האזורים.',
  dlyMeasBtn:'מדוד דיליי בודד (מיק\' מול רפרנס).',
  dlyCountSeg:'מספר רמקולים ליישור (2/4/6).',
  dlyReset:'נקה את מדידות הדיליי.',
  rtRunBtn:'התחל מדידת RT60 (מנגן רעש ופוסק).',
  rtLevel:'עוצמת המדידה. כוונן לפני שמתחיל.',
  rtRange:'טווח דעיכה נדרש. נמוך יותר = קל\nלמדוד בחדר שקט, פחות מדויק.',
  tfOverlayHdr:'הצג/הסתר את עקומות המיק\' והרפרנס\nיחד על הגרף הראשי.',
  tfOverlayBtn:'משאיר את עקומות המיק\' והרפרנס על הגרף\nהראשי גם כשהפאנל סגור.',
  tfAutoDelayBtn:'מחשב ומאפס את השהיית הטיסה האקוסטית של המיקרופון בלחיצה אחת.',
  tfPhaseToggleBtn:'מציג/מסתיר את גרף הפאזה (ירוק).',
  tfCohToggleBtn:'מציג/מסתיר את גרף הקוהרנטיות (אדום מקווקו).',
  saveBtn:'מדידות שמורות: שמור וטען מדידות\nלפי מקום ותאריך.',
  exportJsonBtn:'ייצוא כל הסשן לקובץ JSON להעברה בין מכשירים.',
  importJsonBtn:'ייבוא קובץ JSON של סשן שמור.',
  refCurveBtn:'שומר את התגובה הנוכחית כעקומת ״לפני״\nכדי להשוות אחרי שינוי EQ.',
  cutOnlySeg:'חיתוך בלבד: EQ מוריד תדרים בלבד,\nבלי הגברות — חוסך הדרוּם ומגן על הדרייברים.',
  geqShowBtn:'הצג/הסתר את תצוגת תיקון ה-EQ\n(בנק הפיידרים מתחת לגרף).',
  combBtn:'בדיקת ביטולי פאזה (comb): מזהה אדוות\nתקופתיות בגרף ומעריך את הפרש הזמן שגורם להן.'
};
let helpMode=false;
const helpTip=document.createElement('div'); helpTip.id='helpTip'; document.body.appendChild(helpTip);
safeOn('helpBtn', 'click',function(){
  helpMode=!helpMode; this.classList.toggle('on',helpMode); document.body.classList.toggle('help-on',helpMode);
  if(!helpMode) helpTip.style.display='none';
});
function helpTextFor(target){
  let txt=null;
  const idEl=target.closest && target.closest('[id]'); if(idEl) txt=HELP[idEl.id];
  if(!txt && target.closest){ const cEl=target.closest('.tgtSeg'); if(cEl) txt=HELP.tgtSeg; }
  return txt;
}
function showHelpTip(txt,cx,cy){
  if(!txt){ helpTip.style.display='none'; return; }
  helpTip.textContent=txt; helpTip.style.whiteSpace='pre-line'; helpTip.style.display='block';
  const x=Math.max(8,Math.min(cx+14, innerWidth-helpTip.offsetWidth-10));
  const y=Math.max(8,Math.min(cy+16, innerHeight-helpTip.offsetHeight-10));
  helpTip.style.left=x+'px'; helpTip.style.top=y+'px';
}
document.addEventListener('mousemove',e=>{
  if(!helpMode) return;
  showHelpTip(helpTextFor(e.target), e.clientX, e.clientY);
});
document.addEventListener('focusin',e=>{
  if(!helpMode) return;
  const txt=helpTextFor(e.target); if(!txt){ helpTip.style.display='none'; return; }
  const r=e.target.getBoundingClientRect();
  showHelpTip(txt, r.left, r.bottom);
});
document.addEventListener('pointerdown',e=>{
  if(!helpMode || e.pointerType==='mouse') return;
  if(e.target.closest && (e.target.closest('#helpBtn') || e.target.closest('#sunBtn'))) return;
  const txt=helpTextFor(e.target);
  if(txt){ e.preventDefault(); e.stopPropagation(); showHelpTip(txt, e.clientX, e.clientY); }
}, true);

(function plexus(){
  const g=document.getElementById('pcbTraces'); if(!g) return;
  const NS='http://www.w3.org/2000/svg', W=600,H=200, N=42, LINK=54;
  let s=90210; const rnd=()=>{ s=(s*1103515245+12345)&0x7fffffff; return s/0x7fffffff; };
  const nodes=[], dots=[];
  const linePath=document.createElementNS(NS,'path');
  linePath.setAttribute('stroke','#5ab0ff'); linePath.setAttribute('stroke-width','0.4');
  linePath.setAttribute('fill','none'); linePath.setAttribute('opacity','0.5'); g.appendChild(linePath);
  for(let i=0;i<N;i++){
    const n={x:rnd()*W,y:rnd()*H,vx:(rnd()-0.5)*0.12,vy:(rnd()-0.5)*0.12,r:0.5+rnd()*1.6};
    nodes.push(n);
    const c=document.createElementNS(NS,'circle'); c.setAttribute('r',n.r.toFixed(1));
    c.setAttribute('fill','#9fd4ff'); c.setAttribute('opacity',(0.4+rnd()*0.5).toFixed(2));
    g.appendChild(c); dots.push(c);
  }
  let last=0;
  function frame(t){
    requestAnimationFrame(frame);
    if(t-last<70) return;
    if(document.hidden) return;
    last=t;
    let d='';
    for(const n of nodes){ n.x+=n.vx; n.y+=n.vy; if(n.x<0||n.x>W)n.vx*=-1; if(n.y<0||n.y>H)n.vy*=-1; }
    for(let i=0;i<N;i++){ dots[i].setAttribute('cx',nodes[i].x.toFixed(1)); dots[i].setAttribute('cy',nodes[i].y.toFixed(1)); }
    for(let i=0;i<N;i++) for(let j=i+1;j<N;j++){
      const dx=nodes[i].x-nodes[j].x, dy=nodes[i].y-nodes[j].y, d2=dx*dx+dy*dy;
      if(d2<LINK*LINK) d+='M'+nodes[i].x.toFixed(1)+' '+nodes[i].y.toFixed(1)+'L'+nodes[j].x.toFixed(1)+' '+nodes[j].y.toFixed(1);
    }
    linePath.setAttribute('d', d);
  }
  requestAnimationFrame(frame);
})();

function reviveAudio(){ if(running && audioCtx && audioCtx.state==='suspended') audioCtx.resume(); }
if(navigator.mediaDevices && navigator.mediaDevices.addEventListener){
  navigator.mediaDevices.addEventListener('devicechange',()=>{ if(running) populateInputs(); });
}
document.addEventListener('visibilitychange',()=>{ if(!document.hidden) reviveAudio(); });
window.addEventListener('focus',reviveAudio);
resize();
if('ResizeObserver' in window){
  const _ro=new ResizeObserver(()=>{ resize(); });
  _ro.observe(document.getElementById('stage'));
}
if('serviceWorker' in navigator){
  window.addEventListener('load',()=>{
    navigator.serviceWorker.register('sw.js').then(reg=>{
      reg.addEventListener('updatefound',()=>{
        const sw=reg.installing; if(!sw) return;
        sw.addEventListener('statechange',()=>{
          if(sw.state==='installed' && navigator.serviceWorker.controller){
            const el=document.getElementById('ver');
            if(el){ el.textContent+=' · גרסה חדשה זמינה — רענן'; el.style.color='var(--warn)'; }
          }
        });
      });
    }).catch(()=>{});
  });
}
