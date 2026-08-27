(()=>{
'use strict';
const AUTH_ACTIONS=/[?&]action=(?:login|session|logout|adminlogin|adminsession|adminlogout|forgotpassword|changepassword)(?:&|$)/i;
const AUTH_PROXY='/api/auth';
const dash=document.getElementById('dashboard');
const queue=document.getElementById('list');

// Authentication requests no longer use browser JSONP redirects. They go through
// the same-origin Cloudflare Pages Function, which follows Apps Script redirects
// server-side and returns plain JSON. Mutation/data JSONP remains untouched.
if(!window.__kudaAdminAuthProxy&&typeof window.jsonp==='function'){
  const originalJsonp=window.jsonp;
  window.jsonp=function(url,timeout){
    const u=String(url||'');
    if(AUTH_ACTIONS.test(u)){
      const parsed=new URL(u,location.href);
      const params=new URLSearchParams();
      parsed.searchParams.forEach((value,key)=>{
        if(key!=='callback'&&key!=='prefix'&&key!=='_')params.set(key,value);
      });
      const controller=new AbortController();
      const limit=Math.max(10000,Number(timeout)||20000);
      const timer=setTimeout(()=>controller.abort(),limit);
      return fetch(AUTH_PROXY+'?'+params.toString(),{
        method:'GET',
        credentials:'same-origin',
        cache:'no-store',
        signal:controller.signal,
        headers:{'Accept':'application/json'}
      }).then(async r=>{
        let body=null;
        try{body=await r.json()}catch(e){throw Error('Respons auth tidak valid')}
        if(!r.ok||body?.success===false)throw Error(body?.message||'Server auth gagal');
        return body;
      }).catch(e=>{
        if(e?.name==='AbortError')throw Error('Timeout');
        throw e;
      }).finally(()=>clearTimeout(timer));
    }
    return originalJsonp(url,timeout);
  };
  window.__kudaAdminAuthProxy=true;
}

if(!dash||!queue)return;

if(!window.__kudaAdminApiGuard){
  if(typeof window.retry==='function'){
    window.retry=async function(fn,n=3){
      let e;
      for(let i=0;i<n;i++){
        try{return await fn()}
        catch(x){e=x;if(i<n-1)await new Promise(r=>setTimeout(r,2500*Math.pow(2,i)+Math.floor(Math.random()*1200)))}
      }
      throw e;
    };
  }
  window.__kudaAdminApiGuard=true;
}

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

if(typeof window.load==='function'&&!window.__adminLoadGuarded){
  const oldLoad=window.load;
  window.__adminLoadGuarded=true;
  window.load=async function(force=false){
    if(!navigator.onLine){
      if(typeof window.toast==='function')window.toast('Koneksi internet terputus. Data terakhir tetap ditampilkan.',true);
      setNetwork(false);
      return;
    }
    for(let attempt=0;attempt<2;attempt++){
      await oldLoad(force&&attempt===0);
      const info=(document.getElementById('sourceInfo')?.textContent||'').toLowerCase();
      if(!info.includes('gagal sinkronisasi'))return;
      if(attempt===0){
        setNetwork(false);
        await new Promise(r=>setTimeout(r,3500+Math.floor(Math.random()*1500)));
        setNetwork(true);
      }
    }
  };
}

refreshExtras();
})();
