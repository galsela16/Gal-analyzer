(function diagnostics(){
  const GAL=window.GAL=window.GAL||{};
  GAL.fail=function(message,error){
    console.error('[GAL]',message,error||'');
    const box=document.getElementById('err');
    if(box){ box.textContent=message; box.style.display='block'; }
  };
  window.addEventListener('error',event=>{
    GAL.fail("An interface error occurred. Refresh the page and if it comes back - send a screenshot.",event.error);
  });
  window.addEventListener('unhandledrejection',event=>{
    GAL.fail("Action not completed. Try again or refresh the page.",event.reason);
  });
})();
