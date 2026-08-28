const GAS='https://script.google.com/macros/s/AKfycbyUB8drjL1dSJedYjKIKjVc5gzIE3Pe-QS0FF8o1_zU4NkAweGLFquhHLfy1Nt_eITA-Q/exec';
const READ_ACTIONS=new Set(['data','announcement','health','userloginmode']);
const ALLOWED_ACTIONS=new Set(['data','announcement','health','add','addbatch','check','updatestatus','markplayed','updatestatuses','delete','deletebatch','reorder','youtubemappings','saveyoutubemapping','deleteyoutubemapping','userloginmode','setuserloginmode','users','saveuser','deleteuser','adminresetpassword','saveannouncement','clearannouncement','login','session','logout','adminlogin','adminsession','adminlogout','forgotpassword','changepassword']);
function parseUpstream(text){const raw=String(text||'').trim();try{return JSON.parse(raw)}catch(_){}const m=raw.match(/^[^(]+\((.*)\)\s*;?\s*$/s);if(m)try{return JSON.parse(m[1])}catch(_){}return null}
function cacheKey(request){const u=new URL(request.url);['callback','prefix','_'].forEach(k=>u.searchParams.delete(k));return new Request(u.toString(),{method:'GET'})}
function jsonp(cb,data){const safe=String(cb||'').replace(/[^a-zA-Z0-9_.$]/g,'')||'__kudajituCallback';return new Response(safe+'('+JSON.stringify(data)+');',{headers:{'Content-Type':'application/javascript; charset=utf-8','Cache-Control':'no-store'}})}
function headers(cache){return{'Cache-Control':cache?'public, max-age=0, s-maxage=10, stale-while-revalidate=30':'no-store, no-cache, must-revalidate','X-Kuda-API':'v3'}}
export async function onRequestGet({request}){
  const incoming=new URL(request.url),action=String(incoming.searchParams.get('action')||'data').trim().toLowerCase(),cb=incoming.searchParams.get('callback')||incoming.searchParams.get('prefix')||'';
  if(!ALLOWED_ACTIONS.has(action))return cb?jsonp(cb,{success:false,message:'Action tidak diizinkan.'}):Response.json({success:false,message:'Action tidak diizinkan.'},{status:400,headers:{'Cache-Control':'no-store'}});
  const isRead=READ_ACTIONS.has(action),cache=caches.default,key=cacheKey(request);
  if(isRead){const hit=await cache.match(key);if(hit){const cachedText=await hit.text(),cachedBody=parseUpstream(cachedText);if(cachedBody)return cb?jsonp(cb,cachedBody):new Response(cachedText,{status:hit.status,headers:headers(true)})}}
  const target=new URL(GAS);
  incoming.searchParams.forEach((v,k)=>{if(k!=='callback'&&k!=='prefix'&&k!=='_')target.searchParams.append(k,v)});
  if(!target.searchParams.has('action'))target.searchParams.set('action',action);
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);
  try{
    const upstream=await fetch(target.toString(),{method:'GET',redirect:'follow',cache:'no-store',signal:controller.signal,headers:{Accept:'application/json, text/plain;q=0.9, */*;q=0.8'}});
    const body=parseUpstream(await upstream.text());
    if(!body){const e={success:false,message:'Server mengembalikan respons tidak valid.'};return cb?jsonp(cb,e):Response.json(e,{status:502,headers:{'Cache-Control':'no-store'}})}
    if(isRead&&upstream.ok){const stored=Response.json(body,{status:200,headers:headers(true)});await cache.put(key,stored.clone())}
    if(action==='add'||action==='addbatch')await cache.delete(new Request(new URL('/api/gas?range=today',request.url).toString()));
    return cb?jsonp(cb,body):Response.json(body,{status:upstream.ok?200:502,headers:headers(isRead&&upstream.ok)});
  }catch(error){
    const body={success:false,message:error&&error.name==='AbortError'?'Server timeout.':'Gagal menghubungi server.'};
    return cb?jsonp(cb,body):Response.json(body,{status:504,headers:{'Cache-Control':'no-store'}});
  }finally{clearTimeout(timer)}
}
