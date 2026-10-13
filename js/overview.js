// A single audio capture feeds all four views. No extra audio contexts or RAF loops.
window.GalOverview={last:0,frames:0,exportCanvas(){
  const grid=document.getElementById('overviewGrid'),bounds=grid.getBoundingClientRect(),scale=Math.min(devicePixelRatio||1,2),off=document.createElement('canvas');
  off.width=Math.round(bounds.width*scale);off.height=Math.round(bounds.height*scale);const c=off.getContext('2d');c.scale(scale,scale);c.fillStyle=sunMode?'#f8fafc':'#04121b';c.fillRect(0,0,bounds.width,bounds.height);
  for(const card of grid.children){const r=card.getBoundingClientRect(),canvas=card.querySelector('canvas'),plot=canvas.getBoundingClientRect();c.fillStyle=sunMode?'#edf4f8':'#0b2330';c.fillRect(r.left-bounds.left,r.top-bounds.top,r.width,32);c.font='700 11px Arial';c.fillStyle=sunMode?'#213640':'#e4f5fc';c.fillText(card.querySelector('header span').textContent,r.left-bounds.left+10,r.top-bounds.top+20);c.drawImage(canvas,plot.left-bounds.left,plot.top-bounds.top,plot.width,plot.height);}
  return off;
},render(nyquist){
  if(performance.now()-this.last<16)return;this.last=performance.now();this.frames++;
  if(running&&!frozen){captureWaterfall3dRow(nyquist);updateWaterfallResonances(nyquist);updateWaterfallDecayEvidence(nyquist);}
  const live=running&&!frozen&&refChannel>=0&&tfHasReferenceSignal()?tfCurrentSnapshot():null;
  const tf=frozen?(this.tfSnapshot||tfWorkingAverage):live?(updateTfWorkingAverage(live)||live):null;
  if(!frozen)this.tfSnapshot=tf;
  for(const view of ['rta','mr','spec','tf']){
    const canvas=document.getElementById('overview-'+view),c=canvas.getContext('2d');
    const W=canvas.clientWidth,H=canvas.clientHeight;if(W<20||H<20)continue;
    const scale=Math.min(devicePixelRatio||1,2);
    if(canvas.width!==Math.round(W*scale)||canvas.height!==Math.round(H*scale)){canvas.width=Math.round(W*scale);canvas.height=Math.round(H*scale);}
    c.setTransform(scale,0,0,scale,0,0);c.clearRect(0,0,W,H);
    if(view==='mr'&&window.GalMr){if(!canvas.dataset.mrCursor){canvas.dataset.mrCursor='true';canvas.addEventListener('pointermove',e=>{this.mrCursor=e.offsetX});canvas.addEventListener('pointerleave',()=>{this.mrCursor=null});}GalMr.render(c,W,H,{compact:true,cursorX:this.mrCursor??null});continue;}
    if(view==='spec'){
      if(!canvas.dataset.waterfallCursor){canvas.dataset.waterfallCursor='true';canvas.addEventListener('pointermove',event=>{this.waterfallCursor=event.offsetX});canvas.addEventListener('pointerleave',()=>{this.waterfallCursor=null});}
      const key=[W,H,scale,sunMode,floorDb,ceilDb,wf3d.intervalMs,wf3d.maxRows,nyquist].join('|');
      if(!this.waterfall)this.waterfall=document.createElement('canvas');
      if(this.waterfallRow!==wf3d.rows[0]||this.waterfallKey!==key||this.waterfallCount!==wf3d.rows.length){
        this.waterfallRow=wf3d.rows[0];this.waterfallCount=wf3d.rows.length;this.waterfallKey=key;
        this.waterfall.width=Math.round(W*scale);this.waterfall.height=Math.round(H*scale);
        const paint=this.waterfall.getContext('2d');paint.setTransform(scale,0,0,scale,0,0);
        drawWaterfall3d(W,H,nyquist,null,paint,{capture:false,toolbarTop:16});
      }
      c.drawImage(this.waterfall,0,0,W,H);
      const geometry=waterfallGeometry(W,H,16),maxHz=Math.min(20000,nyquist*.96);
      drawWaterfallResonanceOverlay(W,H,f=>geometry.left+Math.log(f/20)/Math.log(maxHz/20)*(geometry.right-geometry.left),c,{toolbarTop:16});
      drawWaterfallFrequencyCursor(W,H,nyquist,c,{toolbarTop:16,cursorX:this.waterfallCursor??null});continue;
    }
    const left=38,right=W-12,top=22,bottom=H-23,width=right-left,height=bottom-top;
    c.font='10px Arial';c.fillStyle=sunMode?'#486675':'#8aaaba';
    const x=f=>left+Math.log(f/20)/Math.log(1000)*width;
    const y=db=>bottom-Math.max(0,Math.min(1,(db-floorDb)/(ceilDb-floorDb)))*height;
    c.strokeStyle=sunMode?'#d8e5ec':'#173442';c.lineWidth=1;
    for(const f of [20,100,1000,10000,20000]){const xx=x(f);c.beginPath();c.moveTo(xx,top);c.lineTo(xx,bottom);c.stroke();c.fillText(f>=1000?(f/1000)+'k':String(f),Math.min(W-25,xx-6),H-6);}
    const line=(values,color,ordinate=y)=>{c.beginPath();let pen=false;values.forEach((v,b)=>{if(!Number.isFinite(v)){pen=false;return;}const xx=left+(b+.5)/values.length*width,yy=ordinate(v);pen?c.lineTo(xx,yy):c.moveTo(xx,yy);pen=true;});c.strokeStyle=color;c.lineWidth=1.6;c.stroke();};
    if(view==='tf'){
      if(!tf){c.fillStyle=sunMode?'#486675':'#8aaaba';c.fillText(refChannel<0?'TF unavailable · assign a Reference input':'TF unavailable · check Reference signal',left,top+18,Math.max(1,width));continue;}
      const yy=db=>top+(18-Math.max(-18,Math.min(18,db)))/36*height;
      for(const db of [-18,0,18]){const py=yy(db);c.beginPath();c.moveTo(left,py);c.lineTo(right,py);c.strokeStyle=db===0?'#527582':'#173442';c.stroke();c.fillStyle=sunMode?'#486675':'#8aaaba';c.fillText(db+' dB',2,py+3);}
      c.beginPath();let pen=false;for(let px=left;px<=right;px+=2){const f=20*Math.pow(1000,(px-left)/width),k=Math.min(tf.mag.length-1,Math.round(f/tf.sr*TF_FFT_N));if((tf.coh[k]||0)<tfCohGate){pen=false;continue;}const py=yy(tfNormalizedMagnitude(tf,k));pen?c.lineTo(px,py):c.moveTo(px,py);pen=true;}c.strokeStyle='#00e4ef';c.lineWidth=2;c.stroke();c.fillStyle=sunMode?'#486675':'#8aaaba';c.fillText(tfWorkflowVerified&&tfDelayReady&&tfAverageFrames>=18&&tf.confidence?.label==='HIGH'?'Verified · normalized 0 dB':'Unverified · sync and verify TF',left,14);continue;
    }
    for(let db=Math.ceil(floorDb/20)*20;db<=ceilDb;db+=20){const py=y(db);c.beginPath();c.moveTo(left,py);c.lineTo(right,py);c.stroke();c.fillStyle=sunMode?'#486675':'#8aaaba';c.fillText(String(db),4,py+3);}
    c.fillStyle=sunMode?'#486675':'#8aaaba';c.fillText('1/'+curBpo+' octave · dBFS',left,14);
    if(view==='rta'){
      const gradient=c.createLinearGradient(0,bottom,0,top);[['#0875ff',0],['#00c9ee',.28],['#00ecb0',.5],['#62f052',.7],['#ffdc31',.86],['#ff5266',1]].forEach(([col,p])=>gradient.addColorStop(p,col));c.fillStyle=gradient;
      rtaVisualDb.forEach((db,b)=>{const bw=width/BANDS,yy=y(db);if(Number.isFinite(db))c.fillRect(left+b*bw,yy,Math.max(.5,bw-.8),bottom-yy);});
    }else{line(rtaVisualDb,'#45a5ff');if(refChannel>=0)line(rtaRefVisualDb,'#ff4d5e');c.fillStyle='#45a5ff';c.fillText('MIC '+(measChannel+1),Math.max(left,right-130),14);c.fillStyle='#ff4d5e';c.fillText(refChannel>=0?'REF '+(refChannel+1):'REF None',Math.max(left,right-65),14);}
  }
}};
