(function(){
'use strict';
var installed=false;
function install(){
  if(installed)return true;
  if(typeof window.jsonp!=='function')return false;
  var original=window.jsonp;
  window.jsonp=function(url,timeout){
    var raw=String(url||'');
    return new Promise(function(resolve,reject){
      var u;
      try{u=new URL(raw,location.href)}catch(e){return reject(e)}
      if(u.hostname==='script.google.com'){
        var p=new URLSearchParams(u.search);
        u=new URL('/api/gas',location.origin);
        p.forEach(function(v,k){u.searchParams.set(k,v)});
      }
      ['callback','prefix','_','_refresh'].forEach(function(k){u.searchParams.delete(k)});
      var action=String(u.searchParams.get('action')||'').toLowerCase();
      if(action==='data'){
        u.searchParams.delete('adminToken');
        u.searchParams.delete('token');
      }
      var controller=new AbortController();
      var ms=Math.max(1000,Number(timeout)||30000);
      var timer=setTimeout(function(){controller.abort()},ms);
      fetch(u.toString(),{method:'GET',cache:'no-store',credentials:'same-origin',headers:{Accept:'application/json'},signal:controller.signal})
        .then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.text()})
        .then(function(text){
          var d;
          try{d=JSON.parse(text)}catch(e){
            var m=String(text||'').match(/^[^(]+\((.*)\)\s*;?\s*$/s);
            if(m)d=JSON.parse(m[1]);else throw e;
          }
          if(d&&d.success===false)throw new Error(d.message||'Server gagal');
          resolve(d);
        })
        .catch(function(e){reject(e)})
        .finally(function(){clearTimeout(timer)});
    }).catch(function(e){
      return original(url,timeout);
    });
  };
  window.__kudaAdminCacheBridge=true;
  installed=true;
  return true;
}
function boot(){if(!install())setTimeout(boot,25)}
boot();
})();
