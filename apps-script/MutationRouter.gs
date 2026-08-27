/**
 * KUDAJITU FM - MutationRouter
 * Persistent YouTube song mapping.
 * No doGet() wrapper is defined here.
 */
var KUDA_YT_MAP_SHEET='youtube_map';
function kudaYoutubeMapSheet_(){
  var ss=SpreadsheetApp.getActiveSpreadsheet(),s=ss.getSheetByName(KUDA_YT_MAP_SHEET);
  if(!s){s=ss.insertSheet(KUDA_YT_MAP_SHEET);s.getRange(1,1,1,4).setValues([['Key','Title','Artist','Video ID']]);s.setFrozenRows(1);}
  return s;
}
function kudaYoutubeKey_(title,artist){return String((title||'')+'|'+(artist&&artist!=='Unknown Artist'?artist:'')).trim().toLowerCase().replace(/\s+/g,' ');}
function kudaYoutubeMappings_(p){
  kudaRequireAdmin_(p);var s=kudaYoutubeMapSheet_(),last=s.getLastRow(),out={};
  if(last>=2)s.getRange(2,1,last-1,4).getValues().forEach(function(r){var key=String(r[0]||'').trim(),video=String(r[3]||'').trim();if(key&&video)out[key]=video;});
  return{success:true,mappings:out};
}
function kudaSaveYoutubeMapping_(p){
  kudaRequireAdmin_(p);var title=String(p.title||'').trim(),artist=String(p.artist||'').trim(),video=String(p.videoId||'').trim();
  if(!title)return{success:false,message:'Judul lagu wajib diisi.'};
  if(!/^[A-Za-z0-9_-]{11}$/.test(video))return{success:false,message:'Video ID YouTube tidak valid.'};
  var key=kudaYoutubeKey_(title,artist),s=kudaYoutubeMapSheet_(),last=s.getLastRow();
  if(last>=2){var rows=s.getRange(2,1,last-1,4).getValues();for(var i=0;i<rows.length;i++)if(String(rows[i][0]||'')===key){s.getRange(i+2,2,1,3).setValues([[title,artist,video]]);return{success:true,message:'Mapping YouTube diperbarui.',key:key,videoId:video};}}
  s.appendRow([key,title,artist,video]);return{success:true,message:'Mapping YouTube disimpan.',key:key,videoId:video};
}
function kudaDeleteYoutubeMapping_(p){
  kudaRequireAdmin_(p);var key=String(p.key||'').trim(),s=kudaYoutubeMapSheet_(),last=s.getLastRow();if(last<2)return{success:true,message:'Mapping tidak ditemukan.'};
  var rows=s.getRange(2,1,last-1,1).getValues();for(var i=0;i<rows.length;i++)if(String(rows[i][0]||'')===key){s.deleteRow(i+2);return{success:true,message:'Mapping dihapus.'};}
  return{success:true,message:'Mapping tidak ditemukan.'};
}
