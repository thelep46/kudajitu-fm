/* Admin runtime: authoritative direct Supabase read + realtime sync. */
(function(){
'use strict';

const SUPABASE_URL='https://jdqcvfqysmjreibcaduk.supabase.co';
const SUPABASE_KEY='sb_publishable_QDcyGfH-3dBNmUYE9pKIkg_uFmRsmOa';
const ADMIN_FN=SUPABASE_URL+'/functions/v1/kudajitu-admin-v4';

let client=null;
let realtimeChannel=null;
let syncTimer=0;
let syncBusy=false;
let started=false;

function getClient(){
  if(client)return client;
  if(!window.supabase?.createClient)throw new Error('Supabase JS belum dimuat.');
  if(window.KUDAJITUAdminDB?.client){client=window.KUDAJITUAdminDB.client;return client;}
  client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  window.KUDAJITUAdminDB={client};
  return client;
}

async function isAdminSession(){
  try{
    const {data,error}=await getClient().auth.getSession();
    if(error)return false;
    return data?.session?.user?.app_metadata?.role==='admin';
  }catch(_){return false;}
}

async function syncData(){
  if(typeof window.render!=='function')return;
  const {data,error}=await getClient()
    .from('requests')
    .select('id,requester,title,artist,note,status,timestamp,queue_position,played_at')
    .order('timestamp',{ascending:true})
    .order('id',{ascending:true})
    .limit(5000);
  if(error)throw new Error(error.message||'Gagal membaca request.');
  const rows=(data||[]).map(x=>({
    id:String(x.id),requester:String(x.requester||''),title:String(x.title||''),artist:String(x.artist||''),
    note:String(x.note||''),status:String(x.status||'pending').toLowerCase()==='played'?'played':'pending',
    timestamp:x.timestamp||'',queue_position:x.queue_position==null?0:Number(x.queue_position||0),playedAt:x.played_at||''
  }));
  window.data=rows;
  const valid=new Set(rows.map(x=>x.id));
  if(typeof selected!=='undefined') [...selected].forEach(id=>{if(!valid.has(id))selected.delete(id)});
  const source=document.getElementById('sourceInfo');
  if(source)source.textContent='Supabase • '+rows.length+' data';
  window.render();
}

function clearRealtime(){
  try{if(realtimeChannel){getClient().removeChannel(realtimeChannel);realtimeChannel=null;}}catch(_){realtimeChannel=null;}
}

function scheduleRefresh(){
  clearTimeout(syncTimer);
  syncTimer=setTimeout(async()=>{
    if(syncBusy)return;
    const dashboard=document.getElementById('dashboard');
    if(!dashboard||dashboard.classList.contains('hidden'))return;
    if(!(await isAdminSession()))return;
    syncBusy=true;
    try{await syncData();}catch(error){console.warn('[Admin Realtime] refresh:',error?.message||error);}
    finally{syncBusy=false;}
  },250);
}

function startRealtime(){
  const c=getClient();
  clearRealtime();
  realtimeChannel=c.channel('admin-request-queue-sync-authoritative')
    .on('postgres_changes',{event:'*',schema:'public',table:'requests'},scheduleRefresh)
    .subscribe(status=>{
      if(status==='SUBSCRIBED'){scheduleRefresh();return;}
      if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED'){
        clearTimeout(syncTimer);
        clearRealtime();
        setTimeout(()=>{if(started&&isAdminSession())startRealtime()},1500);
      }
    });
}

function bindAuth(){
  getClient().auth.onAuthStateChange((_event,session)=>{
    if(session?.user?.app_metadata?.role==='admin'){
      startRealtime();
      scheduleRefresh();
    }else clearRealtime();
  });
}

async function restore(){
  if(!(await isAdminSession()))return;
  try{
    window.show?.();
    await syncData();
    startRealtime();
  }catch(error){console.error('[Admin Supabase]',error?.message||error);}
}

function installAuthoritativeLoad(){
  if(window.__kudaAdminAuthoritativeLoad)return;
  window.load=async function(){
    const dashboard=document.getElementById('dashboard');
    if(!dashboard||dashboard.classList.contains('hidden'))return;
    await syncData();
  };
  window.__kudaAdminAuthoritativeLoad=true;
}

function start(){
  if(started)return;
  started=true;
  window.__kudaAdminSupabase=true;
  window.KUDAJITUAdminDB=window.KUDAJITUAdminDB||{};
  try{
    window.KUDAJITUAdminDB.client=getClient();
    window.KUDAJITUAdminDB.url=SUPABASE_URL;
    window.KUDAJITUAdminDB.adminFunction=ADMIN_FN;
    installAuthoritativeLoad();
    bindAuth();
  }catch(error){
    console.warn('[Admin Supabase] init:',error?.message||error);
    return;
  }
  setTimeout(restore,250);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
else start();
})();
