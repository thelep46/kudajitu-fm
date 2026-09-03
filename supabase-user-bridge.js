(function(){
'use strict';
const SUPABASE_URL='https://jdqcvfqysmjreibcaduk.supabase.co';
const SUPABASE_KEY='sb_publishable_QDcyGfH-3dBNmUYE9pKIkg_uFmRsmOa';
const GAS_READ='/api/gas?action=data&range=all';
const LIMIT=200;
let client=null,channel=null,booted=false;
window.KUDAJITU_SUPABASE_MODE=false;
function mapRow(r){r=r||{};return{id:String(r.id||''),requester:String(r.requester||''),title:String(r.title||''),artist:String(r.artist||''),note:String(r.note||''),timestamp:String(r.timestamp||''),playedAt:String(r.played_at||''),status:String(r.status||'pending').toLowerCase()==='played'?'played':'pending'};}
function apply(rows){
  const list=(rows||[]).map(mapRow).sort(function(a,b){return new Date(a.timestamp)-new Date(b.timestamp)});
  window.requests=list;
  const p=list.filter(function(x){return x.status==='pending'}).length;
  const d=list.filter(function(x){return x.status==='played'}).length;
  const set=function(id,v){const e=document.getElementById(id);if(e)e.textContent=String(v)};
  set('statPending',p);set('statPlayed',d);set('statTotal',list.length);
  if(typeof window.saveCache==='function')window.saveCache();
  if(typeof window.render==='function')window.render();
  if(typeof window.setSync==='function')window.setSync('online');
}
async function load(){
  if(!client)return false;
  const {data,error}=await client.from('requests').select('id,legacy_id,requester,title,artist,note,status,timestamp,played_at').order('timestamp',{ascending:true}).limit(LIMIT);
  if(error)throw error;
  apply(data||[]);return true;
}
async function migrateLegacy(){
  const {data:existing,error:existingError}=await client.from('requests').select('id').limit(1);
  if(existingError)throw existingError;
  if(existing&&existing.length)return false;
  const response=await fetch(GAS_READ,{cache:'no-store',credentials:'same-origin',headers:{Accept:'application/json'}});
  if(!response.ok)throw new Error('GAS migration read HTTP '+response.status);
  const payload=await response.json();
  if(!payload||payload.success===false||!Array.isArray(payload.data))throw new Error('Format data GAS tidak valid untuk migrasi.');
  const source=payload.data;
  if(!source.length){
    const empty=await client.rpc('migrate_request_batch',{p_rows:[],p_finalize:true});
    if(empty.error)throw empty.error;
    return true;
  }
  for(let i=0;i<source.length;i+=200){
    const chunk=source.slice(i,i+200).map(function(r){return{
      legacy_id:String(r&&r.id||''),requester:String(r&&r.requester||''),title:String(r&&r.title||''),artist:String(r&&r.artist||''),note:String(r&&r.note||''),status:String(r&&r.status||'pending').toLowerCase()==='played'?'played':'pending',queue_position:null,timestamp:String(r&&r.timestamp||''),played_at:String(r&&r.playedAt||''),created_by:null
    }}).filter(function(r){return r.legacy_id&&r.title&&r.artist&&r.requester});
    if(!chunk.length)continue;
    const result=await client.rpc('migrate_request_batch',{p_rows:chunk,p_finalize:(i+200>=source.length)});
    if(result.error)throw result.error;
  }
  return true;
}
function upsertRow(row){
  if(!row||!row.id)return;
  const next=mapRow(row),list=Array.isArray(window.requests)?window.requests.slice():[];
  const i=list.findIndex(function(x){return x.id===next.id});
  if(i>=0)list[i]=next;else list.push(next);
  list.sort(function(a,b){return new Date(a.timestamp)-new Date(b.timestamp)});
  apply(list);
}
function removeRow(row){if(!row||!row.id)return;apply((window.requests||[]).filter(function(x){return x.id!==String(row.id)}));}
function subscribe(){
  if(channel)return;
  channel=client.channel('kudajitu-requests-realtime')
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'requests'},function(p){upsertRow(p.new)})
    .on('postgres_changes',{event:'UPDATE',schema:'public',table:'requests'},function(p){upsertRow(p.new)})
    .on('postgres_changes',{event:'DELETE',schema:'public',table:'requests'},function(p){removeRow(p.old)})
    .subscribe(function(status){
      if(status==='SUBSCRIBED'){if(typeof window.setSync==='function')window.setSync('online')}
      else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'){if(typeof window.setSync==='function')window.setSync('offline')}
    });
}
function wrapAddFunctions(){
  function wrap(name,batch){
    if(typeof window[name]!=='function'||window[name].__kudaSupabaseWrapped)return;
    const original=window[name];
    window[name]=async function(){
      const before=Array.isArray(window.requests)?window.requests.map(function(x){return x&&x.id}):[];
      const result=await original.apply(this,arguments);
      try{
        if(batch){
          const current=Array.isArray(window.requests)?window.requests:[];
          const fresh=current.filter(function(x){return x&&x.id&&!before.includes(x.id)});
          if(fresh.length){
            await client.from('requests').upsert(fresh.map(function(p){return{legacy_id:String(p.id),requester:String(p.requester||''),title:String(p.title||''),artist:String(p.artist||''),note:String(p.note||''),status:'pending',timestamp:p.timestamp||new Date().toISOString(),played_at:null,created_by:null}}),{onConflict:'legacy_id'});
          }
        } else {
          const after=Array.isArray(window.requests)?window.requests:[];
          const fresh=after.find(function(x){return x&&x.id&&!before.includes(x.id)});
          if(fresh)await client.from('requests').upsert({legacy_id:String(fresh.id),requester:String(fresh.requester||''),title:String(fresh.title||''),artist:String(fresh.artist||''),note:String(fresh.note||''),status:'pending',timestamp:fresh.timestamp||new Date().toISOString(),played_at:null,created_by:null},{onConflict:'legacy_id'});
        }
      }catch(e){console.warn('[Kudajitu] mirror request failed:',e&&e.message||e)}
      return result;
    };
    window[name].__kudaSupabaseWrapped=true;
  }
  wrap('addSingle',false);wrap('addBatch',true);
}
async function boot(){
  if(booted||!window.supabase||typeof window.supabase.createClient!=='function')return;
  booted=true;
  client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{realtime:{params:{eventsPerSecond:10}}});
  try{
    await migrateLegacy();
    await load();
    subscribe();
    wrapAddFunctions();
    window.KUDAJITU_SUPABASE_MODE=true;
    if(window.KUDAJITURealtimeQueue)window.KUDAJITURealtimeQueue.refresh=function(){return Promise.resolve(true)};
  }catch(e){
    console.warn('[Kudajitu] Supabase bridge:',e&&e.message||e);
    window.KUDAJITU_SUPABASE_MODE=false;
    booted=false;
    if(typeof window.setSync==='function')window.setSync('offline');
  }
}
function wait(){if(window.supabase&&window.supabase.createClient)boot();else setTimeout(wait,25)}
wait();
window.KUDAJITU_SUPABASE={url:SUPABASE_URL,load:load,subscribe:subscribe};
})();
