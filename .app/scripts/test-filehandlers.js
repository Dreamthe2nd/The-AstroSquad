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
console.log('First 50 chars of README:', readmeContent.substring(0, 50).trim());

console.log('✅ ALL file handling tests passed successfully!');
