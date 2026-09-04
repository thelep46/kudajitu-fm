export async function onRequest(context){
  const response=await context.next();
  const type=response.headers.get('content-type')||'';
  if(!type.includes('text/html'))return response;
  const url=new URL(context.request.url);
  if(url.pathname==='/maintenance.html')return response;
  const text=await response.text();
  let body=text;
  const isAdminPage=url.pathname==='/admin.html'||url.pathname.endsWith('/admin.html');
  const isAdminDataPage=isAdminPage||url.pathname.endsWith('/users.html')||url.pathname.endsWith('/announcement.html')||url.pathname.endsWith('/youtube-mapping.html');
  const isHome=url.pathname==='/'||url.pathname==='/index.html';
  const isPlayer=/\/player(?:-[^/]+)?\.html$/.test(url.pathname);
  if(isHome){
    const supabaseTag='<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>';
    const bridgeTag='<script src="/supabase-user-bridge.js?v=20260904-3"></script>';
    body=body.replace(/<script[^>]+src=["']https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js[^"']*["'][^>]*><\/script>/gi,'');
    body=body.replace(/<script[^>]+src=["'](?:\.\/)?supabase-user-bridge\.js(?:\?[^"']*)?["'][^>]*><\/script>/gi,'');
    body=body.replace(/<script[^>]+src=["'](?:\.\/)?realtime-queue-refresh\.js(?:\?[^"']*)?["'][^>]*><\/script>/gi,'');
    body=body.includes('</head>')?body.replace('</head>',supabaseTag+bridgeTag+'</head>'):supabaseTag+bridgeTag+body;
    body=body.includes('</body>')?body.replace('</body>','<script src="/realtime-queue-refresh.js?v=20260904-3"></script></body>'):body+'<script src="/realtime-queue-refresh.js?v=20260904-3"></script>';
    body=body.replace(/loadCache\(\);loadData\(true\);/g,'loadCache();');
    body=body.replace(/loadCache\(\);\s*loadData\(true\);/g,'loadCache();');
    body=body.replace(/src=["'](?:\.\/)?user-login-mode\.js(?:\?[^"']*)?["']/g,'src="/user-login-mode.js?v=20260904-3"');
    body=body.replace(/src=["'](?:\.\/)?youtube-request-mapping\.js(?:\?[^"']*)?["']/g,'src="/youtube-request-mapping.js?v=20260904-2"');
    body=body.replace(/src=["'](?:\.\/)?announcement\.js(?:\?[^"']*)?["']/g,'src="/announcement.js?v=20260904-2"');
  }
  if(isAdminDataPage){
    const sb='<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>',bridge='<script src="/admin-supabase.js?v=20260904-4"></script>';
    body=body.replace(/<script[^>]+src=["']https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js[^"']*["'][^>]*><\/script>/gi,'');
    body=body.replace(/<script[^>]+src=["'][^"']*\/admin-supabase\.js(?:\?[^"']*)?["'][^>]*><\/script>/gi,'');
    body=body.includes('</head>')?body.replace('</head>',sb+'</head>'):body+sb;
    body=body.includes('</body>')?body.replace('</body>',bridge+'</body>'):body+bridge;
  }
  if(url.pathname==='/'||url.pathname.endsWith('.html')){
    const hasYtMapping=/src=["'](?:\.\/)?youtube-request-mapping\.js(?:\?[^"']*)?["']/.test(body);
    const injection=hasYtMapping?'<script src="/youtube-request-mapping-batch-v2.js?v=20260904-2"></script>':'<script src="/youtube-request-mapping.js?v=20260904-2"></script><script src="/youtube-request-mapping-batch-v2.js?v=20260904-2"></script>';
    body=body.includes('/youtube-request-mapping-batch-v2.js')?body:(body.includes('</body>')?body.replace('</body>',injection+'</body>'):body+injection);
  }
  if(isPlayer){
    const sb='<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>',ps='<script src="/player-supabase.js?v=20260904-3"></script>';
    body=body.replace(/<script[^>]+src=["']https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js[^"']*["'][^>]*><\/script>/gi,'');
    body=body.includes('</head>')?body.replace('</head>',sb+'</head>'):body+sb;
    body=body.replace(/maps=cachedMaps\(\);load\(\);ytLoad\(\);/g,'if(window.KUDAJITUPlayerSupabaseBoot){window.KUDAJITUPlayerSupabaseBoot().catch(function(e){console.error(\'[Kudajitu Player]\',e);});}');
    body=body.replace(/<script[^>]+src=["'][^"']*\/player-supabase\.js(?:\?[^"']*)?["'][^>]*><\/script>/gi,'');
    body=body.includes('</body>')?body.replace('</body>',ps+'</body>'):body+ps;
  }
  const headers=new Headers(response.headers);headers.delete('content-length');
  return new Response(body,{status:response.status,statusText:response.statusText,headers});
}
