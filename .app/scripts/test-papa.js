const Papa = require('papaparse');
const fs = require('fs');

console.log('Testing Papa.parse on 20MB base64 string...');
const buf = Buffer.alloc(20 * 1024 * 1024, 'A');
const str = buf.toString('base64');

console.log('String length:', str.length);
const startMem = process.memoryUsage().heapUsed;
const startTime = Date.now();

try {
  const res = Papa.parse(str, { skipEmptyLines: true });
  console.log('Parsed rows:', res.data.length);
} catch (e) {
  console.error('Error:', e);
}

const elapsed = Date.now() - startTime;
const endMem = process.memoryUsage().heapUsed;

console.log(`Elapsed: ${elapsed}ms | Mem diff: ${((endMem - startMem)/1024/1024).toFixed(2)} MB`);
