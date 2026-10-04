const { app, BrowserWindow, protocol, net, session, Menu } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const fs = require('node:fs');
const origin = 'gal://app';
const testing = process.argv.includes('--self-test');
protocol.registerSchemesAsPrivileged([{scheme:'gal', privileges:{standard:true,secure:true,supportFetchAPI:true,stream:true}}]);
let window;
const local = url => { try { const u=new URL(url); return u.protocol==='gal:' && u.hostname==='app'; } catch { return false; } };
app.whenReady().then(async () => {
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
  window = new BrowserWindow({width:1440,height:940,minWidth:1000,minHeight:650,show:!testing,
    title:'GAL Analyzer',backgroundColor:'#0d1117',webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false}});
  window.webContents.setWindowOpenHandler(() => ({action:'deny'}));
  window.webContents.on('will-navigate',(event,url) => {if(!local(url))event.preventDefault();});
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {label:app.name,submenu:[{role:'about'},{type:'separator'},{role:'quit'}]},
    {role:'editMenu'},{role:'viewMenu'},{role:'windowMenu'}
  ]));
  const errors=[];
  window.webContents.on('console-message',(_event,level,message)=>{if(level===3)errors.push(message);});
  await window.loadURL(origin+'/index.html');
  if(testing){
    try {
      await new Promise(resolve=>setTimeout(resolve,2000));
      const result=await window.webContents.executeJavaScript(`(async()=>{
        const assert=(ok,text)=>{if(!ok)throw Error(text)};
        assert(window.isSecureContext,'Secure origin');
        assert(typeof navigator.mediaDevices?.getUserMedia==='function','Microphone API');
        assert(window.GAL?.config,'Shared bootstrap');
        assert(document.getElementById('ver')?.textContent.includes('6.0.0-preview.4'),'Desktop version');
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
        const code=await fetch('js/app-core.js').then(r=>r.text());
        assert(code.includes('Desktop updates ship'),'Desktop cache policy');
        return {version:GAL.config.version,canvases:document.querySelectorAll('canvas').length,worklet:true,parallelInputs:8};
      })()`);
      if(errors.length)throw Error(errors.join('\n'));
      console.log('Desktop integration passed:',JSON.stringify(result)); app.exit(0);
    }catch(error){console.error(error);app.exit(1);}
  }
}).catch(error=>{console.error(error);app.exit(1);});
app.on('window-all-closed',()=>app.quit());
