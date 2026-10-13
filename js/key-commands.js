// User-owned keyboard bindings. Capture commands before legacy modal handlers.
(()=>{
 const storageKey='gal.keyCommands.v1';
 const definitions=[
 ['audio','Start / stop audio','uiLivePill',''],['signal','Start / stop signal','tlsGenToggle',''],
 ['trace','Capture trace','v5AddTrace',''],['freeze','Freeze / resume view','freezeBtn','Space'],
 ['rta','RTA view','v53AnalysisToggle',''],['mr','M/R view','v54MrToggle',''],
 ['waterfall','Waterfall view','v54WaterfallToggle',''],['tf','TF view','v54TfGraphToggle',''],['overview','Overview','overviewToggle',''],
 ['peak','Toggle peak hold','peakBtn','KeyP'],['average','Toggle averaging','avgBtn','KeyA'],['resetPeak','Reset peaks','resetPeakBtn','KeyR'],
 ['range','Full frequency range','zoomBtn','KeyF'],['generator','Focus generator','bottomSignalType','KeyG'],['save','Saved measurements','saveBtn','KeyS'],
 ['left','Fold / unfold left sidebar','leftRailToggle',''],['right','Fold / unfold right sidebar','rightRailToggle',''],['theme','Day / night theme','uiSetTheme','']
 ];
 const defaults=Object.fromEntries(definitions.map(([id,,,key])=>[id,key]));
 const valid=/^(?:Ctrl\+)?(?:Alt\+)?(?:Shift\+)?(?:Meta\+)?(?:Key[A-Z]|Digit[0-9]|F(?:[1-9]|1[0-2])|Space|Arrow(?:Up|Down|Left|Right)|Home|End|PageUp|PageDown|BracketLeft|BracketRight|Backquote|Minus|Equal|Comma|Period|Slash|Semicolon|Quote|Backslash)$/;
 const reserved=combo=>/^(?:Ctrl|Meta)\+(?:Key[ACVXZQWHMNR]|Comma|Space|Tab|Minus|Equal|Digit0)$/.test(combo.replace('Alt+','').replace('Shift+',''))||combo==='Ctrl+Meta+KeyF'||combo==='Alt+F4'||combo==='Meta+Alt+Escape';
 let bindings={...defaults},recording=null;
 try{const saved=JSON.parse(localStorage.getItem(storageKey)||'null');if(saved&&typeof saved==='object'){
  const used=new Set();for(const [id] of definitions){const key=Object.hasOwn(saved,id)?saved[id]:defaults[id];bindings[id]=typeof key==='string'&&(!key||(valid.test(key)&&!reserved(key)&&!used.has(key)))?key:'';if(bindings[id])used.add(bindings[id]);}
 }}catch{}
 const nav=document.querySelector('.audioPreferencesNav'),dock=document.getElementById('v52IODock');
 if(!nav||!dock)return;
 const tab=document.createElement('button');tab.type='button';tab.dataset.audioPage='keys';tab.textContent='Key Commands';nav.append(tab);
 const panel=document.createElement('section');panel.className='v52IOCard keyCommandsPanel';panel.dataset.preferencesPage='keys';panel.hidden=true;
 panel.innerHTML='<h4>KEY COMMANDS</h4><p>Choose a command, then press your shortcut. Escape cancels. Shortcuts are paused while typing or using Preferences.</p><div class="keyCommandsToolbar"><input type="search" id="keyCommandsSearch" placeholder="Search commands" aria-label="Search key commands"><button type="button" id="keyCommandsReset">Reset defaults</button></div><div id="keyCommandsStatus" role="status" aria-live="polite">Changes are saved automatically.</div><div id="keyCommandsRows"></div>';
 dock.querySelector('.v52IOGrid').append(panel);
 const rows=panel.querySelector('#keyCommandsRows'),status=panel.querySelector('#keyCommandsStatus');
 const label=combo=>combo?combo.replace(/Ctrl\+/g,'⌃ ').replace(/Alt\+/g,'⌥ ').replace(/Shift\+/g,'⇧ ').replace(/Meta\+/g,'⌘ ').replace(/Key([A-Z])/,'$1').replace(/Digit([0-9])/,'$1').replace('Space','Space'): 'Not assigned';
 function render(){rows.replaceChildren();const search=panel.querySelector('input').value.toLowerCase();for(const [id,name] of definitions){if(!name.toLowerCase().includes(search))continue;const row=document.createElement('div');row.className='keyCommandRow';const title=document.createElement('span');title.textContent=name;const assign=document.createElement('button');assign.type='button';assign.dataset.keyCommand=id;assign.textContent=recording===id?'Press shortcut…':label(bindings[id]);assign.setAttribute('aria-label','Assign shortcut for '+name);assign.setAttribute('aria-pressed',String(recording===id));assign.onclick=()=>{recording=id;status.textContent='Press keys for '+name+'. Escape cancels.';render();rows.querySelector('[data-key-command="'+id+'"]')?.focus()};const clear=document.createElement('button');clear.type='button';clear.textContent='Clear';clear.setAttribute('aria-label','Clear shortcut for '+name);clear.disabled=!bindings[id];clear.onclick=()=>{recording=null;save({...bindings,[id]:''},'Shortcut cleared.');};row.append(title,assign,clear);rows.append(row);}}
 function save(next,message){try{localStorage.setItem(storageKey,JSON.stringify(next));bindings=next;status.textContent=message;}catch{status.textContent='Could not save changes. Your previous shortcuts are still active.';}render();}
 panel.querySelector('input').oninput=render;
 panel.querySelector('input').onfocus=()=>{if(recording){recording=null;status.textContent='Assignment cancelled.';render();}};
 panel.querySelector('#keyCommandsReset').onclick=()=>{recording=null;save({...defaults},'Default shortcuts restored.');};
 document.querySelectorAll('[data-audio-page]').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.audioPage!=='keys'){recording=null;render()}}));
 document.getElementById('audioPreferences').addEventListener('close',()=>{recording=null;render()});
 document.addEventListener('keydown',event=>{
  if(event.isComposing||event.repeat)return;
  const combo=(event.ctrlKey?'Ctrl+':'')+(event.altKey?'Alt+':'')+(event.shiftKey?'Shift+':'')+(event.metaKey?'Meta+':'')+event.code;
  if(recording&&!panel.hidden&&document.getElementById('audioPreferences').open){
   event.preventDefault();event.stopImmediatePropagation();
   if(event.key==='Escape'){recording=null;status.textContent='Assignment cancelled.';render();return;}
   if(['Control','Alt','Shift','Meta'].includes(event.key))return;
   if(!valid.test(combo)||reserved(combo)){status.textContent='This shortcut is reserved or unsupported. Choose another.';return;}
   const conflict=definitions.find(([id])=>id!==recording&&bindings[id]===combo);
   if(conflict){status.textContent='Already assigned to '+conflict[1]+'. Clear that assignment first.';return;}
   const id=recording;recording=null;save({...bindings,[id]:combo},'Shortcut saved.');return;
  }
  const target=event.target;
  if(document.querySelector('dialog[open]')||target?.closest?.('input,textarea,select,[contenteditable="true"], [role="textbox"]')||target?.isContentEditable)return;
  const action=definitions.find(([id])=>bindings[id]&&bindings[id]===combo);
  if(!action)return;
  const control=document.getElementById(action[2]);if(!control||control.disabled)return;
  event.preventDefault();event.stopImmediatePropagation();
  if(action[0]==='generator')control.focus();else control.click();
 },true);
 render();
})();
