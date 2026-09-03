(function(){
'use strict';
var WRITE_ACTIONS=/[?&]action=(?:add|addBatch|updateStatus|markPlayed|updateStatuses|delete|deleteBatch|reorder|setQueueOrder|saveUser|deleteUser|adminResetPassword|saveAnnouncement|clearAnnouncement|setUserLoginMode)(?:&|$)/i;
var installed=false;
function install(){
  if(installed||window.__kudaAdminCacheBridge)return true;
  if(typeof window.jsonp!=='function')return false;
  var original=window.jsonp;
  window.jsonp=function(url,timeout){
    var raw=String(url||'');
    if(WRITE_ACTIONS.test(raw)){
      try{
        var u=new URL(raw,location.href);
        if(u.hostname==='script.google.com'){
          var params=new URLSearchParams(u.search);
          ['callback','prefix','_'].forEach(function(k){params.delete(k)});
          u=new URL('/api/gas',location.origin);
          params.forEach(function(v,k){u.searchParams.append(k,v)});
          raw=u.toString();
        }
      }catch(e){}
    }
    return original(raw,timeout);
  };
  window.__kudaAdminCacheBridge=true;
  installed=true;
  return true;
}
if(!install())[0,50,150,300,750,1500,3000].forEach(function(ms){setTimeout(install,ms)});
})();
