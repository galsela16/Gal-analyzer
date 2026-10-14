(()=>{const select=document.getElementById('displaySpeedSelect');if(!select)return;
select.addEventListener('change',()=>window.setAnalysisSpeed?.(select.value));
const sync=()=>{select.disabled=typeof window.setAnalysisSpeed!=='function';const selected=document.querySelector('[data-analysis-speed].on')?.dataset.analysisSpeed||'normal';if(select.value!==selected)select.value=selected;};setInterval(sync,150);sync();})();
