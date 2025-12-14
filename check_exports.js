
try {
  const Table = require('@tiptap/extension-table');
  console.log('Table exports:', Object.keys(Table));
} catch (e) {
  console.log('Error loading Table:', e.message);
}

try {
  const TableRow = require('@tiptap/extension-table-row');
  console.log('TableRow exports:', Object.keys(TableRow));
} catch (e) {
  console.log('Error loading TableRow:', e.message);
}
