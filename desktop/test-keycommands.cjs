module.exports=async({window})=>{
 const evaluate=code=>window.webContents.executeJavaScript(`(async()=>{${code}})()`);
 await evaluate(`
  const key=(code,shift=false)=>document.body.dispatchEvent(new KeyboardEvent('keydown',{key:code==='Escape'?'Escape':code.replace('Key','').toLowerCase(),code,shiftKey:shift,bubbles:true,cancelable:true}));
  document.getElementById('uiSetOpenIo').click();document.querySelector('[data-audio-page="keys"]').click();
  if(document.querySelector('.keyCommandsPanel').hidden)throw Error('Key Commands page did not open');
  document.querySelector('[data-key-command="freeze"]').click();key('KeyK',true);
  if(document.querySelector('[data-key-command="freeze"]').textContent!=='⇧ K')throw Error('Assignment failed');
  document.querySelector('[data-key-command="peak"]').click();key('KeyK',true);
  if(!document.getElementById('keyCommandsStatus').textContent.includes('Already assigned'))throw Error('Conflict was not rejected');
  key('Escape');if(!document.getElementById('audioPreferences').open)throw Error('Cancel closed preferences');
  document.querySelector('[data-key-command="peak"]').click();key('KeyQ');
  key('Escape');
  document.getElementById('audioPreferencesClose').click();document.activeElement?.blur();
  const before=frozen;key('KeyK',true);if(frozen===before)throw Error('Assigned command did not run');
  key('Space');if(frozen===before)throw Error('Old shortcut still ran');key('KeyK',true);
  const input=document.getElementById('bottomSignalHz');input.focus();input.dispatchEvent(new KeyboardEvent('keydown',{key:'K',code:'KeyK',shiftKey:true,bubbles:true,cancelable:true}));if(frozen!==before)throw Error('Command fired while typing');input.blur();
  if(JSON.parse(localStorage.getItem('gal.keyCommands.v1')).freeze!=='Shift+KeyK')throw Error('Assignment not stored');
 `);
 const loaded=new Promise(resolve=>window.webContents.once('did-finish-load',resolve));window.webContents.reload();await loaded;
 await evaluate(`
  document.getElementById('uiSetOpenIo').click();document.querySelector('[data-audio-page="keys"]').click();
  if(document.querySelector('[data-key-command="freeze"]').textContent!=='⇧ K')throw Error('Binding lost after reload');
  document.querySelector('[data-key-command="peak"]').click();document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'q',code:'KeyQ',metaKey:true,bubbles:true,cancelable:true}));
  if(!document.getElementById('keyCommandsStatus').textContent.includes('reserved'))throw Error('Reserved shortcut accepted');
  document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true,cancelable:true}));
  document.querySelector('[aria-label="Clear shortcut for Freeze / resume view"]').click();if(document.querySelector('[data-key-command="freeze"]').textContent!=='Not assigned')throw Error('Clear failed');
  document.getElementById('keyCommandsReset').click();if(document.querySelector('[data-key-command="freeze"]').textContent!=='Space')throw Error('Reset failed');
  document.getElementById('audioPreferencesClose').click();document.activeElement?.blur();
  const before=frozen;document.body.dispatchEvent(new KeyboardEvent('keydown',{key:' ',code:'Space',bubbles:true,cancelable:true}));if(frozen===before)throw Error('Default shortcut failed');document.getElementById('freezeBtn').click();
  if(running||genOn)throw Error('Shortcut editing unexpectedly started audio');
 `);
 return {assignment:true,conflict:true,cancel:true,typingProtection:true,reloadPersistence:true,reservedKeys:true,clear:true,reset:true};
};
