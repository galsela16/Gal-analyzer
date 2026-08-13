(function diagnostics(){
  const GAL=window.GAL=window.GAL||{};
  GAL.fail=function(message,error){
    console.error('[GAL]',message,error||'');
    const box=document.getElementById('err');
    if(box){ box.textContent=message; box.style.display='block'; }
  };
  window.addEventListener('error',event=>{
    GAL.fail('אירעה שגיאה בממשק. רענן את העמוד ואם היא חוזרת—שלח צילום מסך.',event.error);
  });
  window.addEventListener('unhandledrejection',event=>{
    GAL.fail('פעולה לא הושלמה. נסה שוב או רענן את העמוד.',event.reason);
  });
})();
