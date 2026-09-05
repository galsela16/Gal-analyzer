/* GAL Analyzer Foundation bootstrap.
 * Keep this file intentionally small: it starts the application only after
 * diagnostics are active, and makes the migration from the legacy core safe.
 */
(function bootGAL(){
  const files=['js/core/config.js?v=5.5.50','js/core/diagnostics.js?v=5.5.50','js/app-core.js?v=5.5.50'];
  let index=0;
  function loadNext(){
    if(index>=files.length) return;
    const script=document.createElement('script');
    script.src=files[index++];
    script.async=false;
    script.onload=loadNext;
    script.onerror=()=>window.GAL?.fail('לא ניתן לטעון רכיב מערכת: '+script.src);
    document.head.appendChild(script);
  }
  loadNext();
})();
