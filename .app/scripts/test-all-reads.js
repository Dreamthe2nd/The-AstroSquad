const fs = require('fs');
const path = require('path');

const repoDir = 'C:\\Users\\h1465\\Documents\\AstroSquad';

class FileHandlers {
  static listFiles(repoDir) {
    if (!fs.existsSync(repoDir)) return [];

    const walk = (currentDir, relativeCurrent) => {
      const items = fs.readdirSync(currentDir, { withFileTypes: true });
      const nodes = [];

      for (const item of items) {
        if (item.name === '.git' || item.name === 'node_modules' || (item.name.startsWith('.') && item.name !== '.app')) {
          continue;
        }

        const absPath = path.join(currentDir, item.name);
        const relPath = relativeCurrent ? path.join(relativeCurrent, item.name).replace(/\\/g, '/') : item.name;

        if (item.isDirectory()) {
          nodes.push({
            name: item.name,
            relativePath: relPath,
            absolutePath: absPath,
            isDirectory: true,
            children: walk(absPath, relPath)
          });
        } else {
          const stat = fs.statSync(absPath);
          const ext = path.extname(item.name).toLowerCase().replace('.', '');
          nodes.push({
            name: item.name,
            relativePath: relPath,
            absolutePath: absPath,
            isDirectory: false,
            size: stat.size,
            extension: ext
          });
        }
      }

      return nodes.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });
    };

    return walk(repoDir, '');
  }

  static readFile(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const stats = fs.statSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const binaryExts = [
      '.pdf', '.png', '.jpg', '.jpeg', '.webp', '.pptx', '.ico',
      '.fits', '.fit', '.zip', '.tar', '.gz', '.7z', '.exe', '.dll',
      '.so', '.dylib', '.bin', '.dat', '.db', '.sqlite', '.pack',
      '.idx', '.parquet', '.h5', '.hdf5', '.pyc'
    ];

    if (binaryExts.includes(ext)) {
      let mimeType = 'application/octet-stream';
      if (ext === '.pdf') mimeType = 'application/pdf';
      else if (ext === '.png') mimeType = 'image/png';
      else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
      else if (ext === '.webp') mimeType = 'image/webp';
      else if (ext === '.pptx') mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
      else if (ext === '.fits' || ext === '.fit') mimeType = 'application/fits';

      const needsBase64 = ext === '.pptx' && stats.size <= 30 * 1024 * 1024;
      const content = needsBase64 ? fs.readFileSync(filePath).toString('base64') : '';

      return { content, isBinary: true, mimeType };
    } else {
      if (path.basename(filePath).toLowerCase() === 'proposal') {
        const head = Buffer.alloc(10);
        const fd = fs.openSync(filePath, 'r');
        fs.readSync(fd, head, 0, 10, 0);
        fs.closeSync(fd);
        if (head.toString().startsWith('%PDF')) {
          return { content: '', isBinary: true, mimeType: 'application/pdf' };
        }
      }

      const sampleSize = Math.min(stats.size, 4096);
      if (sampleSize > 0) {
        const buf = Buffer.alloc(sampleSize);
        const fd = fs.openSync(filePath, 'r');
        fs.readSync(fd, buf, 0, sampleSize, 0);
        fs.closeSync(fd);
        for (let i = 0; i < sampleSize; i++) {
          if (buf[i] === 0) {
            return { content: '', isBinary: true, mimeType: 'application/octet-stream' };
          }
        }
      }

      if (stats.size > 2 * 1024 * 1024) {
        const previewBuf = Buffer.alloc(512 * 1024);
        const fd = fs.openSync(filePath, 'r');
        const bytesRead = fs.readSync(fd, previewBuf, 0, 512 * 1024, 0);
        fs.closeSync(fd);
        const content = previewBuf.toString('utf-8', 0, bytesRead) +
          `\n\n--- [Telemetry Notice: File size is ${(stats.size / (1024 * 1024)).toFixed(1)} MB. Truncated for viewing performance. Open in Desktop App for full file] ---`;
        return { content, isBinary: false, mimeType: 'text/plain' };
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      return { content, isBinary: false, mimeType: 'text/plain' };
    }
  }
}

console.log('Testing FileHandlers.listFiles and FileHandlers.readFile across all files in repo...');
const files = FileHandlers.listFiles(repoDir);
console.log(`Found ${files.length} top-level nodes.`);

function testAll(nodes) {
  for (const node of nodes) {
    if (node.isDirectory) {
      if (node.children) testAll(node.children);
    } else {
      const start = Date.now();
      const startMem = process.memoryUsage().heapUsed;
      const res = FileHandlers.readFile(node.absolutePath);
      const elapsed = Date.now() - start;
      const endMem = process.memoryUsage().heapUsed;
      console.log(`File: ${node.relativePath} | Size: ${node.size} | isBinary: ${res.isBinary} | mime: ${res.mimeType} | contentLen: ${res.content.length} | time: ${elapsed}ms | memDiff: ${((endMem - startMem)/1024).toFixed(1)} KB`);
    }
  }
}

testAll(files);
console.log('Done test! Heap used:', (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2), 'MB');
