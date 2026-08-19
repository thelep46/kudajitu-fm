var NAMA_TAB_ANDA = 'req lagu';

function getSheet_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(NAMA_TAB_ANDA);
  if (!sheet) throw new Error('Sheet "' + NAMA_TAB_ANDA + '" tidak ditemukan');
  return sheet;
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function dateKey_(value) {
  var d = value instanceof Date ? value : new