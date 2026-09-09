(function(){
  'use strict';
  if(window.__KUDAJITU_DAILY_LIMIT_LOADED)return;
  window.__KUDAJITU_DAILY_LIMIT_LOADED=true;

  function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
  function userByRow(row){
    const m=row.querySelector('.text-xs.text-gray-400');
    const hit=m?.textContent?.match(/@(.+)/);
    const username=(hit?.[1]||'').trim().toLowerCase();
    return (typeof users!=='undefined'?users:[]).find(u=>String(u.username||'').toLowerCase()===username);
  }
  function injectStyle(){
    if(document.getElementById('dailyLimitStyle'))return;
    const s=document.createElement('style');s.id='dailyLimitStyle';
    s.textContent=`
      .daily-limit-wrap{display:flex;align-items:center;justify-content:space-between;gap:10px;padding-top:8px;border-top:1px solid rgba(20,184,166,.08)}
      .daily-limit-info{font-size:10px;color:#64748b}.daily-limit-info b{color:#5eead4}
      .daily-limit-btn{border:1px solid rgba(20,184,166,.38);background:#062322;color:#99f6e4;border-radius:.7rem;padding:.55rem .75rem;font-size:.68rem;font-weight:900;cursor:pointer;transition:.14s}
      .daily-limit-btn:hover{background:#0b3434;border-color:#2dd4bf;transform:translateY(-1px)}
      .daily-limit-modal{position:fixed;inset:0;z-index:1200;background:rgba(0,0,0,.78);backdrop-filter:blur(7px);display:flex;align-items:center;justify-content:center;padding:16px}
      .daily-limit-box{width:min(420px,100%);background:#071719;border:1px solid rgba(45,212,191,.25);border-radius:20px;padding:20px;box-shadow:0 30px 100px rgba(0,0,0,.65)}
      .daily-limit-presets{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:14px 0}.daily-limit-preset{border:1px solid #115e59;background:#030a0c;color:#cbd5e1;border-radius:10px;padding:10px 8px;font-size:11px;font-weight:900;cursor:pointer}.daily-limit-preset.active,.daily-limit-preset:hover{background:#0d9488;border-color:#2dd4bf;color:#fff}
      .daily-limit-input{width:100%;box-sizing:border-box;background:#030a0c;border:1px solid #115e59;border-radius:10px;padding:11px 12px;color:#fff;outline:none}.daily-limit-input:focus{border-color:#2dd4bf}
      .daily-limit-actions{display:flex;gap:8px;margin-top:14px}.daily-limit-actions button{flex:1;border:0;border-radius:10px;padding:11px;font-weight:900;cursor:pointer}.daily-limit-cancel{background:#123033;color:#cbd5e1}.daily-limit-save{background:#0d9488;color:#fff}
      @media(max-width:520px){.daily-limit-presets{grid-template-columns:repeat(3,minmax(0,1fr))}.daily-limit-wrap{align-items:flex-start;flex-direction:column}}
    `;
    document.head.appendChild(s)
  }
  function openModal(u){
    injectStyle();
    document.getElementById('dailyLimitModal')?.remove();
    const current=Number(u.dailyRequestLimit||0);
    const m=document.createElement('div');m.id='dailyLimitModal';m.className='daily-limit-modal';
    m.innerHTML=`<div class="daily-limit-box">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
        <div><div style="font-size:15px;font-weight:900;color:#fff">Atur Batas Harian</div><div style="font-size:10px;color:#64748b;margin-top:4px">@${esc(u.username)} • jumlah request lagu per hari</div></div>
        <button id="dlx" type="button" style="border:1px solid #334155;background:#071719;color:#94a3b8;border-radius:9px;width:32px;height:32px;cursor:pointer">✕</button>
      </div>
      <div style="font-size:10px;color:#64748b;margin-top:16px">Preset cepat</div>
      <div class="daily-limit-presets">${[10,15,20,30,50,100,200,0].map(v=>`<button type="button" class="daily-limit-preset ${v===current?'active':''}" data-value="${v}">${v===0?'∞ Unlimited':v}</button>`).join('')}</div>
      <div style="font-size:10px;color:#64748b;margin-bottom:6px">Atau masukkan jumlah sendiri (0 = unlimited)</div>
      <input id="dailyLimitInput" class="daily-limit-input" type="number" min="0" max="100000" step="1" value="${current}" inputmode="numeric" placeholder="Contoh: 25">
      <div id="dailyLimitMsg" style="min-height:18px;font-size:10px;color:#f87171;margin-top:7px"></div>
      <div class="daily-limit-actions"><button id="dailyLimitCancel" type="button" class="daily-limit-cancel">Batal</button><button id="dailyLimitSave" type="button" class="daily-limit-save">Simpan Batas</button></div>
    </div>`;
    document.body.appendChild(m);
    const input=m.querySelector('#dailyLimitInput'),msg=m.querySelector('#dailyLimitMsg');
    m.querySelector('#dlx').onclick=()=>m.remove();m.querySelector('#dailyLimitCancel').onclick=()=>m.remove();
    m.addEventListener('click',e=>{if(e.target===m)m.remove()});
    m.querySelectorAll('.daily-limit-preset').forEach(b=>b.addEventListener('click',()=>{m.querySelectorAll('.daily-limit-preset').forEach(x=>x.classList.remove('active'));b.classList.add('active');input.value=b.dataset.value}));
    m.querySelector('#dailyLimitSave').onclick=async()=>{
      const limit=Number(input.value);
      if(!Number.isInteger(limit)||limit<0||limit>100000){msg.textContent='Masukkan angka 0 sampai 100000.';return}
      const save=m.querySelector('#dailyLimitSave');save.disabled=true;save.textContent='Menyimpan...';msg.textContent='';
      try{const r=await adminCall('setrequestlimit',{id:u.id,limit});u.dailyRequestLimit=limit;m.remove();toast(r.message||'Batas harian diperbarui.');render()}catch(e){msg.textContent=e?.message||'Gagal menyimpan batas.';save.disabled=false;save.textContent='Simpan Batas'}
    };
    input.focus();input.select();
  }
  function decorate(){
    const list=document.getElementById('list');if(!list)return;
    injectStyle();
    list.querySelectorAll('.row').forEach(row=>{
      if(row.dataset.dailyLimitReady)return;
      const u=userByRow(row);if(!u)return;
      const actions=row.querySelector('.flex.flex-wrap.gap-2');if(!actions)return;
      row.dataset.dailyLimitReady='1';
      const btn=document.createElement('button');btn.type='button';btn.className='daily-limit-btn';btn.textContent='⚙ Atur Batas';btn.title='Atur batas request lagu harian';btn.onclick=()=>openModal(u);actions.appendChild(btn);
      const wrap=document.createElement('div');wrap.className='daily-limit-wrap';const limit=Number(u.dailyRequestLimit||0);wrap.innerHTML=`<div class="daily-limit-info">Batas request harian: <b>${limit<=0?'Unlimited':limit+' lagu / hari'}</b></div><span style="font-size:9px;color:#475569">Admin</span>`;row.appendChild(wrap);
    });
  }
  function patch(){
    if(typeof window.render!=='function'||window.__KUDAJITU_DAILY_LIMIT_RENDER_PATCHED)return;
    const original=window.render;window.render=function(){const r=original.apply(this,arguments);requestAnimationFrame(decorate);return r};window.__KUDAJITU_DAILY_LIMIT_RENDER_PATCHED=true;requestAnimationFrame(decorate)
  }
  let tries=0;const timer=setInterval(()=>{patch();if(window.__KUDAJITU_DAILY_LIMIT_RENDER_PATCHED||++tries>80)clearInterval(timer)},100);
})();
