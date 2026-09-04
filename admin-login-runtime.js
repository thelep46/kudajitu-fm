(function(){
'use strict';
const SUPABASE_URL='https://jdqcvfqysmjreibcaduk.supabase.co';
const SUPABASE_KEY='sb_publishable_QDcyGfH-3dBNmUYE9pKIkg_uFmRsmOa';
let client=null,ran=false;
function $(id){return document.getElementById(id)}
function wait(ms){return new Promise(r=>setTimeout(r,ms))}
async function getClient(){
  if(window.KUDAJITUAdminDB&&window.KUDAJITUAdminDB.client)return window.KUDAJITUAdminDB.client;
  if(window.supabase&&typeof window.supabase.createClient==='function'){
    if(!client)client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
    return client;
  }
  for(let i=0;i<80;i++){
    if(window.KUDAJITUAdminDB&&window.KUDAJITUAdminDB.client)return window.KUDAJITUAdminDB.client;
    if(window.supabase&&typeof window.supabase.createClient==='function'){
      client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);return client;
    }
    await wait(25);
  }
  throw new Error('Supabase belum siap.');
}
function ensureEmail(){
  const box=$('login');
  if(!box||$('adminEmail'))return;
  const p=box.querySelector('p');
  const input=document.createElement('input');
  input.id='adminEmail';input.type='email';input.className='field mb-3';
  input.placeholder='Email admin';input.autocomplete='username';
  if(p)p.after(input);else box.querySelector('.glass')?.prepend(input);
}
function show(){if($('login'))$('login').classList.add('hidden');if($('dashboard'))$('dashboard').classList.remove('hidden')}
function setMsg(msg){const e=$('loginMsg');if(e)e.textContent=String(msg||'')}
async function signIn(){
  ensureEmail();
  const email=($('adminEmail')?.value||'').trim();
  const password=($('password')?.value||'');
  if(!email||!password){setMsg('Email dan password wajib diisi.');return false}
  try{
    const c=await getClient();
    const {data,error}=await c.auth.signInWithPassword({email,password});
    if(error)throw error;
    if(!data?.session||data?.user?.app_metadata?.role!=='admin'){
      try{await c.auth.signOut()}catch(_){ }
      throw new Error('Akun bukan Admin atau session tidak tersedia.');
    }
    sessionStorage.setItem('kudajitu_admin_supabase','1');
    setMsg('');$('password').value='';show();
    if(typeof window.load==='function')await window.load(true);
    if(typeof window.loadUserLoginMode==='function')await window.loadUserLoginMode();
    return true;
  }catch(e){setMsg(e?.message||'Login Admin gagal.');return false}
}
async function verifySession(){
  try{
    const c=await getClient();
    const {data}=await c.auth.getSession();
    return !!(data?.session&&data.session.user?.app_metadata?.role==='admin');
  }catch(_){return false}
}
async function logout(){
  try{const c=await getClient();await c.auth.signOut()}catch(_){ }
  sessionStorage.removeItem('kudajitu_admin_supabase');
  try{sessionStorage.removeItem('kudajitu_admin_token')}catch(_){ }
  location.reload();
}
async function boot(){
  if(ran)return;ran=true;ensureEmail();
  window.login=signIn;window.verifySession=verifySession;window.logout=logout;window.token=function(){return ''};
  try{
    const ok=await verifySession();
    if(ok){show();if(typeof window.load==='function')await window.load(true);if(typeof window.loadUserLoginMode==='function')await window.loadUserLoginMode();}
  }catch(e){console.warn('[Kudajitu] admin login runtime:',e?.message||e)}
}
function start(){boot()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.addEventListener('load',function(){boot()}, {once:true});
})();
