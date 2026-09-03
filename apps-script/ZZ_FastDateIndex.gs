var KUDA_FAST_DATE_INDEX_PREFIX_='kudajitu_fast_date_start_v1_';
function kudaFastDateStartKey_(dateKey){return KUDA_FAST_DATE_INDEX_PREFIX_+String(dateKey||'');}
function kudaFastDateStartGet_(dateKey){try{var raw=PropertiesService.getScriptProperties().getProperty(kudaFastDateStartKey_(dateKey));var n=Number(raw||0);return n>1?n:0}catch(e){return 0}}
function kudaFastDateStartSet_(dateKey,row){try{if(dateKey&&row>1)PropertiesService.getScriptProperties().setProperty(kudaFastDateStartKey_(dateKey),String(row));}catch(e){}}
function kudaFastBuildDateIndexFromScan_(sheet,targetKey){
  var last=sheet.getLastRow();
  if(last<2)return 0;
  var end=last,first=0;
  while(end>=2){
    var start=Math.max(2,end-RECENT_SCAN_BLOCK_ROWS_+1),dates=sheet.getRange(start,6,end-start+1,1).getValues();
    for(var i=dates.length-1;i>=0;i--){
      var key=dateKey_(dates[i][0]),row=start+i;
      if(key===targetKey)first=row;
      else if(first&&key&&key<targetKey){end=1;break}
    }
    if(end===1)break;
    end=start-1;
  }
  if(first)kudaFastDateStartSet_(targetKey,first);
  return first;
}
function kudaFastRecentRows_(sheet,targetKey){
  var last=sheet.getLastRow();
  if(last<2)return[];
  var start=kudaFastDateStartGet_(targetKey);
  if(!start)start=kudaFastBuildDateIndexFromScan_(sheet,targetKey);
  if(!start)return[];
  var end=last;
  var today=todayKey_();
  if(targetKey!==today){
    var nextKey=today;
    var nextStart=kudaFastDateStartGet_(nextKey);
    if(nextStart>start)end=nextStart-1;
    else return null;
  }
  if(end<start)return[];
  var vals=sheet.getRange(start,1,end-start+1,9).getValues(),out=[];
  for(var j=0;j<vals.length;j++)if(vals[j][0]&&dateKey_(vals[j][5])===targetKey)out.push(rowToObject_(vals[j]));
  out.sort(function(a,b){
    if(a.status==='played'&&b.status==='played')return(toDate_(b.playedAt||b.timestamp)||0)-(toDate_(a.playedAt||a.timestamp)||0);
    return(toDate_(a.timestamp)||0)-(toDate_(b.timestamp)||0);
  });
  return applyQueueOrder_(out);
}
function kudaFastIndexAfterAppend_(items,appendStart,added){
  if(!added||!items||!items.length)return;
  var counts={},rows={};
  for(var i=0;i<items.length;i++){
    var key=dateKey_(items[i]&&items[i].timestamp||'');
    if(key){counts[key]=(counts[key]||0)+1;var r=appendStart+i;if(!rows[key]||r<rows[key])rows[key]=r;}
  }
  Object.keys(rows).forEach(function(key){var existing=kudaFastDateStartGet_(key);if(!existing||rows[key]<existing)kudaFastDateStartSet_(key,rows[key]);});
}
(function(){
  if(typeof getRecentRows_==='function'&&!getRecentRows_.__kudaFastDateWrapped){
    var originalRecent=getRecentRows_;
    var wrappedRecent=function(sheet,targetKey){
      var fast=kudaFastRecentRows_(sheet,targetKey);
      return fast===null?originalRecent.call(this,sheet,targetKey):fast;
    };
    wrappedRecent.__kudaFastDateWrapped=true;
    getRecentRows_=wrappedRecent;
  }
  if(typeof appendIfMissing_==='function'&&!appendIfMissing_.__kudaFastDateWrapped){
    var originalAppend=appendIfMissing_;
    var wrappedAppend=function(sheet,items){
      var appendStart=sheet.getLastRow()+1;
      var result=originalAppend.apply(this,arguments);
      try{kudaFastIndexAfterAppend_(items,appendStart,Number(result&&result.added||0));}catch(e){}
      return result;
    };
    wrappedAppend.__kudaFastDateWrapped=true;
    appendIfMissing_=wrappedAppend;
  }
})();
