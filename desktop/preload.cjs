const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('galNativeHost',{
 list:()=>ipcRenderer.invoke('gal:native:list'),
 start:options=>ipcRenderer.invoke('gal:native:start',options),
 stop:()=>ipcRenderer.invoke('gal:native:stop'),
 onPacket:callback=>{const handler=(_event,value)=>callback(value);ipcRenderer.on('gal:native:packet',handler);return()=>ipcRenderer.removeListener('gal:native:packet',handler)},
 onEnded:callback=>{const handler=(_event,value)=>callback(value);ipcRenderer.on('gal:native:ended',handler);return()=>ipcRenderer.removeListener('gal:native:ended',handler)}
});
