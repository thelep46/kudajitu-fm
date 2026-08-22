(() => {
  'use strict';

  const state = { filter: 'all', busy: false };
  const statusMap = {
    pending: ['menunggu', 'pending', 'waiting', 'antrean', 'queued'],
    processing: ['diproses', 'processing', 'playing', 'proses'],
    completed: ['selesai', 'completed', 'done', 'played'],
    rejected: ['ditolak', 'rejected', 'cancelled', 'canceled']
  };

  const normalize = value => String(value ?? '').trim().toLowerCase();
  const getStatus = row => normalize(row.status || row.state || row.status_request || row.requestStatus);
  const matches = (row, filter) => filter === 'all' || (statusMap[filter] || []).some(s => getStatus(row).includes(s));

  function getRows() {
    const source = window.__ADMIN_REQUESTS__;
    if (Array.isArray(source)) return source;
    return Array.isArray(window.requests) ? window.requests : [];
  }

  function render(rows) {
    const host = document.querySelector('#adminRequestPanel');
    if (!host) return;
    const filtered = rows.filter(r => matches(r, state.filter));
    host.innerHTML = `
      <div class="admin-req-toolbar">
        ${['all','pending','processing','completed','rejected'].map(f => `<button type="button" data-admin-filter="${f}" class="${state.filter === f ? 'active' : ''}">${f === 'all' ? 'Semua' : f === 'pending' ? 'Menunggu' : f === 'processing' ? 'Diproses' : f === 'completed' ? 'Selesai' : 'Ditolak'}</button>`).join('')}
      </div>
      <div class="admin-req-list">
        ${filtered.length ? filtered.map((r, i) => `
          <article class="admin-req-card">
            <div><strong>${escapeHtml(r.title || r.song || r.songTitle || 'Tanpa judul')}</strong></div>
            <div>${escapeHtml(r.artist || r.singer || r.requester || '-')}</div>
            <span class="admin-req-status">${escapeHtml(r.status || r.state || 'Menunggu')}</span>
            <div class="admin-req-actions">
              <button type="button" data-admin-action="processing" data-index="${i}">▶ Proses</button>
              <button type="button" data-admin-action="completed" data-index="${i}">✓ Selesai</button>
              <button type="button" data-admin-action="rejected" data-index="${i}">✕ Tolak</button>
            </div>
          </article>`).join('') : '<div class="admin-req-empty">Tidak ada request pada filter ini.</div>'}
      </div>`;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  document.addEventListener('click', event => {
    const filter = event.target.closest('[data-admin-filter]');
    if (filter) {
      state.filter = filter.dataset.adminFilter;
      render(getRows());
      return;
    }
    const action = event.target.closest('[data-admin-action]');
    if (!action || state.busy) return;
    const rows = getRows();
    const row = rows[Number(action.dataset.index)];
    if (!row) return;
    const label = action.dataset.adminAction === 'processing' ? 'memproses' : action.dataset.adminAction === 'completed' ? 'menyelesaikan' : 'menolak';
    if (!window.confirm(`Yakin ingin ${label} request ini?`)) return;
    state.busy = true;
    action.disabled = true;
    const fn = window.updateRequestStatus || window.setRequestStatus;
    if (typeof fn === 'function') {
      Promise.resolve(fn(row, action.dataset.adminAction)).finally(() => { state.busy = false; render(getRows()); });
    } else {
      state.busy = false;
      action.disabled = false;
    }
  });

  window.AdminRequestPanel = { render, setFilter: filter => { state.filter = filter; render(getRows()); } };
})();
