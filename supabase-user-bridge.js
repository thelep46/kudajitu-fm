(function(){
'use strict';
/* Direct User data path: Supabase REST + Realtime. Admin/GAS remains transitional. */
const SUPABASE_URL='https://jdqcvfqysmjreibcaduk.supabase.co';
const SUPABASE_KEY='sb_publishable_QDcyGfH-3dBNmUYE9pKIkg_uFmRsmOa';
const LIMIT=200;
let client=null,channel=null,booted=false;
window.KUDAJITU_SUPABASE_MODE=true;
function mapRow(r){r=r||{};return{id:String(r.id||''),requester:String(r.requester||''),title:String(r.title||''),artist:String(r.artist||''),note:String(r.note||''),timestamp:String(r.timestamp||''),playedAt:String(r.played_at||''),status:String(r.status||'pending').toLowerCase()==='played'?'played':'pending'};}
function apply(rows){
  const list=(rows||[]).map(mapRow).sort(function(a,b){return new Date(a.timestamp)-new Date(b.timestamp)});
  window.requests=list;
  if(typeof window.renderNowPlayingFromQueue==='function')window.renderNowPlayingFromQueue();
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
  const {data,error}=await client.from('requests').select('id,requester,title,artist,note,status,timestamp,played_at').order('timestamp',{ascending:true}).limit(LIMIT);
  if(error)throw error;
  apply(data||[]);return true;
}
function upsertRow(row){
  if(!row||!row.id)return;
  const next=mapRow(row),list=Array.isArray(window.requests)?window.requests.slice():[];
  const i=list.findIndex(function(x){return x.id===next.id});
  if(i>=0)list[i]=next;else list.push(next);
  list.sort(function(a,b){return new Date(a.timestamp)-new Date(b.timestamp)});
  apply(list);
}
function removeRow(row){
  if(!row||!row.id)return;
  apply((window.requests||[]).filter(function(x){return x.id!==String(row.id)}));
}
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
function bindMutations(){
  if(typeof window.sendSingle==='function'&&!window.sendSingle.__kudaSupabaseWrapped){
    const oldSingle=window.sendSingle;
    window.sendSingle=async function(payload){
      const p=payload||{};
      if(!p.requester&&window.name){}
      const {data,error}=await client.from('requests').insert({requester:String(p.requester||''),title:String(p.title||''),artist:String(p.artist||''),note:String(p.note||''),status:'pending',created_by:null,played_at:null}).select('id,requester,title,artist,note,status,timestamp,played_at').single();
      if(error)throw error;return {success:true,data:data};
    };
    window.sendSingle.__kudaSupabaseWrapped=true;window.sendSingle.__kudaSupabaseOriginal=oldSingle;
  }
  if(typeof window.sendBatch==='function'&&!window.sendBatch.__kudaSupabaseWrapped){
    const oldBatch=window.sendBatch;
    window.sendBatch=async function(items){
      const source=Array.isArray(items)?items:[];
      const rows=source.map(function(p){return{requester:String((p&&p.requester)||''),title:String((p&&p.title)||''),artist:String((p&&p.artist)||''),note:String((p&&p.note)||''),status:'pending',created_by:null,played_at:null}});
      const {data,error}=await client.from('requests').insert(rows).select('id,requester,title,artist,note,status,timestamp,played_at');
      if(error)throw error;return {success:true,data:data||[]};
    };
    window.sendBatch.__kudaSupabaseWrapped=true;window.sendBatch.__kudaSupabaseOriginal=oldBatch;
  }
}
async function boot(){
  if(booted)return;
  if(!window.supabase||typeof window.supabase.createClient!=='function')return;
  booted=true;
  client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{realtime:{params:{eventsPerSecond:10}}});
  try{
    await load();
    subscribe();
    bindMutations();
    if(typeof window.KUDAJITURealtimeQueue!=='undefined')window.KUDAJITURealtimeQueue.stop=true;
  }catch(e){
    console.warn('[Kudajitu] Supabase bridge:',e&&e.message||e);
    booted=false;
    if(typeof window.setSync==='function')window.setSync('offline');
  }
}
function wait(){if(window.supabase&&window.supabase.createClient)boot();else setTimeout(wait,25)}
wait();
window.KUDAJITU_SUPABASE={url:SUPABASE_URL,load:load,subscribe:subscribe};
})();
