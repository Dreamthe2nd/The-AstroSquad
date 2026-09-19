// Let's test the remark-math inline / block regex on a 20MB base64 string!
// In remark-math:
// The inline math regex searches for $ ... $
// Let's see what standard markdown math regexes do on a 20MB string without newlines:

console.log('Testing regex on 20MB base64 string...');
const buf = Buffer.alloc(20 * 1024 * 1024, 'x');
const b64 = buf.toString('base64');
console.log('String size:', b64.length);

const start = Date.now();
const startMem = process.memoryUsage().heapUsed;

// Remark-math inline regex pattern:
// /^(?:\$([^\$]+)\$|\$\$([^\$]+)\$\$)/
// Remark-gfm table regex, autolink regex, etc.
// In unified/remark-parse:
// Markdown tokenize runs line by line or on block:
const lines = b64.split(/\r?\n/);
console.log('Lines count:', lines.length);

// In a single 27MB line, remark tries to tokenize inline:
// Test matching:
const inlineMathRegex = /\$((?:\\\$|[^$])+)\$/g;
const hasDollar = b64.includes('$');
console.log('Has dollar?', hasDollar);

// What about remark-gfm autolink or emphasis regex?
// Emphasis regex: /((?:\*|_){1,3})(.*?)\1/g
const startTime = Date.now();
const match = b64.match(/(\*|_)(.*?)\1/);
console.log('Emphasis match time:', Date.now() - startTime, 'ms');
