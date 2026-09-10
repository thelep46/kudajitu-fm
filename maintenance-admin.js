(function(){
  'use strict';
  const URL='https://jdqcvfqysmjreibcaduk.supabase.co';
  const KEY='sb_publishable_QDcyGfH-3dBNmUYE9pKIkg_uFmRsmOa';
  let db=null, modal=null;

  function client(){
    if(db)return db;
    if(!window.supabase?.createClient)throw Error('Supabase JS belum dimuat.');
    db=window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    return db;
  }

  function css(){
    if(document.getElementById('maintenance-admin-css'))return;
    const s=document.createElement('style');s.id='maintenance-admin-css';
    s.textContent='.maint-overlay{position:fixed;inset:0;z-index:1000;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(0,0,0,.72);backdrop-filter:blur(8px)}.maint-modal{width:min(460px,100%);background:#071114;border:1px solid rgba(45,212,191,.22);border-radius:22px;padding:22px;box-shadow:0 24px 80px rgba(0,0,0,.45)}.maint-modal h3{margin:0;font-size:18px;font-weight:900}.maint-modal p{margin:6px 0 16px;color:#9ca3af;font-size:12px;line-height:1.5}.maint-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px;border:1px solid rgba(45,212,191,.14);border-radius:14px;background:#030a0c}.maint-status{font-size:12px;font-weight:800}.maint-switch{appearance:none;width:48px;height:26px;border-radius:999px;background:#374151;position:relative;cursor:pointer;outline:none}.maint-switch:before{content:"";position:absolute;width:20px;height:20px;left:3px;top:3px;border-radius:50%;background:white;transition:.18s}.maint-switch:checked{background:#dc2626}.maint-switch:checked:before{transform:translateX(22px)}.maint-field{width:100%;min-height:96px;margin-top:12px;background:#030a0c;color:#fff;border:1px solid #134e4a;border-radius:12px;padding:11px;resize:vertical;outline:0;font:inherit;font-size:12px}.maint-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:14px}.maint-btn{border:1px solid #164e4a;background:#0b1618;color:#fff;border-radius:10px;padding:9px 13px;font-size:12px;font-weight:800;cursor:pointer}.maint-btn.primary{background:#0d9488;border-color:#0d9488}.maint-btn.danger{background:#991b1b;border-color:#991b1b}.maint-msg{min-height:18px;margin-top:10px;font-size:11px;color:#fca5a5}.maint-open{display:flex!important}';
    document.head.appendChild(s);
  }

  function build(){
    css();
    const panel=document.querySelector('.menu-panel');
    if(panel&&!panel.querySelector('[data-maintenance-admin]')){
      const b=document.createElement('button');b.type='button';b.className='menu-link';b.dataset.maintenanceAdmin='1';b.textContent='🛠 Maintenance';b.addEventListener('click',open);panel.appendChild(b);
    }
    if(document.getElementById('maintenance-admin-overlay'))return;
    const o=document.createElement('div');o.id='maintenance-admin-overlay';o.className='maint-overlay';o.innerHTML='<div class="maint-modal" role="dialog" aria-modal="true" aria-labelledby="maint-title"><h3 id="maint-title">🛠 Maintenance Website</h3><p>Kontrol akses website publik tanpa mengganggu Player dan Admin.</p><div class="maint-row"><div><div class="maint-status" id="maint-status">Memuat status...</div><div style="font-size:10px;color:#6b7280;margin-top:3px">User publik akan diarahkan ke halaman maintenance saat aktif.</div></div><input id="maint-switch" class="maint-switch" type="checkbox" aria-label="Aktifkan maintenance"></div><textarea id="maint-message" class="maint-field" maxlength="500" placeholder="Pesan maintenance untuk pengunjung"></textarea><div id="maint-msg" class="maint-msg"></div><div class="maint-actions"><button class="maint-btn" type="button" id="maint-cancel">Batal</button><button class="maint-btn primary" type="button" id="maint-save">Simpan</button></div></div>';
    document.body.appendChild(o);modal=o;
    o.addEventListener('click',e=>{if(e.target===o)close()});
    o.querySelector('#maint-cancel').onclick=close;
    o.querySelector('#maint-save').onclick=save;
    o.querySelector('#maint-switch').onchange=renderStatus;
  }

  async function read(){
    const c=client();const {data,error}=await c.rpc('get_maintenance_setting');
    if(error)throw error;return data||{enabled:false};
  }

  async function open(e){
    e?.preventDefault();e?.stopPropagation();
    build();modal.classList.add('maint-open');setMsg('Memuat status...');
    try{const v=await read();modal.querySelector('#maint-switch').checked=!!v.enabled;modal.querySelector('#maint-message').value=String(v.message||'');renderStatus();}
    catch(err){setMsg('Gagal memuat: '+(err?.message||err),true)}
  }
  function close(){if(modal)modal.classList.remove('maint-open')}
  function renderStatus(){const on=!!modal?.querySelector('#maint-switch')?.checked;const s=modal?.querySelector('#maint-status');if(s){s.textContent=on?'🔴 Maintenance AKTIF':'🟢 Website NORMAL';s.style.color=on?'#fca5a5':'#86efac'}}
  function setMsg(v,error=false){const e=modal?.querySelector('#maint-msg');if(e){e.textContent=v||'';e.style.color=error?'#fca5a5':'#86efac'}}
  async function save(){
    const btn=modal.querySelector('#maint-save'),sw=modal.querySelector('#maint-switch'),message=modal.querySelector('#maint-message');
    btn.disabled=true;btn.textContent='Menyimpan...';setMsg('');
    try{
      const {data,error}=await client().rpc('set_maintenance_setting',{p_enabled:!!sw.checked,p_message:message.value});
      if(error)throw error;
      sw.checked=!!data?.enabled;message.value=String(data?.message||message.value);renderStatus();setMsg(sw.checked?'Maintenance berhasil AKTIF.':'Maintenance berhasil DINONAKTIFKAN.');
      setTimeout(close,700);
    }catch(err){setMsg('Gagal menyimpan: '+(err?.message||err),true)}finally{btn.disabled=false;btn.textContent='Simpan'}
  }

  function init(){build();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
