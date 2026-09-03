(function(){
'use strict';
/* Supabase transition bridge: User reads/realtime come from Supabase; GAS remains the write fallback until fully migrated. */
const SUPABASE_URL='https://jdqcvfqysmjreibcaduk.supabase.co';
const SUPABASE_KEY='sb_publishable_QDcyGfH-3dBNmUYE9pKIkg_uFmRsmOa';
const LIMIT=1000;
let client=null,channel=null,booted=false;
window.KUDAJITU_SUPABASE_MODE=false;
function mapRow(r){r=r||{};return{id:String(r.id||''),legacyId:String(r.legacy_id||''),requester:String(r.requester||''),title:String(r.title||''),artist:String(r.artist||''),note:String(r.note||''),timestamp:String(r.timestamp||''),playedAt:String(r.played_at||''),status:String(r.status||'pending').toLowerCase()==='played'?'played':'pending'};}
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
function upsertLocal(row){
  if(!row||!row.id)return;
  const next=mapRow(row),list=Array.isArray(window.requests)?window.requests.slice():[];
  const i=list.findIndex(function(x){return x.id===next.id||((next.legacyId)&&x.legacyId===next.legacyId)});
  if(i>=0)list[i]=next;else list.push(next);
  apply(list.sort(function(a,b){return new Date(a.timestamp)-new Date(b.timestamp)}));
}
function removeLocal(row){if(!row||!row.id)return;apply((window.requests||[]).filter(function(x){return x.id!==String(row.id)}));}
function subscribe(){
  if(!client||channel)return;
  channel=client.channel('kudajitu-requests-realtime')
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'requests'},function(p){upsertLocal(p.new)})
    .on('postgres_changes',{event:'UPDATE',schema:'public',table:'requests'},function(p){upsertLocal(p.new)})
    .on('postgres_changes',{event:'DELETE',schema:'public',table:'requests'},function(p){removeLocal(p.old)})
    .subscribe(function(status){
      if(status==='SUBSCRIBED'){if(typeof window.setSync==='function')window.setSync('online')}
      else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'){if(typeof window.setSync==='function')window.setSync('offline')}
    });
}
function mirrorAdd(name,batch){
  if(typeof window[name]!=='function')return;
  const original=window[name];
  if(original.__kudaSupabaseWrapped)return;
  const wrapped=function(){
    const before=Array.isArray(window.requests)?window.requests.map(function(x){return x&&x.id}):[];
    return Promise.resolve(original.apply(this,arguments)).then(async function(result){
      try{
        const current=Array.isArray(window.requests)?window.requests:[];
        let fresh=batch?current.filter(function(x){return x&&x.id&&!before.includes(x.id)}):[];
        if(!batch){const one=current.find(function(x){return x&&x.id&&!before.includes(x.id)});if(one)fresh=[one];}
        if(fresh.length){
          const rows=fresh.map(function(p){return{legacy_id:String(p.id||''),requester:String(p.requester||''),title:String(p.title||''),artist:String(p.artist||''),note:String(p.note||''),status:'pending',timestamp:p.timestamp||new Date().toISOString(),played_at:null,created_by:null}}).filter(function(p){return p.legacy_id&&p.requester&&p.title&&p.artist});
          if(rows.length){const r=await client.from('requests').upsert(rows,{onConflict:'legacy_id'});if(r.error)throw r.error;}
        }
      }catch(e){console.warn('[Kudajitu] Supabase mirror request failed:',e&&e.message||e)}
      return result;
    });
  };
  wrapped.__kudaSupabaseWrapped=true;
  window[name]=wrapped;
}
function bindMutations(){mirrorAdd('addSingle',false);mirrorAdd('addBatch',true);}
async function boot(){
  if(booted||!window.supabase||typeof window.supabase.createClient!=='function')return;
  booted=true;
  client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{realtime:{params:{eventsPerSecond:10}}});
  try{
    await load();
    subscribe();
    bindMutations();
    window.KUDAJITU_SUPABASE_MODE=true;
    if(window.KUDAJITURealtimeQueue&&typeof window.KUDAJITURealtimeQueue.stop==='function')window.KUDAJITURealtimeQueue.stop();
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
