(function(){
  'use strict';
  if(location.pathname!=='/youtube-mapping'&&location.pathname!=='/youtube-mapping.html')return;

  function getClient(){
    return globalThis.supabase?.createClient?.(
      'https://jdqcvfqysmjreibcaduk.supabase.co',
      'sb_publishable_QDcyGfH-3dBNmUYE9pKIkg_uFmRsmOa',
      {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}
    );
  }
  async function adminApi(action,payload={}){
    const c=getClient();
    if(!c)throw Error('Supabase JS belum siap.');
    const {data,error}=await c.auth.getSession();
    if(error||!data?.session?.access_token)throw Error('LOGIN_REQUIRED');
    const r=await fetch('https://jdqcvfqysmjreibcaduk.supabase.co/functions/v1/kudajitu-admin-v4',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+data.session.access_token,'apikey':'sb_publishable_QDcyGfH-3dBNmUYE9pKIkg_uFmRsmOa'},
      body:JSON.stringify({action,...payload}),cache:'no-store'
    });
    const out=await r.json().catch(()=>null);
    if(!r.ok||!out?.success)throw Error(out?.message||'Server Admin gagal.');
    return out;
  }
  function setForm(x){
    const title=document.getElementById('title'),artist=document.getElementById('artist'),video=document.getElementById('video'),oldKey=document.getElementById('oldKey');
    if(title)title.value=x?.title||'';
    if(artist)artist.value=x?.artist||'';
    if(video)video.value=x?.videoId||'';
    if(oldKey)oldKey.value=x?.id||'';
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function mapFromKey(k){
    const list=Array.isArray(window.maps)?window.maps:[];
    return list.find(x=>String(x?.key||'')===String(k||''))||null;
  }
  window.edit=function(x){setForm(x)};
  window.del=async function(k){
    if(!confirm('Hapus mapping ini?'))return;
    try{
      const row=mapFromKey(k);
      const id=String(row?.id||'').trim();
      if(!id)throw Error('ID mapping tidak ditemukan. Silakan refresh halaman.');
      await adminApi('deleteyoutubemapping',{id});
      if(typeof window.toast==='function')window.toast('Mapping dihapus.');
      if(typeof window.load==='function')await window.load();
    }catch(e){
      if(typeof window.toast==='function')window.toast('Gagal menghapus: '+(e?.message||e),true);
    }
  };
  window.save=async function(){
    const title=(document.getElementById('title')?.value||'').trim();
    const artist=(document.getElementById('artist')?.value||'').trim();
    const raw=(document.getElementById('video')?.value||'').trim();
    const existingId=(document.getElementById('oldKey')?.value||'').trim();
    let video='';
    try{
      const u=new URL(raw);
      const host=u.hostname.toLowerCase().replace(/^www\./,'');
      if(host==='youtu.be')video=u.pathname.split('/').filter(Boolean)[0]||'';
      else if(['youtube.com','m.youtube.com','music.youtube.com'].includes(host)){
        video=u.searchParams.get('v')||'';
        if(!video){const p=u.pathname.split('/').filter(Boolean);if(['shorts','embed','live'].includes(p[0]))video=p[1]||'';}
      }
    }catch(_){ }
    if(!video&&/^[A-Za-z0-9_-]{11}$/.test(raw))video=raw;
    if(!title||!artist||!/^[A-Za-z0-9_-]{11}$/.test(video)){
      const msg=document.getElementById('formMsg');if(msg)msg.textContent='Judul, penyanyi, dan Video ID YouTube valid wajib diisi.';return;
    }
    const btn=document.getElementById('saveBtn');
    if(btn){btn.disabled=true;btn.textContent='⏳ Menyimpan…';}
    try{
      await adminApi('saveyoutubemapping',{id:existingId,title,artist,videoId:video});
      document.getElementById('oldKey').value='';
      document.getElementById('title').value='';
      document.getElementById('artist').value='';
      document.getElementById('video').value='';
      const msg=document.getElementById('formMsg');if(msg)msg.textContent=existingId?'Mapping berhasil diperbarui.':'Mapping berhasil disimpan.';
      if(typeof window.toast==='function')window.toast(existingId?'Mapping berhasil diperbarui.':'Mapping berhasil disimpan.');
      if(typeof window.load==='function')await window.load();
    }catch(e){
      const msg=document.getElementById('formMsg');if(msg)msg.textContent='Gagal: '+(e?.message||e);
      if(typeof window.toast==='function')window.toast('Gagal menyimpan mapping.',true);
    }finally{
      if(btn){btn.disabled=false;btn.textContent='💾 Simpan Mapping';}
    }
  };
  function bind(){
    const saveBtn=document.getElementById('saveBtn');
    if(saveBtn){saveBtn.onclick=window.save;saveBtn.dataset.idSafeFix='1';}
    document.querySelectorAll('[data-edit]').forEach(b=>{b.onclick=()=>window.edit(JSON.parse(decodeURIComponent(b.dataset.edit)))});
    document.querySelectorAll('[data-del]').forEach(b=>{b.onclick=()=>window.del(b.dataset.del)});
  }
  function observe(){
    bind();
    const list=document.getElementById('list');
    if(list&&window.MutationObserver){new MutationObserver(bind).observe(list,{childList:true,subtree:true});}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',observe,{once:true});else observe();
})();
