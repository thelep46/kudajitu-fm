(function(){'use strict';
if(window.__KUDAJITU_USER_ACCESS_LOADED)return;
window.__KUDAJITU_USER_ACCESS_LOADED=true;
const SUPABASE_URL='https://jdqcvfqysmjreibcaduk.supabase.co';
const SUPABASE_KEY='sb_publishable_QDcyGfH-3dBNmUYE9pKIkg_uFmRsmOa';
let loginMode='open',authUser=null,client=null;
const $=id=>document.getElementById(id);
function getMode(){return loginMode}
function token(){try{return localStorage.getItem('kudajitu_user_token')||sessionStorage.getItem('kudajitu_user_token')||''}catch(e){return''}}
function clearToken(){try{localStorage.removeItem('kudajitu_user_token');sessionStorage.removeItem('kudajitu_user_token')}catch(e){}}
function header(){return document.querySelector('header>div>div:last-child')}
function requestCard(){const f=$('singleForm')||$('batchForm');return f?f.closest('.glass'):null}
function addStyle(){if($('kuda-user-style'))return;const s=document.createElement('style');s.id='kuda-user-style';s.textContent='.kuda-login-chip,.kuda-member-chip{display:inline-flex!important;align-items:center;justify-content:center;white-space:nowrap;border-radius:10px;padding:7px 10px;font-size:10px;font-weight:800;cursor:pointer;max-width:150px;overflow:hidden;text-overflow:ellipsis;order:3}.kuda-login-chip{background:#0d9488;border:1px solid #2dd4bf;color:#fff}.kuda-member-chip{background:#071719;border:1px solid #115e59;color:#99f6e4}.kuda-request-lock{position:relative}.kuda-request-lock-overlay{position:absolute;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px;border-radius:16px;background:rgba(3,10,12,.86);backdrop-filter:blur(5px)}.kuda-request-lock-box{width:min(300px,100%);padding:18px;border:1px solid rgba(45,212,191,.22);border-radius:16px;background:rgba(7,23,25,.96);box-shadow:0 18px 50px rgba(0,0,0,.35)}.kuda-request-lock-box i{font-size:24px;color:#2dd4bf;margin-bottom:9px}.kuda-request-lock-title{font-size:14px;font-weight:800;color:#fff}.kuda-request-lock-text{font-size:11px;color:#94a3b8;margin-top:5px;line-height:1.5}.kuda-request-lock-btn{margin-top:12px;border:0;border-radius:10px;padding:9px 16px;background:#0d9488;color:#fff;font-size:11px;font-weight:800;cursor:pointer}';document.head.appendChild(s)}
function clearAccountControls(){document.querySelectorAll('#kudaLoginBtn,.kuda-login-chip,#kudaAccountBtn,.kuda-member-chip').forEach(el=>el.remove())}
function showLoginButton(){addStyle();clearAccountControls();const b=document.createElement('button');b.id='kudaLoginBtn';b.type='button';b.className='kuda-login-chip';b.textContent='Login';b.onclick=openLogin;const h=header();if(h)h.appendChild(b)}
function showAccount(user){addStyle();clearAccountControls();const b=document.createElement('button');b.id='kudaAccountBtn';b.type='button';b.className='kuda-member-chip';b.textContent='@ '+(user.display_name||user.username||'User');const h=header();if(h)h.appendChild(b);const name=$('name');if(name){name.value=user.display_name||user.username||'';name.readOnly=true;name.classList.add('bg-gray-950/70')}}
function lockRequestArea(locked){addStyle();const card=requestCard();if(!card)return;card.classList.add('kuda-request-lock');let overlay=$('kudaRequestLock');if(locked){if(overlay)return;overlay=document.createElement('div');overlay.id='kudaRequestLock';overlay.className='kuda-request-lock-overlay';overlay.innerHTML='<div class="kuda-request-lock-box"><i class="fa-solid fa-lock"></i><div class="kuda-request-lock-title">Login diperlukan</div><div class="kuda-request-lock-text">Admin mewajibkan login sebelum kamu dapat mengirim request lagu.</div><button type="button" class="kuda-request-lock-btn">Login User</button></div>';overlay.querySelector('button').onclick=openLogin;card.appendChild(overlay)}else if(overlay)overlay.remove()}
function enableSubmit(allowed){document.querySelectorAll('#singleForm button[type="submit"],#batchForm button[type="submit"]').forEach(b=>b.disabled=(loginMode==='required'&&!allowed))}
async function loadMode(){try{if(!client&&window.supabase?.createClient)client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);if(client){const {data,error}=await client.from('settings').select('value').eq('key','user_login_mode').maybeSingle();if(!error&&data?.value){const m=String(data.value.mode||'open').toLowerCase();loginMode=m==='required'?'required':'open'}}}catch(e){loginMode='open'}authUser=null;window.KUDAJITUUser=null;const locked=loginMode==='required';if(locked)showLoginButton();else clearAccountControls();lockRequestArea(locked);enableSubmit(!locked)}
function openLogin(){alert('Login User sedang dinonaktifkan sementara selama migrasi database. Akun akan dibuat setelah website stabil.')}
async function verifySession(){return false}
function logout(){clearToken();authUser=null;window.KUDAJITUUser=null;clearAccountControls();if(loginMode==='required')showLoginButton();lockRequestArea(loginMode==='required');enableSubmit(loginMode!=='required');window.dispatchEvent(new CustomEvent('kudajitu-user-auth',{detail:{user:null}}))}
function changePassword(){openLogin()}
function observe(){const obs=new MutationObserver(()=>{if(loginMode==='required'&&!authUser)lockRequestArea(true)});obs.observe(document.body,{childList:true,subtree:true})}
function init(){observe();setTimeout(loadMode,100)}
window.KUDAJITUUserAccess={loadMode,openLogin,logout,getMode,verifySession,token,changePassword};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
