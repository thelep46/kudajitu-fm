(function(){
'use strict';
var GAS='https://script.google.com/macros/s/AKfycbyUB8drjL1dSJedYjKIKjVc5gzIE3Pe-QS0FF8o1_zU4NkAweGLFquhHLfy1Nt_eITA-Q/exec';
var TOKEN_KEY='kudajitu_member_token_v1';
var ANN_KEY='kudajitu_announcement_seen_v2';
function getToken(){return localStorage.getItem(TOKEN_KEY)||'';}
function request(action,data,timeout){
  data=data||{};
  var query='?action='+encodeURIComponent(action);
  Object.keys(data).forEach(function(key){query+='&'+encodeURIComponent(key)+'='+encodeURIComponent(data[key]);});
  return new Promise(function(resolve,reject){
    var callback='kudaAuth_'+Date.now()+'_'+Math.random().toString(36).slice(2);
    var script=document.createElement('script');
    var finished=false;
    var timer=setTimeout(function(){finish();reject(new Error('timeout'));},timeout||30000);
    function finish(){if(finished)return;finished=true;clearTimeout(timer);script.remove();try{delete window[callback]}catch(e){window[callback]=undefined;}}
    window[callback]=function(result){finish();if(result&&result.success!==false)resolve(result);else reject(new Error(result&&result.message||'Server gagal merespons.'));};
    script.onerror=function(){finish();reject(new Error('network error'));};
    script.src=GAS+query+'&callback='+callback+'&_='+Date.now();
    document.head.appendChild(script);
  });
}
function retry(action,data,timeout){
  return request(action,data,timeout).catch(function(error){return new Promise(function(resolve){setTimeout(resolve,900);}).then(function(){return request(action,data,timeout);});});
}
function esc(value){return String(value==null?'':value).replace(/[&<>\"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c];});}
function addStyle(){
  if(document.getElementById('kuda-auth-style'))return;
  var style=document.createElement('style');
  style.id='kuda-auth-style';
  style.textContent=''+
  '.auth-overlay{position:fixed;inset:0;z-index:10000;background:rgba(2,8,9,.96);display:flex;align-items:center;justify-content:center;padding:14px}'+
  '.auth-card{width:min(420px,100%);max-height:calc(100dvh - 28px);overflow:auto;background:#071719;border:1px solid #115e59;border-radius:20px;padding:24px;box-shadow:0 25px 80px #000}'+
  '.auth-field{box-sizing:border-box;width:100%;background:#030a0c;border:1px solid #115e59;border-radius:11px;padding:12px;color:#fff;margin-top:8px;outline:0;font-size:16px}'+
  '.auth-btn{width:100%;border:0;border-radius:11px;padding:12px;background:#0d9488;color:#fff;font-weight:800;margin-top:12px;cursor:pointer}'+
  '.auth-btn:disabled{opacity:.55;cursor:wait}'+
  '.auth-link{border:0;background:none;color:#5eead4;font-size:11px;cursor:pointer;margin-top:10px}'+
  '.auth-msg{font-size:12px;color:#f87171;margin-top:10px;min-height:18px}'+
  '.login-chip,.member-chip{position:static!important;display:inline-flex!important;align-items:center;justify-content:center;background:#071719;border:1px solid #115e59;color:#99f6e4;border-radius:10px;padding:7px 10px;font-size:10px;font-weight:800;cursor:pointer;white-space:nowrap;max-width:120px;overflow:hidden;text-overflow:ellipsis}'+
  '.login-chip{background:#0d9488;border-color:#2dd4bf;color:#fff}'+
  '.account-menu{position:fixed;right:12px;top:68px;z-index:10001;width:min(330px,calc(100vw - 24px));background:#071719;border:1px solid #115e59;border-radius:16px;padding:16px;box-shadow:0 20px 60px #000}'+
  '.kuda-ann-overlay{position:fixed;inset:0;z-index:9998;background:rgba(0,0,0,.72);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:16px;animation:kudaAnnFade .18s ease}'+
  '.kuda-ann-card{width:min(520px,100%);max-height:calc(100dvh - 32px);overflow:auto;background:#071719;border:1px solid rgba(45,212,191,.32);border-radius:22px;padding:22px;box-shadow:0 25px 90px rgba(0,0,0,.8);animation:kudaAnnPop .2s ease}'+
  '.kuda-ann-icon{width:46px;height:46px;border-radius:14px;display:flex;align-items:center;justify-content:center;background:rgba(20,184,166,.12);color:#5eead4;font-size:20px;flex:0 0 46px}'+
  '.kuda-ann-content{white-space:pre-wrap;word-break:break-word;color:#cbd5e1;line-height:1.7;font-size:13px}'+
  '.kuda-ann-btn{width:100%;border:0;border-radius:11px;padding:12px;background:#0d9488;color:#fff;font-weight:800;cursor:pointer;margin-top:18px}'+
  '@keyframes kudaAnnFade{from{opacity:0}to{opacity:1}}@keyframes kudaAnnPop{from{opacity:0;transform:translateY(10px) scale(.98)}to{opacity:1;transform:none}}'+
  '@media(max-width:640px){.auth-overlay{padding:10px}.auth-card{padding:20px;border-radius:18px}.account-menu{top:62px;right:8px;width:calc(100vw - 16px)}.login-chip,.member-chip{font-size:9px;padding:7px 8px;max-width:90px}.kuda-ann-overlay{padding:10px}.kuda-ann-card{padding:18px;border-radius:18px}.kuda-ann-content{font-size:12px}}';
  document.head.appendChild(style);
}
function header(){return document.querySelector('header>div>div:last-child');}
function showLoginButton(){
  addStyle();
  var account=document.getElementById('accountBtn');
  if(account)account.remove();
  if(document.getElementById('loginBtn'))return;
  var button=document.createElement('button');
  button.id='loginBtn';button.type='button';button.className='login-chip';button.textContent='Login';button.title='Login member';
  button.onclick=showLogin;
  var target=header();
  if(target)target.appendChild(button);
}
function closeOverlay(){var overlay=document.getElementById('authOverlay');if(overlay)overlay.remove();}
function showLogin(){
  addStyle();showLoginButton();
  if(document.getElementById('authOverlay'))return;
  var overlay=document.createElement('div');overlay.id='authOverlay';overlay.className='auth-overlay';
  overlay.innerHTML='<div class="auth-card"><div style="text-align:center;color:#fff;font-size:22px;font-weight:800;margin-bottom:5px">KUDAJITU FM</div><div style="text-align:center;color:#94a3b8;font-size:11px;margin-bottom:16px">Login untuk mengirim request lagu</div><input id="ku" class="auth-field" autocomplete="username" placeholder="Username"><input id="kp" type="password" class="auth-field" autocomplete="current-password" placeholder="Password"><button id="kb" class="auth-btn">Masuk</button><button id="forgotBtn" class="auth-link">Lupa password?</button><div id="km" class="auth-msg"></div></div>';
  document.body.appendChild(overlay);
  document.getElementById('kb').onclick=doLogin;
  document.getElementById('kp').onkeydown=function(event){if(event.key==='Enter')doLogin();};
  document.getElementById('forgotBtn').onclick=showForgot;
}
function doLogin(){
  var username=document.getElementById('ku'),password=document.getElementById('kp'),button=document.getElementById('kb'),message=document.getElementById('km');
  if(!username||!password)return;
  if(!username.value.trim()||!password.value){message.textContent='Username dan password wajib diisi.';return;}
  button.disabled=true;button.textContent='Memeriksa...';message.textContent='';
  retry('login',{username:username.value.trim(),password:password.value},30000).then(function(result){
    if(!result.token||!result.user)throw new Error(result.message||'Login gagal.');
    localStorage.setItem(TOKEN_KEY,result.token);applyUser(result.user);
  }).catch(function(error){message.textContent=error.message==='timeout'?'Server sedang sibuk. Silakan coba lagi.':error.message;}).finally(function(){button.disabled=false;button.textContent='Masuk';});
}
function showForgot(){
  var overlay=document.getElementById('authOverlay');if(!overlay)return;
  overlay.innerHTML='<div class="auth-card"><b style="color:#fff;font-size:18px">Lupa Password</b><p style="font-size:12px;color:#94a3b8;line-height:1.6">Masukkan username Anda. Admin dapat membantu melakukan reset password.</p><input id="forgotUser" class="auth-field" autocomplete="username" placeholder="Username"><button id="forgotSend" class="auth-btn">Ajukan Reset</button><button id="forgotBack" class="auth-link">Kembali ke Login</button><div id="forgotMsg" class="auth-msg"></div></div>';
  document.getElementById('forgotSend').onclick=function(){
    var username=document.getElementById('forgotUser').value.trim(),msg=document.getElementById('forgotMsg'),button=document.getElementById('forgotSend');
    if(!username){msg.textContent='Username wajib diisi.';return;}
    button.disabled=true;button.textContent='Mengirim...';
    retry('forgotpassword',{username:username},20000).then(function(result){msg.style.color='#5eead4';msg.textContent=result.message||'Permintaan reset dikirim ke admin.';}).catch(function(error){msg.textContent=error.message;}).finally(function(){button.disabled=false;button.textContent='Ajukan Reset';});
  };
  document.getElementById('forgotBack').onclick=showLogin;
}
function applyUser(user){
  closeOverlay();window.KUDAJITUUser=user;
  var loginButton=document.getElementById('loginBtn');if(loginButton)loginButton.remove();
  var old=document.getElementById('accountBtn');if(old)old.remove();
  var button=document.createElement('button');button.id='accountBtn';button.className='member-chip';button.title='Akun '+(user.name||user.username);button.textContent='@ '+(user.name||user.username);
  button.onclick=function(){
    var menu=document.getElementById('accountMenu');if(menu){menu.remove();return;}
    addStyle();menu=document.createElement('div');menu.id='accountMenu';menu.className='account-menu';
    menu.innerHTML='<b style="color:#fff">Akun</b><div style="font-size:11px;color:#94a3b8;margin:6px 0 12px">@'+esc(user.username)+'</div><button id="changePwBtn" class="auth-btn">Ganti Password</button><button id="logoutBtn" class="auth-btn" style="background:#123033">Keluar</button>';
    document.body.appendChild(menu);document.getElementById('changePwBtn').onclick=function(){menu.remove();changePassword();};document.getElementById('logoutBtn').onclick=logout;
  };
  var target=header();if(target)target.appendChild(button);
  var name=document.getElementById('name');if(name){name.value=user.name||user.username;name.readOnly=true;}
  showAnnouncement();
}
function changePassword(){
  addStyle();var overlay=document.createElement('div');overlay.id='authOverlay';overlay.className='auth-overlay';
  overlay.innerHTML='<div class="auth-card"><b style="color:#fff;font-size:18px">Ganti Password</b><input id="oldPw" type="password" class="auth-field" autocomplete="current-password" placeholder="Password lama"><input id="newPw" type="password" class="auth-field" autocomplete="new-password" placeholder="Password baru"><input id="confirmPw" type="password" class="auth-field" autocomplete="new-password" placeholder="Konfirmasi password baru"><button id="savePw" class="auth-btn">Simpan</button><button id="cancelPw" class="auth-link">Batal</button><div id="pwMsg" class="auth-msg"></div></div>';
  document.body.appendChild(overlay);
  document.getElementById('cancelPw').onclick=closeOverlay;
  document.getElementById('savePw').onclick=function(){
    var oldPw=document.getElementById('oldPw').value,newPw=document.getElementById('newPw').value,confirmPw=document.getElementById('confirmPw').value,msg=document.getElementById('pwMsg'),button=document.getElementById('savePw');
    if(!oldPw||!newPw||!confirmPw){msg.textContent='Semua kolom wajib diisi.';return;}
    if(newPw.length<6){msg.textContent='Password baru minimal 6 karakter.';return;}
    if(newPw!==confirmPw){msg.textContent='Konfirmasi password tidak sama.';return;}
    button.disabled=true;button.textContent='Menyimpan...';
    retry('changepassword',{token:getToken(),oldPassword:oldPw,newPassword:newPw},20000).then(function(result){msg.style.color='#5eead4';msg.textContent=result.message||'Password berhasil diganti.';setTimeout(logout,1000);}).catch(function(error){msg.textContent=error.message;}).finally(function(){button.disabled=false;button.textContent='Simpan';});
  };
}
function logout(){
  var oldToken=getToken();localStorage.removeItem(TOKEN_KEY);window.KUDAJITUUser=null;
  var menu=document.getElementById('accountMenu');if(menu)menu.remove();
  request('logout',{token:oldToken},5000).catch(function(){}).finally(function(){location.reload();});
}
function validateSession(){
  var currentToken=getToken();
  if(!currentToken){showLogin();return;}
  retry('session',{token:currentToken},30000).then(function(result){if(!result.success||!result.user)throw new Error('LOGIN_REQUIRED');applyUser(result.user);}).catch(function(){localStorage.removeItem(TOKEN_KEY);window.KUDAJITUUser=null;showLogin();});
}
function currentUser(){
  var currentToken=getToken();
  if(!currentToken)return Promise.reject(new Error('Silakan login terlebih dahulu.'));
  if(window.KUDAJITUUser)return Promise.resolve(window.KUDAJITUUser);
  return retry('session',{token:currentToken},30000).then(function(result){if(!result.success||!result.user)throw new Error('Sesi login berakhir. Silakan login kembali.');window.KUDAJITUUser=result.user;return result.user;});
}
function showAnnouncement(){
  if(document.getElementById('kudaAnnouncement'))return;
  request('announcement',{},12000).then(function(result){
    var a=result&&result.announcement;
    if(!a||a.enabled!==true||!String(a.title||'').trim()&&!String(a.content||'').trim())return;
    var version=String(a.updatedAt||'');
    var mode=String(a.mode||'once');
    if(mode==='once'&&version&&localStorage.getItem(ANN_KEY)===version)return;
    addStyle();
    var overlay=document.createElement('div');overlay.id='kudaAnnouncement';overlay.className='kuda-ann-overlay';
    var type=String(a.type||'info');
    var icon=type==='important'?'⚠️':type==='warning'?'🔔':'📢';
    var title=esc(a.title||'INFORMASI KUDAJITU FM');
    var content=esc(a.content||'');
    overlay.innerHTML='<div class="kuda-ann-card"><div style="display:flex;gap:12px;align-items:flex-start"><div class="kuda-ann-icon">'+icon+'</div><div style="flex:1;min-width:0"><div style="color:#fff;font-size:18px;font-weight:800;line-height:1.35">'+title+'</div><div style="color:#64748b;font-size:10px;text-transform:uppercase;letter-spacing:.16em;margin-top:4px">Pengumuman</div></div><button id="kudaAnnClose" type="button" style="border:0;background:none;color:#94a3b8;font-size:24px;line-height:1;cursor:pointer">×</button></div><div class="kuda-ann-content" style="margin-top:16px">'+content+'</div><button id="kudaAnnOk" class="kuda-ann-btn" type="button">✓ Saya Mengerti</button></div>';
    document.body.appendChild(overlay);
    function close(){if(mode==='once'&&version)localStorage.setItem(ANN_KEY,version);overlay.remove();}
    document.getElementById('kudaAnnClose').onclick=close;
    document.getElementById('kudaAnnOk').onclick=close;
    overlay.addEventListener('click',function(e){if(e.target===overlay)close();});
  }).catch(function(){});
}
function init(){
  addStyle();
  validateSession();
  document.addEventListener('submit',function(event){if(event.target&&event.target.id==='singleForm'){sendSingleCapture(event);}else if(event.target&&event.target.id==='batchForm'){sendBatchCapture(event);}},true);
}
function sendSingleCapture(event){
  event.preventDefault();event.stopImmediatePropagation();
  var button=document.getElementById('sendBtn'),title=document.getElementById('title'),artist=document.getElementById('artist'),note=document.getElementById('note');
  if(!button||button.disabled||!title||!artist||!title.value.trim()||!artist.value.trim())return false;
  var oldText=button.innerHTML;button.disabled=true;button.textContent='Mengirim...';
  currentUser().then(function(user){return retry('add',{token:getToken(),requester:user.name||user.username,title:title.value.trim(),artist:artist.value.trim(),note:note?note.value.trim():''},30000);}).then(function(result){if(typeof toast==='function')toast(result.message||'Request berhasil dikirim.');title.value='';artist.value='';if(note)note.value='';if(typeof loadData==='function')loadData(false);}).catch(function(error){if(typeof toast==='function')toast(error.message||'Request gagal.','error');}).finally(function(){button.disabled=false;button.innerHTML=oldText;});
  return false;
}
function sendBatchCapture(event){
  event.preventDefault();event.stopImmediatePropagation();
  var button=document.getElementById('batchBtn'),field=document.getElementById('batch');
  if(!button||button.disabled||!field||!field.value.trim())return false;
  var lines=field.value.split(/\r?\n/).map(function(line){return line.trim();}).filter(Boolean).slice(0,3);
  var items=lines.map(function(line){var parts=line.split(/\s+-\s+/);return{title:(parts.shift()||'').trim(),artist:parts.join(' - ').trim()||'Unknown Artist',note:'Batch Request'};}).filter(function(item){return item.title&&item.artist;});
  if(!items.length){if(typeof toast==='function')toast('Format: Judul Lagu - Artist','error');return false;}
  var oldText=button.innerHTML;button.disabled=true;button.textContent='Mengirim...';
  currentUser().then(function(user){return retry('addbatch',{token:getToken(),requester:user.name||user.username,items:JSON.stringify(items)},30000);}).then(function(result){if(typeof toast==='function')toast(result.message||'Request berhasil dikirim.');field.value='';if(typeof loadData==='function')loadData(false);}).catch(function(error){if(typeof toast==='function')toast(error.message||'Batch request gagal.','error');}).finally(function(){button.disabled=false;button.innerHTML=oldText;});
  return false;
}
window.KUDAJITUAuth={logout:logout,login:showLogin};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
