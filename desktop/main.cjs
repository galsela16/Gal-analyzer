const { app, BrowserWindow, protocol, net, session, Menu, nativeTheme, ipcMain, systemPreferences } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const fs = require('node:fs');
const origin = 'gal://app';
const testing = process.argv.includes('--self-test');
const hardwareTesting=process.argv.includes('--hardware-test');
if(testing||hardwareTesting)app.setPath('userData',fs.mkdtempSync(path.join(require('node:os').tmpdir(),'gal-audio-test-')));
const {NativeHost}=require('./native-host.cjs');
let audioHost;
protocol.registerSchemesAsPrivileged([{scheme:'gal', privileges:{standard:true,secure:true,supportFetchAPI:true,stream:true}}]);
let window;
const local = url => { try { const u=new URL(url); return u.protocol==='gal:' && u.hostname==='app'; } catch { return false; } };
app.whenReady().then(async () => {
  nativeTheme.themeSource = 'dark';
  const trusted=event=>{if(event.sender!==window?.webContents||!local(event.senderFrame?.url||''))throw Error('Unauthorized audio request.');};
  audioHost=new NativeHost({app,testing,send:(channel,value)=>{if(window&&!window.isDestroyed())window.webContents.send(channel,value)}});
  ipcMain.handle('gal:native:list',async event=>{trusted(event);return audioHost.list();});
  ipcMain.handle('gal:native:start',async(event,options)=>{
    trusted(event);
    if(!testing && !await systemPreferences.askForMediaAccess('microphone'))throw Error('Allow GAL Analyzer microphone access in System Settings → Privacy & Security → Microphone.');
    return audioHost.start(options);
  });
  ipcMain.handle('gal:native:stop',async event=>{trusted(event);await audioHost.stop();});
  const root = path.join(__dirname, 'web');
  protocol.handle('gal', request => {
    const url = new URL(request.url);
    if (!local(request.url) || request.method !== 'GET') return new Response('', {status:403});
    let relative;
    try { relative=decodeURIComponent(url.pathname); } catch { return new Response('', {status:400}); }
    const target = path.resolve(root, '.' + (relative==='/' ? '/index.html' : relative));
    if (!target.startsWith(root + path.sep) || !fs.existsSync(target) || !fs.statSync(target).isFile()) return new Response('', {status:404});
    return net.fetch(pathToFileURL(target).toString());
  });
  session.defaultSession.setPermissionCheckHandler((contents, permission, requestingOrigin, details) =>
    contents === window?.webContents && local(requestingOrigin) && permission === 'media' && details.mediaType !== 'video');
  session.defaultSession.setPermissionRequestHandler((contents, permission, callback, details) => {
    const types=details.mediaTypes || [];
    callback(!testing && contents===window?.webContents && local(details.requestingUrl || contents.getURL()) && permission==='media' && types.includes('audio') && !types.includes('video'));
  });
  // Packaged assets operate offline. No remote pages are loaded into the analyzer.
  session.defaultSession.webRequest.onBeforeRequest((details,callback) => callback({cancel:/^https?:/i.test(details.url)}));
  window = new BrowserWindow({width:1440,height:940,minWidth:1000,minHeight:650,show:!testing&&!hardwareTesting,
    title:'GAL Analyzer',backgroundColor:'#0d1117',webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false}});
  window.webContents.setWindowOpenHandler(() => ({action:'deny'}));
  window.webContents.on('will-navigate',(event,url) => {if(!local(url))event.preventDefault();});
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {label:app.name,submenu:[{role:'about'},{type:'separator'},{role:'quit'}]},
    {role:'editMenu'},{role:'viewMenu'},{role:'windowMenu'}
  ]));
  const errors=[];
  window.webContents.on('console-message',(_event,level,message)=>{if(level===3)errors.push(message);});
  await window.loadURL(origin+'/index.html');
  if(hardwareTesting){
    try {
      const result=await window.webContents.executeJavaScript(`(async()=>{
        const devices=await GalNativeInput.listDevices();
        const device=devices.find(d=>d.kind==='audioinput'&&/EVO8/i.test(d.label));
        if(!device)throw Error('EVO8 is not connected.');
        await start(device.deviceId);
        if(!running||!stream?.native)throw Error(errBox.textContent||'Native application input did not start.');
        await new Promise(resolve=>setTimeout(resolve,8000));
        if(!running||stream.getAudioTracks()[0].readyState!=='live')throw Error(errBox.textContent||'Capture stopped.');
        const result={...stream.info,contextRate:audioCtx.sampleRate,receivedChannels:chReceived,inputChoices:document.getElementById('v52MeasSelect').options.length,levels:GalMultiInput.snapshot().map(c=>c.level)};
        await stop();return result;
      })()`);
      console.log('Native hardware capture passed:',JSON.stringify(result));app.exit(0);
    }catch(error){console.error('Native hardware capture failed:',error);app.exit(1);}
    return;
  }
  if(testing){
    try {
      await new Promise(resolve=>setTimeout(resolve,2000));
      const result=await window.webContents.executeJavaScript(`(async()=>{
        const nativeAdapter=window.GalNativeInput;window.GalNativeInput=null;
        const assert=(ok,text)=>{if(!ok)throw Error(text)};
        assert(window.isSecureContext,'Secure origin');
        assert(typeof navigator.mediaDevices?.getUserMedia==='function','Microphone API');
        assert(window.GAL?.config,'Shared bootstrap');
        assert(document.getElementById('ver')?.textContent.includes('6.0.0-preview.8'),'Desktop version');
        assert(document.querySelector('[data-bpo="48"]'),'1/48 resolution');
        assert(document.querySelectorAll('canvas').length>0,'Graph canvases');
        assert(typeof require==='undefined','Renderer isolation');
        const audio=new AudioContext();
        await audio.audioWorklet.addModule('recorder-worklet.js');
        const recorder=new AudioWorkletNode(audio,'recorder-worklet');
        recorder.disconnect();await audio.close();
        const synthetic=new AudioContext();await synthetic.resume();
        const merger=synthetic.createChannelMerger(8);
        const oscillators=[];
        for(let i=0;i<8;i++){
          const oscillator=synthetic.createOscillator();oscillator.frequency.value=300+i*300;
          const gain=synthetic.createGain();gain.gain.value=Math.pow(10,(-12-i*3)/20);
          oscillator.connect(gain);gain.connect(merger,0,i);oscillator.start();oscillators.push(oscillator);
        }
        GalMultiInput.start(synthetic,merger,8,8192);
        await new Promise(resolve=>setTimeout(resolve,350));
        for(let i=0;i<30;i++){GalMultiInput.update(false);await new Promise(resolve=>setTimeout(resolve,20));}
        const inputs=GalMultiInput.snapshot();assert(inputs.length===8,'Eight monitored inputs');
        assert(document.querySelectorAll('.multiInputRow').length===8,'Eight input meters');
        inputs.forEach((input,i)=>{
          assert(Math.abs(input.level-(-15.0103-i*3))<0.4,'Independent channel level '+i);
          const peak=input.frequency.indexOf(Math.max(...input.frequency));
          assert(Math.abs(peak*synthetic.sampleRate/8192-(300+i*300))<15,'Independent channel frequency '+i);
        });
        GalMultiInput.setFFT(16384);assert(GalMultiInput.snapshot().length===8,'FFT change retains channels');
        GalMultiInput.dispose();assert(GalMultiInput.snapshot().length===0,'Stop clears channels');
        for(const oscillator of oscillators)oscillator.stop();await synthetic.close();
        // Reproduce a driver exposing a stereo stream while reporting one input.
        // Only the reported MIC may enter measurement; REF must remain absent.
        const monoTest=new AudioContext();await monoTest.resume();
        const destination=monoTest.createMediaStreamDestination();destination.channelCount=2;
        destination.channelCountMode='explicit';destination.channelInterpretation='discrete';
        const pair=monoTest.createChannelMerger(2);pair.connect(destination);
        const tones=[];
        for(let i=0;i<2;i++){
          const tone=monoTest.createOscillator();tone.frequency.value=600+i*800;
          const gain=monoTest.createGain();gain.gain.value=i ? .1 : .25;
          tone.connect(gain);gain.connect(pair,0,i);tone.start();tones.push(tone);
        }
        const track=destination.stream.getAudioTracks()[0];
        Object.defineProperty(track,'getSettings',{value:()=>({channelCount:1,sampleRate:monoTest.sampleRate})});
        const original=navigator.mediaDevices.getUserMedia;
        navigator.mediaDevices.getUserMedia=async()=>destination.stream;
        try {
          await start();await new Promise(resolve=>setTimeout(resolve,600));
          const reference=new Float32Array(analyserRef.fftSize);analyserRef.getFloatTimeDomainData(reference);
          assert(reference.every(x=>x===0),'No phantom reference audio');
          const capture=new AudioWorkletNode(audioCtx,'recorder-worklet',{channelCount:1,channelCountMode:'explicit',channelInterpretation:'discrete'});
          const silent=audioCtx.createGain();silent.gain.value=0;source.connect(capture);capture.connect(silent);silent.connect(audioCtx.destination);
          const recorded=await new Promise((resolve,reject)=>{
            const timeout=setTimeout(()=>reject(Error('Mono recorder timeout')),2000);
            capture.port.onmessage=event=>{clearTimeout(timeout);resolve(event.data)};
            capture.port.postMessage({cmd:'start',micChannel:0,refChannel:-1});
          });
          assert(recorded.ref.every(x=>x===0),'Recorder must not substitute MIC for REF None');
          assert(recorded.mic.some(x=>Math.abs(x)>.01),'Recorder keeps real MIC');
          capture.port.postMessage({cmd:'stop'});source.disconnect(capture);capture.disconnect();silent.disconnect();
          const live=getLiveInputMeterSnapshot();assert(live.refDb===-120&&live.refPeakDb===-120,'No phantom reference meter');
          assert(document.getElementById('v52RefSelect').value==='-1','REF None for mono');
          assert(document.getElementById('v52MeasSelect').options.length===1,'Only one selectable input');
          assert(getComputedStyle(document.querySelector('[data-input="ref"]')).display==='none','Hide unassigned REF card');
          assert(document.getElementById('multiInputPanel').hidden,'No duplicate mono input list');
          assert(document.getElementById('targetTraceCard').scrollWidth<=document.getElementById('targetTraceCard').clientWidth+1,'No sidebar overflow');
          assert(document.getElementById('tlsMicInput').getBoundingClientRect().right<=document.querySelector('[data-input="mic"]').getBoundingClientRect().right,'Input label fits meter card');
        } finally {
          await stop();navigator.mediaDevices.getUserMedia=original;
          for(const tone of tones)tone.stop();await monoTest.close();
        }
        window.GalNativeInput=nativeAdapter;
        assert(nativeAdapter&&window.galNativeHost,'Native audio bridge');
        const nativeDevices=await nativeAdapter.listDevices();
        assert(nativeDevices.some(d=>d.deviceId.startsWith('coreaudio:')),'Core Audio device enumeration');
        const nativeContext=new AudioContext();await nativeContext.resume();
        const capture=await nativeAdapter.open(nativeContext,'coreaudio:synthetic');
        assert(capture.stream.getAudioTracks()[0].getSettings().channelCount===6,'Six native transport channels');
        GalMultiInput.start(nativeContext,capture.source,6,8192);
        await new Promise(resolve=>setTimeout(resolve,450));
        for(let i=0;i<30;i++){GalMultiInput.update(false);await new Promise(resolve=>setTimeout(resolve,20));}
        const nativeInputs=GalMultiInput.snapshot();
        assert(capture.stream.getAudioTracks()[0].readyState==='live','Native transport stayed live');
        nativeInputs.forEach((input,i)=>{
          assert(Math.abs(input.level-(-15.0103-i*3))<.5,'Native PCM channel level '+i);
          const peak=input.frequency.indexOf(Math.max(...input.frequency));
          assert(Math.abs(peak*nativeContext.sampleRate/8192-(300+i*300))<15,'Native PCM channel frequency '+i);
        });
        GalMultiInput.dispose();await nativeAdapter.stop();await nativeContext.close();
        // Exercise the complete TF workflow on six native inputs, without output playback.
        await start('coreaudio:field-test');v5SetTab('tf');showModal(tfPanel);
        assert(refChannel===1,'Mono to multichannel restores the real reference');
        const fieldTrack=stream.getAudioTracks()[0],fieldContext=audioCtx;
        const captureDelay=()=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Field capture timeout: '+errBox.textContent)),12000);runDelayCapture(null,result=>{clearTimeout(timer);resolve(result)},{signalType:'noise',maxDelayMs:50});});
        const delay=await captureDelay();assert(delay?.reliable&&Math.abs(delay.ms-5)<.1,'Native reference delay measurement: '+JSON.stringify(delay));
        assert(running&&fieldTrack.readyState==='live','Capture completion keeps input alive');
        tfDelayMs=delay.ms;tfDelaySamples=delay.samples;tfDelayReady=true;
        const realGenStart=genStart;
        genStart=options=>{assert(options.preserveTfSync,'TF source switch retains sync');genOn=true;};
        runWithSource('pink',verifyTfWorkflow,3000);await new Promise(resolve=>setTimeout(resolve,2800));genStart=realGenStart;
        assert(tfWorkflowVerified,'TF verifies on real recorded reference');
        await new Promise(resolve=>setTimeout(resolve,2600));
        assert(tfAverageFrames>=18&&tfWorkingAverage?.confidence?.label==='HIGH','Stable TF working average');
        const before=tfTraces.length;requestTfTraceCapture();
        assert(tfTraces.length===before+1&&tfTraces.at(-1).verified,'Capture stores a verified TF result');
        assert(!srcOverlay.classList.contains('show'),'Stable capture does not restart stimulus or sync');
        const savedTrace=tfTraces.at(-1),saved=Array.from(savedTrace.mag);
        source.gain.value=0;await new Promise(resolve=>setTimeout(resolve,700));
        const heldCount=tfTraces.length;requestTfTraceCapture();
        assert(tfTraces.length===heldCount+1&&tfTraces.at(-1).verified,'Held TF result can be saved after stimulus ends');
        source.gain.value=1;await new Promise(resolve=>setTimeout(resolve,500));
        for(let i=0;i<2;i++){
          const repeat=await captureDelay();assert(repeat?.reliable&&Math.abs(repeat.ms-5)<.1,'Repeat measurement '+i);
          assert(running&&audioCtx===fieldContext&&fieldTrack.readyState==='live','Same microphone remains running '+i);
        }
        assert(saved.every((value,i)=>value===savedTrace.mag[i]),'Saved trace survives subsequent measurements');
        // Record higher inputs without down-mixing into the recorder default stereo input.
        measChannel=2;refChannel=3;await switchInput('coreaudio:field-test');v5SetTab('tf');
        const higher=await captureDelay();assert(higher?.reliable&&Math.abs(higher.ms-5)<.1,'Delay recorder keeps channels 3 and 4');
        const stableTrack=stream.getAudioTracks()[0];
        const blockedUntil=performance.now()+350;while(performance.now()<blockedUntil){}
        await new Promise(resolve=>setTimeout(resolve,1500));
        assert(running&&stableTrack.readyState==='live','UI stalls do not require microphone restart');
        await stop();measChannel=0;refChannel=1;v5SetTab('rta');
        const code=await fetch('js/app-core.js').then(r=>r.text());
        assert(code.includes('Desktop updates ship'),'Desktop cache policy');
        return {version:GAL.config.version,canvases:document.querySelectorAll('canvas').length,worklet:true,parallelInputs:8,monoReference:false,nativeChannels:6,repeatedFieldMeasurements:4,verifiedTrace:true};
      })()`);
      if(errors.length)throw Error(errors.join('\n'));
      for(const [width,height] of [[1440,940],[1080,760]]){
        window.setSize(width,height);
        await window.webContents.executeJavaScript(`(async()=>{
          const check=(ok,message)=>{if(!ok)throw Error(message)};
          const rect=node=>node.getBoundingClientRect();
          const intersects=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
          const panel=document.getElementById('dlyPanel');showModal(panel);
          panel.classList.remove('expanded');resize();updateMeasureDockHeight();
          await new Promise(resolve=>setTimeout(resolve,150));
          check(!intersects(rect(panel.querySelector('h3')),rect(panel.querySelector('.dlyActions'))),'Delay title and actions overlap');
          const card=rect(panel.querySelector('.dlyMeasureCard'));
          for(const selector of ['#dlyMeasBtn','#dlyStatus','.delayRangeControl','.dlyUnitControl']){
            const control=rect(panel.querySelector(selector));
            check(control.left>=card.left-1&&control.right<=card.right+1,'Delay control clipped: '+selector);
          }
          const range=rect(panel.querySelector('.delayRangeControl')),unit=rect(panel.querySelector('.dlyUnitControl'));
          check(!intersects(range,unit),'Delay controls overlap');
          panel.classList.add('expanded');updateMeasureDockHeight();await new Promise(resolve=>setTimeout(resolve,100));
          check(panel.scrollWidth<=panel.clientWidth+1,'Expanded delay overflow');
          panel.classList.remove('open','expanded');updateMeasureDockHeight();
        })()`);
      }
      console.log('Desktop integration passed:',JSON.stringify(result)); app.exit(0);
    }catch(error){console.error(error);app.exit(1);}
  }
}).catch(error=>{console.error(error);app.exit(1);});
app.on('before-quit',()=>{audioHost?.stop();});
app.on('window-all-closed',()=>app.quit());
