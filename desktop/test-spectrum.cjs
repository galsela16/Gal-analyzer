// Compare actual canvas paths, not just data, using isolated synthetic input.
module.exports=async({window})=>window.webContents.executeJavaScript(`(async()=>{
  const wait=ms=>new Promise(r=>setTimeout(r,ms));await wait(600);
  v54SetAnalysisView('overview');await wait(170);if(running||window.GalOverview.frames<1)throw Error('Idle overview unexpectedly starts audio or fails to display');v54SetAnalysisView('rta');
  v5OpenTf();document.getElementById('tfPanel').classList.add('expanded');updateMeasureDockHeight();await wait(400);
  const dock=document.getElementById('tfPanel'),rect=dock.getBoundingClientRect();
  if(dock.scrollWidth>dock.clientWidth+2)throw Error(JSON.stringify([...dock.querySelectorAll('*')].filter(e=>e.getBoundingClientRect().right>rect.right-10&&e.getBoundingClientRect().width>0).map(e=>({id:e.id,cls:e.className,width:e.getBoundingClientRect().width,right:e.getBoundingClientRect().right})).slice(0,25)));
  for(const id of measureDockIds){
    const panel=document.getElementById(id);showModal(panel);
    for(const expanded of [false,true]){panel.classList.toggle('expanded',expanded);updateMeasureDockHeight();await wait(100);const r=panel.getBoundingClientRect();if(panel.scrollWidth>panel.clientWidth+2)throw Error(id+' overflows: '+JSON.stringify([...panel.querySelectorAll('*')].filter(e=>e.getBoundingClientRect().right>r.right-10&&e.getBoundingClientRect().width>0).map(e=>e.id||e.className).slice(0,15)));}
  }
  closeModals();await wait(350);
  await start('coreaudio:channels-2');setFft(16384);setAnalysisSpeed('normal',false);
  const capture=fn=>{
    const methods=['beginPath','moveTo','lineTo','stroke'],saved={},paths=[];let path=[];
    methods.forEach(k=>saved[k]=ctx[k]);
    ctx.beginPath=function(){path=[];return saved.beginPath.call(this);};
    ['moveTo','lineTo'].forEach(k=>ctx[k]=function(x,y){path.push([k,x,y]);return saved[k].call(this,x,y);});
    ctx.stroke=function(...args){if(this.strokeStyle==='#45a5ff'||this.strokeStyle==='#ff4d5e')paths.push({color:this.strokeStyle,path:path.slice()});return saved.stroke.apply(this,args);};
    try{fn();return paths;}finally{methods.forEach(k=>ctx[k]=saved[k]);}
  };
  const results=[];micCal={f:[20,20000],g:[3,3]};
  for(const resolution of [3,6,12,24,48]){
    buildBands(resolution);v54SetAnalysisView('mr');await wait(500);frozen=true;
    const history=JSON.stringify([avgBuf,refAvgBuf,rtaVisualDb,rtaRefVisualDb]);
    for(const reference of [1,-1]){
      refChannel=reference;
      const mr=capture(()=>drawDualInputRta(1000,650,24000));
      const tf=capture(()=>tfDrawDualLiveView(1000,650,24000));
      if(JSON.stringify(mr)!==JSON.stringify(tf))throw Error('Spectrum geometry differs at 1/'+resolution);
      if(mr.length!==(reference<0?1:2)||mr[0].path.length!==BANDS)throw Error('Missing bands or phantom reference');
      if(mr.some(p=>p.path.some(point=>!Number.isFinite(point[1])||!Number.isFinite(point[2]))))throw Error('Invalid path');
    }
    refChannel=1;v54SetAnalysisView('tf');await wait(80);
    if(JSON.stringify([avgBuf,refAvgBuf,rtaVisualDb,rtaRefVisualDb])!==history)throw Error('View switch changed frozen spectrum');
    if(Math.abs(calibratedResponseDb(-40,1000)-(-43))>.001)throw Error('Calibration correction changed');
    results.push({resolution,bands:BANDS,identicalPaths:true});refChannel=1;frozen=false;
  }
  micCal=null;
  document.querySelector('#uiRightTools [data-tool="align"]').click();await wait(350);
  if(!alignOn||!document.getElementById('alignBar').classList.contains('open')||getComputedStyle(document.getElementById('alignBar')).display==='none')throw Error('Sub/Top tool did not open');
  closeModals();
  v5OpenTf();await wait(100);
  if(getComputedStyle(document.querySelector('#tfPanel .dockMoreBtn')).display!=='none'||getComputedStyle(document.getElementById('tfUtilityBtns')).display==='none')throw Error('Measurement options still require expansion');
  closeModals();refChannel=-1;v54SetAnalysisView('overview');await wait(450);
  if(!document.body.classList.contains('overview-mode')||window.GalOverview.frames<2||wf3d.rows.length<2)throw Error('Overview did not update live graphs');
  if(document.querySelectorAll('#v53AnalysisGroup button.on').length!==1||!document.getElementById('overviewToggle').classList.contains('on'))throw Error('Overview selector not exclusive');
  for(const view of ['rta','mr','spec','tf'])if(document.getElementById('overview-'+view).width<100)throw Error('Overview canvas missing: '+view);
  const cadence=[];
  for(const reference of [1,-1]){
    refChannel=reference;referenceExplicitlyNone=reference<0;await switchInput('coreaudio:field-test');await wait(600);if(reference>=0){await wait(Math.ceil(wf3d.maxRows*wf3d.intervalMs*1.5));if(wf3d.rows.length!==wf3d.maxRows)throw Error('Waterfall history did not fill for the cadence stress check');}
    const originalClear=ctx.clearRect,originalFill=ctx.fillRect;let hiddenPaints=0;
    ctx.clearRect=function(...args){hiddenPaints++;return originalClear.apply(this,args)};ctx.fillRect=function(...args){hiddenPaints++;return originalFill.apply(this,args)};
    const before=GalOverview.frames,began=performance.now();
    try{await wait(1200);const fps=(GalOverview.frames-before)/(performance.now()-began)*1000;if(fps<22||hiddenPaints!==0)throw Error('Overview cadence or hidden draw regression: '+JSON.stringify({reference,fps,hiddenPaints}));cadence.push({reference,fps,hiddenPaints});if(reference>=0){const snapshot=GalOverview.tfSnapshot,row=GalOverview.waterfallRow,bands=JSON.stringify(rtaVisualDb);if(!snapshot)throw Error('TF live snapshot unavailable with valid reference');frozen=true;await wait(180);if(GalOverview.tfSnapshot!==snapshot||GalOverview.waterfallRow!==row||JSON.stringify(rtaVisualDb)!==bands)throw Error('Overview freeze changed TF, history or bands');frozen=false;}}finally{ctx.clearRect=originalClear;ctx.fillRect=originalFill;}
  }
  frozen=true;const history=wf3d.rows,historyJson=JSON.stringify(history);
  v54SetAnalysisView('spec');await wait(180);if(wf3d.rows!==history||JSON.stringify(wf3d.rows)!==historyJson)throw Error('Expanding Waterfall cleared or advanced frozen history');
  v54SetAnalysisView('overview');await wait(180);if(wf3d.rows!==history||JSON.stringify(wf3d.rows)!==historyJson)throw Error('Returning to Overview changed frozen history');
  const visible=document.getElementById('overview-spec'),W=visible.clientWidth,H=visible.clientHeight,scale=Math.min(devicePixelRatio||1,2),referenceCanvas=document.createElement('canvas');
  referenceCanvas.width=Math.round(W*scale);referenceCanvas.height=Math.round(H*scale);const paint=referenceCanvas.getContext('2d');paint.setTransform(scale,0,0,scale,0,0);drawWaterfall3d(W,H,audioCtx.sampleRate/2,null,paint,{capture:false,toolbarTop:16});
  const geometry=waterfallGeometry(W,H,16),maxHz=Math.min(20000,audioCtx.sampleRate/2*.96);drawWaterfallResonanceOverlay(W,H,f=>geometry.left+Math.log(f/20)/Math.log(maxHz/20)*(geometry.right-geometry.left),paint,{toolbarTop:16});
  const expected=paint.getImageData(0,0,referenceCanvas.width,referenceCanvas.height).data,actual=visible.getContext('2d').getImageData(0,0,visible.width,visible.height).data;
  if(expected.length!==actual.length||expected.some((v,i)=>v!==actual[i]))throw Error('Overview Waterfall differs from the shared 3D renderer');
  frozen=false;
  const exportCanvas=GalOverview.exportCanvas(),gridBounds=document.getElementById('overviewGrid').getBoundingClientRect();if(exportCanvas.width!==Math.round(gridBounds.width*Math.min(devicePixelRatio||1,2))||exportCanvas.height!==Math.round(gridBounds.height*Math.min(devicePixelRatio||1,2)))throw Error('Overview PNG export does not include the whole visible grid');
  const originalDownload=download;let exportName;download=name=>{exportName=name};try{exportPNG();if(!exportName?.startsWith('overview_'))throw Error('PNG export still uses the hidden graph');}finally{download=originalDownload;}
  const traceCount=tfTraces.length,traceValues=lastV.slice();captureWorkspaceTrace();if(tfTraces.length!==traceCount+1||tfTraces.at(-1).type!=='rta'||JSON.stringify(tfTraces.at(-1).values)!==JSON.stringify(traceValues))throw Error('Overview trace capture no longer uses canonical measured bands');
  const type=document.getElementById('bottomSignalType');type.value='sine';type.dispatchEvent(new Event('change'));
  const hz=document.getElementById('bottomSignalHz');hz.value='250';hz.dispatchEvent(new Event('change'));await wait(170);if(genHz!==250||hz.disabled||genOn)throw Error('Inline sine control failed');
  type.value='sweep';type.dispatchEvent(new Event('change'));const duration=document.getElementById('bottomSweepDuration');duration.value='6';duration.dispatchEvent(new Event('change'));await wait(170);if(genSweepDur!==6||duration.disabled||genOn)throw Error('Inline sweep control failed');
  v54SetAnalysisView('rta');await stop();return {results,freezePreserved:true,calibrationVerified:true,overviewCadence:cadence};
})()`);
