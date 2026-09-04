(function(){
'use strict';
const SUPABASE_URL='https://jdqcvfqysmjreibcaduk.supabase.co';
const SUPABASE_KEY='sb_publishable_QDcyGfH-3dBNmUYE9pKIkg_uFmRsmOa';
const FN=SUPABASE_URL+'/functions/v1/kudajitu-admin-v4';
let client;
function getClient(){
  if(client)return client;
  if(window.KUDAJITUAdminDB?.client){client=window.KUDAJITUAdminDB.client;return client;}
  if(!window.supabase?.createClient)throw new Error('Supabase JS belum dimuat.');
  client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
  window.KUDAJITUAdminDB={client};
  return client;
}
function msg(t){const e=document.getElementById('loginMsg');if(e)e.textContent=t||'';}
async function edge(action,payload={}){
  const c=getClient();
  const {data,error}=await c.auth.getSession();
  if(error||!data?.session?.access_token)throw new Error('LOGIN_REQUIRED');
  const r=await fetch(FN,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+data.session.access_token},body:JSON.stringify({action,...payload})});
  const text=await r.text();let out;try{out=JSON.parse(text)}catch(_){throw new Error('Respons Admin tidak valid.');}
  if(!r.ok||out.success===false)throw new Error(out.message||('Server gagal ('+r.status+').'));
  return out;
}
async function setUserLoginModeDirect(mode){
  const c=getClient();
  const value={mode:String(mode||'open').toLowerCase()==='required'?'required':'open'};
  const {error}=await c.from('settings').upsert({key:'user_login_mode',value,updated_at:new Date().toISOString()},{onConflict:'key'});
  if(error)throw error;
  return {success:true,mode:value.mode};
}
async function syncTodayPlayed(){
  try{
    const c=getClient();
    const start=new Date();start.setHours(0,0,0,0);
    const end=new Date(start);end.setDate(end.getDate()+1);
    const {count,error}=await c.from('requests').select('id',{count:'exact',head:true}).eq('status','played').gte('played_at',start.toISOString()).lt('played_at',end.toISOString());
    if(!error&&document.getElementById('played'))document.getElementById('played').textContent=String(count||0);
  }catch(_){/* keep existing dashboard value if the optional counter query fails */}
}
async function loginAdmin(){
  const c=getClient();
  const email=(document.getElementById('adminEmail')?.value||'').trim();
  const password=document.getElementById('password')?.value||'';
  if(!email||!password){msg('Email dan password wajib diisi.');return false;}
  try{
    const {data,error}=await c.auth.signInWithPassword({email,password});
    if(error)throw error;
    if(!data?.session?.user)throw new Error('Session login tidak tersedia.');
    if(data.user.app_metadata?.role!=='admin'){await c.auth.signOut();throw new Error('Akun bukan Admin.');}
    sessionStorage.setItem('kudajitu_admin_supabase','1');msg('');
    if(typeof window.show==='function')window.show();
    if(typeof window.load==='function')await window.load(true);
    if(typeof window.loadUserLoginMode==='function')await window.loadUserLoginMode();
    await syncTodayPlayed();
    return true;
  }catch(e){msg(e?.message||'Login Admin gagal.');return false;}
}
async function verifyAdminSession(){
  try{const {data}=await getClient().auth.getSession();return !!(data?.session?.user?.app_metadata?.role==='admin');}catch(_){return false;}
}
async function logoutAdmin(){try{await getClient().auth.signOut()}catch(_){}sessionStorage.removeItem('kudajitu_admin_supabase');sessionStorage.removeItem('kudajitu_admin_token');location.reload();}
function installBridge(){
  if(typeof window.jsonp!=='function'||window.jsonp.__kudaSupabaseBridge)return;
  const original=window.jsonp;
  const map={data:'data',nowplaying:'nowplaying',getqueueorder:'getqueueorder',reorder:'reorder',checkids:'checkids',youtubecheck:'youtubeCheck',youtubemappings:'youtubemappings',saveyoutubemapping:'saveyoutubemapping',deleteyoutubemapping:'deleteyoutubemapping',announcement:'announcement',saveannouncement:'saveannouncement',clearannouncement:'clearannouncement',userloginmode:'userloginmode',setuserloginmode:'setuserloginmode',updatestatus:'updateStatus',markplayed:'markPlayed',updatestatuses:'updateStatuses',delete:'delete',deletebatch:'deleteBatch',users:'users'};
  async function bridge(url){
    const u=new URL(String(url||''),location.href);const raw=(u.searchParams.get('action')||'').toLowerCase();
    if(raw==='setuserloginmode')return setUserLoginModeDirect(u.searchParams.get('mode')||'open');
    const action=map[raw];
    if(!action)return original(url);
    const payload={};u.searchParams.forEach((v,k)=>{if(!['action','callback','prefix','_','adminToken','token'].includes(k))payload[k]=v;});
    return edge(action,payload);
  }
  bridge.__kudaSupabaseBridge=true;window.jsonp=bridge;
}
function bind(){
  const b=document.querySelector('#login button[onclick="login()"]');if(b&&!b.dataset.supabaseBound){b.dataset.supabaseBound='1';b.onclick=e=>{e?.preventDefault();loginAdmin();};}
  const p=document.getElementById('password');if(p&&!p.dataset.supabaseBound){p.dataset.supabaseBound='1';p.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();loginAdmin();}});}
}
async function restore(){if(await verifyAdminSession()){window.show?.();try{await window.load?.(true);await window.loadUserLoginMode?.();await syncTodayPlayed()}catch(e){console.error('[Admin Supabase]',e)}}}
function start(){
  try{getClient()}catch(e){msg(e.message)}
  window.login=loginAdmin;window.verifySession=verifyAdminSession;window.logout=logoutAdmin;window.token=()=>'';
  bind();installBridge();setTimeout(bind,100);setTimeout(installBridge,100);setTimeout(restore,250);
  setInterval(syncTodayPlayed,15000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
