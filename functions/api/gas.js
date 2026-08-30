const GAS='https://script.google.com/macros/s/AKfycbyUB8drjL1dSJedYjKIKjVc5gzIE3Pe-QS0FF8o1_zU4NkAweGLFquhHLfy1Nt_eITA-Q/exec';
const READ_ACTIONS=new Set(['data','announcement','userloginmode','getqueueorder','checkids','youtubemappings']);
const QUEUE_WRITE_ACTIONS=new Set(['add','addbatch','updatestatus','markplayed','updatestatuses','delete','deletebatch','reorder','setqueueorder']);
const ALLOWED_ACTIONS=new Set(['data','announcement','health','add','addbatch','check','checkids','updatestatus','markplayed','updatestatuses','delete','deletebatch','reorder','getqueueorder','setqueueorder','youtubemappings','saveyoutubemapping','deleteyoutubemapping','userloginmode','setuserloginmode','users','saveuser','deleteuser','adminresetpassword','saveannouncement','clearannouncement','login','session','logout','adminlogin','adminsession','adminlogout','forgotpassword','changepassword']);
const CANONICAL_ACTIONS={
  add:'add',
  addbatch:'addBatch',
  check:'check',
  checkids:'checkIds',
  updatestatus:'updateStatus',
  markplayed:'markPlayed',
  updatestatuses:'updateStatuses',
  delete:'delete',
  deletebatch:'deleteBatch',
  reorder:'setQueueOrder',
  getqueueorder:'getQueueOrder',
  setqueueorder:'setQueueOrder',
  userloginmode:'userloginmode',
  setuserloginmode:'setuserloginmode',
  youtubemappings:'youtubemappings',
  saveyoutubemapping:'saveyoutubemapping',
  deleteyoutubemapping:'deleteyoutubemapping',
  adminlogin:'adminlogin',
  adminsession:'adminsession',
  adminlogout:'adminlogout',
  adminresetpassword:'adminresetpassword',
  saveuser:'saveuser',
  deleteuser:'deleteuser',
  saveannouncement:'saveannouncement',
  clearannouncement:'clearannouncement',
  forgotpassword:'forgotpassword',
  changepassword:'changepassword'
};
function parseUpstream(text){const raw=String(text||'').trim();try{return JSON.parse(raw)}catch(_){}const m=raw.match(/^[^(]+\((.*)\)\s*;?\s*$/s);if(m)try{return JSON.parse(m[1])}catch(_){}return null}
function cacheKey(request){const u=new URL(request.url);['callback','prefix','_','_refresh'].forEach(k=>u.searchParams.delete(k));return new Request(u.toString(),{method:'GET'})}
function jsonp(cb,data,cacheable,cacheState){const safe=String(cb||'').replace(/[^a-zA-Z0-9_.$]/g,'')||'__kudajituCallback';const h={'Content-Type':'application/javascript; charset=utf-8','Cache-Control':cacheable?'public, max-age=0, s-maxage=5, stale-while-revalidate=15':'no-store, no-cache, must-revalidate'};if(cacheState)h['X-Kuda-Cache']=cacheState;return new Response(safe+'('+JSON.stringify(data)+');',{headers:h})}
function headers(cache,extra){return Object.assign({'Cache-Control':cache?'public, max-age=0, s-maxage=5, stale-while-revalidate=15':'no-store, no-cache, must-revalidate','X-Kuda-API':'v5'},extra||{})}
async function purgeQueueCache(request){
 const cache=caches.default,base=new URL(request.url);
 const ranges=['today','yesterday','all'],statuses=['','pending','played'];
 const keys=[];
 for(const range of ranges){for(const status of statuses){let path='/api/gas?action=data&range='+encodeURIComponent(range);if(status)path+='&status='+encodeURIComponent(status);keys.push(new Request(new URL(path,base).toString()));}}
 await Promise.all(keys.map(key=>cache.delete(key)));
}
function normalizeAction(incoming){const action=String(incoming.searchParams.get('action')||'data').trim().toLowerCase();if(action==='reorder')return'setqueueorder';return action}
function normalizeTargetParams(incoming,action){const params=new URLSearchParams();incoming.searchParams.forEach((v,k)=>{if(!['callback','prefix','_'].includes(k))params.append(k,v)});if(action==='setqueueorder'&&incoming.searchParams.has('ids')&&!incoming.searchParams.has('order')){const ids=String(incoming.searchParams.get('ids')||'').split(',').map(x=>x.trim()).filter(Boolean);params.delete('ids');params.set('order',JSON.stringify(ids));}params.set('action',CANONICAL_ACTIONS[action]||action);return params}
export async function onRequestGet({request}){
 const started=Date.now(),incoming=new URL(request.url),requestedAction=String(incoming.searchParams.get('action')||'data').trim().toLowerCase(),action=normalizeAction(incoming),cb=incoming.searchParams.get('callback')||incoming.searchParams.get('prefix')||'',isHealth=action==='health';
 if(!ALLOWED_ACTIONS.has(requestedAction))return cb?jsonp(cb,{success:false,message:'Action tidak diizinkan.'},false,'BYPASS'):Response.json({success:false,message:'Action tidak diizinkan.'},{status:400,headers:headers(false,{'X-Kuda-Cache':'BYPASS'})});
 const isRead=READ_ACTIONS.has(action),cache=caches.default,key=cacheKey(request),forceFresh=incoming.searchParams.has('_refresh');
 if(isRead&&!isHealth&&!forceFresh){const hit=await cache.match(key);if(hit){const t=await hit.text(),b=parseUpstream(t);if(b)return cb?jsonp(cb,b,true,'HIT'):new Response(t,{status:hit.status,headers:headers(true,{'X-Kuda-Cache':'HIT'})})}}
 const target=new URL(GAS),params=normalizeTargetParams(incoming,action);params.forEach((v,k)=>target.searchParams.append(k,v));
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),isHealth?8000:30000);
 try{const upstream=await fetch(target.toString(),{method:'GET',redirect:'follow',cache:'no-store',signal:controller.signal,headers:{Accept:'application/json, text/plain;q=0.9, */*;q=0.8'}});const upstreamText=await upstream.text(),body=parseUpstream(upstreamText);const runtimeMs=Date.now()-started;if(!body){const e={success:false,message:'Server mengembalikan respons tidak valid.'};return cb?jsonp(cb,e,false,'BYPASS'):Response.json(e,{status:502,headers:headers(false,{'X-Kuda-Upstream-Ms':String(runtimeMs),'X-Kuda-Cache':'BYPASS'})})}if(isHealth){const health={success:upstream.ok&&body.success!==false,api:'online',upstream:upstream.ok?'reachable':'error',upstreamHttpStatus:upstream.status,healthActionOk:body.success!==false,latencyMs:runtimeMs,apiVersion:body.apiVersion||null};return cb?jsonp(cb,Object.assign({},body,health),false,'BYPASS'):Response.json(Object.assign({},body,health),{status:upstream.ok?200:502,headers:headers(false,{'X-Kuda-Upstream-Ms':String(runtimeMs),'X-Kuda-Cache':'BYPASS'})})}if(QUEUE_WRITE_ACTIONS.has(requestedAction)&&upstream.ok)await purgeQueueCache(request);if(isRead&&upstream.ok){const stored=Response.json(body,{status:200,headers:headers(true,{'X-Kuda-Cache':'MISS','X-Kuda-Upstream-Ms':String(runtimeMs)})});await cache.put(key,stored.clone())}const cacheState=isRead&&upstream.ok?'MISS':'BYPASS',responseHeaders=headers(isRead&&upstream.ok,{'X-Kuda-Upstream-Ms':String(runtimeMs),'X-Kuda-Cache':cacheState});return cb?jsonp(cb,body,isRead&&upstream.ok,cacheState):Response.json(body,{status:upstream.ok?200:502,headers:responseHeaders})}catch(error){const runtimeMs=Date.now()-started;const body={success:false,message:error&&error.name==='AbortError'?(isHealth?'Health check timeout.':'Server timeout.'):'Gagal menghubungi server.',api:'online',upstream:'error',latencyMs:runtimeMs};return cb?jsonp(cb,body,false,'BYPASS'):Response.json(body,{status:504,headers:headers(false,{'X-Kuda-Upstream-Ms':String(runtimeMs),'X-Kuda-Cache':'BYPASS'})})}finally{clearTimeout(timer)}}
