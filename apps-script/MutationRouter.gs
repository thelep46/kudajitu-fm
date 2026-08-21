/* KUDAJITU FM - mutation compatibility router
 * Keeps status mutations independent from the request-list read path.
 * This is intentionally self-contained so a stale/older Code.gs read router
 * cannot turn a mutation request into action=data.
 */
var KUDA_MUTATION_VERSION='kudajitu-mutation-v1';

function kudaMutationResponse_(cb,d){
  d=d||{};
  d.apiVersion=d.apiVersion||API_VERSION||KUDA_MUTATION_VERSION;
  d.mutationVersion=KUDA_MUTATION_VERSION;
  return cb?jsonpResponse(cb,d):jsonResponse(d);
}

function kudaMutationGet_(e){
  var p=e&&e.parameter?e.parameter:{};
  var cb=p.callback||p.prefix||'';
  var action=String(p.action||'').trim().toLowerCase();

  if(['updateStatus','markPlayed','updateStatuses','delete','deleteBatch'].indexOf(action)<0){
    return null;
  }

  try{
    var sheet=getSheet_();
    var lock=LockService.getScriptLock();
    try{
      lock.waitLock(5000);
      if(action==='updateStatus'||action==='markPlayed'){
        var id=String(p.id||'').trim();
        if(!id)return kudaMutationResponse_(cb,{success:false,action:'updateStatus',message:'ID request kosong'});
        var row=findRowById_(sheet,id);
        if(row<0)return kudaMutationResponse_(cb,{success:false,action:'updateStatus',message:'ID request tidak ditemukan: '+id});
        var status=normalizeStatus_(p.status||'played');
        var playedAt=status==='played'?new Date().toISOString():'';
        sheet.getRange(row,7,1,3).setValues([[status,sheet.getRange(row,8).getValue(),playedAt]]);
        SpreadsheetApp.flush();
        clearCaches_();
        return kudaMutationResponse_(cb,{success:true,action:'updateStatus',id:id,row:row,status:status,playedAt:playedAt,message:status==='played'?'Request ditandai sudah diputar.':'Request dikembalikan ke antrean.'});
      }

      if(action==='updateStatuses'){
        var ids=String(p.ids||'').split(',').map(function(x){return x.trim();}).filter(Boolean);
        var status2=normalizeStatus_(p.status||'played'),changed=0;
        ids.forEach(function(id2){
          var row2=findRowById_(sheet,id2);
          if(row2>0){
            sheet.getRange(row2,7,1,3).setValues([[status2,sheet.getRange(row2,8).getValue(),status2==='played'?new Date().toISOString():'']]);
            changed++;
          }
        });
        SpreadsheetApp.flush();
        clearCaches_();
        return kudaMutationResponse_(cb,{success:true,action:'updateStatuses',updated:changed,message:changed+' request diperbarui.'});
      }

      if(action==='delete'){
        var did=String(p.id||'').trim();
        var dr=findRowById_(sheet,did);
        if(dr<0)return kudaMutationResponse_(cb,{success:false,action:'delete',message:'ID request tidak ditemukan: '+did});
        sheet.deleteRow(dr);
        SpreadsheetApp.flush();
        clearCaches_();
        return kudaMutationResponse_(cb,{success:true,action:'delete',id:did,message:'Request dihapus.'});
      }

      if(action==='deleteBatch'){
        var dels=String(p.ids||'').split(',').map(function(x){return x.trim();}).filter(Boolean);
        var all=getIds_(sheet),rows=[];
        all.forEach(function(id3,i){if(dels.indexOf(id3)!==-1)rows.push(i+2);});
        rows.sort(function(a,b){return b-a;});
        rows.forEach(function(r){sheet.deleteRow(r);});
        SpreadsheetApp.flush();
        clearCaches_();
        return kudaMutationResponse_(cb,{success:true,action:'deleteBatch',deleted:rows.length,message:rows.length+' request dihapus.'});
      }
    }finally{
      try{lock.releaseLock();}catch(x){}
    }
  }catch(err){
    return kudaMutationResponse_(cb,{success:false,action:action,message:String(err&&err.message||err)});
  }
}

/* Wrap the existing router last. AuthRouter.gs already wraps doGet, so this
 * wrapper only claims mutation actions and leaves auth/data routing untouched. */
var _kudaMutationPreviousDoGet_=doGet;
doGet=function(e){
  var p=e&&e.parameter?e.parameter:{};
  var a=String(p.action||'').trim().toLowerCase();
  if(['updatestatus','markplayed','updatestatuses','delete','deletebatch'].indexOf(a)>=0){
    return kudaMutationGet_(e);
  }
  return _kudaMutationPreviousDoGet_(e);
};

function doGetMutationHealth_(e){
  var p=e&&e.parameter?p:{};
  var cb=p.callback||p.prefix||'';
  return kudaMutationResponse_(cb,{success:true,action:'health',message:'Mutation router active'});
}