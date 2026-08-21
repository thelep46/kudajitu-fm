(function(){
'use strict';

function escPatch(v){return String(v==null?'':v).replace(/[&<>\"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]})}

function addRegisterButton(){
  var overlay=document.getElementById('authOverlay');
  if(!overlay)return;
  var forgot=document.getElementById('forgotBtn');
  if(!forgot || document.getElementById('registerBtn'))return;
  var button=document.createElement('button');
  button.id='registerBtn';
  button.type='button';
  button.className='auth-link';
  button.textContent='Daftar Akun';
  button.style.display='block';
  button.style.margin='6px auto 0';
  button.onclick=showRegisterInfo;
  forgot.parentNode.insertBefore(button,forgot.nextSibling);
}

function showRegisterInfo(){
  var old=document.getElementById('registerInfoOverlay');
  if(old)old.remove();
  var overlay=document.createElement('div');
  overlay.id='registerInfoOverlay';
  overlay.className='auth-overlay';
  overlay.style.zIndex='10002';
  overlay.innerHTML='<div class="auth-card" style="text-align:center"><div style="font-size:30px;margin-bottom:8px">👤</div><b style="color:#fff;font-size:19px">Daftar Akun</b><p style="font-size:12px;color:#94a3b8;line-height:1.7;margin-top:10px">Pendaftaran akun dilakukan melalui Admin KUDAJITU.</p><p style="font-size:12px;color:#cbd5e1;line-height:1.7">Silakan hubungi Admin KUDAJITU melalui <b style="color:#5eead4">Microsoft Teams</b> atau <b style="color:#5eead4">Telegram</b> untuk mendapatkan akun.</p><button id="registerClose" type="button" class="auth-btn">Kembali ke Login</button></div>';
  document.body.appendChild(overlay);
  document.getElementById('registerClose').onclick=function(){overlay.remove();};
  overlay.addEventListener('click',function(e){if(e.target===overlay)overlay.remove();});
}

function patchBatchForm(){
  var form=document.getElementById('batchForm');
  var area=document.getElementById('batch');
  if(area){area.removeAttribute('maxlength');area.placeholder='Satu lagu per baris, contoh:\nHati-Hati di Jalan - Tulus\nSial - Mahalini\nSeparuh Aku - Noah';}
  var note=form&&form.querySelector('p');
  if(note)note.textContent='Satu lagu per baris. Tidak ada batas jumlah lagu dari sisi fitur; sistem akan mengirim otomatis dalam beberapa bagian.';
  if(!form || form.dataset.unlimitedPatched==='1')return;
  form.dataset.unlimitedPatched='1';
  form.addEventListener('submit',function(event){
    event.preventDefault();
    event.stopImmediatePropagation();
    submitUnlimitedBatch();
  },true);
}

async function submitUnlimitedBatch(){
  var nameEl=document.getElementById('name'),area=document.getElementById('batch'),button=document.getElementById('batchBtn');
  var name=nameEl?nameEl.value.trim():'';
  var raw=area?area.value.trim():'';
  if(!name||!raw){toast('Nama dan daftar lagu wajib diisi.','error');return;}
  var lines=raw.split(/\r?\n/).map(function(x){return x.trim()}).filter(Boolean);
  if(!lines.length){toast('Daftar lagu masih kosong.','error');return;}
  var base=Date.now();
  var items=lines.map(function(line,i){
    var parts=line.split('-');
    return normalize({
      id:'req_'+(base+i)+'_'+Math.random().toString(36).slice(2,8),
      requester:name,
      title:(parts[0]||'').trim(),
      artist:(parts.length>1?parts.slice(1).join('-').trim():'Unknown Artist'),
      note:'Batch Request',
      timestamp:new Date(base+i).toISOString(),
      status:'pending',
      votes:1
    });
  }).filter(function(x){return x.title;});
  if(!items.length){toast('Tidak ada judul lagu yang valid.','error');return;}
  localStorage.setItem('kudajitu_name',name);
  if(typeof busy==='function')busy(button,true,'Menyimpan...');
  try{
    var chunkSize=10,added=0;
    for(var i=0;i<items.length;i+=chunkSize){
      var chunk=items.slice(i,i+chunkSize);
      var result=await sendBatch(chunk);
      if(!result||!result.success)throw new Error(result&&result.message||'Gagal menyimpan batch.');
      added+=Number(result.added||chunk.length);
    }
    area.value='';
    toast(added+' request berhasil disimpan.');
    await loadData(false);
  }catch(error){
    console.error(error);
    toast('Sebagian request mungkin belum tersimpan. Sistem akan menyinkronkan ulang.','error');
    await loadData(false);
  }finally{
    if(typeof busy==='function')busy(button,false);
  }
}

function observeLogin(){
  addRegisterButton();
  var observer=new MutationObserver(function(){
    addRegisterButton();
    patchBatchForm();
  });
  observer.observe(document.body,{childList:true,subtree:true});
  patchBatchForm();
}

window.addEventListener('DOMContentLoaded',function(){
  observeLogin();
});
})();
