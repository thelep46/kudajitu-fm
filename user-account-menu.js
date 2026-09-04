(function(){'use strict';
function init(){
 const b=document.getElementById('kudaAccountBtn'); if(!b||document.getElementById('kudaAccountMenu'))return;
 b.style.position='relative';
 const wrap=document.createElement('span');wrap.id='kudaAccountWrap';wrap.style.cssText='position:relative;display:inline-flex';
 b.parentNode.insertBefore(wrap,b);wrap.appendChild(b);
 const menu=document.createElement('div');menu.id='kudaAccountMenu';menu.style.cssText='position:absolute;right:0;top:calc(100% + 8px);width:190px;padding:6px;border:1px solid rgba(45,212,191,.22);border-radius:14px;background:rgba(4,15,17,.98);box-shadow:0 18px 50px rgba(0,0,0,.45);backdrop-filter:blur(12px);display:none;z-index:999';
 menu.innerHTML='<button type="button" data-kuda-action="forgot" style="display:block;width:100%;padding:10px;border:0;border-radius:9px;background:transparent;color:#cbd5e1;text-align:left;font-size:11px;font-weight:700;cursor:pointer">🔑 Lupa Password</button><button type="button" data-kuda-action="logout" style="display:block;width:100%;padding:10px;border:0;border-radius:9px;background:transparent;color:#fca5a5;text-align:left;font-size:11px;font-weight:700;cursor:pointer">↪ Logout</button>';
 wrap.appendChild(menu);
 b.onclick=function(e){e.stopPropagation();menu.style.display=menu.style.display==='none'?'block':'none'};
 menu.querySelector('[data-kuda-action="logout"]').onclick=async function(){menu.style.display='none';if(confirm('Logout dari akun ini?'))await window.logout()};
 menu.querySelector('[data-kuda-action="forgot"]').onclick=function(){menu.style.display='none';if(typeof window.changePassword==='function')window.changePassword()};
 document.addEventListener('click',function(e){if(!wrap.contains(e.target))menu.style.display='none'});
}
function boot(){init();window.addEventListener('kudajitu-user-auth',function(){setTimeout(init,30)})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
