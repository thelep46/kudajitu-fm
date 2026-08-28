(function(){
'use strict';
/* Performance layer: keep the UI responsive while API sync happens in background. */
var K={lastSync:0,syncing:false,minSyncGap:15000,timeout:8000};
function normalizeP(x){x=x||{};return{id:String(x.id||''),requester:String(x.requester||''),title:String(x.title||''),artist:String(x.artist||''),note:String(x.note||''),timestamp:String(x.timestamp||''),playedAt:String(x.playedAt||''),status:String(x.status||'pending').toLowerCase()==='played'?'played':'pending',votes:Number(x.votes||1)}}
function api(action,params,timeout){
  var u=new URL('/api/gas',location.origin);u.searchParams.set('action',action||'data');
  Object.keys(params||{}).forEach(function(k){if(params[k]!==undefined&&params[k]!==null)u.searchParams.set(k,String(params[k]))});
  var controller=new AbortController(),timer=setTimeout(function(){controller.abort()},timeout||K.timeout);
  return fetch(u.toString(),{method:'GET',cache:'no-store',credentials:'same-origin',headers:{Accept:'application/json'},signal:controller.signal})
    .then(function(r){return r.text().then(function(t){var d;try{d=JSON.parse(t)}catch(e){throw new Error('Respons server tidak valid.')}if(!r.ok||d&&d.success===false)throw new Error(d&&d.message||'Server gagal');return d})})
    .finally(function(){clearTimeout(timer)});
}
function readLocal(){try{var c=JSON.parse(localStorage.getItem('kudajitu_user_today_v4')||'null');return c&&Array.isArray(c.data)?c.data.map(normalizeP):[]}catch(e){return []}}
function hasLocalData(){return readLocal().length>0}
function silentLoad(force){
  if(K.syncing)return;
  var now=Date.now();if(!force&&now-K.lastSync<K.minSyncGap)return;
  K.syncing=true;K.lastSync=now;
  var local=readLocal(),had=local.length>0;
  /* Never leave the header stuck on "Menghubungkan..." while a background sync is pending. */
  if(had){
    window.requests=local;
    if(typeof render==='function')render();
  }
  if(typeof setSync==='function')setSync('online');
  api('data',{range:'today'},K.timeout).then(function(j){
    window.requests=(Array.isArray(j.data)?j.data:[]).map(normalizeP);
    if(typeof saveCache==='function')saveCache();
    if(typeof render==='function')render();
    if(typeof setSync==='function')setSync('online');
  }).catch(function(e){
    /* A background refresh failure must not turn the whole page into a loading state. */
    if(typeof setSync==='function')setSync(had?'online':'offline');
    if(!had)console.warn('[Kudajitu] initial sync failed:',e&&e.message||e);
  }).finally(function(){K.syncing=false});
}
function optimisticAdd(item,button){
  item=normalizeP(item);
  window.requests=Array.isArray(window.requests)?window.requests:[];
  var exists=window.requests.some(function(x){return x.id===item.id});
  if(!exists)window.requests.unshift(item);
  if(typeof saveCache==='function')saveCache();
  if(typeof render==='function')render();
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
  if(typeof busy==='function')busy(button,true,'Menyimpan...');
  window.lastSubmit=Date.now();
  optimisticAdd(item,button);
  if(titleEl)titleEl.value='';if(artistEl)artistEl.value='';if(noteEl)noteEl.value='';
  api('add',{id:item.id,requester:item.requester,title:item.title,artist:item.artist,note:item.note,timestamp:item.timestamp,status:'pending',votes:1},30000)
    .then(function(j){
      if(j&&j.success===false)throw new Error(j.message||'Gagal');
      silentLoad(true);
    })
    .catch(function(err){
      console.warn('[Kudajitu] request save failed:',err&&err.message||err);
      if(typeof toast==='function')toast('Penyimpanan server belum terkonfirmasi.','error');
      silentLoad(true);
    });
  return false;
}
function install(){
  window.loadData=silentLoad;
  window.addSingle=addFast;
  if(typeof window.addBatch==='function'){
    var oldBatch=window.addBatch;
    window.addBatch=async function(e){var result=await oldBatch(e);silentLoad(true);return result;};
  }
  /* Start a silent refresh without ever showing the initial connecting state. */
  setTimeout(function(){silentLoad(false)},50);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
