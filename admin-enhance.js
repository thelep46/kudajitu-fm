(()=>{
'use strict';
const boot=()=>{
  const dash=document.getElementById('dashboard');
  const queue=dash?.querySelector('#list');
  if(!dash||!queue)return;

  // Add a compact search control without changing the existing data/API flow.
  const statusRow=document.getElementById('sAll')?.parentElement;
  if(statusRow && !document.getElementById('adminSearch')){
    const wrap=document.createElement('div');
    wrap.className='mt-3 flex flex-col sm:flex-row gap-2';
    wrap.innerHTML='<input id="adminSearch" class="field sm:max-w-sm" placeholder="🔎 Cari judul, penyanyi, atau nama..." autocomplete="off"><span id="adminSearchInfo" class="text-[10px] text-gray-500 self-center"></span>';
    statusRow.parentElement.insertBefore(wrap,statusRow.nextSibling);
    document.getElementById('adminSearch').addEventListener('input',()=>applySearch());
  }

  // Add a fourth lightweight metric: request baru.
  const stats=dash.querySelector('.grid.grid-cols-3');
  if(stats && !document.getElementById('newCountCard')){
    stats.classList.remove('grid-cols-3');
    stats.classList.add('grid-cols-2','sm:grid-cols-4');
    const card=document.createElement('div');
    card.id='newCountCard';
    card.className='glass rounded-xl p-4';
    card.innerHTML='<span class="text-[10px] text-gray-500 block">REQUEST BARU</span><b id="newCount" class="text-2xl text-cyan-300">0</b><p class="text-[10px] text-gray-600 mt-1">masuk 1 jam terakhir</p>';
    stats.appendChild(card);
  }

  // Improve the queue section heading with a clearer operator hint.
  const qTitle=dash.querySelector('#list')?.previousElementSibling?.previousElementSibling;
  if(qTitle && !document.getElementById('adminQueueHint')){
    const hint=document.createElement('p');
    hint.id='adminQueueHint';
    hint.className='text-[10px] text-gray-600 mt-1';
    hint.textContent='Gunakan filter status untuk fokus pada request yang sedang ditangani.';
    qTitle.parentElement.appendChild(hint);
  }

  window.__adminSearchQuery='';
  window.applySearch=()=>{
    const q=(document.getElementById('adminSearch')?.value||'').trim().toLowerCase();
    window.__adminSearchQuery=q;
    const rows=Array.isArray(window.data)?window.data:[];
    const visibleFn=typeof window.visible==='function'?window.visible:null;
    let count=0;
    queue.querySelectorAll('[data-id]').forEach(el=>{
      const id=el.getAttribute('data-id');
      const r=rows.find(x=>String(x.id)===String(id));
      const hay=r?[r.title,r.artist,r.requester,r.note].join(' ').toLowerCase():'';
      const show=!q||hay.includes(q);
      el.style.display=show?'':'none';
      if(show)count++;
    });
    const info=document.getElementById('adminSearchInfo');
    if(info)info.textContent=q?`${count} hasil`:'';
  };

  const oldRender=window.render;
  if(typeof oldRender==='function'&&!window.__adminRenderEnhanced){
    window.__adminRenderEnhanced=true;
    window.render=function(){
      oldRender();
      const rows=Array.isArray(window.data)?window.data:[];
      const now=Date.now();
      const fresh=rows.filter(r=>r.status==='pending' && (now-(new Date(r.timestamp).getTime()||now))<3600000).length;
      const n=document.getElementById('newCount');
      if(n)n.textContent=fresh;
      setTimeout(()=>window.applySearch?.(),0);
    };
  }
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();