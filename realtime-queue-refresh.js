(function(){
'use strict';
/* Single queue sync owner: initial page load remains in index.html; this helper owns post-submit refresh, periodic refresh, and local NOW PLAYING. */
let installed=false,installing=false,lastNowId='',nowTimer=0,queueTimer=0,queueInFlight=null,failures=0,retryTimer=0;
function patchGlobalJsonp(){
  if(window.__KUDAJITU_FETCH_JSONP_PATCHED)return true;
  const install=function(){
    if(window.__KUDAJITU_FETCH_JSONP_PATCHED)return true;
    if(typeof window.jsonp!=='function')return false;
    const original=window.jsonp;
    window.jsonp=function(url,timeout){
      const controller=new AbortController();
      const timer=setTimeout(function(){try{controller.abort()}catch(e){}},Math.max(1000,Number(timeout||20000)));
      const u=new URL(String(url||''),location.href);
      ['callback','prefix','_'].forEach(function(k){u.searchParams.delete(k)});
      return fetch(u.toString(),{method:'GET',cache:'no-store',credentials:'same-origin',signal:controller.signal,headers:{Accept:'application/json'}})
        .then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.text();})
        .then(function(text){
          const raw=String(text||'').trim();
          try{return JSON.parse(raw)}catch(e){}
          const m=raw.match(/^[^(]+\((.*)\)\s*;?\s*$/s);
          if(m){try{return JSON.parse(m[1])}catch(e){}}
          throw new Error('Respons API tidak valid.');
        })
        .finally(function(){clearTimeout(timer)});
    };
    window.jsonp.__kudaOriginal=original;
    window.__KUDAJITU_FETCH_JSONP_PATCHED=true;
    return true;
  };
  if(install())return true;
  const schedule=[0,50,150,300,750,1500,2500,4000,6000];
  schedule.forEach(function(ms){setTimeout(install,ms)});
  document.addEventListener('DOMContentLoaded',install,{once:true});
  return false;
}
function applyQueue(d){
  if(!d||d.success===false||!Array.isArray(d.data))throw new Error(d&&d.message||'Data antrean tidak valid.');
  window.requests=d.data.map(typeof window.normalize==='function'?window.normalize:function(x){return x||{};});
  renderNowPlayingFromQueue();
  if(typeof window.saveCache==='function')window.saveCache();
  if(typeof window.render==='function')window.render();
  if(typeof window.setSync==='function')window.setSync('online');
  failures=0;
  return true;
}
function refreshQueue(forceFresh){
  if(document.visibilityState==='hidden'||typeof window.fetch!=='function')return Promise.resolve(false);
  if(queueInFlight)return queueInFlight;
  const suffix=forceFresh?'&_refresh='+Date.now():'';
  const url='/api/gas?action=data&range=today&compact=1'+suffix;
  queueInFlight=fetch(url,{cache:'no-store',credentials:'same-origin'})
    .then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();})
    .then(applyQueue)
    .catch(function(e){failures=Math.min(failures+1,5);throw e})
    .finally(function(){queueInFlight=null});
  return queueInFlight;
}
function renderNowPlayingFromQueue(){
  const rows=Array.isArray(window.requests)?window.requests:[];let best=null,bestTime=-1;
  rows.forEach(function(row){
    if(String(row&&row.status||'').toLowerCase()!=='played')return;
    const t=Date.parse(String(row&&row.playedAt||row&&row.timestamp||''))||0;
    if(t>=bestTime){bestTime=t;best=row;}
  });
  const id=best?String(best.id||best.playedAt||best.timestamp||''):'';
  if(id===lastNowId)return false;
  lastNowId=id;
  const title=document.getElementById('npTitle'),artist=document.getElementById('npArtist'),requester=document.getElementById('npRequester'),stage=document.getElementById('npStage');
  if(!title||!artist||!requester||!stage)return true;
  if(!best){title.textContent='Belum ada lagu diputar';artist.textContent='Request lagu dan tunggu giliranmu';requester.textContent='-';stage.classList.remove('playing');return true;}
  title.textContent=String(best.title||'Belum ada lagu diputar');
  artist.textContent=String(best.artist||'Request lagu dan tunggu giliranmu');
  requester.textContent=best.requester?'Direquest oleh '+String(best.requester):'-';
  stage.classList.add('playing');
  return true;
}
function startNowPlaying(){if(nowTimer)clearInterval(nowTimer);renderNowPlayingFromQueue();nowTimer=setInterval(function(){if(document.visibilityState==='visible')renderNowPlayingFromQueue()},5000)}
function scheduleRetry(){
  if(retryTimer||!failures)return;
  const delay=Math.min(300000,15000*Math.pow(2,failures-1)+Math.floor(Math.random()*3000));
  retryTimer=setTimeout(function(){retryTimer=0;if(document.visibilityState!=='hidden')refreshQueue(false).catch(function(e){console.warn('[Kudajitu] queue retry failed:',e&&e.message||e);scheduleRetry()})},delay);
}
function startQueuePolling(){
  if(queueTimer)clearInterval(queueTimer);
  const poll=function(){
    if(document.visibilityState==='visible')refreshQueue(false).catch(function(e){console.warn('[Kudajitu] periodic queue refresh failed:',e&&e.message||e);scheduleRetry()});
  };
  queueTimer=setInterval(poll,60000);
}
function wrap(name){
  if(typeof window[name]!=='function')return false;const fn=window[name];if(fn.__kudaRealtimeWrapped)return true;
  const wrapped=function(){
    let result;try{result=fn.apply(this,arguments)}catch(e){throw e}
    return Promise.resolve(result).then(function(value){
      if(value!==false){
        /* The WRITE path already invalidates Cloudflare cache. A normal read is intentional here: it may HIT a still-valid cache if invalidation did not target this variant, while a MISS fetches fresh data. */
        return refreshQueue(false).catch(function(e){console.warn('[Kudajitu] post-submit refresh failed:',e&&e.message||e);scheduleRetry()}).then(function(){return value});
      }
      return value;
    });
  };
  wrapped.__kudaRealtimeWrapped=true;window[name]=wrapped;return true;
}
function install(){patchGlobalJsonp();if(installed||installing)return installed;installing=true;const single=wrap('addSingle'),batch=wrap('addBatch');installed=single||batch;installing=false;return installed}
function boot(){patchGlobalJsonp();install();startNowPlaying();startQueuePolling();if(!installed)[250,750,1500,3000,5000].forEach(function(ms){setTimeout(install,ms)})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.KUDAJITURealtimeQueue={refresh:function(){return refreshQueue(false)},refreshNowPlaying:renderNowPlayingFromQueue,install:install};
})();
