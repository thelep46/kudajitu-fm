(function(){'use strict';
// Safe filter controller: deliberately avoids MutationObserver/setInterval loops.
const state={mode:'all'};
function statusOf(el){const t=(el&&el.innerText||'').toLowerCase();if(t.includes('ditolak')||t.includes('tolak'))return'reject';if(t.includes('selesai'))return'done';if(t.includes('diproses')||t.includes('proses'))return'process';return'waiting';}
function apply(){const section=document.getElementById('myRequestsSection');if(!section)return;const cards=Array.from(section.querySelectorAll('.myreq-card'));const feature=section.querySelector('.myreq-feature');const items=feature?[feature,...cards]:cards;function show(el){if(!el)return;const s=statusOf(el);const ok=state.mode==='all'||(state.mode==='waiting'&&s==='waiting')||(state.mode==='done'&&s==='done');el.style.display=ok?'':'none';}
items.forEach(show);let empty=section.querySelector('.myreq-filter-empty');const visible=items.filter(el=>el&&el.style.display!=='none').length;if(!visible){if(!empty){empty=document.createElement('div');empty.className='myreq-filter-empty';empty.style='padding:14px;text-align:center;color:#64748b;font-size:10px;border:1px dashed #16413e;border-radius:10px;margin-top:8px;';const list=section.querySelector('.myreq-list')||section.querySelector('.myreq-panel');if(list)list.appendChild(empty);}empty.textContent=state.mode==='waiting'?'Belum ada request yang masih dalam antrean.':'Belum ada request yang selesai.';}else if(empty)empty.remove();}
function setMode(mode){state.mode=mode;apply();}
function labelOf(el){return (el.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();}
function handleClick(e){let el=e.target;for(let i=0;i<6&&el;i++,el=el.parentElement){const t=labelOf(el);if(t!=='semua'&&t!=='antrean'&&t!=='selesai')continue;const section=document.getElementById('myRequestsSection');if(!section)continue;if(!section.parentElement||!section.parentElement.parentElement||!section.parentElement.parentElement.contains(el))continue;if(t==='semua')setMode('all');else if(t==='antrean')setMode('waiting');else setMode('done');return;}}
function init(){document.addEventListener('click',handleClick,true);setTimeout(apply,1200);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
