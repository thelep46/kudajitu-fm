(() => {
  'use strict';
  const state = { filter: 'all', busy: false };
  const statusMap = { pending:['menunggu','pending','waiting','antrean','queued'], processing:['diproses','processing','playing','proses'], completed:['selesai','completed','done','played'], rejected:['ditolak','rejected','cancelled','canceled'] };
  const normalize = value => String(value ?? '').trim().toLowerCase();
  const getStatus = row => normalize(row.status || row.state || row.status_request || row.requestStatus);
  const matches = (row, filter) => filter === 'all' || (statusMap[filter] || []).some(s => getStatus(row).includes(s));
  const getRows = () => Array.isArray(window.__ADMIN_REQUESTS__) ? window.__ADMIN_REQUESTS__ : (Array.isArray(window.requests) ? window.requests : []);
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function render(rows){
    const host=document.querySelector('#adminRequestPanel');if(!host)return;
    const filtered=rows.filter(r=>matches(r,state.filter));
    host.innerHTML=`<div class="admin-req-toolbar">${['all','pending','processing','completed','rejected'].map(f=>`<button type="button" data-admin-filter="${f}" class="${state.filter===f?'active':''}">${f==='all'?'Semua':f==='pending'?'Menunggu':f==='processing'?'Diproses':f==='completed'?'Selesai':'Ditolak'}</button>`).join('')}</div><div class="admin-req-list">${filtered.length?filtered.map(r=>`<article class="admin-req-card" data-admin-id="${escapeHtml(r.id||'')}"><div><strong>${escapeHtml(r.title||r.song||r.songTitle||'Tanpa judul')}</strong></div><div>${escapeHtml(r.artist||r.singer||r.requester||'-')}</div><span class="admin-req-status">${escapeHtml(r.status||r.state||'Menunggu')}</span><div class="admin-req-actions"><button type="button" data-admin-action="processing">▶ Proses</button><button type="button" data-admin-action="completed">✓ Selesai</button><button type="button" data-admin-action="rejected">✕ Tolak</button></div></article>`).join(''):'<div class="admin-req-empty">Tidak ada request pada filter ini.</div>'}</div>`;
  }
  document.addEventListener('click',event=>{
    const filter=event.target.closest('[data-admin-filter]');
    if(filter){state.filter=filter.dataset.adminFilter;render(getRows());return;}
    const action=event.target.closest('[data-admin-action]');if(!action||state.busy)return;
    const card=action.closest('[data-admin-id]');if(!card)return;
    const id=card.dataset.adminId, row=getRows().find(r=>String(r.id||'')===String(id));if(!row)return;
    const kind=action.dataset.adminAction,label=kind==='processing'?'memproses':kind==='completed'?'menyelesaikan':'menolak';
    if(!window.confirm(`Yakin ingin ${label} request ini?`))return;
    state.busy=true;action.disabled=true;
    const fn=window.updateRequestStatus||window.setRequestStatus;
    if(typeof fn==='function')Promise.resolve(fn(row,kind)).finally(()=>{state.busy=false;render(getRows())});else{state.busy=false;action.disabled=false;}
  });
  window.AdminRequestPanel={render,setFilter:filter=>{state.filter=filter;render(getRows())}};
})();
