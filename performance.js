(function(){
'use strict';
/* Single transport + authoritative queue sync for user/admin pages. */
var K={lastSync:0,syncing:false,pendingForce:false,minSyncGap:5000,timeout:12000};
function normalizeP(x){x=x||{};return{id:String(x.id||''),requester:String(x.requester||''),title:String(x.title||''),artist:String(x.artist||''),note:String(x.note||''),timestamp:String(x.timestamp||''),playedAt:String(x.playedAt||''),status:String(x.status||'pending').toLowerCase()==='played'?'played':'pending',votes:Number(x.votes||1)}}
function api(action,params,timeout,forceFresh){
  var u=new URL('/api/gas',location.origin);u.searchParams.set('action',action||'data');
  Object.keys(params||{}).forEach(function(k){if(params[k]!==undefined&&params[k]!==null)u.searchParams.set(k,String(params[k]))});
  if(forceFresh)u.searchParams.set('_refresh',Date.now().toString());
  var controller=new AbortController(),timer=setTimeout(function(){controller.abort()},timeout||K.timeout);
  return fetch(u.toString(),{method:'GET',cache:'no-store',credentials:'same-origin',headers:{Accept:'application/json'},signal:controller.signal})
    .then(function(r){return r.text().then(function(t){var d;try{d=JSON.parse(t)}catch(e){throw new Error('Respons server tidak valid.')}if(!r.ok||d&&d.success===false)throw new Error(d&&d.message||'Server gagal');return d})})
    .finally(function(){clearTimeout(timer)});
}
function proxyLegacyJsonp(url,timeout){
  try{
    var src=new URL(url,location.href),params={};
    src.searchParams.forEach(function(v,k){if(k!=='callback'&&k!=='prefix'&&k!=='_')params[k]=v});
    var action=String(params.action||'data').toLowerCase();
    var force=src.searchParams.has('_refresh');
    return api(action,params,timeout||30000,force);
  }catch(e){return Promise.reject(e)}
}
function readLocal(){try{var c=JSON.parse(localStorage.getItem('kudajitu_user_today_v4')||'null');return c&&Array.isArray(c.data)?c.data.map(normalizeP):[]}catch(e){return []}}
function silentLoad(force){
  if(K.syncing){if(force)K.pendingForce=true;return Promise.resolve(false)}
  var now=Date.now();if(!force&&now-K.lastSync<K.minSyncGap)return Promise.resolve(false);
  K.syncing=true;K.lastSync=now;
  var local=readLocal(),had=local.length>0;
  if(had&&!force){window.requests=local;if(typeof render==='function')render()}
  if(typeof setSync==='function')setSync('online');
  /* Queue truth is always fetched fresh. This is intentional: admin/player writes must be visible to users immediately and must not depend on an old browser/edge snapshot. */
  return api('data',{range:'today'},K.timeout,true).then(function(j){
    var fresh=(Array.isArray(j.data)?j.data:[]).map(normalizeP);
    window.requests=fresh;
    if(typeof saveCache==='function')saveCache();
    if(typeof render==='function')render();
    if(typeof setSync==='function')setSync('online');
    return true;
  }).catch(function(e){
    if(typeof setSync==='function')setSync(had?'online':'offline');
    if(!had)console.warn('[Kudajitu] initial sync failed:',e&&e.message||e);
    return false;
  }).finally(function(){
    K.syncing=false;
    if(K.pendingForce){K.pendingForce=false;setTimeout(function(){silentLoad(true)},0)}
  });
}
function optimisticAdd(item,button){
  item=normalizeP(item);window.requests=Array.isArray(window.requests)?window.requests:[];
  if(!window.requests.some(function(x){return x.id===item.id}))window.requests.push(item);
  if(typeof saveCache==='function')saveCache();if(typeof render==='function')render();
  if(typeof toast==='function')toast('Request sedang disimpan.');
  if(button&&typeof busy==='function')busy(button,false);
}
function addFast(e){
  if(e&&e.preventDefault)e.preventDefault();
  var nameEl=document.getElementById('name'),titleEl=document.getElementById('title'),artistEl=document.getElementById('artist'),noteEl=document.getElementById('note'),button=document.getElementById('sendBtn');
  var name=nameEl?nameEl.value.trim():'',title=titleEl?titleEl.value.trim():'',artist=artistEl?artistEl.value.trim():'',note=noteEl?noteEl.value.trim():'';
  if(!name||!title||!artist){if(typeof toast==='function')toast('Nama, judul, dan penyanyi wajib diisi.','error');return false}
  if(typeof canSubmit==='function'&&!canSubmit(1))return false;
  var item=normalizeP({id:'req_'+Date.now()+'_'+Math.random().toString(36).slice(2,8),requester:name,title:title,artist:artist,note:note,timestamp:new Date().toISOString(),status:'pending',votes:1});
  try{localStorage.setItem('kudajitu_name',name)}catch(_){}
  if(typeof busy==='function')busy(button,true,'Menyimpan...');window.lastSubmit=Date.now();optimisticAdd(item,button);
  if(titleEl)titleEl.value='';if(artistEl)artistEl.value='';if(noteEl)noteEl.value='';
  return api('add',{id:item.id,requester:item.requester,title:item.title,artist:item.artist,note:item.note,timestamp:item.timestamp,status:'pending',votes:1},30000,false)
    .then(function(j){if(j&&j.success===false)throw new Error(j.message||'Gagal');return silentLoad(true)})
    .catch(function(err){console.warn('[Kudajitu] request save failed:',err&&err.message||err);if(typeof toast==='function')toast('Penyimpanan server belum terkonfirmasi.','error');return silentLoad(true)});
}
function install(){
  window.jsonp=proxyLegacyJsonp;
  if(location.pathname!=='/admin.html'){
    window.loadData=silentLoad;
    window.addSingle=addFast;
    if(typeof window.addBatch==='function'&&!window.addBatch.__kudaPerf){var oldBatch=window.addBatch;window.addBatch=async function(e){var result=await oldBatch(e);silentLoad(true);return result};window.addBatch.__kudaPerf=true}
    setTimeout(function(){silentLoad(false)},50);
    if(!window.__kudaQueuePoll){
      window.__kudaQueuePoll=setInterval(function(){if(document.visibilityState!=='hidden')silentLoad(true)},5000);
      document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')silentLoad(true)},{passive:true});
    }
  }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
setTimeout(install,0);
})();
