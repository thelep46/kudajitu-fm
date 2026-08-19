var NAMA_TAB_ANDA = 'req lagu';

function getSheet_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(NAMA_TAB_ANDA);
  if (!sheet) throw new Error('Sheet "' + NAMA_TAB_ANDA + '" tidak ditemukan');
  return sheet;
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function toDate_(value) {
  if (value instanceof Date) return value;
  var d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function dateKey_(value) {
  var d = toDate_(value);
  if (!d) return '';
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function parseRows_(sheet, startRow, numRows) {
  if (numRows <= 0) return [];
  var rows = sheet.getRange(startRow, 1, numRows, 8).getValues();
  return rows.filter(function(row) { return row[0] !== '' && row[0] !== null; }).map(function(row) {
    return {
      id: String(row[0]), requester: String(row[1] || ''), title: String(row[2] || ''), artist: String(row[3] || ''),
      note: String(row[4] || ''), timestamp: row[5], status: String(row[6] || 'pending'), votes: Number(row[7] || 1)
    };
  });
}

function doGet(e) {
  try {
    var sheet = getSheet_();
    var p = e && e.parameter ? e.parameter : {};
    var range = String(p.range || 'all').toLowerCase();
    var status = String(p.status || 'all').toLowerCase();
    var since = p.since ? new Date(p.since) : null;
    var until = p.until ? new Date(p.until) : null;
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return jsonResponse({success:true,data:[]});

    // Default tetap kompatibel: tanpa parameter mengembalikan semua data.
    // Dengan range today/yesterday, backend hanya mengirim data yang diperlukan.
    var rows = parseRows_(sheet, 2, lastRow - 1);
    var today = new Date();
    var todayKey = dateKey_(today);
    var yesterday = new Date(today.getTime() - 86400000);
    var yesterdayKey = dateKey_(yesterday);

    rows = rows.filter(function(r) {
      var k = dateKey_(r.timestamp);
      if (range === 'today' && k !== todayKey) return false;
      if (range === 'yesterday' && k !== yesterdayKey) return false;
      if (since && (!toDate_(r.timestamp) || toDate_(r.timestamp) < since)) return false;
      if (until && (!toDate_(r.timestamp) || toDate_(r.timestamp) >= until)) return false;
      if (status === 'pending' && String(r.status).toLowerCase() === 'played') return false;
      if (status === 'played' && String(r.status).toLowerCase() !== 'played') return false;
      return true;
    });
    return jsonResponse({success:true,data:rows});
  } catch (error) {
    return jsonResponse({success:false,message:error.toString(),data:[]});
  }
}

function findRowById_(sheet, id) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === id) return i + 2;
  return -1;
}

function doPost(e) {
  try {
    var sheet = getSheet_();
    if (!e || !e.postData || !e.postData.contents) return jsonResponse({success:false,message:'Data POST kosong'});
    var data = JSON.parse(e.postData.contents);
    var action = String(data.action || '');

    if (action === 'add') {
      sheet.appendRow([String(data.id), data.requester || '', data.title || '', data.artist || '', data.note || '', data.timestamp || new Date().toISOString(), data.status || 'pending', Number(data.votes || 1)]);
      return jsonResponse({success:true,action:'add',message:'Request berhasil ditambahkan'});
    }

    if (action === 'addBatch') {
      var items = data.items || [];
      if (!items.length) return jsonResponse({success:false,message:'Tidak ada data batch'});
      var rows = items.map(function(item) { return [String(item.id), item.requester || '', item.title || '', item.artist || '', item.note || '', item.timestamp || new Date().toISOString(), item.status || 'pending', Number(item.votes || 1)]; });
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 8).setValues(rows);
      return jsonResponse({success:true,action:'addBatch',count:rows.length,message:rows.length+' request berhasil ditambahkan'});
    }

    if (action === 'updateStatus') {
      var id = String(data.id || '');
      if (!id) return jsonResponse({success:false,message:'ID tidak ditemukan'});
      var row = findRowById_(sheet, id);
      if (row < 0) return jsonResponse({success:false,action:'updateStatus',id:id,message:'ID request tidak ditemukan'});
      var status = String(data.status || 'pending');
      sheet.getRange(row, 7).setValue(status);
      return jsonResponse({success:true,action:'updateStatus',id:id,status:status});
    }

    if (action === 'updateStatuses') {
      var items2 = data.items || [];
      var changed = 0;
      items2.forEach(function(item) {
        var row2 = findRowById_(sheet, String(item.id || ''));
        if (row2 > 0) { sheet.getRange(row2, 7).setValue(String(item.status || 'played')); changed++; }
      });
      return jsonResponse({success:true,action:'updateStatuses',count:changed});
    }

    if (action === 'delete') {
      var deleteId = String(data.id || '');
      if (!deleteId) return jsonResponse({success:false,message:'ID tidak ditemukan'});
      var deleteRow = findRowById_(sheet, deleteId);
      if (deleteRow < 0) return jsonResponse({success:false,action:'delete',id:deleteId,message:'ID request tidak ditemukan'});
      sheet.deleteRow(deleteRow);
      return jsonResponse({success:true,action:'delete',id:deleteId});
    }

    if (action === 'deleteBatch') {
      var ids = (data.ids || []).map(String);
      var rowsToDelete = [];
      var last = sheet.getLastRow();
      if (last >= 2) {
        var allIds = sheet.getRange(2,1,last-1,1).getValues();
        allIds.forEach(function(v, i) { if (ids.indexOf(String(v[0])) !== -1) rowsToDelete.push(i + 2); });
      }
      rowsToDelete.sort(function(a,b){return b-a;}).forEach(function(rowNum){sheet.deleteRow(rowNum);});
      return jsonResponse({success:true,action:'deleteBatch',count:rowsToDelete.length});
    }

    return jsonResponse({success:false,message:'Action tidak dikenal: '+action});
  } catch (error) {
    return jsonResponse({success:false,message:error.toString()});
  }
}
