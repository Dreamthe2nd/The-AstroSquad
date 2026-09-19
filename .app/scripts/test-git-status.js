const git = require('isomorphic-git');
const fs = require('fs');
const path = require('path');

const dir = 'C:\\Users\\h1465\\Documents\\AstroSquad';

console.log('Testing isomorphic-git statusMatrix memory usage...');

async function run() {
  const startMem = process.memoryUsage().heapUsed;
  const startTime = Date.now();

  const statusMatrix = await git.statusMatrix({
    fs,
    dir,
    filter: (p) => !p.startsWith('.git')
  });

  const elapsed = Date.now() - startTime;
  const endMem = process.memoryUsage().heapUsed;

  console.log(`statusMatrix entries: ${statusMatrix.length}`);
  console.log(`Elapsed: ${elapsed}ms | Mem diff: ${((endMem - startMem)/1024/1024).toFixed(2)} MB | Total heap: ${(endMem/1024/1024).toFixed(2)} MB`);
}

run().catch(console.error);
