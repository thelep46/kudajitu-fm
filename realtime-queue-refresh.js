(function(){
'use strict';
/* Single queue sync owner: initial page load remains in index.html, this helper owns post-submit refresh + periodic authoritative refresh. NOW PLAYING is derived locally from the same queue payload to avoid a second upstream read path. */
let installed=false;
let installing=false;
let lastNowId='';
let queueTimer=0;
let localTimer=0;
function latestPlayed(rows){
  const list=Array.isArray(rows)?rows:[];
  let best=null,bestTime=-1;
  list.forEach(function(row){
    if(String(row&&row.status||'').toLowerCase()!=='played')return;
    const t=Date.parse(String(row&&row.playedAt||row&&row.timestamp||''))||0;
    if(t>=bestTime){bestTime=t;best=row;}
  });
  return best;
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
function syncNowPlayingFromQueue(){
  const p=latestPlayed(window.requests);
  const id=p?String(p.id||p.playedAt||p.timestamp||''):'';
  if(id===lastNowId)return false;
  lastNowId=id;
  renderNowPlaying(p);
  return true;
}
function refreshQueue(forceFresh){
  if(document.visibilityState==='hidden'||typeof window.fetch!=='function')return Promise.resolve(false);
  const suffix=forceFresh?'&_refresh='+Date.now():'';
  const url='/api/gas?action=data&range=today&compact=1'+suffix;
  return fetch(url,{cache:'no-store',credentials:'same-origin'})
    .then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();})
    .then(function(d){
      if(!d||d.success===false||!Array.isArray(d.data))throw new Error(d&&d.message||'Data antrean tidak valid.');
      window.requests=d.data.map(typeof window.normalize==='function'?window.normalize:function(x){return x||{};});
      syncNowPlayingFromQueue();
      if(typeof window.saveCache==='function')window.saveCache();
      if(typeof window.render==='function')window.render();
      if(typeof window.setSync==='function')window.setSync('online');
      return true;
    });
}
function startLocalNowPlaying(){
  if(localTimer)clearInterval(localTimer);
  syncNowPlayingFromQueue();
  localTimer=setInterval(function(){
    if(document.visibilityState==='visible')syncNowPlayingFromQueue();
  },5000);
}
function startQueuePolling(){
  if(queueTimer)clearInterval(queueTimer);
  queueTimer=setInterval(function(){
    if(document.visibilityState==='visible')refreshQueue(false).catch(function(e){console.warn('[Kudajitu] periodic queue refresh failed:',e&&e.message||e);});
  },30000);
}
function wrap(name){
  if(typeof window[name]!=='function')return false;
  const fn=window[name];
  if(fn.__kudaRealtimeWrapped)return true;
  const wrapped=function(){
    let result;
    try{result=fn.apply(this,arguments);}catch(e){throw e;}
    return Promise.resolve(result).then(function(value){
      if(value!==false)return refreshQueue(true).catch(function(e){console.warn('[Kudajitu] post-submit refresh failed:',e&&e.message||e);}).then(function(){return value;});
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
  startLocalNowPlaying();
  startQueuePolling();
  if(!installed)[250,750,1500,3000,5000].forEach(function(ms){setTimeout(install,ms);});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.KUDAJITURealtimeQueue={refresh:function(){return refreshQueue(true);},refreshNowPlaying:syncNowPlayingFromQueue,install:install};
})();
