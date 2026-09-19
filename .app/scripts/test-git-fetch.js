const git = require('isomorphic-git');
const http = require('isomorphic-git/http/node');
const fs = require('fs');
const path = require('path');

const repoDir = 'C:\\Users\\h1465\\Documents\\AstroSquad';
const repoUrl = 'https://github.com/Dreamthe2nd/The-AstroSquad';
const branch = 'main';

console.log('Testing git.fetch memory and CPU...');

async function testFetch() {
  const startMem = process.memoryUsage().heapUsed;
  const startTime = Date.now();

  try {
    await git.fetch({
      fs,
      http,
      dir: repoDir,
      url: repoUrl,
      ref: branch,
      depth: 10,
      onAuth: () => ({ username: 'git', password: '' })
    });
    console.log('Fetch completed successfully!');
  } catch (err) {
    console.error('Fetch error:', err.message);
  }

  const elapsed = Date.now() - startTime;
  const endMem = process.memoryUsage().heapUsed;
  console.log(`Fetch Elapsed: ${elapsed}ms | Mem diff: ${((endMem - startMem)/1024/1024).toFixed(2)} MB | Total heap: ${(endMem/1024/1024).toFixed(2)} MB`);
}

testFetch().catch(console.error);
