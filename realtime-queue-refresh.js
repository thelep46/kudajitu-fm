(function(){
'use strict';
/* Public realtime helpers: refresh queue only after a write succeeds + lightweight NOW PLAYING polling. */
let installed=false;
let installing=false;
let writeHooked=false;
let lastRefresh=0;
let refreshPromise=null;
let lastNowId='';
let nowTimer=0;
function refreshQueue(){
  if(document.visibilityState==='hidden'||typeof window.fetch!=='function')return Promise.resolve(false);
  const now=Date.now();
  if(refreshPromise)return refreshPromise;
  if(now-lastRefresh<500)return Promise.resolve(false);
  lastRefresh=now;
  const url='/api/gas?action=data&range=today&_refresh='+now;
  refreshPromise=fetch(url,{cache:'no-store',credentials:'same-origin'})
    .then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();})
    .then(function(d){
      if(!d||d.success===false||!Array.isArray(d.data))throw new Error(d&&d.message||'Data antrean tidak valid.');
      window.requests=d.data.map(typeof window.normalize==='function'?window.normalize:function(x){return x||{};});
      if(typeof window.saveCache==='function')window.saveCache();
      if(typeof window.render==='function')window.render();
      if(typeof window.setSync==='function')window.setSync('online');
      return true;
    })
    .catch(function(e){console.warn('[Kudajitu] post-submit refresh failed:',e&&e.message||e);return false;})
    .finally(function(){refreshPromise=null;});
  return refreshPromise;
}
function isWriteUrl(url){
  try{
    const u=new URL(String(url||''),location.href);
    if(u.pathname!='/api/gas')return false;
    const action=String(u.searchParams.get('action')||'').toLowerCase();
    return action==='add'||action==='addbatch';
  }catch(e){return false;}
}
function hookSuccessfulWrites(){
  if(writeHooked||typeof window.jsonp!=='function')return false;
  if(window.__kudaRealtimeWriteJsonp)return true;
  const original=window.jsonp;
  window.jsonp=function(url,timeout){
    const write=isWriteUrl(url);
    let result;
    try{result=original.call(this,url,timeout);}catch(e){throw e;}
    return Promise.resolve(result).then(function(value){
      if(write&&value&&value.success!==false){
        refreshQueue();
      }
      return value;
    });
  };
  window.__kudaRealtimeWriteJsonp=true;
  writeHooked=true;
  return true;
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
  const url='/api/gas?action=nowplaying&_refresh='+Date.now();
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
function install(){
  if(installed||installing)return installed;
  installing=true;
  const hooked=hookSuccessfulWrites();
  installed=hooked;
  installing=false;
  return installed;
}
function boot(){
  install();
  startNowPlaying();
  if(!writeHooked)[250,750,1500,3000,5000].forEach(function(ms){setTimeout(install,ms);});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.KUDAJITURealtimeQueue={refresh:refreshQueue,refreshNowPlaying:refreshNowPlaying,install:install};
})();
