export async function onRequest(context){
  const response=await context.next();
  const type=response.headers.get('content-type')||'';
  if(!type.includes('text/html'))return response;
  const url=new URL(context.request.url);
  if(url.pathname==='/maintenance.html')return response;
  const text=await response.text();
  let body=text;
  if(url.pathname==='/index.html'||url.pathname==='/'||url.pathname==='/admin.html'||url.pathname.endsWith('/admin.html')||url.pathname.endsWith('/announcement.html')||url.pathname.endsWith('/users.html')||url.pathname.endsWith('/youtube-mapping.html')||/\/player(?:-[^/]+)?\.html$/.test(url.pathname)){
    body=body.replace(/https:\/\/script\.google\.com\/macros\/s\/[^'\"`\s]+/g,'/api/gas');
  }
  if(/\/player(?:-[^/]+)?\.html$/.test(url.pathname)){
    const injection='<script src="/api-router.js?v=20260829-2"></script>';
    body=body.includes('</body>')?body.replace('</body>',injection+'</body>'):body+injection;
  }
  if(url.pathname==='/'||url.pathname.endsWith('.html')){
    const injection='<script src="/performance.js?v=20260829-2"></script><script src="/youtube-request-mapping.js?v=20260830-1"></script><script src="/youtube-request-mapping-batch.js?v=20260830-1"></script>';
    body=body.includes('</body>')?body.replace('</body>',injection+'</body>'):body+injection;
  }
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  return new Response(body,{status:response.status,statusText:response.statusText,headers});
}
