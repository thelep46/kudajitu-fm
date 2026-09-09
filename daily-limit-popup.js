(function(){
  'use strict';
  if(window.__KUDAJITU_DAILY_LIMIT_POPUP_LOADED)return;
  window.__KUDAJITU_DAILY_LIMIT_POPUP_LOADED=true;

  const STYLE_ID='kudaDailyLimitPopupStyle';
  let cache={userId:'',limit:0,used:0,remaining:0,unlimited:true,at:0};
  let busy=false;

  function $(id){return document.getElementById(id)}
  function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}

  function injectStyle(){
    if($(STYLE_ID))return;
    const s=document.createElement('style');
    s.id=STYLE_ID;
    s.textContent=`
      .kuda-quota-badge{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 12px;padding:9px 12px;border:1px solid rgba(20,184,166,.18);border-radius:11px;background:rgba(3,10,12,.58);font-size:10px;color:#64748b}
      .kuda-quota-badge b{color:#5eead4;font-weight:900}
      .kuda-quota-badge.warn{border-color:rgba(245,158,11,.3)}.kuda-quota-badge.warn b{color:#fbbf24}
      .kuda-quota-badge.full{border-color:rgba(239,68,68,.35)}.kuda-quota-badge.full b{color:#fca5a5}
      .kuda-limit-backdrop{position:fixed;inset:0;z-index:3000;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(0,0,0,.82);backdrop-filter:blur(9px);animation:kudaLimitFade .16s ease}
      .kuda-limit-card{width:min(390px,100%);background:#071719;border:1px solid rgba(45,212,191,.24);border-radius:22px;padding:24px;box-shadow:0 30px 100px rgba(0,0,0,.72);text-align:center;animation:kudaLimitPop .2s ease}
      .kuda-limit-icon{width:64px;height:64px;border-radius:18px;margin:0 auto 14px;display:flex;align-items:center;justify-content:center;background:#2a0b0b;border:1px solid #7f1d1d;font-size:28px;box-shadow:0 0 30px rgba(239,68,68,.12)}
      .kuda-limit-title{font-size:18px;font-weight:900;color:#fff}.kuda-limit-text{font-size:11px;line-height:1.7;color:#94a3b8;margin-top:8px}.kuda-limit-count{margin-top:13px;padding:11px 12px;border-radius:12px;background:#030a0c;border:1px solid #115e59;color:#cbd5e1;font-size:11px}.kuda-limit-count b{color:#fca5a5}.kuda-limit-note{font-size:10px;color:#64748b;margin-top:10px}.kuda-limit-ok{width:100%;margin-top:17px;border:0;border-radius:11px;padding:12px;background:linear-gradient(90deg,#0d9488,#2dd4bf);color:#031012;font-weight:900;cursor:pointer}.kuda-limit-ok:hover{filter:brightness(1.08)}
      @keyframes kudaLimitFade{from{opacity:0}to{opacity:1}}@keyframes kudaLimitPop{from{opacity:0;transform:translateY(8px) scale(.97)}to{opacity:1;transform:none}}
      @media(prefers-reduced-motion:reduce){.kuda-limit-backdrop,.kuda-limit-card{animation:none}}
    `;
    document.head.appendChild(s);
  }

  function startOfTodayJakarta(){
    const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const y=p.find(x=>x.type==='year')?.value,m=p.find(x=>x.type==='month')?.value,d=p.find(x=>x.type==='day')?.value;
    return new Date(`${y}-${m}-${d}T00:00:00+07:00`);
  }

  async function getClient(){
    const api=window.KUDAJITU_SUPABASE;
    if(api?.getClient){const c=api.getClient();if(c)return c}
    if(window.supabase?.createClient)return window.supabase.createClient('https://jdqcvfqysmjreibcaduk.supabase.co','sb_publishable_QDcyGfH-3dBNmUYE9pKIkg_uFmRsmOa');
    return null;
  }

  async function quota(force){
    const now=Date.now();
    if(!force&&cache.at&&now-cache.at<5000)return cache;
    const c=await getClient();
    if(!c)return null;
    const session=(await c.auth.getSession()).data?.session;
    const user=session?.user;
    if(!user){cache={userId:'',limit:0,used:0,remaining:0,unlimited:true,at:now};return cache}
    const {data:p,error:pe}=await c.from('user_profiles').select('daily_request_limit').eq('id',user.id).maybeSingle();
    if(pe)throw pe;
    const limit=Number(p?.daily_request_limit||0);
    if(limit<=0){cache={userId:user.id,limit:0,used:0,remaining:0,unlimited:true,at:now};return cache}
    const start=startOfTodayJakarta();
    const {count,error}=await c.from('requests').select('id',{count:'exact',head:true}).eq('created_by',user.id).gte('created_at',start.toISOString());
    if(error)throw error;
    const used=Number(count||0),remaining=Math.max(0,limit-used);
    cache={userId:user.id,limit,used,remaining,unlimited:false,at:now};
    return cache;
  }

  function popup(title,text,used,limit){
    injectStyle();
    document.querySelector('.kuda-limit-backdrop')?.remove();
    const m=document.createElement('div');m.className='kuda-limit-backdrop';
    m.innerHTML=`<div class="kuda-limit-card" role="dialog" aria-modal="true" aria-labelledby="kudaLimitTitle"><div class="kuda-limit-icon">🚫</div><div id="kudaLimitTitle" class="kuda-limit-title">${esc(title)}</div><div class="kuda-limit-text">${esc(text)}</div><div class="kuda-limit-count">Request hari ini: <b>${used} / ${limit}</b></div><div class="kuda-limit-note">Kuota akan reset otomatis besok pukul 00:00 WIB.</div><button type="button" class="kuda-limit-ok">Mengerti</button></div>`;
    document.body.appendChild(m);
    const close=()=>m.remove();m.querySelector('.kuda-limit-ok').onclick=close;m.addEventListener('click',e=>{if(e.target===m)close()});
  }

  function quotaBadge(q){
    const form=document.getElementById('singleForm');
    if(!form||!q)return;
    let b=$('kudaQuotaBadge');
    if(!b){b=document.createElement('div');b.id='kudaQuotaBadge';form.parentNode?.insertBefore(b,form)}
    b.className='kuda-quota-badge'+(q.unlimited?'':q.remaining<=0?' full':q.remaining<=Math.max(1,Math.ceil(q.limit*.2))?' warn':'');
    if(q.unlimited)b.innerHTML='<span>Kuota request hari ini</span><b>∞ Unlimited</b>';
    else b.innerHTML=`<span>Request hari ini</span><b>${q.used} / ${q.limit} • tersisa ${q.remaining}</b>`;
  }

  async function check(count){
    try{
      const q=await quota(true);
      if(!q||q.unlimited)return true;
      quotaBadge(q);
      if(q.remaining<=0){popup('Batas Request Harian Tercapai',`Kamu sudah mencapai batas ${q.limit} request lagu hari ini. Silakan coba lagi besok.`,q.used,q.limit);return false}
      if(Number(count)>q.remaining){popup('Request Melebihi Sisa Kuota',`Kamu mencoba mengirim ${count} lagu, tetapi sisa kuotamu hanya ${q.remaining} request hari ini.`,q.used,q.limit);return false}
      return true;
    }catch(e){console.warn('[Kudajitu] daily limit check:',e?.message||e);return true}
  }

  function batchCount(){
    const builder=$('batchBuilder');
    if(builder){
      return Array.from(builder.querySelectorAll('[data-batch-field="title"]')).filter(i=>String(i.value||'').trim()).length;
    }
    const raw=$('batch')?.value||'';
    return raw.split(/\r?\n/).map(x=>x.trim()).filter(Boolean).length;
  }

  function bind(){
    if(window.__KUDAJITU_DAILY_LIMIT_POPUP_BOUND)return;
    const bindButtons=()=>{
      const s=$('sendBtn'),b=$('batchBtn');
      if(s&&!s.dataset.dailyLimitBound){s.dataset.dailyLimitBound='1';s.addEventListener('click',async e=>{if(busy)return;busy=true;const ok=await check(1);busy=false;if(!ok){e.preventDefault();e.stopImmediatePropagation()}},true)}
      if(b&&!b.dataset.dailyLimitBound){b.dataset.dailyLimitBound='1';b.addEventListener('click',async e=>{if(busy)return;busy=true;const n=Math.max(1,batchCount());const ok=await check(n);busy=false;if(!ok){e.preventDefault();e.stopImmediatePropagation()}},true)}
    };
    const observer=new MutationObserver(bindButtons);observer.observe(document.body,{childList:true,subtree:true});bindButtons();window.__KUDAJITU_DAILY_LIMIT_POPUP_BOUND=true;
    setInterval(async()=>{try{const q=await quota(false);if(q)quotaBadge(q)}catch(_){ }},10000);
    setInterval(bindButtons,1500);
  }

  function boot(){injectStyle();bind();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
