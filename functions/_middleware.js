export async function onRequest(context){
  const response=await context.next();
  const type=response.headers.get('content-type')||'';
  if(!type.includes('text/html'))return response;
  const url=new URL(context.request.url);
  if(url.pathname==='/maintenance.html')return response;
  const text=await response.text();
  let body=text;
  const path=url.pathname.replace(/\/+$/,'')||'/';
  const isAdminPage=path==='/admin'||path==='/admin.html';
  const isAdminDataPage=isAdminPage||path==='/users'||path==='/users.html'||path==='/announcement'||path==='/announcement.html'||path==='/youtube-mapping'||path==='/youtube-mapping.html';
  const isHome=path==='/'||path==='/index.html';
  const isPlayer=path==='/player'||path==='/player.html'||/^\/player-[^/]+\.html$/.test(path);
  if(isHome){
    const sb='<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>',bridge='<script src="/supabase-user-bridge.js?v=20260904-9"></script>';
    body=body.replace(/<script[^>]+src=["']https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js[^"']*["'][^>]*><\/script>/gi,'');
    body=body.replace(/<script[^>]+src=["'](?:\.\/)?supabase-user-bridge\.js(?:\?[^"']*)?["'][^>]*><\/script>/gi,'');
    body=body.replace(/<script[^>]+src=["'](?:\.\/)?realtime-queue-refresh\.js(?:\?[^"']*)?["'][^>]*><\/script>/gi,'');
    body=body.includes('</head>')?body.replace('</head>',sb+bridge+'</head>'):sb+bridge+body;
    body=body.includes('</body>')?body.replace('</body>','<script src="/realtime-queue-refresh.js?v=20260904-9"></script></body>'):body+'<script src="/realtime-queue-refresh.js?v=20260904-9"></script>';
    body=body.replace(/loadCache\(\);\s*loadData\(true\);/g,'loadCache();');
    body=body.replace(/src=["'](?:\.\/)?user-login-mode\.js(?:\?[^"']*)?["']/g,'src="/user-login-mode.js?v=20260904-6"');
    body=body.replace(/src=["'](?:\.\/)?user-access\.js(?:\?[^"']*)?["']/g,'src="/user-access.js?v=20260904-10"');
    body=body.replace(/src=["'](?:\.\/)?youtube-request-mapping\.js(?:\?[^"']*)?["']/g,'src="/youtube-request-mapping.js?v=20260904-8"');
    body=body.replace(/src=["'](?:\.\/)?announcement\.js(?:\?[^"']*)?["']/g,'src="/announcement.js?v=20260904-5"');
  }
  if(isAdminDataPage){
    const sb='<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>',bridge='<script src="/admin-supabase.js?v=20260904-10"></script>',runtime='<script src="/admin-login-runtime.js?v=20260904-4"></script>';
    body=body.replace(/<script[^>]+src=["']https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js[^"']*["'][^>]*><\/script>/gi,'');
    body=body.replace(/<script[^>]+src=["'][^"']*\/admin-supabase\.js(?:\?[^"']*)?["'][^>]*><\/script>/gi,'');
    body=body.replace(/<script[^>]+src=["'][^"']*\/admin-login-runtime\.js(?:\?[^"']*)?["'][^>]*><\/script>/gi,'');
    body=body.includes('</head>')?body.replace('</head>',sb+'</head>'):body+sb;
    body=body.includes('</body>')?body.replace('</body>',bridge+runtime+'</body>'):body+bridge+runtime;
  }
  if(isPlayer){
    const sb='<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>',ps='<script src="/player-supabase.js?v=20260904-9"></script>';
    body=body.replace(/<script[^>]+src=["']https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js[^"']*["'][^>]*><\/script>/gi,'');
    body=body.includes('</head>')?body.replace('</head>',sb+'</head>'):body+sb;
    body=body.replace(/<script[^>]+src=["'][^"']*\/player-supabase\.js(?:\?[^"']*)?["'][^>]*><\/script>/gi,'');
    body=body.includes('</body>')?body.replace('</body>',ps+'</body>'):body+ps;
  }
  const headers=new Headers(response.headers);headers.delete('content-length');headers.set('Cache-Control','no-store');
  return new Response(body,{status:response.status,statusText:response.statusText,headers});
}
