(function(){
'use strict';
/* Queue sync helper: keep one lightweight polling path and let /api/gas cache absorb repeats. */
var K={lastSync:0,syncing:false,minSyncGap:5000,timeout:30000,originalLoad:null,originalAdd:null};
function install(){
  if(location.pathname==='/admin.html')return;
  if(!K.originalLoad&&typeof window.loadData==='function')K.originalLoad=window.loadData;
  if(!K.originalAdd&&typeof window.addSingle==='function')K.originalAdd=window.addSingle;
  if(K.originalLoad&&!window.__kudaLoadWrapped){
    window.loadData=function(force){
      var now=Date.now();
      if(K.syncing)return Promise.resolve(false);
      if(!force&&now-K.lastSync<K.minSyncGap)return Promise.resolve(false);
      K.lastSync=now;K.syncing=true;
      try{if(typeof window.setSync==='function')window.setSync('syncing');}catch(e){}
      return Promise.resolve(K.originalLoad.call(window,force)).then(function(v){
        try{if(typeof window.setSync==='function')window.setSync('online');}catch(e){}
        return v;
      }).catch(function(e){
        try{if(typeof window.setSync==='function')window.setSync('offline');}catch(_){}
        console.warn('[Kudajitu] queue sync failed:',e&&e.message||e);
        return false;
      }).finally(function(){K.syncing=false;});
    };
    window.__kudaLoadWrapped=true;
  }
  if(!window.__kudaQueuePoll){
    window.__kudaQueuePoll=setInterval(function(){
      if(document.visibilityState!=='hidden'&&typeof window.loadData==='function')window.loadData(false);
    },5000);
    document.addEventListener('visibilitychange',function(){
      if(document.visibilityState==='visible'&&typeof window.loadData==='function')window.loadData(false);
    },{passive:true});
  }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
setTimeout(install,0);
setTimeout(install,1000);
})();
