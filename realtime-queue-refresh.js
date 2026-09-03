(function(){
'use strict';
/* Refresh the public queue only after a request write actually resolves. */
let installed=false;
let installing=false;
function refreshQueue(){
  if(document.visibilityState==='hidden'||typeof window.fetch!=='function')return Promise.resolve(false);
  const url='/api/gas?action=data&range=today&_refresh='+Date.now();
  return fetch(url,{cache:'no-store',credentials:'same-origin'})
    .then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();})
    .then(function(d){
      if(!d||d.success===false||!Array.isArray(d.data))throw new Error(d&&d.message||'Data antrean tidak valid.');
      window.requests=d.data.map(typeof window.normalize==='function'?window.normalize:function(x){return x||{};});
      if(typeof window.saveCache==='function')window.saveCache();
      if(typeof window.render==='function')window.render();
      if(typeof window.setSync==='function')window.setSync('online');
      return true;
    });
}
function wrap(name){
  if(typeof window[name]!=='function')return false;
  const fn=window[name];
  if(fn.__kudaRealtimeWrapped)return true;
  const wrapped=function(){
    let result;
    try{result=fn.apply(this,arguments);}catch(e){throw e;}
    return Promise.resolve(result).then(function(value){
      if(value!==false){
        return refreshQueue().catch(function(e){console.warn('[Kudajitu] post-submit refresh failed:',e&&e.message||e);}).then(function(){return value;});
      }
      return value;
    });
  };
  wrapped.__kudaRealtimeWrapped=true;
  window[name]=wrapped;
  return true;
}
function install(){
  if(installed||installing)return installed;
  installing=true;
  const single=wrap('addSingle');
  const batch=wrap('addBatch');
  installed=single||batch;
  installing=false;
  return installed;
}
function boot(){
  install();
  if(!installed){
    [250,750,1500,3000,5000].forEach(function(ms){setTimeout(install,ms);});
  }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.KUDAJITURealtimeQueue={refresh:refreshQueue,install:install};
})();
