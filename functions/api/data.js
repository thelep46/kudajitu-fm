const GAS = 'https://script.google.com/macros/s/AKfycbyUB8drjL1dSJedYjKIKjVc5gzIE3Pe-QS0FF8o1_zU4NkAweGLFquhHLfy1Nt_eITA-Q/exec';
const ALLOWED_ACTIONS = new Set(['data']);

function parseUpstream(text) {
  const raw = String(text || '').trim();
  try { return JSON.parse(raw); } catch (_) {}
  const match = raw.match(/^[^(]+\((.*)\)\s*;?\s*$/s);
  if (match) {
    try { return JSON.parse(match[1]); } catch (_) {}
  }
  return null;
}

export async function onRequestGet({ request }) {
  const incoming = new URL(request.url);
  const action = String(incoming.searchParams.get('action') || '').trim().toLowerCase();
  if (!ALLOWED_ACTIONS.has(action)) {
    return Response.json({ success: false, message: 'Action data tidak diizinkan.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }

  const target = new URL(GAS);
  incoming.searchParams.forEach((value, key) => {
    if (key !== 'callback' && key !== 'prefix' && key !== '_') target.searchParams.append(key, value);
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const upstream = await fetch(target.toString(), {
      method: 'GET',
      redirect: 'follow',
      cache: 'no-store',
      signal: controller.signal,
      headers: { 'Accept': 'application/json, text/plain;q=0.9, */*;q=0.8' }
    });
    const body = parseUpstream(await upstream.text());
    if (!body) return Response.json({ success: false, message: 'Server data mengembalikan respons tidak valid.' }, { status: 502 });
    return Response.json(body, {
      status: upstream.ok ? 200 : upstream.status,
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache', 'X-Kuda-Data-Proxy': 'v1' }
    });
  } catch (error) {
    const aborted = error && error.name === 'AbortError';
    return Response.json({ success: false, message: aborted ? 'Server data timeout.' : 'Gagal menghubungi server data.' }, { status: 504, headers: { 'Cache-Control': 'no-store' } });
  } finally {
    clearTimeout(timer);
  }
}
