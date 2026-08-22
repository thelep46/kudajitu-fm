(function(){'use strict';
/* Stable filter for Request Saya. It follows the main queue tabs but filters only the user's cards. */
let mode='all';
let sectionObserver=null;
let hooked=false;
function section(){return document.getElementById('myRequestsSection');}
function statusOf(el){
  if(!el)return 'waiting';
  const badge=el.querySelector('.myreq-status,.myreq-feature-status');
  const text=(badge?badge.textContent:'').toLowerCase().replace(/\s+/g,' ').trim();
  if(text.includes('ditolak')||text.includes('tolak'))return 'reject';
  if(text.includes('selesai')||text.includes('played'))return 'done';
  if(text.includes('diproses')||text.includes('proses'))return 'process';
  return 'waiting';
}
function wanted(st){
  if(mode==='all')return true;
  if(mode==='waiting')return st==='waiting';
  if(mode==='done')return st==='done';
  return true;
}
function apply(){
  const s=section();
  if(!s)return;
  const feature=s.querySelector('.myreq-feature');
  const cards=Array.from(s.querySelectorAll('.myreq-card'));
  const items=[];
  if(feature)items.push(feature);
  cards.forEach(x=>items.push(x));
  let visible=0;
  items.forEach(el=>{
    const st=statusOf(el);
    el.dataset.filterStatus=st;
    const show=wanted(st);
    el.style.display=show?'':'none';
    if(show)visible++;
  });
  let empty=s.querySelector('.myreq-filter-empty');
  if(mode==='all'){
    if(empty)empty.remove();
    return;
  }
  if(!visible){
    if(!empty){
      empty=document.createElement('div');
      empty.className='myreq-filter-empty';
      empty.style.cssText='padding:14px;text-align:center;color:#64748b;font-size:10px;border:1px dashed #16413e;border-radius:10px;margin-top:8px';
      const list=s.querySelector('.myreq-list');
      if(list)list.appendChild(empty);
      else s.querySelector('.myreq-panel')?.appendChild(empty);
    }
    empty.textContent=mode==='waiting'?'Belum ada request yang masih dalam antrean.':'Belum ada request yang selesai.';
  }else if(empty)empty.remove();
}
function setMode(next){
  mode=next;
  requestAnimationFrame(apply);
}
function hookMainFilter(){
  if(hooked)return;
  if(typeof window.setFilter!=='function')return;
  const original=window.setFilter;
  window.setFilter=function(f){
    original(f);
    if(f==='pending')setMode('waiting');
    else if(f==='played')setMode('done');
    else setMode('all');
    requestAnimationFrame(apply);
  };
  hooked=true;
}
function observeSection(){
  const s=section();
  if(!s||sectionObserver)return;
  sectionObserver=new MutationObserver(function(){requestAnimationFrame(apply);});
  sectionObserver.observe(s,{childList:true});
}
function init(){
  hookMainFilter();
  observeSection();
  setTimeout(function(){hookMainFilter();observeSection();apply();},1200);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
