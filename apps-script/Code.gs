var NAMA_TAB_ANDA='req lagu';
var TIMEZONE='Asia/Jakarta';
var CACHE_SECONDS=15;
var BASE_CACHE_KEYS=['today_base','yesterday_base','all_base'];
var API_VERSION='kudajitu-v14';
var ANNOUNCEMENT_KEY='kudajitu_announcement_v1';
var ANNOUNCEMENT_ADMIN_KEY='290979';
var USER_LOGIN_MODE_KEY_='kudajitu_user_login_mode_v1';
var USER_LOGIN_MODE_CACHE_KEY_='user_login_mode_base';

function getSheet_(){var s=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(NAMA_TAB_ANDA);if(!s)throw new Error('Sheet "'+NAMA_TAB_ANDA+'" tidak ditemukan');return s;}
function jsonResponse(d){return ContentService.createTextOutput(JSON.stringify(d)).setMimeType(ContentService.MimeType.JSON)}
function jsonpResponse(cb,d){var safe=String(cb||'').replace(/[^a-zA-Z0-9_.$]/g,'');if(!safe)safe='__kudajituCallback';return ContentService.createTextOutput(safe+'('+JSON.stringify(d)+');').setMimeType(ContentService.MimeType.JAVASCRIPT)}
function respond_(cb,d){d=d||{};if(!d.apiVersion)d.apiVersion=API_VERSION;return cb?jsonpResponse(cb,d):jsonResponse(d)}
function toDate_(v){if(v instanceof Date)return isNaN(v.getTime())?null:new Date(v.getTime());if(!v)return null;var d=new Date(v);return isNaN(d.getTime())?null:d}
function dateKey_(v){var d=toDate_(v);return d?Utilities.formatDate(d,TIMEZONE,'yyyy-MM-dd'):''}
function todayKey_(){return Utilities.formatDate(new Date(),TIMEZONE,'yyyy-MM-dd')}
function yesterdayKey_(){var p=todayKey_().split('-'),d=new Date(+p[0],+p[1]-1,+p[2]);d.setDate(d.getDate()-1);return Utilities.formatDate(d,TIMEZONE,'yyyy-MM-dd')}
function normalizeStatus_(v){var s=String(v||'').trim().toLowerCase();return(s==='played'||s==='play'||s==='selesai'||s==='diputar')?'played':'pending'}
function normalizeTimestamp_(v){var d=toDate_(v);return d?d.toISOString():(v?String(v):'')}
function rowToObject_(r){return{id:String(r[0]||''),requester:String(r[1]||''),title:String(r[2]||''),artist:String(r[3]||''),note:String(r[4]||''),timestamp:normalizeTimestamp_(r[5]),status:normalizeStatus_(r[6]),votes:Number(r[7]||1),playedAt:normalizeTimestamp_(r[8])}}
function cacheKey_(k){return'kudajitu_sync_v14_'+k}
function cacheGet_(k){try{var v=CacheService.getScriptCache().get(cacheKey_(k));return v?JSON.parse(v):null}catch(e){return null}}
function cachePut_(k,d){try{var raw=JSON.stringify(d);if(raw.length<95000)CacheService.getScriptCache().put(cacheKey_(k),raw,CACHE_SECONDS)}catch(e){}}
function clearCaches_(){
  try{
    var c=CacheService.getScriptCache();
    c.removeAll(BASE_CACHE_KEYS.concat([ID_CACHE_KEY_,QUEUE_ORDER_CACHE_KEY_,USER_LOGIN_MODE_CACHE_KEY_]).map(cacheKey_));
  }catch(e){}
}
function getBaseRowsCached_(sheet,range,forceFresh){
  var baseKey=range+'_base',rows;
  if(!forceFresh){
    rows=cacheGet_(baseKey);
    if(rows!==null)return{rows:rows,cached:true};
  }
  var lock=LockService.getScriptLock(),locked=false;
  try{
    locked=lock.tryLock(3000);
    if(!forceFresh&&locked){
      rows=cacheGet_(baseKey);
      if(rows!==null)return{rows:rows,cached:true};
    }
    rows=range==='today'?getRecentRows_(sheet,todayKey_()):range==='yesterday'?getRecentRows_(sheet,yesterdayKey_()):getAllRows_(sheet);
    cachePut_(baseKey,rows);
    return{rows:rows,cached:false};
  }finally{
    if(locked){try{lock.releaseLock()}catch(e){}}
  }
}

var ID_CACHE_KEY_='ids_base';
var QUEUE_ORDER_CACHE_KEY_='queue_order_base';

function getRecentRows_(sheet,targetKey){
  var last=sheet.getLastRow();
  if(last<2)return[];
  var vals=sheet.getRange(2,1,last-1,9).getValues(),out=[];
  for(var i=0;i<vals.length;i++){
    var row=vals[i];
    if(row[0]&&dateKey_(row[5])===targetKey)out.push(rowToObject_(row));
  }
  out.sort(function(a,b){
    if(a.status==='played'&&b.status==='played')return(toDate_(b.playedAt||b.timestamp)||0)-(toDate_(a.playedAt||a.timestamp)||0);
    return(toDate_(a.timestamp)||0)-(toDate_(b.timestamp)||0);
  });
  return applyQueueOrder_(out);
}

function getAllRows_(sheet){
  var last=sheet.getLastRow();
  if(last<2)return[];
  var vals=sheet.getRange(2,1,last-1,9).getValues(),out=[];
  for(var i=0;i<vals.length;i++)if(vals[i][0])out.push(rowToObject_(vals[i]));
  out.reverse();
  return applyQueueOrder_(out);
}

function getIds_(sheet){
  var cached=cacheGet_(ID_CACHE_KEY_);
  if(cached!==null)return cached;
  var last=sheet.getLastRow();
  if(last<2){cachePut_(ID_CACHE_KEY_,[]);return[]}
  var ids=sheet.getRange(2,1,last-1,1).getValues().map(function(r){return String(r[0]||'')});
  cachePut_(ID_CACHE_KEY_,ids);
  return ids;
}

function findRowById_(sheet,id){
  var cached=cacheGet_(ID_CACHE_KEY_),target=String(id);
  if(cached!==null){
    for(var i=0;i<cached.length;i++)if(String(cached[i])===target)return i+2;
    return-1;
  }
  var n=Math.max(1,sheet.getLastRow()-1),hit=sheet.getRange(2,1,n,1).createTextFinder(target).matchEntireCell(true).findNext();
  return hit?hit.getRow():-1;
}

function buildIdRowIndex_(sheet){var ids=getIds_(sheet),index={};for(var i=0;i<ids.length;i++){var id=ids[i];if(id)index[id]=i+2}return index;}
function checkIds_(sheet,ids){var index=buildIdRowIndex_(sheet),found=[];ids.forEach(function(id){if(index[String(id)])found.push(String(id))});return found;}
function generateId_(){return'req_'+Date.now()+'_'+Math.random().toString(36).substring(2,8)}
function extractYouTubeId_(value){var raw=String(value||'').trim();if(!raw)return'';var m=raw.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i);return m?m[1]:'';}
function autoMapRequestYouTube_(item){try{var video=extractYouTubeId_(item.note),title=String(item.title||'').trim(),artist=String(item.artist||'').trim();if(!video||!title)return false;if(typeof kudaYoutubeMapSheet_!=='function'||typeof kudaYoutubeKey_!=='function')return false;var s=kudaYoutubeMapSheet_(),key=kudaYoutubeKey_(title,artist),last=s.getLastRow();if(last>=2){var rows=s.getRange(2,1,last-1,4).getValues();for(var i=0;i<rows.length;i++){if(String(rows[i][0]||'')===key){if(String(rows[i][3]||'')!==video)s.getRange(i+2,2,1,3).setValues([[title,artist,video]]);return true;}}}s.appendRow([key,title,artist,video]);return true;}catch(e){console.warn('Auto YouTube mapping gagal: '+e);return false;}}
function appendIfMissing_(sheet,items){var accepted=[],rows=[],index=buildIdRowIndex_(sheet),appendStart=sheet.getLastRow()+1;items.forEach(function(item){var id=String(item.id||generateId_());if(index[id]){accepted.push(id);return}index[id]=appendStart+rows.length;accepted.push(id);rows.push([id,String(item.requester||''),String(item.title||''),String(item.artist||''),String(item.note||''),item.timestamp||new Date().toISOString(),normalizeStatus_(item.status||'pending'),Number(item.votes||1),'']);});if(rows.length)sheet.getRange(appendStart,1,rows.length,9).setValues(rows);rows.forEach(function(r){autoMapRequestYouTube_({title:r[2],artist:r[3],note:r[4]});});return{accepted:accepted,added:rows.length,existing:accepted.length-rows.length};}
function addViaParams_(sheet,p){var item={id:String(p.id||generateId_()),requester:String(p.requester||''),title:String(p.title||''),artist:String(p.artist||''),note:String(p.note||''),timestamp:p.timestamp||new Date().toISOString(),status:normalizeStatus_(p.status||'pending'),votes:Number(p.votes||1)};var r=appendIfMissing_(sheet,[item]);clearCaches_();return{success:true,action:'add',id:item.id,added:r.added,existing:r.existing,data:item}}
function addBatchViaParams_(sheet,p){var raw=[];try{raw=JSON.parse(p.items||'[]')}catch(e){throw new Error('Format batch tidak valid')}if(!Array.isArray(raw)||!raw.length)return{success:false,message:'Tidak ada data batch'};var batchRequester=String(p.requester||'').trim();var items=raw.map(function(x){x=x||{};return{id:String(x.id||generateId_()),requester:String(x.requester||batchRequester||''),title:String(x.title||''),artist:String(x.artist||''),note:String(x.note||'Batch Request'),timestamp:x.timestamp||new Date().toISOString(),status:normalizeStatus_(x.status||'pending'),votes:Number(x.votes||1)}});var r=appendIfMissing_(sheet,items);clearCaches_();return{success:true,action:'addBatch',count:r.accepted.length,added:r.added,existing:r.existing,ids:r.accepted}}
function mutate_(sheet,p){var action=String(p.action||'');if(action==='updateStatus'||action==='markPlayed'){var id=String(p.id||'').trim(),row=findRowById_(sheet,id);if(row<0)return{success:false,action:'updateStatus',message:'ID request tidak ditemukan: '+id};var st=normalizeStatus_(p.status||'played'),playedAt=st==='played'?new Date().toISOString():'';sheet.getRange(row,7,1,3).setValues([[st,sheet.getRange(row,8).getValue(),playedAt]]);clearCaches_();return{success:true,action:'updateStatus',id:id,row:row,status:st,playedAt:playedAt,message:st==='played'?'Request ditandai sudah diputar.':'Request dikembalikan ke antrean.'};}if(action==='updateStatuses'){var ids=String(p.ids||'').split(',').map(function(x){return x.trim()}).filter(Boolean),last=sheet.getLastRow();if(last<2)return{success:true,action:'updateStatuses',updated:0};var idRows=sheet.getRange(2,1,last-1,1).getValues(),values=sheet.getRange(2,7,last-1,3).getValues(),wanted={};ids.forEach(function(x){wanted[String(x)]=true});var st=normalizeStatus_(p.status||'played'),playedAt=st==='played'?new Date().toISOString():'',changed=0;for(var i=0;i<idRows.length;i++){var rid=String(idRows[i][0]||'');if(rid&&wanted[rid]){values[i][0]=st;values[i][2]=playedAt;changed++;}}if(changed)sheet.getRange(2,7,last-1,3).setValues(values);clearCaches_();return{success:true,action:'updateStatuses',updated:changed};}if(action==='delete'){var did=String(p.id||''),dr=findRowById_(sheet,did);if(dr<0)return{success:false,action:'delete',message:'ID request tidak ditemukan'};sheet.deleteRow(dr);pruneQueueOrder_();clearCaches_();return{success:true,action:'delete',id:did};}if(action==='deleteBatch'){var dels=String(p.ids||'').split(',').map(function(x){return x.trim()}).filter(Boolean),index=buildIdRowIndex_(sheet),rows=[];dels.forEach(function(id){if(index[id])rows.push(index[id])});rows.sort(function(a,b){return b-a});var blocks=[];for(var i=0;i<rows.length;i++){var r=rows[i],block=blocks[blocks.length-1];if(!block||r!==block.start-1)blocks.push({start:r,count:1});else{block.start=r;block.count++;}}blocks.forEach(function(b){sheet.deleteRows(b.start,b.count)});pruneQueueOrder_();clearCaches_();return{success:true,action:'deleteBatch',deleted:rows.length};}return{success:false,action:action,message:'Action tidak dikenal: '+action};}
function getAnnouncement_(){var raw=PropertiesService.getScriptProperties().getProperty(ANNOUNCEMENT_KEY);if(!raw)return{enabled:false,type:'info',title:'',content:'',mode:'once',updatedAt:''};try{var a=JSON.parse(raw);return{enabled:a.enabled===true,type:String(a.type||'info'),title:String(a.title||''),content:String(a.content||''),mode:String(a.mode||'once'),updatedAt:String(a.updatedAt||'')}}catch(e){return{enabled:false,type:'info',title:'',content:'',mode:'once',updatedAt:''}}}
function saveAnnouncement_(p){kudaRequireAdmin_(p);var enabled=String(p.enabled||'false')==='true',type=['info','warning','important'].indexOf(String(p.type||'info'))>=0?String(p.type||'info'):'info',mode=String(p.mode||'once')==='always'?'always':'once',title=String(p.title||'').trim().slice(0,120),content=String(p.content||'').trim().slice(0,5000),a={enabled:enabled,type:type,mode:mode,title:title,content:content,updatedAt:new Date().toISOString()};PropertiesService.getScriptProperties().setProperty(ANNOUNCEMENT_KEY,JSON.stringify(a));return{success:true,announcement:a}}
function getUserLoginMode_(){var cached=cacheGet_(USER_LOGIN_MODE_CACHE_KEY_);if(cached!==null)return cached;var mode='open';try{var raw=PropertiesService.getScriptProperties().getProperty(USER_LOGIN_MODE_KEY_);mode=String(raw||'open').toLowerCase()==='required'?'required':'open';}catch(e){mode='open'}cachePut_(USER_LOGIN_MODE_CACHE_KEY_,mode);return mode;}
function setUserLoginMode_(p){kudaRequireAdmin_(p);var mode=String(p.mode||'open').toLowerCase()==='required'?'required':'open';PropertiesService.getScriptProperties().setProperty(USER_LOGIN_MODE_KEY_,mode);cachePut_(USER_LOGIN_MODE_CACHE_KEY_,mode);return{success:true,action:'setuserloginmode',mode:mode,message:mode==='required'?'Login diperlukan sebelum request lagu.':'Request terbuka tanpa login.'};}
var QUEUE_ORDER_KEY_='kudajitu_queue_order_v1';
function getQueueOrder_(){var cached=cacheGet_(QUEUE_ORDER_CACHE_KEY_);if(cached!==null)return cached;try{var raw=PropertiesService.getScriptProperties().getProperty(QUEUE_ORDER_KEY_);var a=raw?JSON.parse(raw):[];a=Array.isArray(a)?a.map(String):[];cachePut_(QUEUE_ORDER_CACHE_KEY_,a);return a;}catch(e){return[]}}
function setQueueOrder_(ids){var clean=(ids||[]).map(String).filter(Boolean);PropertiesService.getScriptProperties().setProperty(QUEUE_ORDER_KEY_,JSON.stringify(clean));cachePut_(QUEUE_ORDER_CACHE_KEY_,clean);try{CacheService.getScriptCache().removeAll(BASE_CACHE_KEYS.map(cacheKey_));}catch(e){}return clean;}
function applyQueueOrder_(rows){var order=getQueueOrder_(),rank={};for(var i=0;i<order.length;i++)rank[String(order[i])]=i;return rows.slice().sort(function(a,b){var ar=rank.hasOwnProperty(String(a.id))?rank[String(a.id)]:999999,br=rank.hasOwnProperty(String(b.id))?rank[String(b.id)]:999999;if(ar!==br)return ar-br;return 0;});}
function pruneQueueOrder_(){var order=getQueueOrder_(),sheet=getSheet_(),ids=getIds_(sheet),set={};ids.forEach(function(id){if(id)set[String(id)]=true});setQueueOrder_(order.filter(function(id){return set[String(id)]}));}
function getData_(p){var range=['today','yesterday','all'].indexOf(String(p.range||'today'))>=0?String(p.range||'today'):'today',sheet=getSheet_(),forceFresh=String(p._refresh||p.forceFresh||'')==='1'||String(p._refresh||p.forceFresh||'').toLowerCase()==='true',base=getBaseRowsCached_(sheet,range,forceFresh),rows=base.rows||[],status=String(p.status||'').trim().toLowerCase();if(status&&status!=='all')rows=rows.filter(function(r){return r.status===status});return{success:true,action:'data',range:range,status:status||'all',cached:base.cached,data:rows,count:rows.length};}
function getHealth_(){return{success:true,action:'health',apiVersion:API_VERSION,time:new Date().toISOString()}}
function doGet(e){return route_(e||{},false)}
function doPost(e){return route_(e||{},true)}
function route_(e,isPost){var p=isPost&&e.postData&&e.postData.contents?JSON.parse(e.postData.contents):(e.parameter||{}),action=String(p.action||'').trim();try{if(action==='data')return respond_(p.callback,getData_(p));if(action==='health')return respond_(p.callback,getHealth_());if(action==='announcement')return respond_(p.callback,{success:true,action:'announcement',announcement:getAnnouncement_()});if(action==='userloginmode')return respond_(p.callback,{success:true,action:'userloginmode',mode:getUserLoginMode_()});if(action==='setuserloginmode')return respond_(p.callback,setUserLoginMode_(p));if(action==='add'){var r=addViaParams_(getSheet_(),p);return respond_(p.callback,r)}if(action==='addBatch'){var rb=addBatchViaParams_(getSheet_(),p);return respond_(p.callback,rb)}if(action==='checkIds'){var ids=String(p.ids||'').split(',').map(function(x){return x.trim()}).filter(Boolean);return respond_(p.callback,{success:true,action:'checkIds',ids:checkIds_(getSheet_(),ids)})}if(['updateStatus','markPlayed','updateStatuses','delete','deleteBatch'].indexOf(action)>=0)return respond_(p.callback,mutate_(getSheet_(),p));if(action==='getQueueOrder'){return respond_(p.callback,{success:true,action:'getQueueOrder',order:getQueueOrder_()})}if(action==='setQueueOrder'){kudaRequireAdmin_(p);return respond_(p.callback,{success:true,action:'setQueueOrder',order:setQueueOrder_(JSON.parse(p.order||'[]'))})}if(action==='saveAnnouncement'){return respond_(p.callback,saveAnnouncement_(p))}return respond_(p.callback,{success:false,message:'Action tidak dikenal: '+action});}catch(err){return respond_(p.callback,{success:false,message:String(err&&err.message||err)})}}
