(function(){
'use strict';
const SUPABASE_URL='https://jdqcvfqysmjreibcaduk.supabase.co';
const SUPABASE_KEY='sb_publishable_QDcyGfH-3dBNmUYE9pKIkg_uFmRsmOa';
const FN=SUPABASE_URL+'/functions/v1/kudajitu-admin-v4';
let client=null;
let signingIn=false;
function $(id){return document.getElementById(id)}
function getClient(){
  if(client)return client;
  if(window.KUDAJITUAdminDB&&window.KUDAJITUAdminDB.client){client=window.KUDAJITUAdminDB.client;return client}
  if(!window.supabase?.createClient)throw new Error('Supabase JS belum dimuat.');
  client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  window.KUDAJITUAdminDB={client};
  return client;
}
function msg(v){const e=$('loginMsg');if(e)e.textContent=String(v||'')}
function show(){if($('login'))$('login').classList.add('hidden');if($('dashboard'))$('dashboard').classList.remove('hidden')}
async function signIn(){
  if(signingIn)return false;
  const c=getClient();
  const email=($('adminEmail')?.value||'').trim();
  const password=$('password')?.value||'';
  if(!c){msg('Supabase belum siap.');return false}
  if(!email||!password){msg('Email dan password wajib diisi.');return false}
  signingIn=true;
  try{
    const {data,error}=await c.auth.signInWithPassword({email,password});
    if(error)throw error;
    if(!data?.session||data.user?.app_metadata?.role!=='admin'){
      try{await c.auth.signOut()}catch(_){ }
      throw new Error('Akun bukan Admin atau session tidak tersedia.');
    }
    sessionStorage.setItem('kudajitu_admin_supabase','1');
    if($('password'))$('password').value='';
    msg('');show();
    await loadAfterLogin();
    return true;
  }catch(e){msg(e?.message||'Login Admin gagal.');return false}
  finally{signingIn=false}
}
async function loadAfterLogin(){
  if(typeof window.load==='function')await window.load(true);
  if(typeof window.loadUserLoginMode==='function')await window.loadUserLoginMode();
}
async function verifySession(){
  const c=getClient();if(!c)return false;
  try{const {data}=await c.auth.getSession();return !!(data?.session&&data.session.user?.app_metadata?.role==='admin')}catch(_){return false}
}
async function logout(){
  const c=getClient();try{if(c)await c.auth.signOut()}catch(_){ }
  sessionStorage.removeItem('kudajitu_admin_supabase');
  sessionStorage.removeItem('kudajitu_admin_token');
  location.reload();
}
function edge(action,payload){
  const c=getClient();
  if(!c)return Promise.reject(new Error('DATABASE_NOT_READY'));
  return c.auth.getSession().then(({data})=>{
    const token=data?.session?.access_token||'';
    if(!token)throw new Error('LOGIN_REQUIRED');
    return fetch(FN,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify(Object.assign({action},payload||{}))});
  }).then(async r=>{const d=await r.json().catch(()=>({success:false,message:'Respons server tidak valid.'}));if(!r.ok||d.success===false)throw new Error(d.message||'Server gagal.');return d});
}
function bridgeJsonp(){
  if(typeof window.jsonp!=='function')return;
  if(window.jsonp.__kudaSupabaseBridge)return;
  const old=window.jsonp;
  const map={data:'data',nowplaying:'nowplaying',getqueueorder:'getqueueorder',reorder:'reorder',checkids:'checkids',youtubecheck:'youtubeCheck',youtubemappings:'youtubemappings',saveyoutubemapping:'saveyoutubemapping',deleteyoutubemapping:'deleteyoutubemapping',announcement:'announcement',saveannouncement:'saveannouncement',clearannouncement:'clearannouncement',userloginmode:'userloginmode',setuserloginmode:'setuserloginmode',updatestatus:'updateStatus',markplayed:'markPlayed',updatestatuses:'updateStatuses',delete:'delete',deletebatch:'deleteBatch',users:'users'};
  function wrapped(url){
    try{
      const u=new URL(String(url||''),location.href),raw=String(u.searchParams.get('action')||'').toLowerCase();
      if(!map[raw])return old(url);
      const payload={};u.searchParams.forEach((v,k)=>{if(!['action','callback','prefix','_','adminToken','token'].includes(k))payload[k]=v});
      return edge(map[raw],payload);
    }catch(e){return Promise.reject(e)}
  }
  wrapped.__kudaSupabaseBridge=true;window.jsonp=wrapped;
}
function bind(){
  const b=document.querySelector('#login button[onclick="login()"]');
  if(b&&!b.dataset.kudaBound){b.dataset.kudaBound='1';b.onclick=e=>{e?.preventDefault();signIn()}}
  const p=$('password');
  if(p&&!p.dataset.kudaBound){
    p.dataset.kudaBound='1';
    if(!p.getAttribute('onkeydown'))p.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();signIn()}})
  }
  window.login=signIn;window.verifySession=verifySession;window.logout=logout;window.token=()=>'';
  bridgeJsonp();
}
async function boot(){bind();if(await verifySession()){show();await loadAfterLogin()}}
function start(){boot();[100,300,700,1500,3000].forEach(ms=>setTimeout(bind,ms))}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
