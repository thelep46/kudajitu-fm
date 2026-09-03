var KUDA_ADMIN_FAST_MUTATION_TAG_='v2';
function kudaAdminFastGroups_(rows){
  rows=(rows||[]).filter(function(n){return Number(n)>1}).map(Number).sort(function(a,b){return a-b});
  var groups=[];
  rows.forEach(function(row){
    var last=groups[groups.length-1];
    if(last&&row===last.start+last.count)last.count++;
    else groups.push({start:row,count:1});
  });
  return groups;
}
(function(){
  if(typeof mutate_!=='function'||mutate_.__kudaAdminFastMutationWrapped)return;
  var originalMutate=mutate_;
  var wrappedMutate=function(sheet,p){
    var action=String(p&&p.action||'');
    if(action!=='updateStatus'&&action!=='markPlayed'&&action!=='updateStatuses'&&action!=='delete'&&action!=='deleteBatch')return originalMutate.apply(this,arguments);
    if(typeof kudaIdIndexLoad_!=='function')return originalMutate.apply(this,arguments);
    var idx=kudaIdIndexLoad_(sheet), wanted=String(p&&p.ids||'').split(',').map(function(x){return x.trim()}).filter(Boolean);
    var status=normalizeStatus_(p&&p.status||'played');
    var playedAt=status==='played'?new Date().toISOString():'';
    if(action==='updateStatus'||action==='markPlayed'){
      var id=String(p&&p.id||'').trim(),row=Number(idx[id]||0);
      if(row<2)return{success:false,action:'updateStatus',message:'ID request tidak ditemukan: '+id};
      sheet.getRange(row,7).setValue(status);
      sheet.getRange(row,9).setValue(playedAt);
      clearCaches_(true);
      return{success:true,action:'updateStatus',id:id,row:row,status:status,playedAt:playedAt,message:status==='played'?'Request ditandai sudah diputar.':'Request dikembalikan ke antrean.'};
    }
    if(action==='updateStatuses'){
      var rows=[];
      wanted.forEach(function(id){if(idx[id])rows.push(Number(idx[id]));});
      if(!rows.length)return{success:true,action:'updateStatuses',updated:0};
      var groups=kudaAdminFastGroups_(rows),updated=0;
      groups.forEach(function(g){
        var statuses=[],played=[];
        for(var i=0;i<g.count;i++){statuses.push([status]);played.push([playedAt]);}
        sheet.getRange(g.start,7,g.count,1).setValues(statuses);
        sheet.getRange(g.start,9,g.count,1).setValues(played);
        updated+=g.count;
      });
      clearCaches_(true);
      return{success:true,action:'updateStatuses',updated:updated};
    }
    if(action==='delete'){
      var did=String(p&&p.id||'').trim(),dr=Number(idx[did]||0);
      if(dr<2)return{success:false,action:'delete',message:'ID request tidak ditemukan'};
      sheet.deleteRow(dr);
      if(typeof kudaIdIndexClear_==='function')kudaIdIndexClear_();
      pruneQueueOrder_();
      clearCaches_();
      return{success:true,action:'delete',id:did};
    }
    if(action==='deleteBatch'){
      var rowsToDelete=[];
      wanted.forEach(function(id){if(idx[id])rowsToDelete.push(Number(idx[id]));});
      rowsToDelete.sort(function(a,b){return b-a;});
      var groups=[];
      rowsToDelete.forEach(function(r){var g=groups[groups.length-1];if(g&&r===g.start-1){g.start=r;g.count++;}else groups.push({start:r,count:1});});
      groups.forEach(function(g){sheet.deleteRows(g.start,g.count);});
      if(typeof kudaIdIndexClear_==='function')kudaIdIndexClear_();
      pruneQueueOrder_();
      clearCaches_();
      return{success:true,action:'deleteBatch',deleted:rowsToDelete.length};
    }
    return originalMutate.apply(this,arguments);
  };
  wrappedMutate.__kudaAdminFastMutationWrapped=true;
  mutate_=wrappedMutate;
})();
