const GAS='https://script.google.com/macros/s/AKfycbyUB8drjL1dSJedYjKIKjVc5gzIE3Pe-QS0FF8o1_zU4NkAweGLFquhHLfy1Nt_eITA-Q/exec';
export async function onRequest(context){
  const response=await context.next();
  const type=response.headers.get('content-type')||'';
  if(!type.includes('text/html'))return response;
  const url=new URL(context.request.url);
  if(url.pathname==='/maintenance.html')return response;
  const text=await response.text();
  let body=text.split(GAS).join('/api/gas');
  if(/\/player(?:-[^/]+)?\.html$/.test(url.pathname)){
    const injection='<script src="/api-router.js?v=20260829-1"></script>';
    body=body.includes('</body>')?body.replace('</body>',injection+'</body>'):body+injection;
  }
  if(url.pathname==='/'||url.pathname.endsWith('.html')){
    const injection='<script src="/performance.js?v=20260829-1"></script>';
    body=body.includes('</body>')?body.replace('</body>',injection+'</body>'):body+injection;
  }
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  return new Response(body,{status:response.status,statusText:response.statusText,headers});
}
