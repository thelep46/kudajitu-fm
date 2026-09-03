export async function onRequest(context){
  const response=await context.next();
  const type=response.headers.get('content-type')||'';
  if(!type.includes('text/html'))return response;
  const url=new URL(context.request.url);
  if(url.pathname==='/maintenance.html')return response;
  const text=await response.text();
  let body=text;
  const isAdminPage=url.pathname==='/admin.html'||url.pathname.endsWith('/admin.html');
  if(url.pathname==='/index.html'||url.pathname==='/'||isAdminPage||url.pathname.endsWith('/announcement.html')||url.pathname.endsWith('/users.html')||url.pathname.endsWith('/youtube-mapping.html')||/\/player(?:-[^/]+)?\.html$/.test(url.pathname)){
    body=body.replace(/https:\/\/script\.google\.com\/macros\/s\/[^'\"`\s]+/g,'/api/gas');
  }
  if(url.pathname==='/'||url.pathname==='/index.html'){
    body=body.replace(/src=[\"'](?:\.\/)?user-login-mode\.js(?:\?[^\"']*)?[\"']/g,'src="/user-login-mode.js?v=20260903-5"');
    body=body.replace(/src=[\"'](?:\.\/)?realtime-queue-refresh\.js(?:\?[^\"']*)?[\"']/g,'src="/realtime-queue-refresh.js?v=20260903-6"');
    body=body.replace(/src=[\"'](?:\.\/)?youtube-request-mapping\.js(?:\?[^\"']*)?[\"']/g,'src="/youtube-request-mapping.js?v=20260903-5"');
  }
  if(isAdminPage){
    const tag='<script src="/admin-cache-bridge.js?v=20260903-5"></script>';
    body=body.replace(/<script[^>]+src=[\"'][^\"']*\/admin-cache-bridge\.js(?:\?[^\"']*)?[\"'][^>]*><\/script>/gi,'');
    body=body.includes('</head>')?body.replace('</head>',tag+'</head>'):(body.includes('</body>')?body.replace('</body>',tag+'</body>'):body+tag);
    const loginFast='<script src="/admin-login-fast.js?v=20260903-1"></script>';
    body=body.replace(/<script[^>]+src=[\"'][^\"']*\/admin-login-fast\.js(?:\?[^\"']*)?[\"'][^>]*><\/script>/gi,'');
    body=body.includes('</body>')?body.replace('</body>',loginFast+'</body>'):body+loginFast;
  }
  if(url.pathname==='/'||url.pathname.endsWith('.html')){
    const hasYtMapping=/src=[\"'](?:\.\/)?youtube-request-mapping\.js(?:\?[^\"']*)?[\"']/.test(body);
    const injection=hasYtMapping?'<script src="/youtube-request-mapping-batch-v2.js?v=20260903-5"></script>':'<script src="/youtube-request-mapping.js?v=20260903-5"></script><script src="/youtube-request-mapping-batch-v2.js?v=20260903-5"></script>';
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
