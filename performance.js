(function(){
'use strict';
/* Queue sync helper: keep one lightweight polling path and let /api/gas cache absorb repeats. */
var K={lastSync:0,syncing:false,minSyncGap:45000,timeout:12000,originalLoad:null,originalAdd:null,originalJsonp:null,forceFresh:false};
function install(){
  if(location.pathname==='/admin.html')return;
  if(!K.originalLoad&&typeof window.loadData==='function')K.originalLoad=window.loadData;
  if(!K.originalAdd&&typeof window.addSingle==='function')K.originalAdd=window.addSingle;
  if(!K.originalJsonp&&typeof window.jsonp==='function')K.originalJsonp=window.jsonp;
  if(K.originalJsonp&&!window.__kudaJsonpWrapped){
    window.jsonp=function(url,timeout){
      var next=String(url||'');
      if(!K.forceFresh){
        try{
          var u=new URL(next,location.href);
          if(u.pathname==='/api/gas'&&u.searchParams.get('action')==='data'&&u.searchParams.get('range')==='today'){
            u.searchParams.delete('_refresh');
            next=u.toString();
          }
        }catch(e){}
      }
      return K.originalJsonp.call(window,next,timeout);
    };
    window.__kudaJsonpWrapped=true;
  }
  if(K.originalLoad&&!window.__kudaLoadWrapped){
    window.loadData=function(force){
      var now=Date.now();
      if(K.syncing)return Promise.resolve(false);
      if(!force&&now-K.lastSync<K.minSyncGap)return Promise.resolve(false);
      K.lastSync=now;K.syncing=true;K.forceFresh=!!force;
      try{if(typeof window.setSync==='function')window.setSync('syncing');}catch(e){}
      return Promise.resolve(K.originalLoad.call(window,force)).then(function(v){
        try{if(typeof window.setSync==='function')window.setSync('online');}catch(e){}
        return v;
      }).catch(function(e){
        try{if(typeof window.setSync==='function')window.setSync('offline');}catch(_){}
        console.warn('[Kudajitu] queue sync failed:',e&&e.message||e);
        return false;
      }).finally(function(){K.forceFresh=false;K.syncing=false;});
    };
    window.__kudaLoadWrapped=true;
  }

}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
setTimeout(install,0);
setTimeout(install,1000);
})();
