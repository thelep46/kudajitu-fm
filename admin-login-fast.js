(function(){
'use strict';
const FAST_AUTH='/api/auth';
const FAST_TIMEOUT=12000;
function fetchJson(url,options){
  options=options||{};
  const controller=new AbortController();
  const timer=setTimeout(function(){controller.abort()},FAST_TIMEOUT);
  return fetch(url,Object.assign({},options,{signal:controller.signal,cache:'no-store',credentials:'same-origin',headers:Object.assign({'Accept':'application/json'},options.headers||{})}))
    .then(function(r){return r.json().catch(function(){throw new Error('Respons server tidak valid.')}).then(function(d){if(!r.ok)throw new Error(d&&d.message||'Server gagal.');return d})})
    .finally(function(){clearTimeout(timer)});
}
window.login=async function(){
  const input=document.getElementById('password'),msg=document.getElementById('loginMsg'),btn=document.querySelector('#login button[onclick="login()"]');
  const pw=input&&input.value||'';
  if(!pw){if(msg)msg.textContent='Password admin wajib diisi.';return}
  if(btn){btn.disabled=true;btn.dataset.old=btn.innerHTML;btn.innerHTML='Memeriksa...'}
  if(msg)msg.textContent='';
  try{
    const r=await fetchJson(FAST_AUTH+'?action=adminlogin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'adminlogin',password:pw})});
    if(!r.success){if(msg)msg.textContent=r.message||'Login gagal.';return}
    sessionStorage.setItem('kudajitu_admin_token',r.token||'');
    if(input)input.value='';
    if(msg)msg.textContent='';
    if(typeof show==='function')show();
    Promise.allSettled([
      typeof load==='function'?load(true):Promise.resolve(),
      typeof loadUserLoginMode==='function'?loadUserLoginMode():Promise.resolve()
    ]);
  }catch(e){
    if(msg)msg.textContent=e&&e.name==='AbortError'?'Server auth timeout. Coba lagi.':'Gagal login: '+(e&&e.message||'Network error');
  }finally{
    if(btn){btn.disabled=false;btn.innerHTML=btn.dataset.old||'Masuk'}
  }
};
window.jsonp=function(url,timeout){
  const raw=String(url||'');
  try{
    const u=new URL(raw,location.href);
    const action=String(u.searchParams.get('action')||'').toLowerCase();
    if(['login','session','logout','adminlogin','adminsession','adminlogout','forgotpassword','changepassword'].includes(action)){
      const payload={};u.searchParams.forEach(function(v,k){if(!['action','callback','prefix','_'].includes(k))payload[k]=v});
      const qs='?action='+encodeURIComponent(action);
      return fetchJson(FAST_AUTH+qs,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.assign({action:action},payload))});
    }
    u.searchParams.delete('callback');u.searchParams.delete('prefix');u.searchParams.delete('_');
    return fetchJson(u.toString(),{method:'GET'});
  }catch(e){return Promise.reject(e)}
};
})();
