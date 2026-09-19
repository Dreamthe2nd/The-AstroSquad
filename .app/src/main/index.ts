import { app, BrowserWindow, ipcMain, shell, protocol, net } from 'electron';
import path from 'path';
import url from 'url';
import fs from 'fs';
import { GitEngine } from './gitEngine';
import { FileHandlers } from './fileHandlers';
import { SettingsManager, StationSettings } from './settingsManager';

let mainWindow: BrowserWindow | null = null;
let gitEngine: GitEngine;
let settingsManager: SettingsManager;

// Register custom scheme for loading local files securely
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'astrosquad',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true
    }
  }
]);

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 880,
    minWidth: 1040,
    minHeight: 700,
    title: 'AstroSquad Research Station',
    backgroundColor: '#030712',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
      plugins: true
    }
  });

  mainWindow.on('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show();
    }
  });

  // Capture renderer console messages for debugging scan
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer Console] ${message} (${sourceId}:${line})`);
  });

  // Toggle DevTools on F12 or Ctrl+Shift+I
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
      mainWindow?.webContents.toggleDevTools();
    }
  });

  // Handle opening external URLs in default browser
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  // Load either dev server or production dist
  const devServerUrl = process.env['ELECTRON_RENDERER_URL'];
  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

// Custom protocol to safely stream local files with high-performance native I/O
function registerCustomProtocol(): void {
  protocol.handle('astrosquad', (request) => {
    try {
      const parsedUrl = new URL(request.url);
      let filePath = '';
      if (parsedUrl.hostname === 'file') {
        let pathname = decodeURIComponent(parsedUrl.pathname);
        if (process.platform === 'win32' && pathname.startsWith('/')) {
          pathname = pathname.slice(1);
        }
        filePath = path.isAbsolute(pathname)
          ? pathname
          : path.join(gitEngine.getRepoDir(), pathname);
      } else {
        const relPath = decodeURIComponent(parsedUrl.pathname).replace(/^\//, '');
        filePath = path.join(gitEngine.getRepoDir(), relPath);
      }

      if (fs.existsSync(filePath)) {
        // High-performance streaming via Chromium's native net.fetch with range requests support
        const fileUrl = url.pathToFileURL(filePath).toString();
        return net.fetch(fileUrl);
      }
      return new Response('File not found', { status: 404 });
    } catch (err: any) {
      return new Response(`Error: ${err.message}`, { status: 500 });
    }
  });
}

/* ---------------- IPC Handlers ---------------- */

function registerIpcHandlers(): void {
  // Auth handlers
  ipcMain.handle('auth:requestDeviceCode', async (_, clientId?: string) => {
    return gitEngine.requestDeviceCode(clientId);
  });

  ipcMain.handle('auth:pollDeviceAuth', async (_, args: { deviceCode: string; interval?: number; clientId?: string }) => {
    return gitEngine.pollDeviceAuth(args.clientId, args.deviceCode, args.interval);
  });

  ipcMain.handle('auth:getAuthStatus', async () => {
    return gitEngine.getAuthenticatedUser();
  });

  ipcMain.handle('auth:setManualToken', async (_, token: string) => {
    gitEngine.setManualToken(token);
    return true;
  });

  ipcMain.handle('auth:logout', async () => {
    gitEngine.clearToken();
    return true;
  });

  // Git handlers
  ipcMain.handle('git:syncRepository', async () => {
    return gitEngine.syncRepository((phase) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('git:progress', phase);
      }
    });
  });

  ipcMain.handle('git:commitAndPush', async (_, notes?: string) => {
    return gitEngine.commitAndPush(notes);
  });

  ipcMain.handle('git:getStatus', async () => {
    return gitEngine.getStatus();
  });

  ipcMain.handle('git:getRepoDir', async () => {
    return gitEngine.getRepoDir();
  });

  ipcMain.handle('git:setRepoDir', async (_, newPath: string) => {
    gitEngine.setRepoDir(newPath);
    return gitEngine.getRepoDir();
  });

  // FS handlers
  ipcMain.handle('fs:listFiles', async () => {
    return FileHandlers.listFiles(gitEngine.getRepoDir());
  });

  ipcMain.handle('fs:readFile', async (_, relativeOrAbs: string) => {
    const fullPath = path.isAbsolute(relativeOrAbs)
      ? relativeOrAbs
      : path.join(gitEngine.getRepoDir(), relativeOrAbs);
    return FileHandlers.readFile(fullPath);
  });

  ipcMain.handle('fs:writeFile', async (_, args: { filePath: string; content: string }) => {
    const fullPath = path.isAbsolute(args.filePath)
      ? args.filePath
      : path.join(gitEngine.getRepoDir(), args.filePath);
    FileHandlers.writeFile(fullPath, args.content);
    return true;
  });

  ipcMain.handle('fs:importFiles', async (_, targetSubdir?: string) => {
    if (!mainWindow) return { success: false, importedCount: 0, message: 'Window not ready.' };
    const targetDir = targetSubdir
      ? (path.isAbsolute(targetSubdir) ? targetSubdir : path.join(gitEngine.getRepoDir(), targetSubdir))
      : gitEngine.getRepoDir();
    return FileHandlers.importFiles(mainWindow, targetDir);
  });

  ipcMain.handle('fs:importFolder', async (_, targetSubdir?: string) => {
    if (!mainWindow) return { success: false, folderName: '', message: 'Window not ready.' };
    const targetDir = targetSubdir
      ? (path.isAbsolute(targetSubdir) ? targetSubdir : path.join(gitEngine.getRepoDir(), targetSubdir))
      : gitEngine.getRepoDir();
    return FileHandlers.importFolder(mainWindow, targetDir);
  });

  ipcMain.handle('fs:createMarkdownNote', async (_, args: { targetSubdir?: string; filename: string; title?: string }) => {
    const targetDir = args.targetSubdir
      ? (path.isAbsolute(args.targetSubdir) ? args.targetSubdir : path.join(gitEngine.getRepoDir(), args.targetSubdir))
      : gitEngine.getRepoDir();
    return FileHandlers.createMarkdownNote(targetDir, args.filename, args.title);
  });

  ipcMain.handle('fs:openInDesktopApp', async (_, targetFile: string) => {
    const fullPath = path.isAbsolute(targetFile)
      ? targetFile
      : path.join(gitEngine.getRepoDir(), targetFile);
    const customApp = settingsManager.resolveAppForFile(fullPath);
    return FileHandlers.openInDesktopApp(fullPath, customApp);
  });

  // Settings handlers
  ipcMain.handle('settings:get', async () => {
    return settingsManager.getSettings();
  });

  ipcMain.handle('settings:save', async (_, newSettings: Partial<StationSettings>) => {
    const saved = settingsManager.saveSettings(newSettings);
    if (newSettings.repository) {
      if (newSettings.repository.localPath) gitEngine.setRepoDir(newSettings.repository.localPath);
      if (newSettings.repository.url) gitEngine.setRepoUrl(newSettings.repository.url);
      if (newSettings.repository.branch) gitEngine.setBranch(newSettings.repository.branch);
    }
    return saved;
  });

  ipcMain.handle('settings:browseApp', async () => {
    if (!mainWindow) return null;
    return settingsManager.browseApp(mainWindow);
  });

  ipcMain.handle('settings:browseRepoDir', async () => {
    if (!mainWindow) return null;
    return settingsManager.browseRepoDir(mainWindow);
  });

  ipcMain.handle('settings:reset', async () => {
    const reset = settingsManager.resetSettings();
    gitEngine.setRepoDir(reset.repository.localPath);
    gitEngine.setRepoUrl(reset.repository.url);
    gitEngine.setBranch(reset.repository.branch);
    return reset;
  });

  // Shell & utilities
  ipcMain.handle('shell:openExternal', async (_, urlToOpen: string) => {
    await shell.openExternal(urlToOpen);
  });

  ipcMain.handle('shell:openDiscord', async (_, args?: { customInviteUrl?: string; customAppUri?: string }) => {
    const auth = await gitEngine.getAuthenticatedUser();
    if (!auth.authenticated || !auth.isCollaborator) {
      throw new Error('Access restricted: Only verified AstroSquad repository collaborators can access Squad Comms.');
    }
    const settings = settingsManager.getSettings();
    const inviteUrl = args?.customInviteUrl || settings.discord.inviteUrl;
    const appUri = args?.customAppUri || settings.discord.appUri;
    await FileHandlers.openDiscord(inviteUrl, appUri);
  });

  ipcMain.handle('shell:openMeeting', async (_, customUrl?: string) => {
    const auth = await gitEngine.getAuthenticatedUser();
    if (!auth.authenticated || !auth.isCollaborator) {
      throw new Error('Access restricted: Only verified AstroSquad repository collaborators can access Team Video Briefings.');
    }
    const settings = settingsManager.getSettings();
    const url = customUrl || settings.meeting?.url || 'https://meet.google.com/new';
    await shell.openExternal(url);
  });

  ipcMain.handle('shell:openRepoFolder', async () => {
    await shell.openPath(gitEngine.getRepoDir());
  });
}

/* ---------------- App Lifecycle ---------------- */

app.whenReady().then(() => {
  // Initialize SettingsManager
  settingsManager = new SettingsManager();
  const initialSettings = settingsManager.getSettings();

  // Initialize GitEngine with settings
  gitEngine = new GitEngine(
    initialSettings.repository.localPath,
    initialSettings.repository.url,
    initialSettings.repository.branch
  );

  registerCustomProtocol();
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
