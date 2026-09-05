(function(){'use strict';
const URL='https://jdqcvfqysmjreibcaduk.supabase.co',KEY='sb_publishable_QDcyGfH-3dBNmUYE9pKIkg_uFmRsmOa',TZ='Asia/Jakarta';let channel=null,fallback=0,timer=0,started=false;
function loadBatchUI(){if(document.getElementById('batchRequestUIScript'))return;const s=document.createElement('script');s.id='batchRequestUIScript';s.src='./batch-request-ui.js?v=20260905-2';s.async=false;(document.head||document.documentElement).appendChild(s)}
function getClient(){try{if(window.KUDAJITU_SUPABASE?.getClient)return window.KUDAJITU_SUPABASE.getClient();if(window.supabase?.createClient)return window.supabase.createClient(URL,KEY,{realtime:{params:{eventsPerSecond:5}}})}catch(_){}return null}
function schedule(){clearTimeout(timer);timer=setTimeout(()=>refresh(true),250)}
async function refresh(force){if(typeof window.loadData!=='function')return false;try{await window.loadData(!!force);return true}catch(e){console.warn('[Kudajitu] queue refresh:',e?.message||e);return false}}
function subscribe(){if(channel)return;const c=getClient();if(!c)return;try{channel=c.channel('kudajitu-user-requests-v2').on('postgres_changes',{event:'*',schema:'public',table:'requests'},schedule).subscribe(s=>{const e=document.getElementById('syncState');if(s==='SUBSCRIBED'&&e){e.textContent='● Online';e.className='text-[10px] hidden sm:inline text-teal-300'}})}catch(e){console.warn('[Kudajitu] realtime subscribe:',e?.message||e)}}
function fallbackPoll(){clearInterval(fallback);fallback=setInterval(()=>{if(document.visibilityState==='visible')refresh(false)},30000)}
function init(){if(started)return;started=true;window.KUDAJITU_TIMEZONE=TZ;loadBatchUI();setTimeout(()=>{subscribe();fallbackPoll()},500);}
window.KUDAJITURealtimeQueue={refresh,refreshFresh:()=>refresh(true),refreshNowPlaying:()=>refresh(false),stop:()=>{clearInterval(fallback);clearTimeout(timer);if(channel){try{getClient()?.removeChannel(channel)}catch(_){}channel=null}}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();