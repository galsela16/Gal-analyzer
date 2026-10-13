// The footer uses the same device/channel controls as Preferences.
(()=>{
 const card=document.getElementById('bottomIo');if(!card)return;
 const mappings=[['bottomInputDevice','v52DeviceSelect'],['bottomMicInput','v52MeasSelect'],['bottomRefInput','v52RefSelect'],['bottomOutputDevice','v53OutputSelect']];
 const signatures=new Map();
 function sync(){for(const [id,sourceId] of mappings){const target=document.getElementById(id),source=document.getElementById(sourceId);if(!source)continue;
  const options=[...source.options].map(o=>[o.value,o.textContent,o.disabled]);const signature=JSON.stringify(options);
  if(signatures.get(id)!==signature){target.replaceChildren(...options.map(([value,text,disabled])=>{const option=document.createElement('option');option.value=value;option.textContent=text;option.disabled=disabled;return option}));signatures.set(id,signature);}
  const currentDevice=typeof activeInId==='string'?activeInId:'';
  const selected=sourceId==='v52DeviceSelect'&&[...source.options].some(o=>o.value===currentDevice)?currentDevice:source.value;
  if(document.activeElement!==target)target.value=selected;
  target.disabled=source.disabled||((id==='bottomMicInput'||id==='bottomRefInput')&&!(typeof running==='boolean'&&running));target.title=target.selectedOptions[0]?.textContent||'';
 }}
 for(const [id,sourceId] of mappings)document.getElementById(id).addEventListener('change',event=>{const source=document.getElementById(sourceId);source.value=event.target.value;source.dispatchEvent(new Event('change',{bubbles:true}));sync()});
 document.getElementById('bottomIoSettings').onclick=()=>document.getElementById('uiSetOpenIo').click();
 setInterval(sync,150);sync();
})();
