const XLSX = require('xlsx');
const wb = XLSX.readFile('./price.xlsx');   // ← путь к твоему файлу
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
console.log('=== ЗАГОЛОВКИ ===');
rows[0].forEach((h, i) => console.log(i, '→', JSON.stringify(h)));
console.log('\n=== СТРОКА С 440 ===');
const r = rows.find(row => row.some(c => String(c).includes('440')));
if (r) r.forEach((v, i) => console.log(i, '→', JSON.stringify(v)));