var NAMA_TAB_ANDA = 'req lagu';
var TIMEZONE = 'Asia/Jakarta';
var CACHE_SECONDS = 15;
var CACHE_PREFIX = 'kudajitu_sync_v4_';

function getSheet_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(NAMA_TAB_ANDA);
  if (!sheet) throw new Error('Sheet "' + NAMA_TAB_ANDA + '" tidak ditemukan');
  return sheet;
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function toDate_(value) {
  if (value instanceof Date) return isNaN(value.getTime()) ? null : new Date(value.getTime());
  if (!value) return null;
  var d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function dateKey_(value) {
  var d = toDate_(value);
  return d ? Utilities.formatDate(d, TIMEZONE, 'yyyy-MM-dd') : '';
}

function getTodayKey_() {
  return Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd');
}

function getYesterdayKey_() {
  var key = getTodayKey_().split('-');
  var d = new Date(Number(key[0]), Number(key[1]) - 1, Number(key[2]));
  d.setDate(d.getDate() - 1);
  return Utilities.formatDate(d, TIMEZONE, 'yyyy-MM-dd');
}

function normalizeStatus_(status) {
  var s = String(status || '').trim().toLowerCase();
  return (s === 'played' || s === 'play' || s === 'selesai' || s === 'diputar') ? 'played' : 'pending';
}

function normalizeTimestamp_(value) {
  var d = toDate_(value);
  return d ? d.toISOString() : (value ? String(value) : '');
}

function rowToObject_(row) {
  return {
    id: String(row[0] || ''),
    requester: String(row[1] || ''),
    title: String(row[2] || ''),
    artist: String(row[3] || ''),
    note: String(row[4] || ''),
    timestamp: normalizeTimestamp_(row[5]),
    status: normalizeStatus_(row[6]),
    votes: Number(row[7] || 1)
  };
}

function cacheGet_(key) {
  try {
    var value = CacheService.getScriptCache().get(CACHE_PREFIX + key);
    return value ? JSON.parse(value) : null;
  } catch (e) { return null; }
}

function cachePut_(key, data) {
  try {
    CacheService.getScriptCache().put(CACHE_PREFIX + key, JSON.stringify(data), CACHE_SECONDS);
  } catch (e) {}
}

function clearCaches_() {
  try {
    CacheService.getScriptCache().removeAll([
      CACHE_PREFIX + 'today_all',
      CACHE_PREFIX + 'yesterday_all',
      CACHE_PREFIX + 'all_all',
      CACHE_PREFIX + 'today_pending',
      CACHE_PREFIX + 'today_played',
      CACHE_PREFIX + 'yesterday_pending',
      CACHE_PREFIX + 'yesterday_played',
      CACHE_PREFIX + 'all_pending',
      CACHE_PREFIX + 'all_played'
    ]);
  } catch (e) {}
}

function getRecentRows_(sheet, targetKey) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  // Hanya baca kolom timestamp untuk menemukan batas data yang diperlukan.
  var timestamps = sheet.getRange(2, 6, lastRow - 1, 1).getValues();
  var matched = [];

  for (var i = timestamps.length - 1; i >= 0; i--) {
    var value = timestamps[i][0];
    if (!value) continue;
    var key = dateKey_(value);
    if (key === targetKey) {
      matched.push(i + 2);
    } else if (matched.length && key && key < targetKey) {
      break;
    }
  }

  if (!matched.length) return [];

  var minRow = Math.min.apply(null, matched);
  var maxRow = Math.max.apply(null, matched);
  var values = sheet.getRange(minRow, 1, maxRow - minRow + 1, 8).getValues();
  var result = [];

  for (var j = 0; j < values.length; j++) {
    if (dateKey_(values[j][5]) !== targetKey || !values[j][0]) continue;
    result.push(rowToObject_(values[j]));
  }

  result.reverse();
  return result;
}

function getAllRows_(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var values = sheet.getRange(2, 1, lastRow - 1, 8).getValues();
  var result = [];
  for (var i = 0; i < values.length; i++) {
    if (values[i][0]) result.push(rowToObject_(values[i]));
  }
  result.reverse();
  return result;
}

function filterStatus_(rows, status) {
  if (status === 'all') return rows;
  return rows.filter(function(row) { return row.status === status; });
}

function doGet(e) {
  try {
    var sheet = getSheet_();
    var params = e && e.parameter ? e.parameter : {};
    var range = String(params.range || 'all').toLowerCase();
    if (range !== 'today' && range !== 'yesterday' && range !== 'all') range = 'all';
    var status = String(params.status || 'all').toLowerCase();
    if (status !== 'all' && status !== 'pending' && status !== 'played') status = 'all';

    var cacheKey = range + '_' + status;
    var cached = cacheGet_(cacheKey);
    if (cached) {
      return jsonResponse({
        success: true, cached: true, range: range, status: status,
        timezone: TIMEZONE, today: getTodayKey_(), yesterday: getYesterdayKey_(),
        count: cached.length, data: cached
      });
    }

    var rows;
    if (range === 'today') rows = getRecentRows_(sheet, getTodayKey_());
    else if (range === 'yesterday') rows = getRecentRows_(sheet, getYesterdayKey_());
    else rows = getAllRows_(sheet);

    var filtered = filterStatus_(rows, status);
    cachePut_(cacheKey, filtered);

    return jsonResponse({
      success: true, cached: false, range: range, status: status,
      timezone: TIMEZONE, today: getTodayKey_(), yesterday: getYesterdayKey_(),
      count: filtered.length, data: filtered
    });
  } catch (error) {
    return jsonResponse({ success: false, message: error.toString(), data: [] });
  }
}

function findRowById_(sheet, id) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 2;
  return -1;
}

function generateId_() {
  return 'req_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var sheet = getSheet_();
    if (!e || !e.postData || !e.postData.contents) return jsonResponse({ success: false, message: 'Data POST kosong' });
    var data = JSON.parse(e.postData.contents);
    var action = String(data.action || '');

    if (action === 'add') {
      var item = {
        id: String(data.id || generateId_()), requester: String(data.requester || ''),
        title: String(data.title || ''), artist: String(data.artist || ''), note: String(data.note || ''),
        timestamp: data.timestamp || new Date().toISOString(), status: normalizeStatus_(data.status || 'pending'),
        votes: Number(data.votes || 1)
      };
      sheet.appendRow([item.id, item.requester, item.title, item.artist, item.note, item.timestamp, item.status, item.votes]);
      clearCaches_();
      return jsonResponse({ success: true, action: 'add', data: item, message: 'Request berhasil ditambahkan' });
    }

    if (action === 'addBatch') {
      var items = Array.isArray(data.items) ? data.items : [];
      if (!items.length) return jsonResponse({ success: false, message: 'Tidak ada data batch' });
      var rows = items.map(function(item) {
        item = item || {};
        return [String(item.id || generateId_()), String(item.requester || ''), String(item.title || ''), String(item.artist || ''), String(item.note || ''), item.timestamp || new Date().toISOString(), normalizeStatus_(item.status || 'pending'), Number(item.votes || 1)];
      });
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 8).setValues(rows);
      clearCaches_();
      return jsonResponse({ success: true, action: 'addBatch', count: rows.length, message: rows.length + ' request berhasil ditambahkan' });
    }

    if (action === 'updateStatus') {
      var id = String(data.id || '');
      if (!id) return jsonResponse({ success: false, message: 'ID tidak ditemukan' });
      var row = findRowById_(sheet, id);
      if (row < 0) return jsonResponse({ success: false, action: 'updateStatus', id: id, message: 'ID request tidak ditemukan' });
      var status = normalizeStatus_(data.status || 'pending');
      sheet.getRange(row, 7).setValue(status);
      clearCaches_();
      return jsonResponse({ success: true, action: 'updateStatus', id: id, status: status, message: 'Status berhasil diperbarui' });
    }

    if (action === 'updateStatuses') {
      var updates = Array.isArray(data.items) ? data.items : [];
      var changed = 0;
      updates.forEach(function(update) {
        var id = String(update && update.id || '');
        if (!id) return;
        var row = findRowById_(sheet, id);
        if (row < 0) return;
        sheet.getRange(row, 7).setValue(normalizeStatus_(update.status || 'played'));
        changed++;
      });
      clearCaches_();
      return jsonResponse({ success: true, action: 'updateStatuses', count: changed, updated: changed });
    }

    if (action === 'delete') {
      var deleteId = String(data.id || '');
      if (!deleteId) return jsonResponse({ success: false, message: 'ID tidak ditemukan' });
      var deleteRow = findRowById_(sheet, deleteId);
      if (deleteRow < 0) return jsonResponse({ success: false, action: 'delete', id: deleteId, message: 'ID request tidak ditemukan' });
      sheet.deleteRow(deleteRow);
      clearCaches_();
      return jsonResponse({ success: true, action: 'delete', id: deleteId, message: 'Request berhasil dihapus' });
    }

    if (action === 'deleteBatch') {
      var deleteItems = Array.isArray(data.ids) ? data.ids.map(String) : [];
      if (!deleteItems.length && Array.isArray(data.items)) deleteItems = data.items.map(function(x){ return String(x && x.id || ''); }).filter(Boolean);
      if (!deleteItems.length) return jsonResponse({ success: false, message: 'Tidak ada ID untuk dihapus' });
      var last = sheet.getLastRow(), rowsToDelete = [];
      if (last >= 2) {
        var allIds = sheet.getRange(2, 1, last - 1, 1).getValues();
        for (var i = 0; i < allIds.length; i++) if (deleteItems.indexOf(String(allIds[i][0])) !== -1) rowsToDelete.push(i + 2);
      }
      rowsToDelete.sort(function(a,b){return b-a;});
      rowsToDelete.forEach(function(r){sheet.deleteRow(r);});
      clearCaches_();
      return jsonResponse({ success: true, action: 'deleteBatch', count: rowsToDelete.length, deleted: rowsToDelete.length });
    }

    return jsonResponse({ success: false, message: 'Action tidak dikenal: ' + action });
  } catch (error) {
    return jsonResponse({ success: false, message: error.toString() });
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}
