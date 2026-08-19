# PATCH ADMIN TANDAI — KUDAJITU FM

Tujuan: memperbaiki tombol **Tandai** agar action dari Admin aman terhadap perbedaan huruf besar/kecil (`markPlayed` → `markplayed`) tanpa mengganti seluruh `Code.gs`.

## Perubahan yang harus diterapkan pada Code.gs

### 1. Normalisasi action di `mutate_`
Cari:

```js
function mutate_(sheet,p){
```

Pastikan baris awal fungsi menjadi:

```js
function mutate_(sheet,p){
  var action=String(p.action||'').trim().toLowerCase();
```

### 2. Normalisasi nama action Tandai
Gunakan:

```js
if(action==='updatestatus'||action==='markplayed'){
```

Bukan `updateStatus` atau `markPlayed`.

### 3. Normalisasi action massal
Gunakan:

```js
if(action==='updatestatuses'){
```

### 4. Normalisasi delete batch
Gunakan:

```js
if(action==='deletebatch'){
```

### 5. Normalisasi action di `doGet`
Pastikan bagian dispatch menggunakan lowercase:

```js
var action=String(p.action||'data').trim().toLowerCase();
```

Dan dispatch mutation:

```js
if(action==='updatestatus'||action==='markplayed'||action==='updatestatuses'||action==='delete'||action==='deletebatch'){
```

### 6. Normalisasi action di `doPost`
Pastikan:

```js
var action=String(data.action||'').trim().toLowerCase();
```

Lalu:

```js
if(action==='updatestatus'||action==='markplayed'||action==='delete')
```

## Hasil yang diharapkan

Saat Admin mengirim:

```text
markPlayed
```

`doGet()` mengubahnya menjadi:

```text
markplayed
```

Kemudian `mutate_()` mengenalinya dan:

- mencari ID request
- kolom G menjadi `played`
- kolom I diisi `playedAt`
- menjalankan `SpreadsheetApp.flush()`
- membersihkan cache
- mengembalikan `success:true`

Patch ini **tidak mengubah** sistem NOW PLAYING, popup pengumuman, nomor antrean, atau struktur Google Sheet.