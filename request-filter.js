(function(){
'use strict';
/* Stable request helpers: unlimited batch + REQUIRED YouTube links for single and batch requests. Queue synchronization is owned by realtime-queue-refresh.js. */
let mode='all';
let sectionObserver=null;
let hooked=false;
let batchHooked=false;
let youtubeHooked=false;
let batchRows=[];
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
  sectionObserver.observe(s,{childList:true,subtree:true});
}
function enc(v){return encodeURIComponent(String(v==null?'':v));}
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
function makeItems(lines,name){
  const base=Date.now();
  return lines.map(function(item,i){
    return {
      id:'req_'+(base+i)+'_'+Math.random().toString(36).slice(2,8),
      requester:name,
      title:item.title,
      artist:item.artist||'Unknown Artist',
      note:item.youtube,
      youtubeUrl:item.youtube,
      youtubeId:youtubeVideoId(item.youtube),
      timestamp:new Date(base+i).toISOString(),
      status:'pending',
      votes:1
    };
  });
}
function sendChunk(items){
  if(typeof window.jsonp!=='function')return Promise.reject(new Error('API belum siap.'));
  return window.jsonp((window.GAS||'/api/gas')+'?action=addBatch&items='+enc(JSON.stringify(items)),15000);
}
async function sendUnlimited(items){
  const chunkSize=10;
  let added=0,existing=0;
  for(let i=0;i<items.length;i+=chunkSize){
    const chunk=items.slice(i,i+chunkSize);
    const result=await sendChunk(chunk);
    if(!result||result.success===false)throw new Error(result&&result.message||'Batch gagal disimpan.');
    added+=Number(result.added||0);
    existing+=Number(result.existing||0);
  }
  return {success:true,added:added,existing:existing,count:items.length};
}
function styleBatch(){
  return 'display:grid;gap:10px;padding:12px;border:1px solid rgba(17,94,89,.7);border-radius:12px;background:rgba(3,10,12,.55)';
}
function inputField(placeholder,cls){
  const input=document.createElement('input');
  input.type=cls==='youtube'?'url':'text';
  input.className='field';
  input.placeholder=placeholder;
  input.autocomplete='off';
  if(cls==='title')input.maxLength=100;
  if(cls==='artist')input.maxLength=80;
  if(cls==='youtube')input.maxLength=300;
  if(cls==='youtube')input.required=true;
  input.dataset.batchField=cls;
  return input;
}
function renderBatchRows(container){
  container.innerHTML='';
  batchRows.forEach(function(row,index){
    const card=document.createElement('div');
    card.style.cssText=styleBatch();
    const head=document.createElement('div');
    head.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:8px';
    const label=document.createElement('b');
    label.textContent='Lagu '+(index+1);
    label.style.cssText='font-size:11px;color:#99f6e4';
    head.appendChild(label);
    if(batchRows.length>1){
      const remove=document.createElement('button');
      remove.type='button';remove.className='btn';remove.textContent='✕ Hapus';
      remove.style.cssText='font-size:10px;padding:5px 8px;border:1px solid rgba(127,29,29,.8);border-radius:8px;color:#fca5a5';
      remove.onclick=function(){batchRows.splice(index,1);renderBatchRows(container);};
      head.appendChild(remove);
    }
    card.appendChild(head);
    const title=inputField('Judul Lagu','title');
    const artist=inputField('Penyanyi / Band','artist');
    const youtube=inputField('Link YouTube (wajib)','youtube');
    title.value=row.title||'';artist.value=row.artist||'';youtube.value=row.youtube||'';
    [title,artist,youtube].forEach(function(el){el.addEventListener('input',function(){row[el.dataset.batchField]=el.value;});});
    card.appendChild(title);card.appendChild(artist);card.appendChild(youtube);
    container.appendChild(card);
  });
}
function installUnlimitedBatch(){
  if(batchHooked)return;
  if(typeof window.addBatch!=='function')return;
  const form=document.getElementById('batchForm');
  const legacy=document.getElementById('batch');
  if(!form)return;
  if(legacy){
    const holder=document.createElement('div');holder.id='batchBuilder';holder.style.cssText='display:grid;gap:10px';legacy.replaceWith(holder);
  }
  const builder=document.getElementById('batchBuilder');
  if(!builder)return;
  batchRows=[{title:'',artist:'',youtube:''}];
  const controls=document.createElement('div');controls.style.cssText='display:flex;justify-content:space-between;align-items:center;gap:8px';
  const add=document.createElement('button');add.type='button';add.className='btn';add.textContent='＋ Tambah Lagu';
  add.style.cssText='padding:8px 12px;border-radius:10px;border:1px solid rgba(17,94,89,.8);font-size:11px;font-weight:700;color:#99f6e4';
  add.onclick=function(){batchRows.push({title:'',artist:'',youtube:''});renderBatchRows(builder);const cards=builder.children;const last=cards[cards.length-1];if(last)last.scrollIntoView({behavior:'smooth',block:'nearest'});};
  const count=document.createElement('span');count.id='batchCount';count.style.cssText='font-size:10px;color:#64748b';
  controls.appendChild(add);controls.appendChild(count);form.insertBefore(controls,builder);
  const hint=form.querySelector('p');if(hint)hint.textContent='Setiap lagu wajib memiliki Judul, Penyanyi, dan Link YouTube yang valid.';
  renderBatchRows(builder);
  window.addBatch=async function(event){
    if(event&&event.preventDefault)event.preventDefault();
    const nameEl=document.getElementById('name');const button=document.getElementById('batchBtn');const name=nameEl?nameEl.value.trim():'';
    const itemsRaw=batchRows.map(function(r){return{title:String(r.title||'').trim(),artist:String(r.artist||'').trim(),youtube:String(r.youtube||'').trim()};}).filter(function(r){return r.title||r.artist||r.youtube;});
    if(!name){if(typeof window.toast==='function')window.toast('Nama wajib diisi.','error');return false;}
    if(!itemsRaw.length){if(typeof window.toast==='function')window.toast('Tambahkan minimal satu lagu.','error');return false;}
    for(let i=0;i<itemsRaw.length;i++){
      const r=itemsRaw[i];
      if(!r.title||!r.artist||!r.youtube){if(typeof window.toast==='function')window.toast('Lagu '+(i+1)+': judul, penyanyi, dan link YouTube wajib diisi.','error');return false;}
      if(!youtubeVideoId(r.youtube)){if(typeof window.toast==='function')window.toast('Lagu '+(i+1)+': link YouTube tidak valid.','error');return false;}
    }
    if(typeof window.canSubmit==='function'&&!window.canSubmit(itemsRaw.length))return false;
    if(button&&typeof window.busy==='function')window.busy(button,true,'Menyimpan '+itemsRaw.length+' lagu...');
    window.lastSubmit=Date.now();
    try{
      localStorage.setItem('kudajitu_name',name);
      const items=makeItems(itemsRaw,name);const result=await sendUnlimited(items);
      batchRows=[{title:'',artist:'',youtube:''}];renderBatchRows(builder);
      if(typeof window.toast==='function')window.toast(result.added+' request berhasil disimpan.');
    }catch(error){
      console.error('Unlimited batch:',error);if(typeof window.toast==='function')window.toast(error.message||'Request batch gagal disimpan.','error');
    }finally{if(button&&typeof window.busy==='function')window.busy(button,false);}
    return false;
  };
  batchHooked=true;
}
function installYoutubeSingle(){
  if(youtubeHooked)return;
  if(typeof window.addSingle!=='function')return;
  const note=document.getElementById('note');
  if(note){
    const input=document.createElement('input');input.id='note';input.name='youtubeLink';input.type='url';input.required=true;input.maxLength=300;input.autocomplete='url';input.inputMode='url';input.className=note.className;input.placeholder='Link YouTube (wajib)';input.title='Masukkan link video YouTube yang ingin diputar';note.replaceWith(input);
  }
  const originalAddSingle=window.addSingle;
  window.addSingle=async function(event){
    const field=document.getElementById('note');const link=field?field.value.trim():'';const videoId=youtubeVideoId(link);
    if(!link||!videoId){if(event&&event.preventDefault)event.preventDefault();if(typeof window.toast==='function')window.toast('Link YouTube wajib diisi dan harus valid.','error');if(field)field.focus();return false;}
    return originalAddSingle.call(this,event);
  };
  youtubeHooked=true;
}
function init(){
  hookMainFilter();observeSection();installUnlimitedBatch();installYoutubeSingle();
  setTimeout(function(){hookMainFilter();observeSection();installUnlimitedBatch();installYoutubeSingle();apply();},1200);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
