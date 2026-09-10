(function(){
  'use strict';

  const SUPABASE_URL='https://jdqcvfqysmjreibcaduk.supabase.co';
  const SUPABASE_KEY='sb_publishable_QDcyGfH-3dBNmUYE9pKIkg_uFmRsmOa';
  const ENDPOINT=SUPABASE_URL+'/rest/v1/site_settings?select=value&key=eq.maintenance&limit=1';
  const path=location.pathname.replace(/\/+$/,'')||'/';
  const isMaintenance=path==='/maintenance'||path==='/maintenance.html';
  const POLL_MS=3000;
  let busy=false;

  async function check(){
    if(busy||document.visibilityState==='hidden')return;
    busy=true;
    try{
      const r=await fetch(ENDPOINT,{headers:{apikey:SUPABASE_KEY,Accept:'application/json'},cache:'no-store'});
      if(!r.ok)return;
      const rows=await r.json();
      const value=rows?.[0]?.value||{};
      const enabled=value.enabled===true;
      if(enabled&&!isMaintenance){
        location.replace('/maintenance.html');
      }else if(!enabled&&isMaintenance){
        location.replace('/');
      }
    }catch(_){}
    finally{busy=false;}
  }

  check();
  setInterval(check,POLL_MS);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')check()});
})();
