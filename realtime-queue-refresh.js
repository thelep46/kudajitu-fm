(function(){
'use strict';
/* Single queue sync owner: initial page load remains in index.html, this helper owns post-submit refresh + periodic authoritative refresh + NOW PLAYING polling. */
let installed=false;
let installing=false;
let lastNowId='';
let nowTimer=0;
let queueTimer=0;
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
function renderNowPlaying(p){
  const title=document.getElementById('npTitle'),artist=document.getElementById('npArtist'),requester=document.getElementById('npRequester'),stage=document.getElementById('npStage');
  if(!title||!artist||!requester||!stage)return;
  if(!p){title.textContent='Belum ada lagu diputar';artist.textContent='Request lagu dan tunggu giliranmu';requester.textContent='-';stage.classList.remove('playing');return;}
  title.textContent=String(p.title||'Belum ada lagu diputar');
  artist.textContent=String(p.artist||'Request lagu dan tunggu giliranmu');
  requester.textContent=p.requester?'Direquest oleh '+String(p.requester):'-';
  stage.classList.add('playing');
}
function refreshNowPlaying(){
  if(document.visibilityState==='hidden'||typeof window.fetch!=='function')return Promise.resolve(false);
  const url='/api/gas?action=nowplaying';
  return fetch(url,{cache:'no-store',credentials:'same-origin'})
    .then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();})
    .then(function(d){
      if(!d||d.success===false)throw new Error(d&&d.message||'NOW PLAYING tidak valid.');
      const p=d.playing||null;
      const id=p?String(p.id||p.playedAt||''):'';
      if(id!==lastNowId){lastNowId=id;renderNowPlaying(p);}
      return true;
    })
    .catch(function(e){console.warn('[Kudajitu] NOW PLAYING sync failed:',e&&e.message||e);return false;});
}
function startNowPlaying(){
  if(nowTimer)clearInterval(nowTimer);
  refreshNowPlaying();
  nowTimer=setInterval(function(){
    if(document.visibilityState==='visible')refreshNowPlaying();
  },5000);
}
function startQueuePolling(){
  if(queueTimer)clearInterval(queueTimer);
  queueTimer=setInterval(function(){
    if(document.visibilityState==='visible'){
      refreshQueue().catch(function(e){console.warn('[Kudajitu] periodic queue refresh failed:',e&&e.message||e);});
    }
  },60000);
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
  startNowPlaying();
  startQueuePolling();
  if(!installed)[250,750,1500,3000,5000].forEach(function(ms){setTimeout(install,ms);});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.KUDAJITURealtimeQueue={refresh:refreshQueue,refreshNowPlaying:refreshNowPlaying,install:install};
})();
