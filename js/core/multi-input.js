/* Parallel input monitoring. Raw extra-channel levels are always digital dBFS. */
window.GalMultiInput = (() => {
  const colors=['#00c8ff','#ffab00','#c84bff','#00f590','#ff285c','#fff000','#00efff','#8670ff'];
  let channels=[], splitter=null, sink=null, enabled=true, lastTime=0, delta=1/30;
  function dispose(){
    for(const c of channels)c.node.disconnect();
    splitter?.disconnect();sink?.disconnect();
    channels=[];splitter=null;sink=null;lastTime=0;
    const panel=document.getElementById('multiInputPanel');if(panel)panel.hidden=true;
    const count=document.getElementById('multiInputCount');if(count)count.textContent='Audio off';
    const host=document.getElementById('multiInputRows');if(host)host.replaceChildren();
  }
  function start(context,source,count,fftSize){
    dispose();count=Math.max(1,Math.min(32,count));
    splitter=context.createChannelSplitter(count);splitter.channelInterpretation='discrete';source.connect(splitter);
    sink=context.createGain();sink.gain.value=0;sink.connect(context.destination);
    const panel=document.getElementById('multiInputPanel');if(panel)panel.hidden=count<3;
    const host=document.getElementById('multiInputRows');
    for(let i=0;i<count;i++){
      const node=context.createAnalyser();node.fftSize=fftSize;node.smoothingTimeConstant=0;node.minDecibels=-120;node.maxDecibels=0;
      splitter.connect(node,i);node.connect(sink);
      const c={node,frequency:new Float32Array(node.frequencyBinCount),time:new Float32Array(2048),level:-120,visible:true,visual:[],color:colors[i%colors.length]};channels.push(c);
      if(host){
        const row=document.createElement('label');row.className='multiInputRow';
        const toggle=document.createElement('input');toggle.type='checkbox';toggle.checked=true;toggle.setAttribute('aria-label',`Show input ${i+1} curve`);toggle.onchange=()=>{c.visible=toggle.checked;};
        const name=document.createElement('span');name.textContent=`Input ${i+1}`;name.style.color=c.color;
        const track=document.createElement('span');track.className='multiInputTrack';c.fill=document.createElement('i');c.fill.style.background=c.color;track.append(c.fill);
        c.read=document.createElement('span');c.read.className='multiInputRead';c.read.textContent='NO SIGNAL';
        row.append(toggle,name,track,c.read);host.append(row);
      }
    }
    const title=document.getElementById('multiInputCount');if(title)title.textContent=`${count} active`;
  }
  function update(frozen,spectra=true){
    const paint=document.getElementById('v52IODock')?.classList.contains('open');
    const now=performance.now();const dt=lastTime?Math.max(.001,Math.min(.25,(now-lastTime)/1000)):1/30;lastTime=now;
    for(const c of channels){
      if(c.node.fftSize/2!==c.frequency.length)c.frequency=new Float32Array(c.node.frequencyBinCount);
      c.node.getFloatTimeDomainData(c.time);let power=0;for(const x of c.time)power+=x*x;
      const next=10*Math.log10(Math.max(1e-12,power/c.time.length));
      c.level+=(next-c.level)*(1-Math.exp(-dt/(next > c.level ? .045 : .34)));
      if(paint&&c.fill)c.fill.style.width=`${Math.max(0,Math.min(100,(c.level+90)/90*100))}%`;
      if(paint&&c.read)c.read.textContent=c.level<-110?'NO SIGNAL':`${c.level.toFixed(1)} dBFS`;
      if(spectra&&channels.length>2&&!frozen&&c.visible&&enabled)c.node.getFloatFrequencyData(c.frequency);
    }
    delta=dt;return dt;
  }
  function draw(ctx,height,nyquist,xForFreq,iso,ratio,norm,powerDb,frozen){
    if(!enabled || channels.length<3)return;
    ctx.save();ctx.lineWidth=1.5;
    for(const c of channels){
      if(!c.visible)continue;
      if(c.visual.length!==iso.length)c.visual=Array(iso.length).fill(NaN);
      ctx.strokeStyle=c.color;ctx.beginPath();
      iso.forEach((frequency,i)=>{
        const raw=powerDb(c.frequency,frequency/ratio,frequency*ratio,nyquist);
        if(!frozen||!Number.isFinite(c.visual[i])){
          const dt=delta,previous=c.visual[i];c.visual[i]=Number.isFinite(previous)?previous+(raw-previous)*(1-Math.exp(-dt/.12)):raw;
        }
        const x=xForFreq(frequency),y=height*(1-norm(c.visual[i]));if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);
      });ctx.stroke();
    }
    ctx.restore();
  }
  function setFFT(size){for(const c of channels){c.node.fftSize=size;c.frequency=new Float32Array(c.node.frequencyBinCount);c.visual=[];}}
  return {start,dispose,update,draw,setFFT,setEnabled:value=>{enabled=value},snapshot:()=>channels.map(c=>({level:c.level,visible:c.visible,frequency:Array.from(c.frequency)}))};
})();
