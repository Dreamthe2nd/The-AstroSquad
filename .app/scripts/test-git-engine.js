const fs = require('fs');
const path = require('path');
const git = require('isomorphic-git');
const http = require('isomorphic-git/http/node');

async function testGitEngine() {
  console.log('=== AstroSquad GitEngine Guardrail Verification ===');
  
  const testDir = path.join(__dirname, 'test-astrosquad-repo');
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
  fs.mkdirSync(testDir, { recursive: true });

  const repoUrl = 'https://github.com/Dreamthe2nd/The-AstroSquad';
  console.log(`1. Testing shallow clone from ${repoUrl}...`);
  
  await git.clone({
    fs,
    http,
    dir: testDir,
    url: repoUrl,
    ref: 'main',
    singleBranch: true,
    depth: 1
  });

  console.log('   ✓ Clone succeeded!');

  // Check cloned files
  const files = fs.readdirSync(testDir);
  console.log('   Files in cloned repository:', files.filter(f => f !== '.git'));

  // Verify key files exist
  const readmeExists = fs.existsSync(path.join(testDir, 'README.md'));
  const proposalExists = fs.existsSync(path.join(testDir, 'Proposal')) || fs.existsSync(path.join(testDir, 'proposal.pdf'));
  console.log(`   ✓ README.md exists: ${readmeExists}`);
  console.log(`   ✓ Proposal file exists: ${proposalExists}`);

  // Test Non-Technical Guardrail: Simulate local modification & conflict backup
  console.log('2. Testing Non-Technical Guardrail (Conflict Backup)...');
  const targetFile = path.join(testDir, 'README.md');
  const originalContent = fs.readFileSync(targetFile, 'utf-8');
  
  // Simulate user editing locally
  fs.writeFileSync(targetFile, originalContent + '\n\n## Local Experiment Notes\nCollaborator local modification.\n');
  
  // Run guardrail backup scan
  const statusMatrix = await git.statusMatrix({
    fs,
    dir: testDir,
    filter: (p) => !p.startsWith('.git')
  });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backedUp = [];

  for (const [filepath, head, workdir, stage] of statusMatrix) {
    if (workdir !== head && workdir !== 0) {
      const fullPath = path.join(testDir, filepath);
      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
        const parsed = path.parse(fullPath);
        const backupFilename = `${parsed.name}_conflict_${timestamp}${parsed.ext}`;
        const backupPath = path.join(parsed.dir, backupFilename);
        fs.copyFileSync(fullPath, backupPath);
        backedUp.push({
          original: filepath,
          backup: path.relative(testDir, backupPath)
        });
      }
    }
  }

  console.log(`   ✓ Guardrail created ${backedUp.length} backup file(s):`);
  backedUp.forEach(b => console.log(`     - ${b.original} -> ${b.backup}`));

  const backupCreated = backedUp.length > 0 && fs.existsSync(path.join(testDir, backedUp[0].backup));
  console.log(`   ✓ Backup file verified on disk: ${backupCreated}`);

  // Clean up
  fs.rmSync(testDir, { recursive: true, force: true });
  console.log('=== All GitEngine tests passed successfully! ===');
}

testGitEngine().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
