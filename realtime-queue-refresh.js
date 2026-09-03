(function(){'use strict';
/* Single authoritative User queue synchronizer. Normal reads use Cloudflare cache; writes invalidate it. */
let installed=false,installing=false,lastNowId='',nowTimer=0,queueTimer=0,queueInFlight=null,backoffUntil=0;
const POLL_MS=3000,ERROR_BACKOFF_MS=5000;
function applyQueue(d){
  if(!d||d.success===false||!Array.isArray(d.data))throw new Error(d&&d.message||'Data antrean tidak valid.');
  window.requests=d.data.map(typeof window.normalize==='function'?window.normalize:function(x){return x||{};});
  backoffUntil=0;
  renderNowPlayingFromQueue();
  if(typeof window.saveCache==='function')window.saveCache();
  if(typeof window.render==='function')window.render();
  if(typeof window.setSync==='function')window.setSync('online');
  return true;
}
function refreshQueue(forceFresh){
  if(document.visibilityState==='hidden'||typeof window.fetch!=='function')return Promise.resolve(false);
  if(queueInFlight)return queueInFlight;
  if(!forceFresh&&Date.now()<backoffUntil)return Promise.resolve(false);
  const url='/api/gas?action=data&range=today&compact=1'+(forceFresh?'&_refresh=1':'');
  queueInFlight=fetch(url,{method:'GET',cache:'no-store',credentials:'same-origin',headers:{Accept:'application/json'}})
    .then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();})
    .then(applyQueue)
    .catch(function(e){backoffUntil=Date.now()+ERROR_BACKOFF_MS;throw e})
    .finally(function(){queueInFlight=null});
  return queueInFlight;
}
function renderNowPlayingFromQueue(){
  const rows=Array.isArray(window.requests)?window.requests:[];let best=null,bestTime=-1;
  rows.forEach(function(row){if(String(row&&row.status||'').toLowerCase()!=='played')return;const t=Date.parse(String(row&&row.playedAt||row&&row.timestamp||''))||0;if(t>=bestTime){bestTime=t;best=row}});
  const id=best?String(best.id||best.playedAt||best.timestamp||''):'';
  if(id===lastNowId)return false;lastNowId=id;
  const title=document.getElementById('npTitle'),artist=document.getElementById('npArtist'),requester=document.getElementById('npRequester'),stage=document.getElementById('npStage');
  if(!title||!artist||!requester||!stage)return true;
  if(!best){title.textContent='Belum ada lagu diputar';artist.textContent='Request lagu dan tunggu giliranmu';requester.textContent='-';stage.classList.remove('playing');return true;}
  title.textContent=String(best.title||'Belum ada lagu diputar');artist.textContent=String(best.artist||'Request lagu dan tunggu giliranmu');requester.textContent=best.requester?'Direquest oleh '+String(best.requester):'-';stage.classList.add('playing');return true;
}
function startNowPlaying(){if(nowTimer)clearInterval(nowTimer);renderNowPlayingFromQueue();nowTimer=setInterval(function(){if(document.visibilityState==='visible')renderNowPlayingFromQueue()},1000)}
function poll(){if(document.visibilityState!=='visible')return;refreshQueue(false).catch(function(e){console.warn('[Kudajitu] queue sync:',e&&e.message||e)})}
function startQueuePolling(){if(queueTimer)clearInterval(queueTimer);poll();queueTimer=setInterval(poll,POLL_MS)}
function install(){
  if(installed||installing)return installed;installing=true;
  const wrap=function(name){if(typeof window[name]!=='function')return false;const fn=window[name];if(fn.__kudaRealtimeWrapped)return true;const wrapped=function(){let result;try{result=fn.apply(this,arguments)}catch(e){throw e}return Promise.resolve(result).then(function(value){if(value!==false)return refreshQueue(false).catch(function(e){console.warn('[Kudajitu] post-submit cache sync failed:',e&&e.message||e)}).then(function(){return value});return value})};wrapped.__kudaRealtimeWrapped=true;window[name]=wrapped;return true};
  installed=wrap('addSingle')||wrap('addBatch');installing=false;return installed;
}
function boot(){
  install();
  startNowPlaying();
  poll();
  queueTimer=setInterval(poll,POLL_MS);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.KUDAJITURealtimeQueue={refresh:function(){return refreshQueue(false)},refreshFresh:function(){return refreshQueue(true)},refreshNowPlaying:renderNowPlayingFromQueue};
})();
