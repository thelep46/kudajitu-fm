/**
 * KUDAJITU FM - MutationRouter
 * Persistent YouTube song mapping with ScriptCache.
 */
var KUDA_YT_MAP_SHEET='youtube_map';
var KUDA_YT_CACHE_KEY_='youtube_mappings_v1';
var KUDA_YT_CACHE_SECONDS_=300;
function kudaYoutubeMapSheet_(){var ss=SpreadsheetApp.getActiveSpreadsheet(),s=ss.getSheetByName(KUDA_YT_MAP_SHEET);if(!s){s=ss.insertSheet(KUDA_YT_MAP_SHEET);s.getRange(1,1,1,4).setValues([['Key','Title','Artist','Video ID']]);s.setFrozenRows(1)}return s}
function kudaYoutubeKey_(title,artist){return String((title||'')+'|'+(artist&&artist!=='Unknown Artist'?artist:'')).trim().toLowerCase().replace(/\s+/g,' ')}
function kudaYoutubeCacheGet_(){try{var raw=CacheService.getScriptCache().get(KUDA_YT_CACHE_KEY_);return raw?JSON.parse(raw):null}catch(e){return null}}
function kudaYoutubeCachePut_(map){try{var raw=JSON.stringify(map||{});if(raw.length<95000)CacheService.getScriptCache().put(KUDA_YT_CACHE_KEY_,raw,KUDA_YT_CACHE_SECONDS_)}catch(e){}}
function kudaYoutubeCacheClear_(){try{CacheService.getScriptCache().remove(KUDA_YT_CACHE_KEY_)}catch(e){}}
function kudaYoutubeReadAll_(){var cached=kudaYoutubeCacheGet_();if(cached!==null)return cached;var s=kudaYoutubeMapSheet_(),last=s.getLastRow(),out={};if(last>=2)s.getRange(2,1,last-1,4).getValues().forEach(function(r){var key=String(r[0]||'').trim(),video=String(r[3]||'').trim();if(key&&video)out[key]=video});kudaYoutubeCachePut_(out);return out}
function kudaYoutubeMappings_(p){kudaRequireAdmin_(p);return{success:true,mappings:kudaYoutubeReadAll_()}}
function kudaSaveYoutubeMapping_(p){
  kudaRequireAdmin_(p);
  var title=String(p.title||'').trim(),artist=String(p.artist||'').trim(),video=String(p.videoId||'').trim(),oldKey=String(p.oldKey||'').trim();
  if(!title)return{success:false,message:'Judul lagu wajib diisi.'};
  if(!/^[A-Za-z0-9_-]{11}$/.test(video))return{success:false,message:'Video ID YouTube tidak valid.'};
  var key=kudaYoutubeKey_(title,artist),s=kudaYoutubeMapSheet_(),last=s.getLastRow();
  if(last>=2){
    var rows=s.getRange(2,1,last-1,4).getValues(),oldRow=-1,newRow=-1;
    for(var i=0;i<rows.length;i++){
      var rowKey=String(rows[i][0]||'').trim();
      if(rowKey===key)newRow=i+2;
      if(oldKey&&rowKey===oldKey)oldRow=i+2;
    }
    if(oldKey&&oldRow>0){
      if(newRow>0&&newRow!==oldRow){s.deleteRow(oldRow);if(newRow>oldRow)newRow--;}s.getRange(newRow>0?newRow:oldRow,1,1,4).setValues([[key,title,artist,video]]);kudaYoutubeCacheClear_();return{success:true,message:'Mapping YouTube diperbarui.',key:key,oldKey:oldKey,videoId:video};
    }
    if(newRow>0){s.getRange(newRow,1,1,4).setValues([[key,title,artist,video]]);kudaYoutubeCacheClear_();return{success:true,message:'Mapping YouTube diperbarui.',key:key,videoId:video};}
  }
  s.appendRow([key,title,artist,video]);kudaYoutubeCacheClear_();return{success:true,message:'Mapping YouTube disimpan.',key:key,videoId:video};
}
function kudaDeleteYoutubeMapping_(p){kudaRequireAdmin_(p);var key=String(p.key||'').trim(),s=kudaYoutubeMapSheet_(),last=s.getLastRow();if(last<2)return{success:true,message:'Mapping tidak ditemukan.'};var rows=s.getRange(2,1,last-1,1).getValues();for(var i=0;i<rows.length;i++)if(String(rows[i][0]||'')===key){s.deleteRow(i+2);kudaYoutubeCacheClear_();return{success:true,message:'Mapping dihapus.'}}return{success:true,message:'Mapping tidak ditemukan.'}}
