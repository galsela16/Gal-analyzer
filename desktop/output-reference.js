// Desktop-only computer output capture. No console commands or playback changes.
(()=>{
 const host=window.galNativeHost;if(!host?.outputs)return;
 const key='gal.output-reference.v1';let config=null;try{config=JSON.parse(localStorage.getItem(key)||'null')}catch{}
 if(config&&(typeof config.uid!=='string'||typeof config.inputUID!=='string'||!Number.isInteger(config.channel)||!Number.isInteger(config.mic)))config=null;
 const save=()=>config?localStorage.setItem(key,JSON.stringify(config)):localStorage.removeItem(key);
 window.GalOutputReference={configuration:uid=>config?.inputUID===uid?{uid:config.uid,channel:config.channel,mic:config.mic}:null};
 const dialog=document.createElement('dialog');dialog.id='outputReferenceDialog';dialog.style.cssText='background:var(--panel,#102733);color:var(--text,#d4e9f1);border:1px solid #285563;border-radius:14px;padding:24px;width:520px;max-width:85vw';
 dialog.innerHTML='<h3 style="margin-top:0">Computer output as REF</h3><p>Capture audio this Mac sends to an output. Console-generated audio is not included.</p><label>Output device<select id="outputRefDevice" style="display:block;width:100%;margin:8px 0 16px"></select></label><label>Output channel<select id="outputRefChannel" style="display:block;width:100%;margin:8px 0 16px"></select></label><label>MIC input channel<select id="outputRefMic" style="display:block;width:100%;margin:8px 0 16px"></select></label><p>Use the same interface for MIC and output REF. Run TF Sync again after changing the source.</p><p id="outputRefStatus" role="status"></p><div style="display:flex;gap:8px;flex-wrap:wrap"><button id="outputRefApply">Use output as REF</button><button id="outputRefDisable">Use input REF</button><button id="outputRefClose">Close</button></div>';
 document.body.append(dialog);
 const device=dialog.querySelector('#outputRefDevice'),channel=dialog.querySelector('#outputRefChannel'),mic=dialog.querySelector('#outputRefMic'),status=dialog.querySelector('#outputRefStatus'),apply=dialog.querySelector('#outputRefApply');let devices=[],input;
 function channels(){const d=devices.find(d=>d.uid===device.value);channel.replaceChildren(...Array.from({length:d?.channels||0},(_,i)=>new Option(d.labels?.[i]||'Out '+(i+1),String(i))));if(d?.uid===config?.uid)channel.value=String(config.channel);apply.disabled=!input||!d||d.uid!==input.uid;}
 async function open(){
  status.textContent='Reading devices…';apply.disabled=true;dialog.showModal();
  try{const [list,outputs]=await Promise.all([host.list(),host.outputs()]);if(!outputs.supported)throw Error('Computer output REF requires macOS 14.2 or later.');
   const uid=typeof activeInId==='string'?activeInId.replace(/^coreaudio:/,''):'';input=list.find(d=>d.uid===uid)||list.find(d=>d.isDefault);if(!input)throw Error('Select a connected input interface first.');
   devices=outputs.devices;device.replaceChildren(...devices.map(d=>{const o=new Option(d.name+' · '+d.channels+' outputs',d.uid);o.disabled=d.uid!==input.uid;return o}));device.value=input.uid;
   mic.replaceChildren(...Array.from({length:input.channels},(_,i)=>new Option(input.labels?.[i]||'Input '+(i+1),String(i))));mic.value=String(config?.inputUID===input.uid?config.mic:Math.min(measChannel,input.channels-1));channels();
   status.textContent=apply.disabled?'This input device has no matching output. Choose a duplex audio interface.':'macOS may request System Audio Recording permission. Playback stays unchanged.';
  }catch(e){status.textContent=e.message;apply.disabled=true;}
 }
 async function change(next){
  const old=config,wasRunning=running,id=activeInId;apply.disabled=true;
  try{if(wasRunning)await stop();config=next;if(!next&&old){measChannel=old.mic;refChannel=-1;referenceExplicitlyNone=true;}save();if(wasRunning){await start(id);if(!running)throw Error(document.getElementById('errBox')?.textContent||'Capture could not start.');}dialog.close();}
  catch(e){config=old;save();status.textContent=e.message;if(wasRunning&&!running)await start(id);}
  finally{apply.disabled=false;}
 }
 device.onchange=channels;apply.onclick=()=>change({inputUID:input.uid,uid:device.value,channel:Number(channel.value),mic:Number(mic.value)});
 dialog.querySelector('#outputRefDisable').onclick=()=>change(null);dialog.querySelector('#outputRefClose').onclick=()=>dialog.close();
 // Put output capture in the actual REF chooser, including Audio Preferences.
 for(const id of ['bottomRefInput','v52RefSelect'])document.getElementById(id)?.addEventListener('change',event=>{if(event.target.value==='__computer_output__'){event.stopImmediatePropagation();event.target.value=String(refChannel);open();}else if(config&&(typeof stream!=='undefined'?stream:null)?.info?.outputReference){event.stopImmediatePropagation();event.target.value=String(refChannel);open();}},true);
 const button=document.createElement('button');button.id='outputReferenceOpen';button.type='button';button.textContent='Output REF…';button.style.cssText='font-size:11px;padding:3px 7px';button.onclick=open;document.getElementById('bottomIoSettings')?.before(button);
 const refresh=()=>{const select=document.getElementById('v52RefSelect');if(select&&!select.querySelector('[value="__computer_output__"]'))select.add(new Option('Computer output…','__computer_output__'));if((typeof stream!=='undefined'?stream:null)?.info?.outputReference){document.getElementById('v52MeasSelect').disabled=true;document.getElementById('bottomMicInput').title='Change the physical MIC channel in Output REF settings';}else{const s=document.getElementById('v52MeasSelect');if(s)s.disabled=false;}};
 setInterval(refresh,200);refresh();
})();
