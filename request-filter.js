(function(){'use strict';
/* Safe Request Saya filter: no MutationObserver, no interval, no capture-phase DOM loop. */
let mode='all';
let scheduled=false;
function statusOf(el){const t=(el&&el.textContent||'').toLowerCase();if(t.includes('ditolak')||t.includes('tolak'))return'reject';if(t.includes('selesai'))return'done';if(t.includes('diproses')||t.includes('proses'))return'process';return'waiting';}
function apply(){scheduled=false;const section=document.getElementById('myRequestsSection');if(!section)return;const feature=section.querySelector('.myreq-feature');const cards=section.querySelectorAll('.myreq-card');const match=el=>{const s=statusOf(el);return mode==='all'||(mode==='waiting'&&s==='waiting')||(mode==='done'&&s==='done');};if(feature)feature.style.display=match(feature)?'':'none';for(let i=0;i<cards.length;i++)cards[i].style.display=match(cards[i])?'':'none';let empty=section.querySelector('.myreq-filter-empty');let visible=(feature&&feature.style.display!=='none'?1:0);for(let i=0;i<cards.length;i++)if(cards[i].style.display!=='none')visible++;if(!visible){if(!empty){empty=document.createElement('div');empty.className='myreq-filter-empty';empty.style='padding:14px;text-align:center;color:#64748b;font-size:10px;border:1px dashed #16413e;border-radius:10px;margin-top:8px;';const list=section.querySelector('.myreq-list');if(list)list.appendChild(empty);}if(empty)empty.textContent=mode==='waiting'?'Belum ada request yang masih dalam antrean.':'Belum ada request yang selesai.';}else if(empty)empty.remove();}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(apply);}
function setMode(next){mode=next;schedule();}
function handleClick(e){const btn=e.target&&e.target.closest?e.target.closest('button'):null;if(!btn||btn.closest('#myRequestsSection'))return;const label=(btn.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();if(label==='semua')setMode('all');else if(label==='antrean')setMode('waiting');else if(label==='selesai')setMode('done');}
function init(){document.addEventListener('click',handleClick,false);schedule();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
