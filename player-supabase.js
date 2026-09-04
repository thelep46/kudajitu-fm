(function(){
'use strict';
const SUPABASE_URL='https://jdqcvfqysmjreibcaduk.supabase.co';
const SUPABASE_KEY='sb_publishable_QDcyGfH-3dBNmUYE9pKIkg_uFmRsmOa';
const ADMIN_FN=SUPABASE_URL+'/functions/v1/kudajitu-admin-v3';
let client=null;
function getClient(){
  if(client)return client;
  if(window.supabase?.createClient)client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
  return client;
}
async function session(){
  const c=getClient();
  if(!c)throw new Error('Supabase belum siap.');
  const r=await c.auth.getSession();
  const s=r?.data?.session;
  const u=s?.user;
  if(!s||!u)throw new Error('Login Admin diperlukan.');
  if(String(u.app_metadata?.role||'').toLowerCase()!=='admin')throw new Error('Akun bukan Admin.');
  return s;
}
async function api(action,payload){
  const s=await session();
  const r=await fetch(ADMIN_FN,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+s.access_token},body:JSON.stringify({action,...(payload||{})}),cache:'no-store'});
  const d=await r.json().catch(()=>null);
  if(!r.ok||!d||d.success===false)throw new Error(d?.message||'Server Admin gagal.');
  return d;
}
window.KUDAJITUPlayerSupabaseBoot=async function(){
  const c=getClient();
  if(!c)throw new Error('Supabase belum siap.');
  window.auth=async function(){
    try{await session();$('auth').innerHTML='<span class="ok">✓ Admin terhubung via Supabase</span>';return true}
    catch(e){$('auth').innerHTML='<b class="error">'+esc(e.message)+'</b><p class="small">Login di /admin lalu buka menu 🎧 Player.</p>';return false}
  };
  window.keepAdminSession=window.auth;
  window.loadMaps=async function(){
    const {data,error}=await c.from('youtube_mappings').select('map_key,youtube_id');
    if(error)throw error;
    maps={};(data||[]).forEach(x=>{if(x?.map_key&&x?.youtube_id)maps[String(x.map_key)]=String(x.youtube_id)});
    try{localStorage.setItem('kpyt_mappings_v1',JSON.stringify(maps))}catch(_){ }
    return true;
  };
  window.loadQueue=async function(){
    const {data,error}=await c.from('requests').select('id,requester,title,artist,note,status,timestamp,played_at').eq('status','pending').order('timestamp',{ascending:true}).limit(1000);
    if(error)throw error;
    return Array.isArray(data)?data:[];
  };
  window.mark=async function(){
    const x=q[i];if(!x||currentMarked)return true;
    $('status').textContent='Menandai '+x.title+'…';
    try{await api('updateStatus',{id:String(x.id),status:'played'});currentMarked=true;$('status').textContent='✓ Status = played. Memulai '+x.title+'…';$('status').className='small ok';return true}
    catch(e){$('status').textContent='Gagal menandai: '+e.message;$('status').className='small error';return false}
  };
  await load();
  ytLoad();
};
})();
