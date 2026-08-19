var NAMA_TAB_ANDA = 'req lagu';
var TIMEZONE = 'Asia/Jakarta';

// ======================================================
// SHEET / RESPONSE
// ======================================================

function getSheet_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(NAMA_TAB_ANDA);
  if (!sheet) {
    throw new Error('Sheet "' + NAMA_TAB_ANDA + '" tidak ditemukan');
  }
  return sheet;
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ======================================================
// DATE HELPERS
// Semua filter tanggal menggunakan TIMEZONE yang sama.
// ======================================================

function toDate_(value) {
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : new Date(value.getTime());
  }

  if (!value) return null;

  var d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function dateKey_(value) {
  var d = toDate_(value);
  if (!d) return '';

  return Utilities.formatDate(
    d,
    TIMEZONE,
    'yyyy-MM-dd'
  );
}

function getTodayKey_() {
  return Utilities.formatDate(
    new Date(),
    TIMEZONE,
    'yyyy-MM-dd'
  );
}

function getYesterdayKey_() {
  var now = new Date();

  // Ambil tanggal kalender di timezone aplikasi,
  // lalu mundurkan satu hari secara aman.
  var todayKey = Utilities.formatDate(
    now,
    TIMEZONE,
    'yyyy-MM-dd'
  );

  var parts = todayKey.split('-');
  var d = new Date(
    Number(parts[0]),
    Number(parts[1]) - 1,
    Number(parts[2])
  );

  d.setDate(d.getDate() - 1);

  return Utilities.formatDate(
    d,
    TIMEZONE,
    'yyyy-MM-dd'
  );
}

// ======================================================
// ROW -> OBJECT
// ======================================================

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

function normalizeTimestamp_(value) {
  var d = toDate_(value);

  if (d) {
    return d.toISOString();
  }

  return value ? String(value) : '';
}

function normalizeStatus_(status) {
  var s = String(status || '')
    .trim()
    .toLowerCase();

  if (
    s === 'played' ||
    s === 'play' ||
    s === 'selesai' ||
    s === 'diputar'
  ) {
    return 'played';
  }

  return 'pending';
}

// ======================================================
// GET DATA
// ======================================================

function getAllRows_(sheet) {
  var lastRow = sheet.getLastRow();

  if (lastRow < 2) return [];

  var values = sheet
    .getRange(2, 1, lastRow - 1, 8)
    .getValues();

  var result = [];

  for (var i = 0; i < values.length; i++) {
    if (!values[i][0]) continue;
    result.push(rowToObject_(values[i]));
  }

  // Data terbaru di atas.
  result.reverse();

  return result;
}

function filterRows_(rows, range, status, since, until) {
  var todayKey = getTodayKey_();
  var yesterdayKey = getYesterdayKey_();

  return rows.filter(function(row) {
    var rowKey = dateKey_(row.timestamp);

    // Date range
    if (range === 'today' && rowKey !== todayKey) {
      return false;
    }

    if (range === 'yesterday' && rowKey !== yesterdayKey) {
      return false;
    }

    // Optional custom boundaries
    if (since) {
      var rowDateSince = toDate_(row.timestamp);
      if (!rowDateSince || rowDateSince < since) {
        return false;
      }
    }

    if (until) {
      var rowDateUntil = toDate_(row.timestamp);
      if (!rowDateUntil || rowDateUntil >= until) {
        return false;
      }
    }

    // Status
    if (status === 'pending' && row.status !== 'pending') {
      return false;
    }

    if (status === 'played' && row.status !== 'played') {
      return false;
    }

    return true;
  });
}

function doGet(e) {
  try {
    var sheet = getSheet_();
    var params = e && e.parameter ? e.parameter : {};

    // Tanpa range tetap ALL agar kompatibel dengan pemanggil lama.
    var range = String(params.range || 'all')
      .trim()
      .toLowerCase();

    if (
      range !== 'today' &&
      range !== 'yesterday' &&
      range !== 'all'
    ) {
      range = 'all';
    }

    var status = String(params.status || 'all')
      .trim()
      .toLowerCase();

    if (
      status !== 'all' &&
      status !== 'pending' &&
      status !== 'played'
    ) {
      status = 'all';
    }

    var since = params.since
      ? toDate_(params.since)
      : null;

    var until = params.until
      ? toDate_(params.until)
      : null;

    var rows = getAllRows_(sheet);
    var filtered = filterRows_(
      rows,
      range,
      status,
      since,
      until
    );

    return jsonResponse({
      success: true,
      range: range,
      status: status,
      timezone: TIMEZONE,
      today: getTodayKey_(),
      yesterday: getYesterdayKey_(),
      count: filtered.length,
      data: filtered
    });

  } catch (error) {
    return jsonResponse({
      success: false,
      message: error.toString(),
      data: []
    });
  }
}

// ======================================================
// FIND ROW
// ======================================================

function findRowById_(sheet, id) {
  var lastRow = sheet.getLastRow();

  if (lastRow < 2) return -1;

  var ids = sheet
    .getRange(2, 1, lastRow - 1, 1)
    .getValues();

  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) {
      return i + 2;
    }
  }

  return -1;
}

// ======================================================
// ID
// ======================================================

function generateId_() {
  return 'req_' +
    Date.now() + '_' +
    Math.random().toString(36).substring(2, 8);
}

// ======================================================
// POST
// ======================================================

function doPost(e) {
  var lock = LockService.getScriptLock();

  try {
    lock.waitLock(10000);

    var sheet = getSheet_();

    if (
      !e ||
      !e.postData ||
      !e.postData.contents
    ) {
      return jsonResponse({
        success: false,
        message: 'Data POST kosong'
      });
    }

    var data = JSON.parse(e.postData.contents);
    var action = String(data.action || '');

    // --------------------------------------------------
    // ADD
    // --------------------------------------------------

    if (action === 'add') {
      var item = {
        id: String(data.id || generateId_()),
        requester: String(data.requester || ''),
        title: String(data.title || ''),
        artist: String(data.artist || ''),
        note: String(data.note || ''),
        timestamp: data.timestamp || new Date().toISOString(),
        status: normalizeStatus_(data.status || 'pending'),
        votes: Number(data.votes || 1)
      };

      sheet.appendRow([
        item.id,
        item.requester,
        item.title,
        item.artist,
        item.note,
        item.timestamp,
        item.status,
        item.votes
      ]);

      return jsonResponse({
        success: true,
        action: 'add',
        data: item,
        message: 'Request berhasil ditambahkan'
      });
    }

    // --------------------------------------------------
    // ADD BATCH
    // --------------------------------------------------

    if (action === 'addBatch') {
      var items = Array.isArray(data.items)
        ? data.items
        : [];

      if (!items.length) {
        return jsonResponse({
          success: false,
          message: 'Tidak ada data batch'
        });
      }

      var rows = [];

      for (var i = 0; i < items.length; i++) {
        var itemBatch = items[i] || {};

        rows.push([
          String(itemBatch.id || generateId_()),
          String(itemBatch.requester || ''),
          String(itemBatch.title || ''),
          String(itemBatch.artist || ''),
          String(itemBatch.note || ''),
          itemBatch.timestamp || new Date().toISOString(),
          normalizeStatus_(itemBatch.status || 'pending'),
          Number(itemBatch.votes || 1)
        ]);
      }

      sheet
        .getRange(
          sheet.getLastRow() + 1,
          1,
          rows.length,
          8
        )
        .setValues(rows);

      return jsonResponse({
        success: true,
        action: 'addBatch',
        count: rows.length,
        message: rows.length + ' request berhasil ditambahkan'
      });
    }

    // --------------------------------------------------
    // UPDATE STATUS
    // --------------------------------------------------

    if (action === 'updateStatus') {
      var id = String(data.id || '');

      if (!id) {
        return jsonResponse({
          success: false,
          message: 'ID tidak ditemukan'
        });
      }

      var row = findRowById_(sheet, id);

      if (row < 0) {
        return jsonResponse({
          success: false,
          action: 'updateStatus',
          id: id,
          message: 'ID request tidak ditemukan'
        });
      }

      var status = normalizeStatus_(
        data.status || 'pending'
      );

      sheet
        .getRange(row, 7)
        .setValue(status);

      return jsonResponse({
        success: true,
        action: 'updateStatus',
        id: id,
        status: status,
        message: 'Status berhasil diperbarui'
      });
    }

    // --------------------------------------------------
    // UPDATE BANYAK STATUS
    // --------------------------------------------------

    if (action === 'updateStatuses') {
      var updates = Array.isArray(data.items)
        ? data.items
        : [];

      var changed = 0;

      for (var u = 0; u < updates.length; u++) {
        var update = updates[u] || {};
        var updateId = String(update.id || '');

        if (!updateId) continue;

        var updateRow = findRowById_(
          sheet,
          updateId
        );

        if (updateRow < 0) continue;

        sheet
          .getRange(updateRow, 7)
          .setValue(
            normalizeStatus_(
              update.status || 'played'
            )
          );

        changed++;
      }

      return jsonResponse({
        success: true,
        action: 'updateStatuses',
        count: changed,
        updated: changed
      });
    }

    // --------------------------------------------------
    // DELETE
    // --------------------------------------------------

    if (action === 'delete') {
      var deleteId = String(data.id || '');

      if (!deleteId) {
        return jsonResponse({
          success: false,
          message: 'ID tidak ditemukan'
        });
      }

      var deleteRow = findRowById_(
        sheet,
        deleteId
      );

      if (deleteRow < 0) {
        return jsonResponse({
          success: false,
          action: 'delete',
          id: deleteId,
          message: 'ID request tidak ditemukan'
        });
      }

      sheet.deleteRow(deleteRow);

      return jsonResponse({
        success: true,
        action: 'delete',
        id: deleteId,
        message: 'Request berhasil dihapus'
      });
    }

    // --------------------------------------------------
    // DELETE BATCH
    // --------------------------------------------------

    if (action === 'deleteBatch') {
      var deleteItems = Array.isArray(data.ids)
        ? data.ids.map(String)
        : [];

      if (
        !deleteItems.length &&
        Array.isArray(data.items)
      ) {
        deleteItems = data.items
          .map(function(item) {
            return String(item && item.id || '');
          })
          .filter(Boolean);
      }

      if (!deleteItems.length) {
        return jsonResponse({
          success: false,
          message: 'Tidak ada ID untuk dihapus'
        });
      }

      var rowsToDelete = [];
      var last = sheet.getLastRow();

      if (last >= 2) {
        var allIds = sheet
          .getRange(2, 1, last - 1, 1)
          .getValues();

        for (var d = 0; d < allIds.length; d++) {
          if (
            deleteItems.indexOf(
              String(allIds[d][0])
            ) !== -1
          ) {
            rowsToDelete.push(d + 2);
          }
        }
      }

      rowsToDelete.sort(function(a, b) {
        return b - a;
      });

      for (var x = 0; x < rowsToDelete.length; x++) {
        sheet.deleteRow(rowsToDelete[x]);
      }

      return jsonResponse({
        success: true,
        action: 'deleteBatch',
        count: rowsToDelete.length,
        deleted: rowsToDelete.length,
        message: rowsToDelete.length + ' request berhasil dihapus'
      });
    }

    return jsonResponse({
      success: false,
      message: 'Action tidak dikenal: ' + action
    });

  } catch (error) {
    return jsonResponse({
      success: false,
      message: error.toString()
    });

  } finally {
    try {
      lock.releaseLock();
    } catch (e) {}
  }
}
