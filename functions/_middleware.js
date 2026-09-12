export async function onRequest(context){
  const url=new URL(context.request.url);
  const path=url.pathname.replace(/\/+$/,'')||'/';
  const SUPABASE_URL='https://jdqcvfqysmjreibcaduk.supabase.co';
  const SUPABASE_KEY='sb_publishable_QDcyGfH-3dBNmUYE9pKIkg_uFmRsmOa';
  const MAINTENANCE_ENDPOINT=SUPABASE_URL+'/rest/v1/site_settings?select=value&key=eq.maintenance&limit=1';

  const isAdminPage=path==='/admin'||path==='/admin.html';
  const isAdminArea=isAdminPage||path==='/users'||path==='/users.html'||path==='/announcement'||path==='/announcement.html'||path==='/youtube-mapping'||path==='/youtube-mapping.html';
  const isPlayer=path==='/player'||path==='/player.html'||/^\/player-[^/]+\.html$/.test(path);
  const isMaintenancePage=path==='/maintenance'||path==='/maintenance.html';
  const isPageRequest=path==='/'||path.endsWith('.html')||!path.includes('.');

  if(isPageRequest&&!isAdminArea&&!isPlayer&&!isMaintenancePage){
    try{
      const response=await fetch(MAINTENANCE_ENDPOINT,{headers:{apikey:SUPABASE_KEY,Accept:'application/json'},cache:'no-store'});
      if(response.ok){
        const rows=await response.json();
        const value=rows?.[0]?.value||{};
        if(value.enabled===true){
          const target=new URL('/maintenance.html',url.origin);
          return Response.redirect(target.toString(),302);
        }
      }
    }catch(_){
      // Fail open: a settings/API outage must not take the public site offline.
    }
  }

  let response=await context.next();
  const type=response.headers.get('content-type')||'';
  if(!type.includes('text/html'))return response;

  const text=await response.text();
  let body=text;

  // Near-realtime maintenance watcher is deliberately enabled only on public pages.
  // Admin and Player remain available during maintenance for operator control.
  if(!isAdminArea&&!isPlayer){
    const maint='<script src="/maintenance-client.js?v=20260910-3"></script>';
    body=body.includes('</body>')?body.replace('</body>',maint+'</body>'):body+maint;
  }

  if(isHome(path)){
    const sb='<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>',bridge='<script src="/supabase-user-bridge.js?v=20260904-10"></script>',limit='<script src="/daily-limit-popup.js?v=20260909-1"></script>';
    body=body.replace(/<script[^>]+src=["']https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js[^"']*["'][^>]*><\/script>/gi,'');
    body=body.replace(/<script[^>]+src=["'](?:\.\/)?supabase-user-bridge\.js(?:\?[^"']*)?["'][^>]*><\/script>/gi,'');
    body=body.replace(/<script[^>]+src=["'](?:\.\/)?realtime-queue-refresh\.js(?:\?[^"']*)?["'][^>]*><\/script>/gi,'');
    body=body.includes('</head>')?body.replace('</head>',sb+bridge+'</head>'):sb+bridge+body;
    body=body.includes('</body>')?body.replace('</body>','<script src="/realtime-queue-refresh.js?v=20260904-9"></script>'+limit+'</body>'):body+'<script src="/realtime-queue-refresh.js?v=20260904-9"></script>'+limit;
    body=body.replace(/loadCache\(\);\s*loadData\(true\);/g,'loadCache();');
    body=body.replace(/src=["'](?:\.\/)?user-login-mode\.js(?:\?[^"']*)?["']/g,'src="/user-login-mode.js?v=20260904-6"');
    body=body.replace(/src=["'](?:\.\/)?user-access\.js(?:\?[^"']*)?["']/g,'src="/user-access.js?v=20260904-10"');
    body=body.replace(/src=["'](?:\.\/)?youtube-request-mapping\.js(?:\?[^"']*)?["']/g,'src="/youtube-request-mapping.js?v=20260904-8"');
    body=body.replace(/src=["'](?:\.\/)?announcement\.js(?:\?[^"']*)?["']/g,'src="/announcement.js?v=20260904-5"');
    body=body.replace(/Maksimal 3 lagu aktif per nama\.?/gi,'Tidak ada batas jumlah request lagu.');
  }

  if(isAdminArea){
    const sb='<script src="https://cdn.jsdelivr.net/npm/@supabase\/supabase-js@2"></script>',bridge='<script src="/admin-supabase.js?v=20260904-12"></script>',maint='<script src="/maintenance-admin.js?v=20260910-1"></script>';
    body=body.replace(/<script[^>]+src=["']https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js[^"']*["'][^>]*><\/script>/gi,'');
    body=body.replace(/<script[^>]+src=["'][^"']*\/admin-supabase\.js(?:\?[^"']*)?["'][^>]*><\/script>/gi,'');
    body=body.replace(/<script[^>]+src=["'][^"']*\/admin-login-runtime\.js(?:\?[^"']*)?["'][^>]*><\/script>/gi,'');
    body=body.replace(/<script[^>]+src=["'][^"']*\/maintenance-admin\.js(?:\?[^"']*)?["'][^>]*><\/script>/gi,'');
    body=body.includes('</head>')?body.replace('</head>',sb+'</head>'):body+sb;
    body=body.includes('</body>')?body.replace('</body>',bridge+maint+'</body>'):body+bridge+maint;
    if(path==='/youtube-mapping'||path==='/youtube-mapping.html'){
      const ymfix='<script src="/youtube-mapping-fix.js?v=20260912-2"></script>';
      body=body.includes('</body>')?body.replace('</body>',ymfix+'</body>'):body+ymfix;
    }
  }

  if(isPlayer){
    const sb='<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>',ps='<script src="/player-supabase.js?v=20260910-1"></script>';
    body=body.replace(/<script[^>]+src=["']https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js[^"']*["'][^>]*><\/script>/gi,'');
    body=body.includes('</head>')?body.replace('</head>',sb+'</head>'):body+sb;
    body=body.replace(/<script[^>]+src=["'][^"']*\/player-supabase\.js(?:\?[^"']*)?["'][^>]*><\/script>/gi,'');
    body=body.includes('</body>')?body.replace('</body>',ps+'</body>'):body+ps;
  }

  body=body.replace(/href=["'](?:\.\/)?player\.html["']/gi,'href="/player"');
  body=body.replace(/href=["'](?:\.\/)?youtube-mapping\.html["']/gi,'href="/youtube-mapping"');
  body=body.replace(/href=["'](?:\.\/)?users\.html["']/gi,'href="/users"');
  body=body.replace(/href=["'](?:\.\/)?announcement\.html["']/gi,'href="/announcement"');
  body=body.replace(/href=["'](?:\.\/)?admin\.html["']/gi,'href="/admin"');

  const outHeaders=new Headers(response.headers);
  outHeaders.delete('content-length');
  outHeaders.set('Cache-Control','no-store');
  return new Response(body,{status:response.status,statusText:response.statusText,headers:outHeaders});
}

function isHome(path){return path==='/'||path==='/index.html';}
