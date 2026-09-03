(function(){
'use strict';
/* Post-submit queue refresh: bypass edge cache only after a user submits a request. */
let installed=false;
let refreshTimer=[];
function jsonpReady(){return typeof window.jsonp==='function';}
function refreshQueue(){
  if(document.visibilityState==='hidden'||!jsonpReady())return;
  try{
    const url='/api/gas?action=data&range=today&_refresh='+Date.now();
    window.jsonp(url,12000).then(function(d){
      if(!d||d.success===false||!Array.isArray(d.data))return;
      window.requests=d.data.map(typeof window.normalize==='function'?window.normalize:function(x){return x||{};});
      if(typeof window.saveCache==='function')window.saveCache();
      if(typeof window.render==='function')window.render();
      if(typeof window.setSync==='function')window.setSync('online');
    }).catch(function(e){console.warn('[Kudajitu] post-submit refresh failed:',e&&e.message||e);});
  }catch(e){console.warn('[Kudajitu] post-submit refresh error:',e&&e.message||e);}
}
function schedule(){
  refreshTimer.forEach(clearTimeout);refreshTimer=[];
  [800,2200,5000].forEach(function(ms){refreshTimer.push(setTimeout(refreshQueue,ms));});
}
function install(){
  if(installed)return true;
  const single=document.getElementById('singleForm');
  const batch=document.getElementById('batchForm');
  if(!single&&!batch)return false;
  [single,batch].filter(Boolean).forEach(function(form){
    form.addEventListener('submit',function(){setTimeout(schedule,0),{once:false};});
  });
  installed=true;
  return true;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(install,0);setTimeout(install,1200);},{once:true});else{setTimeout(install,0);setTimeout(install,1200);}
})();
