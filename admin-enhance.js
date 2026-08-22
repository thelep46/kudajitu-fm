(()=>{
'use strict';
const boot=()=>{
  const dash=document.getElementById('dashboard');
  const queue=document.getElementById('list');
  if(!dash||!queue)return;

  const statusRow=document.getElementById('sAll')?.parentElement;
  if(statusRow&&!document.getElementById('adminSearch')){
    const wrap=document.createElement('div');
    wrap.className='mt-3 flex flex-col sm:flex-row gap-2';
    wrap.innerHTML='<input id="adminSearch" class="field sm:max-w-sm" placeholder="🔎 Cari judul, penyanyi, atau nama..." autocomplete="off"><span id="adminSearchInfo" class="text-[10px] text-gray-500 self-center"></span>';
    statusRow.parentElement.insertBefore(wrap,statusRow.nextSibling);
    document.getElementById('adminSearch').addEventListener('input',applySearch);
  }

  const stats=dash.querySelector('.grid.grid-cols-3');
  if(stats&&!document.getElementById('activeCountCard')){
    stats.classList.remove('grid-cols-3');
    stats.classList.add('grid-cols-2','sm:grid-cols-4');
    const card=document.createElement('div');
    card.id='activeCountCard';
    card.className='glass rounded-xl p-4';
    card.innerHTML='<span class="text-[10px] text-gray-500 block">AKTIF</span><b id="activeCount" class="text-2xl text-cyan-300">0</b><p class="text-[10px] text-gray-600 mt-1">request sedang antre</p>';
    stats.appendChild(card);
  }

  const qHead=queue.parentElement?.querySelector('h3');
  if(qHead&&!document.getElementById('adminQueueHint')){
    const hint=document.createElement('p');
    hint.id='adminQueueHint';
    hint.className='text-[10px] text-gray-600 mt-1';
    hint.textContent='Gunakan filter status dan pencarian untuk fokus pada request yang sedang ditangani.';
    qHead.parentElement.appendChild(hint);
  }

  function applySearch(){
    const q=(document.getElementById('adminSearch')?.value||'').trim().toLowerCase();
    let count=0;
    queue.querySelectorAll('[data-id]').forEach(el=>{
      const show=!q||(el.textContent||'').toLowerCase().includes(q);
      el.style.display=show?'':'none';
      if(show)count++;
    });
    const info=document.getElementById('adminSearchInfo');
    if(info)info.textContent=q?`${count} hasil`:'';
  }

  function refreshExtras(){
    let active=0;
    queue.querySelectorAll('[data-id]').forEach(el=>{
      if((el.textContent||'').includes('BELUM DIPUTAR'))active++;
    });
    const n=document.getElementById('activeCount');
    if(n)n.textContent=active;
    applySearch();
  }

  if(typeof window.render==='function'&&!window.__adminRenderEnhanced){
    const oldRender=window.render;
    window.__adminRenderEnhanced=true;
    window.render=function(){
      oldRender();
      requestAnimationFrame(refreshExtras);
    };
  }

  // Reliability guard: keep the operator informed when the browser loses connectivity.
  const networkBadge=()=>{
    let el=document.getElementById('adminNetworkStatus');
    if(!el){
      el=document.createElement('span');
      el.id='adminNetworkStatus';
      el.className='hidden text-[10px] px-2 py-1 rounded-full border';
      const source=document.getElementById('sourceInfo');
      source?.appendChild(el);
    }
    return el;
  };
  const setNetwork=(online)=>{
    const el=networkBadge();
    if(!el)return;
    el.classList.remove('hidden','text-red-300','border-red-800','text-teal-300','border-teal-800');
    if(online){
      el.textContent='● Online';
      el.classList.add('text-teal-300','border-teal-800');
      setTimeout(()=>el.classList.add('hidden'),2200);
    }else{
      el.textContent='● Offline';
      el.classList.add('text-red-300','border-red-800');
    }
  };
  window.addEventListener('offline',()=>setNetwork(false));
  window.addEventListener('online',()=>{
    setNetwork(true);
    if(typeof window.load==='function'&&typeof window.token==='function'&&window.token())window.load(false);
  });
  if(!navigator.onLine)setNetwork(false);

  // Prevent accidental duplicate refresh clicks while the native loader is active.
  if(typeof window.load==='function'&&!window.__adminLoadGuarded){
    const oldLoad=window.load;
    window.__adminLoadGuarded=true;
    window.load=async function(force=false){
      if(!navigator.onLine){
        if(typeof window.toast==='function')window.toast('Koneksi internet terputus. Data terakhir tetap ditampilkan.',true);
        setNetwork(false);
        return;
      }
      return oldLoad(force);
    };
  }

  refreshExtras();
};

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();