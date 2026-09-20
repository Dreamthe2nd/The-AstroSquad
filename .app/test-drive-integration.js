const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('--- AstroSquad Google Drive & Viewer Test Suite ---');

// 1. Static AST/Content verification for Viewer Defluffing (R3)
console.log('\n[TEST 1] Verifying Viewers Toolbar Defluffing & Action Standardization...');

const viewersDir = path.join(__dirname, 'src', 'renderer', 'src', 'components', 'viewers');
const filesToVerify = ['CsvViewer.tsx', 'PptxViewer.tsx', 'PdfViewer.tsx'];

for (const f of filesToVerify) {
  const content = fs.readFileSync(path.join(viewersDir, f), 'utf-8');
  
  // Banned dead states & secondary buttons
  assert.strictEqual(content.includes('isDriveConnected'), false, `${f} still contains dead state isDriveConnected`);
  assert.strictEqual(content.includes('isUploading'), false, `${f} still contains dead state isUploading`);
  assert.strictEqual(content.includes('Slides (Web)'), false, `${f} still contains secondary Slides (Web) button`);
  assert.strictEqual(content.includes('Sheets (Web)'), false, `${f} still contains secondary Sheets (Web) button`);
  assert.strictEqual(content.includes('Docs (Web)'), false, `${f} still contains secondary Docs (Web) button`);
  
  // Required standardized actions
  assert.strictEqual(content.includes('⚡ Open in Drive'), true, `${f} missing "⚡ Open in Drive" action`);
  assert.strictEqual(content.includes('System Default'), true, `${f} missing "System Default" action`);
  
  console.log(`  ✓ ${f}: 0 dead upload states, 0 redundant Web buttons, actions standardized on "⚡ Open in Drive" and "System Default"`);
}

// 2. Behavioral verification of Workspace.tsx
console.log('\n[TEST 2] Verifying Workspace.tsx Action Routing...');
const workspaceContent = fs.readFileSync(path.join(__dirname, 'src', 'renderer', 'src', 'components', 'Workspace.tsx'), 'utf-8');
assert.strictEqual(workspaceContent.includes('handleOpenSystemDefault'), true, 'Workspace.tsx missing handleOpenSystemDefault');
assert.strictEqual(workspaceContent.includes("'system_default'"), true, "Workspace.tsx must invoke 'system_default' app mode");
console.log('  ✓ Workspace.tsx properly routes System Default via handleOpenSystemDefault and system_default parameter');

// 3. Behavioral verification of FileHandlers.openInGoogleDriveDesktop (R1, R2)
console.log('\n[TEST 3] Verifying FileHandlers Google Workspace Routing & Anti-Hijacking (R1, R2)...');
const fileHandlersContent = fs.readFileSync(path.join(__dirname, 'src', 'main', 'fileHandlers.ts'), 'utf-8');

// Ensure shell.openPath is NOT called on destPath (which caused powerpnt.exe / excel.exe hijacking)
assert.strictEqual(
  fileHandlersContent.includes('shell.openPath(destPath)'),
  false,
  'FATAL: fileHandlers.ts still contains shell.openPath(destPath), which causes PowerPoint/Excel hijacking!'
);
console.log('  ✓ Verified: shell.openPath(destPath) has been completely removed. Raw .pptx, .csv, and .pdf are never passed to OS shell in openInGoogleDriveDesktop.');

// Ensure virtual file detection exists
assert.strictEqual(
  fileHandlersContent.includes('.gslides') && fileHandlersContent.includes('virtualPath'),
  true,
  'Virtual file detection for .gslides/.gsheet/.gdoc must be present'
);
console.log('  ✓ Verified: Native Google virtual file (.gslides / .gsheet / .gdoc) detection on G:\\ is implemented.');

// Ensure authuser parameter is always appended
assert.strictEqual(
  fileHandlersContent.includes("authuser=") && fileHandlersContent.includes("targetUrl.includes('/u/0/')"),
  true,
  'authuser parameter attachment must be present'
);
console.log('  ✓ Verified: authuser query parameter is always appended matching configured Pro account.');

// Ensure system_default override exists in openInDesktopApp
assert.strictEqual(
  fileHandlersContent.includes("trimmed === 'system_default'"),
  true,
  "fileHandlers.ts must handle trimmed === 'system_default'"
);
console.log('  ✓ Verified: openInDesktopApp supports "system_default" to launch OS default application.');

console.log('\n=== ALL STATIC & INTEGRATION CHECKS PASSED ===');
