(function(){
'use strict';

function addRegisterButton(){
  var overlay=document.getElementById('authOverlay');
  if(!overlay)return;
  var forgot=document.getElementById('forgotBtn');
  if(!forgot || document.getElementById('registerBtn'))return;
  var button=document.createElement('button');
  button.id='registerBtn';button.type='button';button.className='auth-link';button.textContent='Daftar Akun';
  button.style.display='block';button.style.margin='6px auto 0';button.onclick=showRegisterInfo;
  forgot.parentNode.insertBefore(button,forgot.nextSibling);
}
function showRegisterInfo(){
  var old=document.getElementById('registerInfoOverlay');if(old)old.remove();
  var overlay=document.createElement('div');overlay.id='registerInfoOverlay';overlay.className='auth-overlay';overlay.style.zIndex='10002';
  overlay.innerHTML='<div class="auth-card" style="text-align:center"><div style="font-size:30px;margin-bottom:8px">👤</div><b style="color:#fff;font-size:19px">Daftar Akun</b><p style="font-size:12px;color:#94a3b8;line-height:1.7;margin-top:10px">Pendaftaran akun dilakukan melalui Admin KUDAJITU.</p><p style="font-size:12px;color:#cbd5e1;line-height:1.7">Silakan hubungi Admin KUDAJITU melalui <b style="color:#5eead4">Microsoft Teams</b> atau <b style="color:#5eead4">Telegram</b> untuk mendapatkan akun.</p><button id="registerClose" type="button" class="auth-btn">Kembali ke Login</button></div>';
  document.body.appendChild(overlay);document.getElementById('registerClose').onclick=function(){overlay.remove()};overlay.addEventListener('click',function(e){if(e.target===overlay)overlay.remove()});
}
function patchBatchUI(){
  var area=document.getElementById('batch'),form=document.getElementById('batchForm');
  if(!area||!form)return;
  area.removeAttribute('maxlength');
  var note=form.querySelector('p');if(note)note.textContent='Satu lagu per baris. Tidak ada batas jumlah lagu dari sisi fitur.';
  if(form.dataset.uiPatched==='1')return;form.dataset.uiPatched='1';
}
window.addEventListener('DOMContentLoaded',function(){
  addRegisterButton();patchBatchUI();
  new MutationObserver(function(){addRegisterButton();patchBatchUI()}).observe(document.body,{childList:true,subtree:true});
});
})();
