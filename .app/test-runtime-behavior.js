const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');

// Create a temp workspace for isolation
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'astrosquad-test-'));
const mockDriveRoot = path.join(tempDir, 'My Drive');
const mockSquadFolder = path.join(mockDriveRoot, 'The-AstroSquad');
fs.mkdirSync(mockSquadFolder, { recursive: true });

// Create sample test files
const testPptx = path.join(tempDir, 'presentation.pptx');
fs.writeFileSync(testPptx, 'PPTX_DUMMY_BINARY_DATA');

const testCsv = path.join(tempDir, 'catalog.csv');
fs.writeFileSync(testCsv, 'id,name,val\n1,alpha,100');

const testPdf = path.join(tempDir, 'proposal.pdf');
fs.writeFileSync(testPdf, '%PDF-1.4 dummy pdf content');

// Track Electron calls
const electronCalls = {
  openPath: [],
  openExternal: [],
  clipboard: []
};

// Mock electron
const mockElectron = {
  protocol: {
    registerSchemesAsPrivileged: () => {},
    handle: () => {}
  },
  app: {
    whenReady: () => new Promise(() => {}),
    getPath: () => tempDir,
    on: () => {},
    quit: () => {}
  },
  ipcMain: {
    handle: () => {}
  },
  shell: {
    openPath: async (p) => {
      electronCalls.openPath.push(p);
      return ''; // empty string indicates success in Electron
    },
    openExternal: async (url) => {
      electronCalls.openExternal.push(url);
    },
    showItemInFolder: (p) => {}
  },
  dialog: {},
  BrowserWindow: class {
    constructor() {
      this.webContents = {
        on: () => {},
        setWindowOpenHandler: () => {}
      };
    }
  },
  clipboard: {
    writeText: (t) => { electronCalls.clipboard.push(t); }
  }
};

// Compile / load fileHandlers by mocking electron in module cache
require.cache[require.resolve('electron')] = {
  id: require.resolve('electron'),
  filename: require.resolve('electron'),
  loaded: true,
  exports: mockElectron
};

// Also mock googleWindowManager
const mockGoogleWindowManager = {
  GoogleWindowManager: {
    openSession: (appType, targetUrl, targetFilePath) => {}
  }
};
require.cache[path.join(__dirname, 'src', 'main', 'googleWindowManager.ts')] = {
  id: 'googleWindowManager',
  filename: 'googleWindowManager',
  loaded: true,
  exports: mockGoogleWindowManager
};

// Read and evaluate FileHandlers from compiled dist or directly
const { FileHandlers } = require('./dist/test-fileHandlers.js');

// Mock detectGoogleDrivePath on FileHandlers to point to our mockDriveRoot
FileHandlers.detectGoogleDrivePath = () => {
  return {
    driveRoot: mockDriveRoot,
    squadPath: mockSquadFolder
  };
};

async function runRuntimeTests() {
  console.log('\n--- RUNNING RUNTIME BEHAVIORAL TESTS ---');

  // TEST A: Opening PPTX via openInGoogleDriveDesktop
  console.log('\n[TEST A] openInGoogleDriveDesktop("presentation.pptx")');
  electronCalls.openPath = [];
  electronCalls.openExternal = [];

  const resA = await FileHandlers.openInGoogleDriveDesktop(testPptx);
  console.log('  Result:', resA);

  // Verify shell.openPath was NOT called on presentation.pptx (NO POWERPOINT HIJACKING!)
  const openedPptx = electronCalls.openPath.some(p => p.endsWith('.pptx'));
  assert.strictEqual(openedPptx, false, 'FATAL ERROR: shell.openPath was called on .pptx file! Local PowerPoint would be launched!');
  console.log('  ✓ Verified: shell.openPath was NOT called on .pptx (No PowerPoint hijacking)');

  // Verify file was copied to G:\My Drive\The-AstroSquad\presentation.pptx (R2 Background Sync)
  const copiedPptx = path.join(mockSquadFolder, 'presentation.pptx');
  assert.strictEqual(fs.existsSync(copiedPptx), true, 'FATAL ERROR: File was not copied to Google Drive squad folder!');
  console.log('  ✓ Verified: File was copied to local Google Drive folder for cloud background sync (R2)');

  // Verify URL launched contains authuser parameter (R1)
  const openedUrlA = electronCalls.openExternal[0];
  console.log('  Launched URL:', openedUrlA);
  assert.strictEqual(openedUrlA.includes('authuser='), true, 'FATAL ERROR: Launched URL must contain authuser parameter!');
  console.log('  ✓ Verified: URL contains authuser query parameter matching Pro account');

  // TEST B: Opening CSV via openInGoogleDriveDesktop
  console.log('\n[TEST B] openInGoogleDriveDesktop("catalog.csv")');
  electronCalls.openPath = [];
  electronCalls.openExternal = [];

  const resB = await FileHandlers.openInGoogleDriveDesktop(testCsv);
  console.log('  Result:', resB);

  // Verify shell.openPath was NOT called on catalog.csv (NO EXCEL HIJACKING!)
  const openedCsv = electronCalls.openPath.some(p => p.endsWith('.csv'));
  assert.strictEqual(openedCsv, false, 'FATAL ERROR: shell.openPath was called on .csv file! Local Excel would be launched!');
  console.log('  ✓ Verified: shell.openPath was NOT called on .csv (No Excel hijacking)');

  // Verify file was copied to mockSquadFolder (R2)
  const copiedCsv = path.join(mockSquadFolder, 'catalog.csv');
  assert.strictEqual(fs.existsSync(copiedCsv), true, 'FATAL ERROR: CSV file was not copied to Google Drive squad folder!');
  console.log('  ✓ Verified: CSV was copied to Google Drive folder for background sync (R2)');

  const openedUrlB = electronCalls.openExternal[0];
  console.log('  Launched URL:', openedUrlB);
  assert.strictEqual(openedUrlB.includes('authuser='), true, 'FATAL ERROR: CSV URL must contain authuser parameter!');
  console.log('  ✓ Verified: CSV URL contains authuser query parameter');

  // TEST C: Opening PDF via openInGoogleDriveDesktop
  console.log('\n[TEST C] openInGoogleDriveDesktop("proposal.pdf")');
  electronCalls.openPath = [];
  electronCalls.openExternal = [];

  const resC = await FileHandlers.openInGoogleDriveDesktop(testPdf);
  console.log('  Result:', resC);

  const openedPdf = electronCalls.openPath.some(p => p.endsWith('.pdf'));
  assert.strictEqual(openedPdf, false, 'FATAL ERROR: shell.openPath was called on .pdf file!');
  console.log('  ✓ Verified: shell.openPath was NOT called on .pdf file');

  const copiedPdf = path.join(mockSquadFolder, 'proposal.pdf');
  assert.strictEqual(fs.existsSync(copiedPdf), true, 'FATAL ERROR: PDF was not copied to Google Drive squad folder!');
  console.log('  ✓ Verified: PDF was copied to Google Drive folder for background sync (R2)');

  const openedUrlC = electronCalls.openExternal[0];
  console.log('  Launched URL:', openedUrlC);
  assert.strictEqual(openedUrlC.includes('authuser='), true, 'FATAL ERROR: PDF URL must contain authuser parameter!');
  console.log('  ✓ Verified: PDF URL contains authuser query parameter');

  // TEST D: When a native Google virtual file exists on G:\
  console.log('\n[TEST D] Native Google virtual file (.gslides) exists on G:\\');
  const virtualSlides = path.join(mockSquadFolder, 'presentation.gslides');
  fs.writeFileSync(virtualSlides, '{"doc_id": "12345"}');

  electronCalls.openPath = [];
  electronCalls.openExternal = [];

  const resD = await FileHandlers.openInGoogleDriveDesktop(testPptx);
  console.log('  Result:', resD);
  assert.strictEqual(electronCalls.openPath.includes(virtualSlides), true, 'FATAL ERROR: Native virtual file .gslides was not opened via shell.openPath!');
  console.log('  ✓ Verified: When native .gslides exists on G:\\, it is opened via Google Drive desktop association');

  // TEST E: System Default invocation via openInDesktopApp(path, 'system_default')
  console.log('\n[TEST E] openInDesktopApp("presentation.pptx", "system_default")');
  electronCalls.openPath = [];
  electronCalls.openExternal = [];

  const resE = await FileHandlers.openInDesktopApp(testPptx, 'system_default');
  console.log('  Result:', resE);
  assert.strictEqual(electronCalls.openPath.includes(testPptx), true, 'FATAL ERROR: System Default action must call shell.openPath on the file!');
  console.log('  ✓ Verified: "System Default" explicitly delegates to local OS association via shell.openPath');

  // Clean up
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch {}

  console.log('\n=== ALL 5 RUNTIME BEHAVIORAL TESTS PASSED PERFECTLY ===');
}

runRuntimeTests().catch(err => {
  console.error('\nTEST FAILED:', err);
  process.exit(1);
});
