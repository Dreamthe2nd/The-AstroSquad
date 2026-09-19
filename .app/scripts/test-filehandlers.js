const path = require('path');
const fs = require('fs');

// Mock electron app
const mockRepoDir = 'C:\\Users\\h1465\\Documents\\AstroSquad';

console.log('Testing FileHandlers & Proposal detection in AstroSquad directory...');

// 1. Check directory exists
if (!fs.existsSync(mockRepoDir)) {
  console.error('❌ AstroSquad directory does not exist:', mockRepoDir);
  process.exit(1);
}

// 2. Test reading Proposal
const proposalPath = path.join(mockRepoDir, 'Proposal');
if (!fs.existsSync(proposalPath)) {
  console.error('❌ Proposal file not found at:', proposalPath);
  process.exit(1);
}

const head = Buffer.alloc(10);
const fd = fs.openSync(proposalPath, 'r');
fs.readSync(fd, head, 0, 10, 0);
fs.closeSync(fd);

console.log('Header of Proposal:', head.toString());
const isPdf = head.toString().startsWith('%PDF');
console.log('Is Proposal detected as PDF?', isPdf);

if (!isPdf) {
  console.error('❌ Proposal is not detected as PDF!');
  process.exit(1);
}

// 3. Test reading README.md
const readmePath = path.join(mockRepoDir, 'README.md');
const readmeContent = fs.readFileSync(readmePath, 'utf-8');
console.log('README.md length:', readmeContent.length, 'characters');
// 4. Test listFiles logic including .app directory
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
        isDirectory: true,
        children: walk(absPath, relPath)
      });
    } else {
      nodes.push({
        name: item.name,
        relativePath: relPath,
        isDirectory: false
      });
    }
  }
  return nodes;
};

const tree = walk(mockRepoDir, '');
const appNode = tree.find((n) => n.name === '.app');
if (!appNode) {
  console.error('❌ .app directory was NOT found in tree!');
  process.exit(1);
}
console.log('✅ .app directory successfully found in tree! Children count:', appNode.children?.length);
const srcChild = appNode.children?.find((c) => c.name === 'src');
if (!srcChild) {
  console.error('❌ .app/src was NOT found inside .app children!');
  process.exit(1);
}
console.log('✅ .app/src found with children count:', srcChild.children?.length);

console.log('✅ ALL file handling tests passed successfully!');

