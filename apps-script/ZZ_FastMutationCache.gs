var KUDA_ID_INDEX_CACHE_='kudajitu_id_index_cache_v3';
var KUDA_ID_INDEX_CACHE_SECONDS_=300;
function kudaIdIndexGet_(){try{var raw=CacheService.getScriptCache().get(KUDA_ID_INDEX_CACHE_);return raw?JSON.parse(raw):null}catch(e){return null}}
function kudaIdIndexPut_(map){try{var raw=JSON.stringify(map||{});if(raw.length<95000)CacheService.getScriptCache().put(KUDA_ID_INDEX_CACHE_,raw,KUDA_ID_INDEX_CACHE_SECONDS_)}catch(e){}}
function kudaIdIndexLoad_(sheet){var cached=kudaIdIndexGet_();if(cached!==null)return cached;var last=sheet.getLastRow(),map={};if(last>=2){var vals=sheet.getRange(2,1,last-1,1).getValues();for(var i=0;i<vals.length;i++){var id=String(vals[i][0]||'');if(id)map[id]=i+2;}}kudaIdIndexPut_(map);return map}
function kudaIdIndexClear_(){try{CacheService.getScriptCache().remove(KUDA_ID_INDEX_CACHE_)}catch(e){}}
function kudaFastAppendIndexDate_(items,startRow,added){if(typeof kudaFastIndexAfterAppend_!=='function'||!items||!items.length||!added)return;try{kudaFastIndexAfterAppend_(items,startRow,added)}catch(e){}}
(function(){
  if(typeof appendIfMissing_==='function'&&!appendIfMissing_.__kudaFastMutationWrapped){
    var wrappedAppend=function(sheet,items){
      var lock=LockService.getScriptLock(),locked=false;
      try{
        locked=lock.tryLock(5000);
        if(!locked)throw new Error('Queue sedang sibuk. Silakan coba lagi.');
        var list=Array.isArray(items)?items:[],idx=kudaIdIndexLoad_(sheet),accepted=[],rows=[],start=sheet.getLastRow()+1;
        list.forEach(function(item){
          item=item||{};var id=String(item.id||generateId_());
          if(idx[id]){accepted.push(id);return;}
          var row=start+rows.length;idx[id]=row;accepted.push(id);
          rows.push([id,String(item.requester||''),String(item.title||''),String(item.artist||''),String(item.note||''),item.timestamp||new Date().toISOString(),normalizeStatus_(item.status||'pending'),Number(item.votes||1),'']);
        });
        if(rows.length){sheet.getRange(start,1,rows.length,9).setValues(rows);if(typeof autoMapRequestsYouTube_==='function')autoMapRequestsYouTube_(rows.map(function(r){return{title:r[2],artist:r[3],note:r[4]};}));kudaFastAppendIndexDate_(rows.map(function(r){return{timestamp:r[5]};}),start,rows.length)}
        kudaIdIndexPut_(idx);
        return{accepted:accepted,added:rows.length,existing:accepted.length-rows.length};
      }finally{if(locked){try{lock.releaseLock()}catch(e){}}}
    };
    wrappedAppend.__kudaFastMutationWrapped=true;
    appendIfMissing_=wrappedAppend;
  }
  if(typeof mutate_==='function'&&!mutate_.__kudaFastMutationInvalidationWrapped){
    var originalMutate=mutate_;
    var wrappedMutate=function(sheet,p){var action=String(p&&p.action||'');var result=originalMutate.apply(this,arguments);if(action==='delete'||action==='deleteBatch'){kudaIdIndexClear_();}return result;};
    wrappedMutate.__kudaFastMutationInvalidationWrapped=true;
    mutate_=wrappedMutate;
  }
})();
