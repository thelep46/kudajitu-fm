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
  if(isHome||isAdminDataPage||/\/player(?:-[^/]+)?\.html$/.test(url.pathname)){
    body=body.replace(/https:\/\/script\.google\.com\/macros\/s\/[^'\"`\s]+/g,'/api/gas');
  }
  if(isHome){
    const supabaseTag='<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>';
    const bridgeTag='<script src="/supabase-user-bridge.js?v=20260903-6"></script>';
    body=body.replace(/<script[^>]+src=[\"']https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js[^\"']*[\"'][^>]*><\/script>/gi,'');
    body=body.includes('</head>')?body.replace('</head>',supabaseTag+'</head>'):body;
    body=body.replace(/<script[^>]+src=[\"'](?:\.\/)?supabase-user-bridge\.js(?:\?[^\"']*)?[\"'][^>]*><\/script>/gi,'');
    body=body.includes('</body>')?body.replace('</body>',bridgeTag+'</body>'):body+bridgeTag;
    body=body.replace(/loadCache\(\);loadData\(true\);/g,'loadCache();');
    body=body.replace(/loadCache\(\);\s*loadData\(true\);/g,'loadCache();');
    body=body.replace(/src=[\"'](?:\.\/)?realtime-queue-refresh\.js(?:\?[^\"']*)?[\"']/g,'src="/realtime-queue-refresh.js?v=20260903-11"');
    body=body.replace(/src=[\"'](?:\.\/)?user-login-mode\.js(?:\?[^\"']*)?[\"']/g,'src="/user-login-mode.js?v=20260903-5"');
    body=body.replace(/src=[\"'](?:\.\/)?youtube-request-mapping\.js(?:\?[^\"']*)?[\"']/g,'src="/youtube-request-mapping.js?v=20260903-6"');
    body=body.replace(/src=[\"'](?:\.\/)?announcement\.js(?:\?[^\"']*)?[\"']/g,'src="/announcement.js?v=20260903-2"');
  }
  if(isAdminDataPage){
    const sb='<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>';
    const bridge='<script src="/admin-supabase.js?v=20260903-1"></script>';
    body=body.replace(/<script[^>]+src=[\"']https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js[^\"']*[\"'][^>]*><\/script>/gi,'');
    body=body.includes('</head>')?body.replace('</head>',sb+bridge+'</head>'):body+sb+bridge;
  }
  if(isAdminPage){
    body=body.replace(/<script[^>]+src=[\"'][^\"']*\/admin-cache-bridge\.js(?:\?[^\"']*)?[\"'][^>]*><\/script>/gi,'');
    body=body.replace(/<script[^>]+src=[\"'][^\"']*\/admin-login-fast\.js(?:\?[^\"']*)?[\"'][^>]*><\/script>/gi,'');
  }
  if(url.pathname==='/'||url.pathname.endsWith('.html')){
    const hasYtMapping=/src=[\"'](?:\.\/)?youtube-request-mapping\.js(?:\?[^\"']*)?[\"']/.test(body);
    const injection=hasYtMapping?'<script src="/youtube-request-mapping-batch-v2.js?v=20260903-7"></script>':'<script src="/youtube-request-mapping.js?v=20260903-6"></script><script src="/youtube-request-mapping-batch-v2.js?v=20260903-7"></script>';
    body=body.includes('/youtube-request-mapping-batch-v2.js')?body:(body.includes('</body>')?body.replace('</body>',injection+'</body>'):body+injection);
  }
  if(/\/player(?:-[^/]+)?\.html$/.test(url.pathname)){
    const injection='<script src="/api-router.js?v=20260829-2"></script>';
    body=body.includes('</body>')?body.replace('</body>',injection+'</body>'):body+injection;
  }
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  return new Response(body,{status:response.status,statusText:response.statusText,headers});
}
