(function(){'use strict';
/* Compatibility layer only. Queue synchronization is Supabase-only; this file must never call /api/gas. */
let stopped=false;
function stop(){stopped=true}
async function refresh(){if(stopped)return false;try{if(window.KUDAJITU_SUPABASE?.load)return await window.KUDAJITU_SUPABASE.load();return false}catch(e){console.warn('[Kudajitu] Supabase queue refresh:',e?.message||e);return false}}
function now(){const rows=Array.isArray(window.requests)?window.requests:[];let best=null,t=-1;rows.forEach(r=>{if(String(r?.status||'').toLowerCase()!=='played')return;const n=Date.parse(r?.playedAt||r?.timestamp)||0;if(n>=t){t=n;best=r}});const title=document.getElementById('npTitle'),artist=document.getElementById('npArtist'),requester=document.getElementById('npRequester'),stage=document.getElementById('npStage');if(!title||!artist||!requester||!stage)return false;title.textContent=best?.title||'Belum ada lagu diputar';artist.textContent=best?.artist||'Request lagu dan tunggu giliranmu';requester.textContent=best?.requester?'Direquest oleh '+best.requester:'-';stage.classList.toggle('playing',!!best);return !!best}
window.KUDAJITURealtimeQueue={refresh,refreshFresh:refresh,refreshNowPlaying:now,stop};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{if(window.KUDAJITU_SUPABASE?.load)refresh()},{once:true});else if(window.KUDAJITU_SUPABASE?.load)refresh();
})();
