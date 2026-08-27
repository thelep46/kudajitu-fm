(function(){
'use strict';
/* Stable request helpers: unlimited batch + YouTube link field for single requests. */
let mode='all';
let sectionObserver=null;
let hooked=false;
let batchHooked=false;
let youtubeHooked=false;
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
function setMode(next){mode=next;requestAnimationFrame(apply);}
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
function parseBatchLines(raw){
  return String(raw||'').split(/\r?\n/).map(function(x){return x.trim()}).filter(Boolean);
}
function enc(v){return encodeURIComponent(String(v==null?'':v));}
function makeItems(lines,name){
  const base=Date.now();
  return lines.map(function(line,i){
    const parts=line.split('-');
    return {
      id:'req_'+(base+i)+'_'+Math.random().toString(36).slice(2,8),
      requester:name,
      title:(parts[0]||'').trim(),
      artist:(parts.length>1?parts.slice(1).join('-').trim():'Unknown Artist'),
      note:'Batch Request',
      timestamp:new Date(base+i).toISOString(),
      status:'pending',
      votes:1
    };
  });
}
function sendChunk(items){
  if(typeof window.jsonp!=='function')return Promise.reject(new Error('API belum siap.'));
  return window.jsonp((window.GAS||'https://script.google.com/macros/s/AKfycbyUB8drjL1dSJedYjKIKjVc5gzIE3Pe-QS0FF8o1_zU4NkAweGLFquhHLfy1Nt_eITA-Q/exec')+'?action=addBatch&items='+enc(JSON.stringify(items)),25000);
}
async function sendUnlimited(items){
  const chunkSize=10;
  let added=0,existing=0;
  for(let i=0;i<items.length;i+=chunkSize){
    const chunk=items.slice(i,i+chunkSize);
    let result;
    if(typeof window.withRetry==='function')result=await window.withRetry(function(){return sendChunk(chunk);},3);
    else result=await sendChunk(chunk);
    if(!result||result.success===false)throw new Error(result&&result.message||'Batch gagal disimpan.');
    added+=Number(result.added||0);
    existing+=Number(result.existing||0);
  }
  return {success:true,added:added,existing:existing,count:items.length};
}
function installUnlimitedBatch(){
  if(batchHooked)return;
  if(typeof window.addBatch!=='function')return;
  window.addBatch=async function(event){
    if(event&&event.preventDefault)event.preventDefault();
    const nameEl=document.getElementById('name');
    const batchEl=document.getElementById('batch');
    const button=document.getElementById('batchBtn');
    const name=nameEl?nameEl.value.trim():'';
    const raw=batchEl?batchEl.value.trim():'';
    if(!name||!raw){if(typeof window.toast==='function')window.toast('Nama dan daftar lagu wajib diisi.','error');return;}
    const lines=parseBatchLines(raw);
    if(!lines.length){if(typeof window.toast==='function')window.toast('Daftar lagu kosong.','error');return;}
    if(typeof window.canSubmit==='function'&&!window.canSubmit(lines.length))return;
    if(button&&typeof window.busy==='function')window.busy(button,true,'Menyimpan '+lines.length+' lagu...');
    window.lastSubmit=Date.now();
    try{
      localStorage.setItem('kudajitu_name',name);
      const items=makeItems(lines,name);
      const result=await sendUnlimited(items);
      if(batchEl)batchEl.value='';
      if(typeof window.toast==='function')window.toast(result.added+' request berhasil disimpan.');
      if(typeof window.loadData==='function')await window.loadData(false);
    }catch(error){
      console.error('Unlimited batch:',error);
      if(typeof window.toast==='function')window.toast(error.message||'Request batch gagal disimpan.','error');
      if(typeof window.loadData==='function')await window.loadData(false);
    }finally{
      if(button&&typeof window.busy==='function')window.busy(button,false);
    }
  };
  const batch=document.getElementById('batch');
  if(batch)batch.removeAttribute('maxlength');
  const form=document.getElementById('batchForm');
  if(form){
    const hint=form.querySelector('p');
    if(hint)hint.textContent='Satu lagu per baris. Jumlah lagu tidak dibatasi.';
  }
  batchHooked=true;
}
function youtubeVideoId(value){
  const raw=String(value||'').trim();
  if(!raw)return '';
  try{
    const u=new URL(raw);
    const host=u.hostname.toLowerCase().replace(/^www\./,'');
    if(host==='youtu.be')return (u.pathname.split('/').filter(Boolean)[0]||'').slice(0,20);
    if(host==='youtube.com'||host==='m.youtube.com'||host==='music.youtube.com'){
      if(u.searchParams.get('v'))return u.searchParams.get('v').slice(0,20);
      const parts=u.pathname.split('/').filter(Boolean);
      if(parts[0]==='shorts'||parts[0]==='embed'||parts[0]==='live')return (parts[1]||'').slice(0,20);
    }
  }catch(e){}
  return '';
}
function installYoutubeSingle(){
  if(youtubeHooked)return;
  if(typeof window.addSingle!=='function')return;
  const note=document.getElementById('note');
  if(note){
    const input=document.createElement('input');
    input.id='note';
    input.name='youtubeLink';
    input.type='url';
    input.required=true;
    input.maxLength=300;
    input.autocomplete='url';
    input.inputMode='url';
    input.className=note.className;
    input.placeholder='Link YouTube (wajib)';
    input.title='Masukkan link video YouTube yang ingin diputar';
    note.replaceWith(input);
  }
  const originalAddSingle=window.addSingle;
  window.addSingle=async function(event){
    const field=document.getElementById('note');
    const link=field?field.value.trim():'';
    const videoId=youtubeVideoId(link);
    if(!link||!videoId){
      if(event&&event.preventDefault)event.preventDefault();
      if(typeof window.toast==='function')window.toast('Masukkan link YouTube yang valid. Contoh: youtube.com/watch?v=...','error');
      if(field)field.focus();
      return false;
    }
    /* Keep the existing backend contract: the YouTube link is stored in the note column. */
    return originalAddSingle.call(this,event);
  };
  youtubeHooked=true;
}
function init(){
  hookMainFilter();
  observeSection();
  installUnlimitedBatch();
  installYoutubeSingle();
  setTimeout(function(){
    hookMainFilter();
    observeSection();
    installUnlimitedBatch();
    installYoutubeSingle();
    apply();
  },1200);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();