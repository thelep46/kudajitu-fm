var KUDA_ID_INDEX_PROP_='kudajitu_id_index_v1';
var KUDA_ID_INDEX_CACHE_='kudajitu_id_index_cache_v1';
var KUDA_ID_INDEX_CACHE_SECONDS_=300;
function kudaIdIndexGet_(){try{var raw=CacheService.getScriptCache().get(KUDA_ID_INDEX_CACHE_);return raw?JSON.parse(raw):null}catch(e){return null}}
function kudaIdIndexPut_(map){try{var raw=JSON.stringify(map||{});if(raw.length<95000)CacheService.getScriptCache().put(KUDA_ID_INDEX_CACHE_,raw,KUDA_ID_INDEX_CACHE_SECONDS_)}catch(e){}}
function kudaIdIndexLoad_(sheet){var cached=kudaIdIndexGet_();if(cached!==null)return cached;var last=sheet.getLastRow(),map={};if(last>=2){var vals=sheet.getRange(2,1,last-1,1).getValues();for(var i=0;i<vals.length;i++){var id=String(vals[i][0]||'');if(id)map[id]=i+2;}}kudaIdIndexPut_(map);return map}
function kudaIdIndexClear_(){try{CacheService.getScriptCache().remove(KUDA_ID_INDEX_CACHE_)}catch(e){}}
(function(){
  if(typeof appendIfMissing_==='function'&&!appendIfMissing_.__kudaFastMutationWrapped){
    var originalAppend=appendIfMissing_;
    var wrappedAppend=function(sheet,items){
      var idx=kudaIdIndexLoad_(sheet),accepted=[],rows=[];
      items=(items||[]);
      items.forEach(function(item){
        var id=String(item.id||generateId_());
        if(idx[id]){accepted.push(id);return;}
        idx[id]=(sheet.getLastRow()+1)+rows.length;
        accepted.push(id);
        rows.push([id,String(item.requester||''),String(item.title||''),String(item.artist||''),String(item.note||''),item.timestamp||new Date().toISOString(),normalizeStatus_(item.status||'pending'),Number(item.votes||1),'']);
      });
      if(rows.length){var start=sheet.getLastRow()+1;sheet.getRange(start,1,rows.length,9).setValues(rows);}
      if(rows.length&&typeof autoMapRequestsYouTube_==='function')autoMapRequestsYouTube_(rows.map(function(r){return{title:r[2],artist:r[3],note:r[4]};}));
      kudaIdIndexPut_(idx);
      return{accepted:accepted,added:rows.length,existing:accepted.length-rows.length};
    };
    wrappedAppend.__kudaFastMutationWrapped=true;
    appendIfMissing_=wrappedAppend;
  }
  if(typeof kudaYoutubeReadAll_==='function'&&!kudaYoutubeReadAll_.__kudaFastMutationWrapped){
    var originalYoutubeRead=kudaYoutubeReadAll_;
    var wrappedYoutubeRead=function(){return originalYoutubeRead.apply(this,arguments)};
    wrappedYoutubeRead.__kudaFastMutationWrapped=true;
    kudaYoutubeReadAll_=wrappedYoutubeRead;
  }
})();
