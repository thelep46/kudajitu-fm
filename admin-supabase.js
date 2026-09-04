(function(){
  'use strict';

  var SUPABASE_URL='https://jdqcvfqysmjreibcaduk.supabase.co';
  var SUPABASE_KEY='sb_publishable_QDcyGfH-3dBNmUYE9pKIkg_uFmRsmOa';
  var FN=SUPABASE_URL+'/functions/v1/kudajitu-admin-v4';
  var client=null;
  var originalJsonp=null;
  var installed=false;

  function getClient(){
    if(client) return client;
    if(!window.supabase || typeof window.supabase.createClient!=='function') return null;
    client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
    window.KUDAJITUAdminDB={client:client};
    return client;
  }

  function ensureEmailField(){
    var box=document.getElementById('login');
    if(!box || document.getElementById('adminEmail')) return;
    var p=box.querySelector('p');
    var input=document.createElement('input');
    input.id='adminEmail';
    input.type='email';
    input.className='field mb-3';
    input.placeholder='Email admin';
    input.autocomplete='username';
    if(p && p.parentNode) p.parentNode.insertBefore(input,p.nextSibling);
    else box.appendChild(input);
  }

  function setMessage(text){
    var el=document.getElementById('loginMsg');
    if(el) el.textContent=text || '';
  }

  async function loginAdmin(){
    var c=getClient();
    if(!c){ setMessage('Database Admin belum siap. Muat ulang halaman.'); return false; }
    ensureEmailField();
    var email=(document.getElementById('adminEmail') || {}).value || '';
    var password=(document.getElementById('password') || {}).value || '';
    email=email.trim();
    if(!email || !password){ setMessage('Email dan password wajib diisi.'); return false; }
    try{
      var result=await c.auth.signInWithPassword({email:email,password:password});
      if(result.error) throw result.error;
      if(!result.data || !result.data.session) throw new Error('Session login tidak tersedia.');
      if(!result.data.user || !result.data.user.app_metadata || result.data.user.app_metadata.role!=='admin'){
        try{ await c.auth.signOut(); }catch(_e){}
        throw new Error('Akun bukan Admin.');
      }
      sessionStorage.setItem('kudajitu_admin_supabase','1');
      setMessage('');
      if(typeof window.show==='function') window.show();
      if(typeof window.load==='function') await window.load(true);
      if(typeof window.loadUserLoginMode==='function') await window.loadUserLoginMode();
      return true;
    }catch(e){
      setMessage(e && e.message ? e.message : 'Login Admin gagal.');
      return false;
    }
  }

  async function verifyAdminSession(){
    var c=getClient();
    if(!c) return false;
    try{
      var result=await c.auth.getSession();
      var session=result && result.data ? result.data.session : null;
      if(!session || !session.user) return false;
      return !!(session.user.app_metadata && session.user.app_metadata.role==='admin');
    }catch(_e){ return false; }
  }

  async function logoutAdmin(){
    var c=getClient();
    try{ if(c) await c.auth.signOut(); }catch(_e){}
    sessionStorage.removeItem('kudajitu_admin_supabase');
    sessionStorage.removeItem('kudajitu_admin_token');
    window.location.reload();
  }

  function edge(action,payload){
    var c=getClient();
    if(!c) return Promise.reject(new Error('DATABASE_NOT_READY'));
    return c.auth.getSession().then(function(result){
      var session=result && result.data ? result.data.session : null;
      var token=session && session.access_token ? session.access_token : '';
      if(!token) throw new Error('LOGIN_REQUIRED');
      return fetch(FN,{
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
        body:JSON.stringify(Object.assign({action:action},payload||{}))
      });
    }).then(function(res){
      return res.json().catch(function(){ return {success:false,message:'Respons server tidak valid.'}; }).then(function(data){
        if(!res.ok || data.success===false) throw new Error(data.message || 'Server gagal.');
        return data;
      });
    });
  }

  function installJsonpBridge(){
    if(installed) return;
    if(typeof window.jsonp!=='function') return;
    if(window.jsonp.__kudaSupabaseBridge) return;
    originalJsonp=window.jsonp;
    function bridge(url){
      try{
        var u=new URL(String(url||''),window.location.href);
        var raw=String(u.searchParams.get('action')||'').toLowerCase();
        var map={
          data:'data',nowplaying:'nowplaying',getqueueorder:'getqueueorder',reorder:'reorder',checkids:'checkids',youtubecheck:'youtubeCheck',youtubemappings:'youtubemappings',saveyoutubemapping:'saveyoutubemapping',deleteyoutubemapping:'deleteyoutubemapping',announcement:'announcement',saveannouncement:'saveannouncement',clearannouncement:'clearannouncement',userloginmode:'userloginmode',setuserloginmode:'setuserloginmode',updatestatus:'updateStatus',markplayed:'markPlayed',updatestatuses:'updateStatuses',delete:'delete',deletebatch:'deleteBatch',users:'users'
        };
        if(!map[raw]) return originalJsonp(url);
        var payload={};
        u.searchParams.forEach(function(value,key){
          if(key!=='action' && key!=='callback' && key!=='prefix' && key!=='_' && key!=='adminToken' && key!=='token') payload[key]=value;
        });
        return edge(map[raw],payload);
      }catch(e){ return Promise.reject(e); }
    }
    bridge.__kudaSupabaseBridge=true;
    window.jsonp=bridge;
    installed=true;
  }

  function bindLoginEvents(){
    var button=document.querySelector('#login button[onclick="login()"]');
    if(button && !button.dataset.kudaSupabaseBound){
      button.dataset.kudaSupabaseBound='1';
      button.onclick=function(ev){ if(ev) ev.preventDefault(); loginAdmin(); };
    }
    var password=document.getElementById('password');
    if(password && !password.dataset.kudaSupabaseBound){
      password.dataset.kudaSupabaseBound='1';
      password.addEventListener('keydown',function(ev){if(ev.key==='Enter'){ev.preventDefault();loginAdmin();}});
    }
  }

  async function restore(){
    if(!await verifyAdminSession()) return;
    if(typeof window.show==='function') window.show();
    if(typeof window.load==='function') await window.load(true);
    if(typeof window.loadUserLoginMode==='function') await window.loadUserLoginMode();
  }

  function start(){
    getClient(); ensureEmailField(); bindLoginEvents(); installJsonpBridge();
    window.login=loginAdmin; window.verifySession=verifyAdminSession; window.logout=logoutAdmin; window.token=function(){return ''};
    setTimeout(function(){ensureEmailField();bindLoginEvents();installJsonpBridge()},100);
    setTimeout(function(){ensureEmailField();bindLoginEvents();installJsonpBridge()},500);
    setTimeout(function(){restore()},300);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
})();
