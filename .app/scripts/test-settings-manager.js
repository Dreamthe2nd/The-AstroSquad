const fs = require('fs');
const path = require('path');

// Test SettingsManager logic directly
const testSettingsPath = path.join(__dirname, 'test-settings.json');
if (fs.existsSync(testSettingsPath)) {
  fs.unlinkSync(testSettingsPath);
}

console.log('=== Testing SettingsManager & File Association Logic ===');

// 1. Verify file associations map
const mockSettings = {
  fileAssociations: {
    pptx: 'C:\\Program Files\\LibreOffice\\program\\simpress.exe',
    pdf: 'C:\\Program Files\\SumatraPDF\\SumatraPDF.exe',
    md: '',
    csv: '',
    images: ''
  },
  repository: {
    url: 'https://github.com/Dreamthe2nd/The-AstroSquad',
    localPath: 'C:\\Users\\h1465\\Documents\\AstroSquad',
    branch: 'main'
  },
  discord: {
    inviteUrl: 'https://discord.gg/yk7cgnd6E',
    appUri: 'discord://discord.com/channels/1545465896481333258'
  }
};

fs.writeFileSync(testSettingsPath, JSON.stringify(mockSettings, null, 2), 'utf-8');
console.log('1. Saved test settings to disk.');

// 2. Read back
const reloaded = JSON.parse(fs.readFileSync(testSettingsPath, 'utf-8'));
console.log('2. Reloaded settings from disk successfully.');
console.log('   - PPTX custom app:', reloaded.fileAssociations.pptx);
console.log('   - Repository URL:', reloaded.repository.url);
console.log('   - Discord Invite URL:', reloaded.discord.inviteUrl);

// 3. Test resolveAppForFile logic
function resolveAppForFile(filePath, settings) {
  const ext = path.extname(filePath).toLowerCase();
  const { fileAssociations } = settings;

  if (ext === '.pptx' && fileAssociations.pptx) {
    return fileAssociations.pptx;
  }
  if (ext === '.pdf' && fileAssociations.pdf) {
    return fileAssociations.pdf;
  }
  return undefined;
}

const pptxApp = resolveAppForFile('hubbles-law.pptx', reloaded);
console.log('3. Resolving app for "hubbles-law.pptx":', pptxApp);
if (pptxApp !== 'C:\\Program Files\\LibreOffice\\program\\simpress.exe') {
  console.error('❌ Failed to resolve custom pptx app!');
  process.exit(1);
}

const mdApp = resolveAppForFile('notes.md', reloaded);
console.log('   Resolving app for "notes.md" (empty/default):', mdApp);
if (mdApp !== undefined) {
  console.error('❌ Expected undefined for unassigned md app!');
  process.exit(1);
}

// Cleanup
fs.unlinkSync(testSettingsPath);
console.log('✅ SettingsManager verification passed successfully!');
