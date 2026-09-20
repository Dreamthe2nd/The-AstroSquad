const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');
const { execSync } = require('child_process');

// Ensure dist/test-fileHandlers.js exists and is up to date (Fix for Ledger Issue 8)
const compiledTestPath = path.join(__dirname, 'dist', 'test-fileHandlers.js');
const srcFileHandlersPath = path.join(__dirname, 'src', 'main', 'fileHandlers.ts');
const needsBuild = !fs.existsSync(compiledTestPath) || 
  (fs.existsSync(srcFileHandlersPath) && fs.statSync(srcFileHandlersPath).mtimeMs > fs.statSync(compiledTestPath).mtimeMs);

if (needsBuild) {
  console.log('[Test Setup] Compiling FileHandlers with esbuild for runtime testing...');
  execSync('npx esbuild src/main/fileHandlers.ts --bundle --platform=node --target=node22 --outfile=dist/test-fileHandlers.js --external:electron', {
    cwd: __dirname,
    stdio: 'inherit'
  });
}

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

const testProposalExtless = path.join(tempDir, 'proposal');
fs.writeFileSync(testProposalExtless, '%PDF-1.4 extensionless proposal content');

// Track Electron calls
const electronCalls = {
  openPath: [],
  openExternal: [],
  clipboard: [],
  mockOpenPathResult: ''
};

// Mock electron
const mockElectron = {
  protocol: {
    registerSchemesAsPrivileged: () => {},
    handle: () => {}
  },
  app: {
    whenReady: () => new Promise(() => {}),
    getPath: (name) => {
      if (name === 'userData') return tempDir;
      return tempDir;
    },
    on: () => {},
    quit: () => {}
  },
  ipcMain: {
    handle: () => {}
  },
  shell: {
    openPath: async (p) => {
      electronCalls.openPath.push(p);
      return electronCalls.mockOpenPathResult;
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
        setWindowOpenHandler: () => {},
        setUserAgent: () => {},
        loadURL: (url) => { electronCalls.openExternal.push(url); }
      };
    }
    isDestroyed() { return false; }
    show() {}
    focus() {}
    loadURL(url) { electronCalls.openExternal.push(url); }
    setTitle() {}
    on() {}
    close() {}
  },
  clipboard: {
    writeText: (t) => { electronCalls.clipboard.push(t); }
  }
};

// Safely hook module resolution so 'electron' can be required without requiring node_modules/electron
const Module = require('module');
const origResolve = Module._resolveFilename;
Module._resolveFilename = function(request, parent, isMain, options) {
  if (request === 'electron') {
    return 'electron';
  }
  return origResolve.call(this, request, parent, isMain, options);
};

require.cache['electron'] = {
  id: 'electron',
  filename: 'electron',
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

// Read and evaluate FileHandlers from compiled dist
const { FileHandlers } = require('./dist/test-fileHandlers.js');
const originalDetectGoogleDrivePath = FileHandlers.detectGoogleDrivePath;

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
  electronCalls.mockOpenPathResult = '';

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

  // Verify URL launched targets Google Slides directly and contains authuser parameter (R1)
  const openedUrlA = electronCalls.openExternal[0];
  console.log('  Launched URL:', openedUrlA);
  assert.strictEqual(openedUrlA.includes('presentation'), true, 'FATAL ERROR: URL must target Google Slides (presentation)! Got: ' + openedUrlA);
  assert.strictEqual(openedUrlA.includes('authuser='), true, 'FATAL ERROR: Launched URL must contain authuser parameter!');
  assert.strictEqual(resA.message.includes('Google Slides'), true, 'FATAL ERROR: Message must state Google Slides!');
  console.log('  ✓ Verified: Directly launched into Google Slides with authuser context');

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

  // Verify URL launched targets Google Sheets directly and contains authuser parameter (R1)
  const openedUrlB = electronCalls.openExternal[0];
  console.log('  Launched URL:', openedUrlB);
  assert.strictEqual(openedUrlB.includes('spreadsheets'), true, 'FATAL ERROR: URL must target Google Sheets (spreadsheets)! Got: ' + openedUrlB);
  assert.strictEqual(openedUrlB.includes('authuser='), true, 'FATAL ERROR: CSV URL must contain authuser parameter!');
  assert.strictEqual(resB.message.includes('Google Sheets'), true, 'FATAL ERROR: Message must state Google Sheets!');
  console.log('  ✓ Verified: Directly launched into Google Sheets with authuser context');

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

  // Verify URL launched targets Google Docs directly and contains authuser parameter (R1)
  const openedUrlC = electronCalls.openExternal[0];
  console.log('  Launched URL:', openedUrlC);
  assert.strictEqual(openedUrlC.includes('document'), true, 'FATAL ERROR: URL must target Google Docs (document)! Got: ' + openedUrlC);
  assert.strictEqual(openedUrlC.includes('authuser='), true, 'FATAL ERROR: PDF URL must contain authuser parameter!');
  assert.strictEqual(resC.message.includes('Google Docs'), true, 'FATAL ERROR: Message must state Google Docs!');
  console.log('  ✓ Verified: Directly launched into Google Docs with authuser context');

  // TEST D: When a native Google virtual file exists on G:\
  console.log('\n[TEST D] Native Google virtual file (.gslides) exists on G:\\');
  const virtualSlides = path.join(mockSquadFolder, 'presentation.gslides');
  fs.writeFileSync(virtualSlides, JSON.stringify({ url: 'https://docs.google.com/presentation/d/native123/edit', doc_id: 'native123' }));

  electronCalls.openPath = [];
  electronCalls.openExternal = [];
  electronCalls.mockOpenPathResult = '';

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

  // TEST F: Extensionless Proposal PDF
  console.log('\n[TEST F] openInGoogleDriveDesktop("proposal") (extensionless PDF)');
  electronCalls.openPath = [];
  electronCalls.openExternal = [];

  const resF = await FileHandlers.openInGoogleDriveDesktop(testProposalExtless);
  console.log('  Result:', resF);
  const openedExtless = electronCalls.openPath.some(p => p === testProposalExtless);
  assert.strictEqual(openedExtless, false, 'FATAL ERROR: shell.openPath was called on proposal file!');
  const openedUrlF = electronCalls.openExternal[0];
  console.log('  Launched URL:', openedUrlF);
  assert.strictEqual(openedUrlF.includes('document'), true, 'FATAL ERROR: Extensionless PDF must launch Google Docs! Got: ' + openedUrlF);
  assert.strictEqual(openedUrlF.includes('authuser='), true, 'FATAL ERROR: Launched URL must contain authuser!');
  console.log('  ✓ Verified: Extensionless PDF correctly detected and launched directly into Google Docs');

  // TEST G: Configured Pro Account authuser propagation
  console.log('\n[TEST G] Pro Account Switching (authuser propagation)');
  const settingsPath = path.join(tempDir, 'station_settings.json');
  fs.writeFileSync(settingsPath, JSON.stringify({
    googleSuite: {
      accountIndex: 'astrosquad.pro@gmail.com'
    }
  }));

  // Remove virtual slides from squad folder so it routes to workspace URL
  if (fs.existsSync(virtualSlides)) fs.unlinkSync(virtualSlides);

  electronCalls.openPath = [];
  electronCalls.openExternal = [];

  await FileHandlers.openInGoogleDriveDesktop(testPptx);
  const openedUrlG = electronCalls.openExternal[0];
  console.log('  Launched URL with configured Pro account:', openedUrlG);
  assert.strictEqual(openedUrlG.includes('authuser=astrosquad.pro%40gmail.com'), true, 'FATAL ERROR: URL must contain authuser with Pro account email! Got: ' + openedUrlG);
  console.log('  ✓ Verified: Pro account email correctly applied to authuser parameter');

  // TEST H: Native Google virtual file shell error fallback
  console.log('\n[TEST H] Native Google virtual file with shell.openPath error fallback');
  fs.writeFileSync(virtualSlides, JSON.stringify({ url: 'https://docs.google.com/presentation/d/native456/edit', doc_id: 'native456' }));
  electronCalls.openPath = [];
  electronCalls.openExternal = [];
  electronCalls.mockOpenPathResult = 'Failed to launch desktop association';

  await FileHandlers.openInGoogleDriveDesktop(testPptx);
  assert.strictEqual(electronCalls.openPath.includes(virtualSlides), true);
  const openedUrlH = electronCalls.openExternal[0];
  console.log('  Launched URL on virtual file fallback:', openedUrlH);
  assert.strictEqual(openedUrlH.includes('native456'), true, 'FATAL ERROR: Virtual file fallback must open document URL! Got: ' + openedUrlH);
  console.log('  ✓ Verified: Virtual file error gracefully falls through to opening document URL with authuser');

  // TEST I: Extensionless PDF Proposal with "System Default"
  console.log('\n[TEST I] Extensionless PDF Proposal with "System Default"');
  electronCalls.openPath = [];
  electronCalls.openExternal = [];
  electronCalls.mockOpenPathResult = '';

  const resI = await FileHandlers.openInDesktopApp(testProposalExtless, 'system_default');
  console.log('  Result:', resI);
  assert.strictEqual(resI.success, true);
  const openedPathI = electronCalls.openPath[0];
  console.log('  Opened Path for System Default proposal:', openedPathI);
  assert.strictEqual(openedPathI.endsWith('.pdf'), true, 'FATAL ERROR: Extensionless PDF must be opened via .pdf copy so Windows associates it with PDF viewer! Got: ' + openedPathI);
  console.log('  ✓ Verified: Extensionless PDF opens with .pdf extension on System Default');

  // TEST J: Native Google virtual file with only doc_id (no explicit url field)
  console.log('\n[TEST J] Native Google virtual file with only doc_id');
  fs.writeFileSync(virtualSlides, JSON.stringify({ doc_id: 'docid_789' }));
  electronCalls.openPath = [];
  electronCalls.openExternal = [];
  electronCalls.mockOpenPathResult = 'Association failed';

  await FileHandlers.openInGoogleDriveDesktop(testPptx);
  const openedUrlJ = electronCalls.openExternal[0];
  console.log('  Launched URL from doc_id:', openedUrlJ);
  assert.strictEqual(openedUrlJ.includes('docid_789'), true, 'FATAL ERROR: doc_id must be resolved into document URL! Got: ' + openedUrlJ);
  console.log('  ✓ Verified: Google virtual file with only doc_id is correctly resolved to full document URL');

  // TEST K: Self-copy protection when opening file already in Google Drive squad folder
  console.log('\n[TEST K] Self-copy protection when file already in squad folder');
  const alreadyInSquad = path.join(mockSquadFolder, 'already_in_squad.pptx');
  fs.writeFileSync(alreadyInSquad, 'SQUAD_PPTX_CONTENT');
  electronCalls.openPath = [];
  electronCalls.openExternal = [];

  const resK = await FileHandlers.openInGoogleDriveDesktop(alreadyInSquad);
  console.log('  Result:', resK);
  assert.strictEqual(resK.success, true);
  assert.strictEqual(fs.readFileSync(alreadyInSquad, 'utf-8'), 'SQUAD_PPTX_CONTENT');
  console.log('  ✓ Verified: Self-copy guard prevented file truncation or error');

  // TEST L: detectGoogleDrivePath when The-AstroSquad folder does not pre-exist
  console.log('\n[TEST L] Google Drive squadPath detection and auto-creation when folder does not pre-exist');
  const freshDriveRoot = path.join(tempDir, 'FreshDrive');
  fs.mkdirSync(freshDriveRoot, { recursive: true });
  // Set real FileHandlers.detectGoogleDrivePath mock simulating fresh drive
  FileHandlers.detectGoogleDrivePath = () => ({
    driveRoot: freshDriveRoot,
    squadPath: path.join(freshDriveRoot, 'The-AstroSquad')
  });

  const resL = await FileHandlers.openInGoogleDriveDesktop(testPptx);
  console.log('  Result:', resL);
  assert.strictEqual(resL.success, true);
  const targetCreatedSquadDir = path.join(freshDriveRoot, 'The-AstroSquad');
  assert.strictEqual(fs.existsSync(targetCreatedSquadDir), true, 'FATAL ERROR: The-AstroSquad folder was not auto-created!');
  assert.strictEqual(fs.existsSync(path.join(targetCreatedSquadDir, 'presentation.pptx')), true, 'FATAL ERROR: File was not copied into newly created The-AstroSquad folder!');
  console.log('  ✓ Verified: The-AstroSquad folder is auto-created and synced under fresh Google Drive root');

  // TEST M: openInGoogleDriveDesktop() with no file argument when squadPath does not pre-exist
  console.log('\n[TEST M] openInGoogleDriveDesktop() without filePath when folder does not pre-exist');
  const emptyDriveRoot = path.join(tempDir, 'EmptyDrive');
  fs.mkdirSync(emptyDriveRoot, { recursive: true });
  FileHandlers.detectGoogleDrivePath = () => ({
    driveRoot: emptyDriveRoot,
    squadPath: path.join(emptyDriveRoot, 'The-AstroSquad')
  });
  electronCalls.openPath = [];
  const resM = await FileHandlers.openInGoogleDriveDesktop();
  console.log('  Result:', resM);
  assert.strictEqual(resM.success, true, 'FATAL ERROR: openInGoogleDriveDesktop() failed on fresh drive mount!');
  assert.strictEqual(fs.existsSync(path.join(emptyDriveRoot, 'The-AstroSquad')), true, 'FATAL ERROR: The-AstroSquad folder was not auto-created when opening drive folder!');
  console.log('  ✓ Verified: Opening Google Drive folder auto-creates The-AstroSquad and opens it');

  // TEST N: openInDesktopApp on native virtual file with shell.openPath failure
  console.log('\n[TEST N] openInDesktopApp on native virtual file with shell.openPath failure');
  const standaloneVirtualFile = path.join(tempDir, 'standalone.gslides');
  fs.writeFileSync(standaloneVirtualFile, JSON.stringify({ doc_id: 'docid_app_fallback_999' }));
  electronCalls.openPath = [];
  electronCalls.openExternal = [];
  electronCalls.mockOpenPathResult = 'Failed to launch desktop association';

  const resN = await FileHandlers.openInDesktopApp(standaloneVirtualFile);
  console.log('  Result:', resN);
  assert.strictEqual(resN.success, true);
  const openedUrlN = electronCalls.openExternal[0];
  console.log('  Launched URL on openInDesktopApp virtual fallback:', openedUrlN);
  assert.strictEqual(openedUrlN.includes('docid_app_fallback_999'), true, 'FATAL ERROR: openInDesktopApp virtual fallback must open document URL with doc_id! Got: ' + openedUrlN);
  console.log('  ✓ Verified: openInDesktopApp correctly resolves doc_id from virtual file on association failure');

  // TEST O: authuser query parameter replacement when URL already has an authuser param
  console.log('\n[TEST O] authuser replacement when URL already has authuser query parameter');
  electronCalls.openExternal = [];
  const existingAuthUrl = 'https://docs.google.com/presentation/d/deck123/edit?authuser=old_account%40gmail.com';
  await FileHandlers.openGoogleSuiteSession('slides', 'browser_tab', undefined, undefined, existingAuthUrl);
  const openedUrlO = electronCalls.openExternal[0];
  console.log('  Launched URL with updated authuser:', openedUrlO);
  assert.strictEqual(openedUrlO.includes('authuser=astrosquad.pro%40gmail.com'), true, 'FATAL ERROR: Old authuser parameter was not replaced! Got: ' + openedUrlO);
  assert.strictEqual(openedUrlO.includes('old_account'), false, 'FATAL ERROR: Old authuser still present in URL! Got: ' + openedUrlO);
  console.log('  ✓ Verified: Existing authuser query parameter successfully updated to configured Pro account');

  // TEST P: detectGoogleDrivePath detection of Windows Mirror mode (Google Drive without My Drive)
  console.log('\n[TEST P] Google Drive detection in Mirror mode');
  const mirrorDir = path.join(tempDir, 'Google Drive');
  fs.mkdirSync(mirrorDir, { recursive: true });
  const oldUserProfile = process.env.USERPROFILE;
  const origExistsSync = fs.existsSync;
  process.env.USERPROFILE = tempDir;
  try {
    fs.existsSync = (p) => {
      if (typeof p === 'string' && (/^[D-Z]:\\My Drive/i.test(p) || /^G:\\/i.test(p))) return false;
      return origExistsSync(p);
    };
    FileHandlers.detectGoogleDrivePath = originalDetectGoogleDrivePath;
    const detected = FileHandlers.detectGoogleDrivePath();
    console.log('  Detected Mirror Mode Drive:', detected);
    assert.strictEqual(detected.driveRoot, mirrorDir, 'FATAL ERROR: Mirror mode folder was not detected as driveRoot!');
    assert.strictEqual(detected.squadPath, path.join(mirrorDir, 'The-AstroSquad'), 'FATAL ERROR: squadPath not correctly mapped under mirror mode folder!');
    console.log('  ✓ Verified: Google Drive Mirror mode in user profile detected successfully');
  } finally {
    fs.existsSync = origExistsSync;
    process.env.USERPROFILE = oldUserProfile;
    FileHandlers.detectGoogleDrivePath = originalDetectGoogleDrivePath;
  }

  // Clean up
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch {}

  console.log('\n=== ALL 16 RUNTIME BEHAVIORAL TESTS PASSED PERFECTLY ===');
}

runRuntimeTests().catch(err => {
  console.error('\nTEST FAILED:', err);
  process.exit(1);
});
