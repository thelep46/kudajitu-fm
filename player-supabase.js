(function(){
  'use strict';

  const SUPABASE_URL='https://jdqcvfqysmjreibcaduk.supabase.co';
  const SUPABASE_KEY='sb_publishable_QDcyGfH-3dBNmUYE9pKIkg_uFmRsmOa';
  const ADMIN_FN=SUPABASE_URL+'/functions/v1/kudajitu-admin-v4';

  let db=null,yt=null,ready=false,booted=false,channel=null,refreshTimer=0,updateBusy=false;
  let queueRows=[],current=null,history=[],mapsCache=null,mapsExp=0,started=false,loadingTrack=false;

  const $=id=>document.getElementById(id);
  const setText=(id,v)=>{const e=$(id);if(e)e.textContent=String(v??'');};
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const norm=v=>String(v??'').trim().toLowerCase().replace(/[‐‑‒–—]/g,'-').replace(/\s+/g,' ');
  const key=(t,a)=>norm(t)+'|'+norm(a);

  function status(text,type=''){setText('status',text);const e=$('status');if(e)e.className='status'+(type?' '+type:'');}

  function videoId(value){
    const raw=String(value||'').trim();
    if(!raw)return '';
    try{
      const u=new URL(raw),host=u.hostname.toLowerCase().replace(/^www\./,'');
      if(host==='youtu.be')return (u.pathname.split('/').filter(Boolean)[0]||'').slice(0,11);
      if(['youtube.com','m.youtube.com','music.youtube.com'].includes(host)){
        const q=u.searchParams.get('v'); if(q)return q.slice(0,11);
        const p=u.pathname.split('/').filter(Boolean);
        if(['shorts','embed','live'].includes(p[0])&&p[1])return p[1].slice(0,11);
      }
    }catch(_){ }
    return /^[A-Za-z0-9_-]{11}$/.test(raw)?raw:'';
  }

  function currentVideo(){return current?(videoId(current.note)||mapsCache?.get(key(current.title,current.artist))||''):'';}

  async function loadMappings(){
    if(mapsCache&&mapsExp>Date.now())return mapsCache;
    const {data,error}=await db.from('youtube_mappings').select('title,artist,youtube_id').limit(1000);
    if(error)throw error;
    const map=new Map();
    (data||[]).forEach(r=>{const id=videoId(r?.youtube_id);if(id)map.set(key(r.title,r.artist),id);});
    mapsCache=map;mapsExp=Date.now()+300000;return map;
  }

  function todayBounds(){
    const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta'}).format(new Date());
    const start=new Date(date+'T00:00:00+07:00');
    return {start:start.toISOString(),end:new Date(start.getTime()+86400000).toISOString()};
  }

  async function loadQueue(){
    const {start,end}=todayBounds();
    const {data,error}=await db.from('requests').select('id,requester,title,artist,note,status,timestamp,queue_position,played_at')
      .eq('status','pending').gte('timestamp',start).lt('timestamp',end)
      .order('queue_position',{ascending:true,nullsFirst:false}).order('timestamp',{ascending:true}).order('id',{ascending:true}).limit(500);
    if(error)throw error;return data||[];
  }

  function sortQueue(rows){
    return rows.slice().sort((a,b)=>{
      const aq=Number(a?.queue_position||0),bq=Number(b?.queue_position||0);
      if(aq&&bq&&aq!==bq)return aq-bq;if(aq&&!bq)return -1;if(!aq&&bq)return 1;
      const ta=new Date(a?.timestamp||0).getTime(),tb=new Date(b?.timestamp||0).getTime();
      if(ta!==tb)return ta-tb;return String(a?.id||'').localeCompare(String(b?.id||''));
    });
  }

  function saveSession(){try{
    sessionStorage.setItem('kudajitu_player_current',current?JSON.stringify({id:current.id,requester:current.requester,title:current.title,artist:current.artist,note:current.note,status:'played'}):'');
    sessionStorage.setItem('kudajitu_player_history',JSON.stringify(history.slice(-20)));
  }catch(_){}}

  function restoreSession(){try{
    const c=JSON.parse(sessionStorage.getItem('kudajitu_player_current')||'null');
    const h=JSON.parse(sessionStorage.getItem('kudajitu_player_history')||'[]');
    if(c?.id)current=c;if(Array.isArray(h))history=h.filter(r=>r?.id);
  }catch(_){} }

  function renderNow(){
    if(!current){setText('title','Belum ada lagu diputar');setText('meta','Menunggu request berikutnya');status('Player siap • menunggu lagu');return;}
    setText('title',current.title||'Tanpa judul');setText('meta',(current.artist||'Tanpa penyanyi')+' • '+(current.requester||'User'));
  }

  function renderQueue(){
    const el=$('queue');setText('count',queueRows.length);if(!el)return;
    const rows=queueRows.slice(0,12);
    el.innerHTML=rows.length?rows.map((r,n)=>{
      const has=!!videoId(r.note)||!!mapsCache?.get(key(r.title,r.artist));
      return '<div class="item '+(has?'ready':'missing')+'"><span class="num">'+(n+1)+'</span><div class="item-main"><b>'+esc(r.title)+'</b><small>'+esc(r.artist||'Unknown Artist')+' • '+(has?'✓ Video siap':'⚠ Mapping belum tersedia')+'</small></div></div>';
    }).join(''):'<div class="empty">Tidak ada request berikutnya.</div>';
  }

  function updateButtons(){const p=$('prev'),n=$('next'),s=$('start');if(p)p.disabled=!history.length;if(n)n.disabled=!queueRows.length;if(s)s.textContent=started?'⏸ Pause':'▶ Mulai';}

  function setCurrent(row){
    if(!row)return;
    if(current&&String(current.id)!==String(row.id)){
      history.push({id:current.id,requester:current.requester,title:current.title,artist:current.artist,note:current.note,status:'played'});history=history.slice(-20);
    }
    current={...row,status:'played'};saveSession();renderNow();updateButtons();
  }

  async function adminToken(){try{const s=await db.auth.getSession();return s.data?.session?.access_token||'';}catch(_){return '';}}

  async function markPlayed(row){
    const token=await adminToken();if(!token)throw new Error('LOGIN_REQUIRED');
    const response=await fetch(ADMIN_FN,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify({action:'updateStatus',id:String(row.id),status:'played'}),cache:'no-store'});
    const text=await response.text();let out;try{out=JSON.parse(text);}catch(_){throw new Error('Respons Admin tidak valid.');}
    if(!response.ok||out.success===false)throw new Error(out.message||('Server gagal ('+response.status+').'));return true;
  }

  function playVideo(row,video,auto=true){
    const clean=videoId(video);if(!clean||!yt||!ready)return false;
    loadingTrack=true;setCurrent(row);status('Memuat '+(row.title||'lagu')+'…');
    try{
      yt.stopVideo();
      yt.loadVideoById({videoId:clean,startSeconds:0});
      if(auto){yt.playVideo();started=true;}else{started=false;}
      updateButtons();return true;
    }catch(error){status('Gagal memuat video YouTube.','err');console.error('[Kudajitu Player] play:',error);return false;}
    finally{setTimeout(()=>{loadingTrack=false;},250);}
  }

  function playCurrent(auto=true){if(!current)return false;const v=currentVideo();if(!v){status('Mapping YouTube belum tersedia untuk lagu ini.','err');return false;}return playVideo(current,v,auto);}

  async function startTrack(row,auto=true){
    if(!row||loadingTrack)return false;
    const v=videoId(row.note)||mapsCache?.get(key(row.title,row.artist))||'';
    if(!v){status('Mapping YouTube belum tersedia untuk '+row.title,'err');return false;}
    try{if(row.status!=='played')await markPlayed(row);}catch(error){status(error?.message==='LOGIN_REQUIRED'?'Login Admin diperlukan untuk memutar lagu.':'Gagal menandai lagu: '+(error?.message||error),'err');return false;}
    queueRows=queueRows.filter(x=>String(x.id)!==String(row.id));setCurrent(row);renderQueue();updateButtons();return playCurrent(auto);
  }

  async function nextTrack(){if(loadingTrack)return;const row=queueRows[0];if(!row){status('Antrean berikutnya kosong.');updateButtons();return;}await startTrack(row,true);}

  async function previousTrack(){
    if(loadingTrack||!history.length)return;
    const row=history.pop();current={...row,status:'played'};saveSession();renderNow();const v=currentVideo();if(v)playVideo(current,v,true);else status('Mapping YouTube belum tersedia untuk lagu sebelumnya.','err');updateButtons();
  }

  async function onEnded(){started=false;updateButtons();if(!queueRows.length){status('✓ Lagu selesai • antrean kosong','ok');return;}await nextTrack();}

  function handleRealtime(payload){
    const type=payload.eventType,row=payload.new,old=payload.old,id=String(row?.id||old?.id||'');
    if(type==='INSERT'&&row?.status==='pending'){queueRows=sortQueue([...queueRows,row]);renderQueue();updateButtons();return;}
    if(type==='DELETE'){queueRows=queueRows.filter(x=>String(x.id)!==id);renderQueue();updateButtons();return;}
    if(type==='UPDATE'){
      if(row?.status==='pending'){const exists=queueRows.some(x=>String(x.id)===id);queueRows=sortQueue(exists?queueRows.map(x=>String(x.id)===id?row:x):[...queueRows,row]);renderQueue();updateButtons();return;}
      if(row?.status==='played'){queueRows=queueRows.filter(x=>String(x.id)!==id);renderQueue();updateButtons();if(!current||String(current.id)!==id){const v=videoId(row.note)||mapsCache?.get(key(row.title,row.artist))||'';if(v&&!started)playVideo(row,v,true);}}
    }
  }

  function subscribe(){
    if(channel)return;
    channel=db.channel('kudajitu-player-realtime-v10').on('postgres_changes',{event:'*',schema:'public',table:'requests'},handleRealtime).subscribe(state=>{
      if(state==='SUBSCRIBED')setText('auth','✓ Supabase Realtime aktif • Player siap');
      else if(state==='CHANNEL_ERROR'||state==='TIMED_OUT'||state==='CLOSED'){setText('auth','⚠ Realtime terputus • mencoba terhubung ulang…');channel=null;setTimeout(subscribe,2000);}
    });
  }

  function scheduleSync(){clearTimeout(refreshTimer);refreshTimer=setTimeout(async()=>{if(document.visibilityState==='hidden'||updateBusy)return;updateBusy=true;try{const fresh=sortQueue(await loadQueue());queueRows=started&&current?fresh.filter(x=>String(x.id)!==String(current.id)):fresh;renderQueue();updateButtons();}catch(e){console.warn('[Kudajitu Player] sync:',e)}finally{updateBusy=false;}},400);}

  async function loadInitial(){
    if(updateBusy)return;updateBusy=true;
    try{
      const [fresh,mappings]=await Promise.all([loadQueue(),loadMappings()]);mapsCache=mappings;queueRows=sortQueue(fresh);restoreSession();
      if(current&&String(current.id)&&!queueRows.some(x=>String(x.id)===String(current.id))){renderNow();const v=currentVideo();if(v&&yt&&ready)playVideo(current,v,false);}else if(!current)renderNow();
      renderQueue();updateButtons();
    }catch(error){status('Gagal memuat antrean: '+(error?.message||error),'err');console.error('[Kudajitu Player] load:',error);}finally{updateBusy=false;}
  }

  function makeYT(){
    if(yt||!window.YT?.Player)return;
    yt=new YT.Player('player',{width:'100%',height:'100%',playerVars:{autoplay:0,mute:0,playsinline:1,rel:0,controls:1,modestbranding:1,enablejsapi:1,origin:location.origin},events:{
      onReady(){ready=true;loadInitial();},
      onStateChange(event){
        if(event.data===YT.PlayerState.PLAYING){started=true;setText('start','⏸ Pause');status('▶ Sedang diputar • '+(current?.title||''),'ok');}
        else if(event.data===YT.PlayerState.PAUSED){started=false;setText('start','▶ Mulai');}
        else if(event.data===YT.PlayerState.ENDED){onEnded();}
        updateButtons();
      },
      onAutoplayBlocked(){started=false;setText('start','▶ Mulai');status('▶ Browser memblokir autoplay • tekan Mulai untuk memutar.');updateButtons();},
      onError(event){started=false;status('YouTube error '+Number(event.data),'err');updateButtons();}
    }});
  }

  function ytLoad(){
    if(window.YT?.Player){makeYT();return;}
    if(document.getElementById('yt-api'))return;
    const script=document.createElement('script');script.id='yt-api';script.src='https://www.youtube.com/iframe_api';document.head.appendChild(script);window.onYouTubeIframeAPIReady=makeYT;
  }

  async function boot(){
    if(booted)return;booted=true;
    try{db=window.supabase?.createClient?.(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true},realtime:{params:{eventsPerSecond:5}}});if(!db)throw Error('Supabase JS belum dimuat.');setText('auth','Menghubungkan ke Supabase…');bind();ytLoad();subscribe();}
    catch(error){booted=false;setText('auth','Gagal terhubung ke Supabase: '+(error?.message||error));status('Player belum dapat memuat data.','err');console.error('[Kudajitu Player] boot:',error);}
  }

  function bind(){
    const refresh=$('refresh');if(refresh)refresh.onclick=()=>loadInitial();
    const startButton=$('start');if(startButton)startButton.onclick=async()=>{if(!yt||!ready){status('Player masih disiapkan…');return;}if(started){yt.pauseVideo();return;}if(current)playCurrent(true);else await nextTrack();};
    const next=$('next');if(next)next.onclick=()=>nextTrack();
    const prev=$('prev');if(prev){prev.disabled=true;prev.onclick=()=>previousTrack();}
  }

  window.KUDAJITUPlayerSupabaseBoot=boot;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>boot(),{once:true});else boot();
})();