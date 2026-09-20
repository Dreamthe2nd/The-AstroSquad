import fs from 'fs';
import path from 'path';
import os from 'os';
import child_process from 'child_process';
import { dialog, shell, BrowserWindow, clipboard } from 'electron';
import { GoogleWindowManager } from './googleWindowManager';

export interface FileNode {
  name: string;
  relativePath: string;
  absolutePath: string;
  isDirectory: boolean;
  size?: number;
  extension?: string;
  children?: FileNode[];
}

export interface DetectedBrowserInfo {
  id: string;
  name: string;
  path: string | null;
  supportsAppMode: boolean;
  platform: 'win32' | 'darwin' | 'linux';
}

export class FileHandlers {
  /**
   * Recursively reads the repository directory tree
   */
  public static listFiles(repoDir: string): FileNode[] {
    if (!fs.existsSync(repoDir)) return [];

    const walk = (currentDir: string, relativeCurrent: string): FileNode[] => {
      const items = fs.readdirSync(currentDir, { withFileTypes: true });
      const nodes: FileNode[] = [];

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

      // Sort: folders first, then files alphabetically
      return nodes.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });
    };

    return walk(repoDir, '');
  }

  /**
   * Reads a file: as text or as base64 data URI
   */
  public static readFile(filePath: string): { content: string; isBinary: boolean; mimeType: string } {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      return {
        content: '',
        isBinary: false,
        mimeType: 'text/plain'
      };
    }
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

      // PPTX requires raw bytes for JSZip parsing (guarded up to 30MB)
      const needsBase64 = ext === '.pptx' && stats.size <= 30 * 1024 * 1024;
      const content = needsBase64 ? fs.readFileSync(filePath).toString('base64') : '';

      return {
        content,
        isBinary: true,
        mimeType
      };
    } else {
      // Special check: if file is "Proposal" with no extension, check if it's PDF
      if (path.basename(filePath).toLowerCase() === 'proposal') {
        const head = Buffer.alloc(10);
        const fd = fs.openSync(filePath, 'r');
        fs.readSync(fd, head, 0, 10, 0);
        fs.closeSync(fd);
        if (head.toString().startsWith('%PDF')) {
          return {
            content: '',
            isBinary: true,
            mimeType: 'application/pdf'
          };
        }
      }

      // Check for binary content by scanning first 4KB for null bytes
      const sampleSize = Math.min(stats.size, 4096);
      if (sampleSize > 0) {
        const buf = Buffer.alloc(sampleSize);
        const fd = fs.openSync(filePath, 'r');
        fs.readSync(fd, buf, 0, sampleSize, 0);
        fs.closeSync(fd);
        for (let i = 0; i < sampleSize; i++) {
          if (buf[i] === 0) {
            return {
              content: '',
              isBinary: true,
              mimeType: 'application/octet-stream'
            };
          }
        }
      }

      // Guard large text files (> 2 MB) from freezing React DOM
      if (stats.size > 2 * 1024 * 1024) {
        const previewBuf = Buffer.alloc(512 * 1024);
        const fd = fs.openSync(filePath, 'r');
        const bytesRead = fs.readSync(fd, previewBuf, 0, 512 * 1024, 0);
        fs.closeSync(fd);
        const content = previewBuf.toString('utf-8', 0, bytesRead) +
          `\n\n--- [Telemetry Notice: File size is ${(stats.size / (1024 * 1024)).toFixed(1)} MB. Truncated for viewing performance. Open in Desktop App for full file] ---`;
        return {
          content,
          isBinary: false,
          mimeType: 'text/plain'
        };
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      return {
        content,
        isBinary: false,
        mimeType: 'text/plain'
      };
    }
  }

  /**
   * Writes content to a file
   */
  public static writeFile(filePath: string, content: string): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  /**
   * Cross-platform browser detection across macOS and Windows
   * Detects Vivaldi, Chrome, Edge, Brave, and Safari with app-mode capability tracking.
   */
  public static detectBrowsers(): DetectedBrowserInfo[] {
    const isWin = process.platform === 'win32';
    const isMac = process.platform === 'darwin';
    const browsers: DetectedBrowserInfo[] = [];

    if (isWin) {
      // 1. Vivaldi on Windows (Vivaldi ignores --app when running, so launch in browser tab mode)
      const vivaldiCandidates = [
        path.join(process.env.LOCALAPPDATA || '', 'Vivaldi\\Application\\vivaldi.exe'),
        'C:\\Program Files\\Vivaldi\\Application\\vivaldi.exe',
        'C:\\Program Files (x86)\\Vivaldi\\Application\\vivaldi.exe'
      ];
      for (const p of vivaldiCandidates) {
        if (p && fs.existsSync(p)) {
          browsers.push({ id: 'vivaldi', name: 'Vivaldi', path: p, supportsAppMode: false, platform: 'win32' });
          break;
        }
      }

      // 2. Google Chrome on Windows
      const chromeCandidates = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe')
      ];
      for (const p of chromeCandidates) {
        if (p && fs.existsSync(p)) {
          browsers.push({ id: 'chrome', name: 'Google Chrome', path: p, supportsAppMode: true, platform: 'win32' });
          break;
        }
      }

      // 3. Microsoft Edge on Windows
      const edgeCandidates = [
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
        path.join(process.env.LOCALAPPDATA || '', 'Microsoft\\Edge\\Application\\msedge.exe')
      ];
      for (const p of edgeCandidates) {
        if (p && fs.existsSync(p)) {
          browsers.push({ id: 'edge', name: 'Microsoft Edge', path: p, supportsAppMode: true, platform: 'win32' });
          break;
        }
      }

      // 4. Brave on Windows
      const braveCandidates = [
        'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
        path.join(process.env.LOCALAPPDATA || '', 'BraveSoftware\\Brave-Browser\\Application\\brave.exe')
      ];
      for (const p of braveCandidates) {
        if (p && fs.existsSync(p)) {
          browsers.push({ id: 'brave', name: 'Brave Browser', path: p, supportsAppMode: true, platform: 'win32' });
          break;
        }
      }
    } else if (isMac) {
      // 1. Safari on macOS
      if (fs.existsSync('/Applications/Safari.app')) {
        browsers.push({ id: 'safari', name: 'Safari', path: '/Applications/Safari.app', supportsAppMode: false, platform: 'darwin' });
      }

      // 2. Vivaldi on macOS
      if (fs.existsSync('/Applications/Vivaldi.app')) {
        browsers.push({ id: 'vivaldi', name: 'Vivaldi', path: '/Applications/Vivaldi.app', supportsAppMode: false, platform: 'darwin' });
      }

      // 3. Google Chrome on macOS
      if (fs.existsSync('/Applications/Google Chrome.app')) {
        browsers.push({ id: 'chrome', name: 'Google Chrome', path: '/Applications/Google Chrome.app', supportsAppMode: true, platform: 'darwin' });
      }

      // 4. Brave on macOS
      if (fs.existsSync('/Applications/Brave Browser.app')) {
        browsers.push({ id: 'brave', name: 'Brave Browser', path: '/Applications/Brave Browser.app', supportsAppMode: true, platform: 'darwin' });
      }

      // 5. Microsoft Edge on macOS
      if (fs.existsSync('/Applications/Microsoft Edge.app')) {
        browsers.push({ id: 'edge', name: 'Microsoft Edge', path: '/Applications/Microsoft Edge.app', supportsAppMode: true, platform: 'darwin' });
      }
    }

    return browsers;
  }

  /**
   * Detects local Obsidian installation across Windows and macOS
   */
  public static detectObsidianPath(): string | null {
    const isWin = process.platform === 'win32';
    const isMac = process.platform === 'darwin';

    if (isWin) {
      const localAppData = process.env.LOCALAPPDATA || '';
      const candidates = [
        path.join(localAppData, 'Programs', 'Obsidian', 'Obsidian.exe'),
        path.join(localAppData, 'Obsidian', 'Obsidian.exe'),
        'C:\\Program Files\\Obsidian\\Obsidian.exe',
        'C:\\Program Files (x86)\\Obsidian\\Obsidian.exe'
      ];
      for (const p of candidates) {
        if (p && fs.existsSync(p)) return p;
      }
    } else if (isMac) {
      if (fs.existsSync('/Applications/Obsidian.app')) {
        return '/Applications/Obsidian.app';
      }
    }
    return null;
  }

  /**
   * Detects local Google Drive for Desktop installation and shared AstroSquad folder
   */
  public static detectGoogleDrivePath(): { driveRoot: string | null; squadPath: string | null } {
    const isWin = process.platform === 'win32';
    const isMac = process.platform === 'darwin';

    if (isWin) {
      // Check G: first (standard Google Drive mount)
      const primaryCandidate = 'G:\\My Drive';
      if (fs.existsSync(primaryCandidate)) {
        const squadPath = path.join(primaryCandidate, 'The-AstroSquad');
        return {
          driveRoot: primaryCandidate,
          squadPath: fs.existsSync(squadPath) ? squadPath : primaryCandidate
        };
      }

      // Check all drive letters D through Z
      for (let c = 68; c <= 90; c++) {
        const letter = String.fromCharCode(c);
        const myDrive = `${letter}:\\My Drive`;
        if (fs.existsSync(myDrive)) {
          const squadPath = path.join(myDrive, 'The-AstroSquad');
          return {
            driveRoot: myDrive,
            squadPath: fs.existsSync(squadPath) ? squadPath : myDrive
          };
        }
      }

      // Check user profile folder
      const userProfile = process.env.USERPROFILE || '';
      const localDrive = path.join(userProfile, 'Google Drive', 'My Drive');
      if (fs.existsSync(localDrive)) {
        const squadPath = path.join(localDrive, 'The-AstroSquad');
        return {
          driveRoot: localDrive,
          squadPath: fs.existsSync(squadPath) ? squadPath : localDrive
        };
      }
    } else if (isMac) {
      const home = process.env.HOME || '';
      const candidates = [
        path.join(home, 'Google Drive', 'My Drive'),
        path.join(home, 'Library/CloudStorage/GoogleDrive')
      ];
      for (const c of candidates) {
        if (fs.existsSync(c)) {
          const squadPath = path.join(c, 'The-AstroSquad');
          return {
            driveRoot: c,
            squadPath: fs.existsSync(squadPath) ? squadPath : c
          };
        }
      }
    }

    return { driveRoot: null, squadPath: null };
  }

  /**
   * Safe wrapper for child_process.spawn that catches both sync and async ENOENT errors.
   * Returns a Promise that resolves after a brief delay to check if the child started OK.
   */
  private static safeSpawn(command: string, args: string[]): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      try {
        const child = child_process.spawn(command, args, {
          detached: true,
          stdio: 'ignore'
        });

        let errorOccurred = false;

        child.on('error', (err: any) => {
          errorOccurred = true;
          resolve({ success: false, error: err.message || 'Spawn failed' });
        });

        // Give it 500ms to detect spawn errors (ENOENT fires almost immediately)
        setTimeout(() => {
          if (!errorOccurred) {
            child.unref();
            resolve({ success: true });
          }
        }, 500);
      } catch (err: any) {
        resolve({ success: false, error: err.message || 'Spawn threw synchronously' });
      }
    });
  }

  /**
   * Resolves git repository root from a file path
   */
  public static getRepoRoot(filePath: string): string {
    let dir = path.dirname(filePath);
    while (dir && dir !== path.dirname(dir)) {
      if (fs.existsSync(path.join(dir, '.git'))) {
        return dir;
      }
      dir = path.dirname(dir);
    }
    return path.dirname(filePath);
  }

  /**
   * Automatically ensures that the repository directory is recognized by Obsidian as a vault
   * by creating .obsidian and registering the path in obsidian.json across Windows, macOS, and Linux.
   */
  public static ensureObsidianVault(filePath: string): void {
    try {
      const repoRoot = this.getRepoRoot(filePath);
      // 1. Ensure .obsidian folder exists so Obsidian treats it as a vault
      const obsDir = path.join(repoRoot, '.obsidian');
      if (!fs.existsSync(obsDir)) {
        fs.mkdirSync(obsDir, { recursive: true });
      }

      // 2. Register vault in obsidian.json across OSes
      const isWin = process.platform === 'win32';
      const isMac = process.platform === 'darwin';
      let configPath = '';
      if (isWin && process.env.APPDATA) {
        configPath = path.join(process.env.APPDATA, 'obsidian', 'obsidian.json');
      } else if (isMac && process.env.HOME) {
        configPath = path.join(process.env.HOME, 'Library', 'Application Support', 'obsidian', 'obsidian.json');
      } else if (process.env.HOME) {
        configPath = path.join(process.env.HOME, '.config', 'obsidian', 'obsidian.json');
      }

      if (configPath && fs.existsSync(configPath)) {
        try {
          const raw = fs.readFileSync(configPath, 'utf-8');
          const data = JSON.parse(raw);
          if (!data.vaults) data.vaults = {};

          let exists = false;
          for (const id in data.vaults) {
            if (path.resolve(data.vaults[id]?.path || '') === path.resolve(repoRoot)) {
              exists = true;
              break;
            }
          }
          if (!exists) {
            const vaultId = 'astrosquad' + Math.random().toString(16).slice(2, 8);
            data.vaults[vaultId] = {
              path: repoRoot,
              ts: Date.now()
            };
            fs.writeFileSync(configPath, JSON.stringify(data, null, 2), 'utf-8');
          }
        } catch (e) {
          console.warn('Could not auto-register vault in obsidian.json:', e);
        }
      }
    } catch (err) {
      console.warn('ensureObsidianVault failed:', err);
    }
  }

  /**
   * Detects if a file is a PDF (by extension, name, or %PDF magic byte)
   */
  public static isPdfFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.pdf') return true;
    const base = path.basename(filePath).toLowerCase();
    if (base === 'proposal') return true;
    try {
      if (fs.existsSync(filePath)) {
        const fd = fs.openSync(filePath, 'r');
        const buf = Buffer.alloc(5);
        fs.readSync(fd, buf, 0, 5, 0);
        fs.closeSync(fd);
        return buf.toString('utf-8').startsWith('%PDF');
      }
    } catch {}
    return false;
  }

  /**
   * Resolves public raw GitHub URL for a file in the repository
   */
  public static getRawGitHubUrl(filePath: string): string | null {
    try {
      if (!filePath || !fs.existsSync(filePath)) return null;

      let currentDir = path.dirname(path.resolve(filePath));
      let gitRoot: string | null = null;
      let remoteUrl = 'https://github.com/Dreamthe2nd/The-AstroSquad';
      let branch = 'main';

      while (currentDir && currentDir !== path.dirname(currentDir)) {
        const gitDir = path.join(currentDir, '.git');
        if (fs.existsSync(gitDir)) {
          gitRoot = currentDir;
          const configPath = path.join(gitDir, 'config');
          if (fs.existsSync(configPath)) {
            try {
              const content = fs.readFileSync(configPath, 'utf-8');
              const urlMatch = content.match(/url\s*=\s*(.+)/);
              if (urlMatch) {
                remoteUrl = urlMatch[1].trim();
              }
              const headPath = path.join(gitDir, 'HEAD');
              if (fs.existsSync(headPath)) {
                const headContent = fs.readFileSync(headPath, 'utf-8').trim();
                const branchMatch = headContent.match(/ref:\s*refs\/heads\/(.+)/);
                if (branchMatch) {
                  branch = branchMatch[1].trim();
                }
              }
            } catch (e) {
              console.warn('[FileHandlers] Failed to parse git config:', e);
            }
          }
          break;
        }
        currentDir = path.dirname(currentDir);
      }

      if (!gitRoot) {
        const idx = filePath.toLowerCase().indexOf('astrosquad');
        if (idx !== -1) {
          gitRoot = filePath.substring(0, idx + 'astrosquad'.length);
        }
      }

      if (!gitRoot) return null;

      const relPath = path.relative(gitRoot, filePath).replace(/\\/g, '/');
      if (!relPath || relPath.startsWith('..')) return null;

      const repoMatch = remoteUrl.match(/github\.com[/:]([^/]+)\/([^/.]+)/);
      if (!repoMatch) return null;

      const owner = repoMatch[1];
      const repo = repoMatch[2].replace(/\.git$/, '');

      const encodedPath = relPath.split('/').map((segment) => encodeURIComponent(segment)).join('/');
      return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${encodedPath}`;
    } catch (err) {
      console.warn('[FileHandlers] getRawGitHubUrl error:', err);
      return null;
    }
  }

  /**
   * Opens file directly in the desktop app via Google Drive for Desktop (G:\My Drive\The-AstroSquad).
   * Bypasses the web browser completely, prevents account mismatch (catfish account in browser),
   * and ensures all saves auto-sync directly under the user's pro account.
   */
  public static async openInGoogleDriveDesktop(filePath?: string): Promise<{ success: boolean; message: string }> {
    const driveInfo = this.detectGoogleDrivePath();
    const squadFolder = driveInfo.squadPath || (driveInfo.driveRoot ? path.join(driveInfo.driveRoot, 'The-AstroSquad') : null);

    if (!squadFolder) {
      if (filePath) {
        return this.openInDesktopApp(filePath);
      }
      return {
        success: false,
        message: 'Google Drive for Desktop was not detected on this system. Please verify Google Drive is running.'
      };
    }

    if (!fs.existsSync(squadFolder)) {
      try {
        fs.mkdirSync(squadFolder, { recursive: true });
      } catch (e) {
        console.warn('Could not create Google Drive folder:', e);
      }
    }

    // If no specific file provided, open the Google Drive Desktop folder in Windows Explorer
    if (!filePath) {
      await shell.openPath(squadFolder);
      return {
        success: true,
        message: `Opened local Google Drive Desktop folder: ${squadFolder}`
      };
    }

    if (!fs.existsSync(filePath)) {
      return { success: false, message: `File not found: ${filePath}` };
    }

    const fileName = path.basename(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const isGoogleVirtual = ext === '.gslides' || ext === '.gsheet' || ext === '.gdoc';
    const destPath = isGoogleVirtual ? filePath : path.join(squadFolder, fileName);

    if (!isGoogleVirtual) {
      try {
        fs.copyFileSync(filePath, destPath);
        clipboard.writeText(destPath);
      } catch (e) {
        console.warn('Error syncing file to Google Drive Desktop:', e);
      }
    }

    // Launch directly in the local desktop application from Google Drive Desktop
    const openResult = await shell.openPath(destPath);
    if (!openResult) {
      return {
        success: true,
        message: `Opened "${fileName}" via Google Drive Desktop (${destPath}). Auto-syncing to your account.`
      };
    }

    // Fallback: If no native desktop application is installed (e.g. no PowerPoint/Excel), route to Google Workspace web
    console.log(`[GoogleDriveDesktop] shell.openPath returned: "${openResult}". Routing to Google Workspace with document context.`);
    const appType = ext === '.pptx' || ext === '.ppt' || ext === '.gslides' ? 'slides' :
                    ext === '.csv' || ext === '.xlsx' || ext === '.xls' || ext === '.gsheet' ? 'sheets' : 'docs';
    return this.openGoogleSuiteSession(appType, 'browser_tab', destPath);
  }

  /**
   * Opens local standalone session of Google Productivity Suite (Docs, Sheets, Slides, Drive)
   * Universal across macOS, Windows, and Linux.
   */
  public static async openGoogleSuiteSession(
    appType: 'docs' | 'sheets' | 'slides' | 'drive',
    windowMode: 'station_window' | 'app_window' | 'browser_tab' = 'station_window',
    targetFilePath?: string,
    preferredEngine?: string
  ): Promise<{ success: boolean; message: string }> {
    // If opening Google Drive: route directly to local desktop Google Drive folder
    if (appType === 'drive') {
      return this.openInGoogleDriveDesktop();
    }

    const driveFolderUrl = 'https://drive.google.com/drive/folders/1YE6FbXZVLZLZKNvxqfUqIsScqk_4HIzC?usp=sharing';
    const driveInfo = this.detectGoogleDrivePath();
    let fileHint = '';
    let targetUrl = '';
    let targetFileName = '';

    if (targetFilePath && fs.existsSync(targetFilePath)) {
      targetFileName = path.basename(targetFilePath);

      // 1. Sync to Google Drive Desktop if installed on machine
      if (driveInfo.driveRoot) {
        try {
          const squadFolder = driveInfo.squadPath || path.join(driveInfo.driveRoot, 'The-AstroSquad');
          if (!fs.existsSync(squadFolder)) {
            fs.mkdirSync(squadFolder, { recursive: true });
          }
          const destPath = path.join(squadFolder, targetFileName);
          fs.copyFileSync(targetFilePath, destPath);
          clipboard.writeText(destPath);
          fileHint = ` (Synced to Google Drive: ${destPath})`;
        } catch (e) {
          console.warn('Could not sync to Google Drive folder:', e);
        }
      }

      // 2. Resolve document URL directly for Slides, Sheets, and Docs
      const rawUrl = this.getRawGitHubUrl(targetFilePath);
      if (rawUrl) {
        // Opens Google Docs Viewer with instant slide/sheet rendering and 1-click "Open with Google Slides/Sheets/Docs" button
        targetUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(rawUrl)}`;
      } else if (driveInfo.driveRoot) {
        // File synced to Google Drive: search for it directly on Google Drive web to open in Slides/Sheets
        targetUrl = `https://drive.google.com/drive/u/0/search?q=${encodeURIComponent(targetFileName)}`;
      } else {
        // Search directly in AstroSquad shared Google Drive folder preserving document context
        targetUrl = `https://drive.google.com/drive/folders/1YE6FbXZVLZLZKNvxqfUqIsScqk_4HIzC?q=${encodeURIComponent(targetFileName)}`;
      }
    }

    // Default URLs if targetFilePath not provided or URL not resolved
    if (!targetUrl) {
      const defaultUrls: Record<string, string> = {
        docs: targetFileName
          ? `https://drive.google.com/drive/folders/1YE6FbXZVLZLZKNvxqfUqIsScqk_4HIzC?q=${encodeURIComponent(targetFileName)}`
          : 'https://docs.google.com/document/u/0/',
        sheets: targetFileName
          ? `https://drive.google.com/drive/folders/1YE6FbXZVLZLZKNvxqfUqIsScqk_4HIzC?q=${encodeURIComponent(targetFileName)}`
          : 'https://docs.google.com/spreadsheets/u/0/',
        slides: targetFileName
          ? `https://drive.google.com/drive/folders/1YE6FbXZVLZLZKNvxqfUqIsScqk_4HIzC?q=${encodeURIComponent(targetFileName)}`
          : 'https://docs.google.com/presentation/u/0/',
        drive: driveFolderUrl
      };
      targetUrl = defaultUrls[appType] || driveFolderUrl;
    }

    // Account Switcher / Authuser: check station_settings.json for configured pro account index/email
    try {
      const userData = (process.env.APPDATA || process.env.USERPROFILE || '') + path.sep + 'astrosquad-station';
      const settingsFile = path.join(userData, 'station_settings.json');
      if (fs.existsSync(settingsFile)) {
        const parsed = JSON.parse(fs.readFileSync(settingsFile, 'utf-8'));
        const account = parsed.googleSuite?.accountIndex || parsed.googleSuite?.userEmail;
        if (account && targetUrl.includes('google.com')) {
          if (targetUrl.includes('docs.google.com/viewer')) {
            targetUrl += `&authuser=${encodeURIComponent(account)}`;
          } else if (targetUrl.includes('/u/0/')) {
            targetUrl = targetUrl.replace('/u/0/', `/u/${encodeURIComponent(account)}/`);
          } else if (!targetUrl.includes('authuser=')) {
            targetUrl += (targetUrl.includes('?') ? '&' : '?') + `authuser=${encodeURIComponent(account)}`;
          }
        }
      }
    } catch {}

    const isMac = process.platform === 'darwin';
    const isWin = process.platform === 'win32';

    const appDisplayName = `Google ${appType.charAt(0).toUpperCase() + appType.slice(1)}`;
    const fileSuffix = targetFileName ? ` for "${targetFileName}"` : '';

    // Mode 1: Native AstroSquad Station Window (100% universal across macOS, Windows & Linux, no browser required)
    if (windowMode === 'station_window') {
      GoogleWindowManager.openSession(appType, targetUrl, targetFilePath);
      return {
        success: true,
        message: `Launched dedicated AstroSquad Station Window for ${appDisplayName}${fileSuffix}.${fileHint}`
      };
    }

    // Mode 2: Standalone Browser App Window (Chrome, Edge, Brave with --app support)
    if (windowMode === 'app_window') {
      const browsers = this.detectBrowsers();
      const appBrowser = preferredEngine && preferredEngine !== 'auto'
        ? browsers.find((b) => b.id === preferredEngine && b.supportsAppMode && b.path)
        : browsers.find((b) => b.supportsAppMode && b.path);

      if (appBrowser && appBrowser.path) {
        try {
          if (isWin) {
            const child = child_process.spawn(appBrowser.path, [`--app=${targetUrl}`], {
              detached: true,
              stdio: 'ignore'
            });
            child.unref();
            return {
              success: true,
              message: `Launched ${appDisplayName}${fileSuffix} in ${appBrowser.name}.${fileHint}`
            };
          } else if (isMac) {
            const child = child_process.spawn('open', ['-na', appBrowser.path, '--args', `--app=${targetUrl}`], {
              detached: true,
              stdio: 'ignore'
            });
            child.unref();
            return {
              success: true,
              message: `Launched ${appDisplayName}${fileSuffix} in ${appBrowser.name} (macOS).${fileHint}`
            };
          }
        } catch (err: any) {
          console.warn(`Failed to spawn app window via ${appBrowser.name}:`, err);
        }
      }

      // If no Chromium browser with --app support found (e.g. Vivaldi, Safari):
      await shell.openExternal(targetUrl);
      return {
        success: true,
        message: isMac
          ? `Opened ${appDisplayName}${fileSuffix} in Safari / Default Browser.${fileHint}`
          : `Opened ${appDisplayName}${fileSuffix} in default browser.${fileHint}`
      };
    }

    // Mode 3: Standard Browser Tab (Safari on Mac, Vivaldi on Windows, etc.)
    await shell.openExternal(targetUrl);
    return {
      success: true,
      message: `Opened ${appDisplayName}${fileSuffix} in default browser.${fileHint}`
    };
  }

  /**
   * Opens file in local desktop app (LibreOffice, Obsidian, Excel, Google Suite, etc.)
   * Returns structured result so the renderer can show appropriate success/error feedback.
   */
  public static async openInDesktopApp(filePath: string, customAppPath?: string, preferredMode: 'station_window' | 'app_window' | 'browser_tab' = 'station_window'): Promise<{ success: boolean; message: string }> {
    if (!fs.existsSync(filePath)) {
      return { success: false, message: `File not found: ${filePath}` };
    }

    const ext = path.extname(filePath).toLowerCase();
    const fileName = path.basename(filePath);
    const isPdf = this.isPdfFile(filePath);

    // Google virtual files (.gslides, .gsheet, .gdoc) — NEVER pass to PowerPoint, Excel, or native Office
    const isGoogleVirtual = ext === '.gslides' || ext === '.gsheet' || ext === '.gdoc';
    if (isGoogleVirtual) {
      const openResult = await shell.openPath(filePath);
      if (!openResult) {
        return {
          success: true,
          message: `Opened "${fileName}" via Google Drive Desktop.`
        };
      }
      const appType = ext === '.gslides' ? 'slides' : ext === '.gsheet' ? 'sheets' : 'docs';
      return this.openGoogleSuiteSession(appType, preferredMode, filePath);
    }

    if (customAppPath && customAppPath.trim()) {
      const trimmed = customAppPath.trim();

      // Google Productivity Suite standalone sessions
      if (trimmed === 'google_slides') {
        return this.openGoogleSuiteSession('slides', preferredMode, filePath);
      }
      if (trimmed === 'google_sheets') {
        return this.openGoogleSuiteSession('sheets', preferredMode, filePath);
      }
      if (trimmed === 'google_docs') {
        return this.openGoogleSuiteSession('docs', preferredMode, filePath);
      }
      if (trimmed === 'google_drive' || trimmed === 'google_drive_desktop') {
        return this.openInGoogleDriveDesktop(filePath);
      }

      // Obsidian Markdown editor
      if (trimmed === 'obsidian') {
        this.ensureObsidianVault(filePath);
        const obsPath = this.detectObsidianPath();
        if (obsPath) {
          try {
            const obsUri = `obsidian://open?path=${encodeURIComponent(filePath)}`;
            await shell.openExternal(obsUri);
            return { success: true, message: `Launched "${fileName}" in Obsidian.` };
          } catch (err: any) {
            console.warn('Failed to launch Obsidian via URI:', err);
          }
          const spawnResult = await this.safeSpawn(obsPath, [filePath]);
          if (spawnResult.success) {
            return { success: true, message: `Launched "${fileName}" in Obsidian.` };
          }
        }
        try {
          const obsUri = `obsidian://open?path=${encodeURIComponent(filePath)}`;
          await shell.openExternal(obsUri);
          return { success: true, message: `Launched "${fileName}" in Obsidian.` };
        } catch {
          console.warn('Obsidian not available, falling through to smart fallback');
        }
      }

      // macOS application bundle support (e.g. /Applications/Obsidian.app)
      if (process.platform === 'darwin' && trimmed.endsWith('.app')) {
        const result = await this.safeSpawn('open', ['-a', trimmed, filePath]);
        if (result.success) {
          return { success: true, message: `Launched "${fileName}" in ${path.basename(trimmed, '.app')}.` };
        }
        console.warn(`Failed to open via macOS app ${trimmed}: ${result.error}`);
      }

      // Custom executable path (e.g. C:\Program Files\LibreOffice\program\soffice.exe)
      if (trimmed !== 'obsidian') {
        if (fs.existsSync(trimmed)) {
          const result = await this.safeSpawn(trimmed, [filePath]);
          if (result.success) {
            return { success: true, message: `Launched "${fileName}" in ${path.basename(trimmed)}.` };
          }
          console.warn(`Failed to launch custom app "${trimmed}": ${result.error}`);
        } else {
          console.warn(`Custom app not found at "${trimmed}", falling through to smart fallback`);
        }
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // SMART FALLBACK: No custom app configured or custom app failed.
    // Route intelligently by file type instead of blindly calling shell.openPath.
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    // 1. Markdown (.md) Notes
    if (ext === '.md') {
      this.ensureObsidianVault(filePath);
      const obsPath = this.detectObsidianPath();
      if (obsPath) {
        try {
          const obsUri = `obsidian://open?path=${encodeURIComponent(filePath)}`;
          await shell.openExternal(obsUri);
          return { success: true, message: `Launched "${fileName}" in Obsidian.` };
        } catch (err: any) {
          console.warn('Obsidian open failed, falling back to shell.openPath:', err);
        }
      }
      const result = await shell.openPath(filePath);
      if (!result) {
        return { success: true, message: `Opened "${fileName}" in default text editor.` };
      }
      shell.showItemInFolder(filePath);
      return { success: true, message: `Revealed "${fileName}" in file explorer.` };
    }

    // 2. PDF Documents (.pdf or extensionless Proposal)
    if (isPdf) {
      const driveInfo = this.detectGoogleDrivePath();
      if (driveInfo.driveRoot) {
        return this.openInGoogleDriveDesktop(filePath);
      }

      let targetPath = filePath;
      if (!ext) {
        try {
          const tempDir = path.join(os.tmpdir(), 'AstroSquad');
          if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
          const tempPdf = path.join(tempDir, `${fileName}.pdf`);
          fs.copyFileSync(filePath, tempPdf);
          targetPath = tempPdf;
        } catch (e) {
          console.warn('Could not create temporary .pdf file for extensionless PDF:', e);
        }
      }

      const result = await shell.openPath(targetPath);
      if (!result) {
        return { success: true, message: `Opened "${fileName}" in system PDF reader.` };
      }
      console.log(`shell.openPath failed for PDF (${result}), routing to Google Drive session.`);
      return this.openGoogleSuiteSession('docs', preferredMode, filePath);
    }

    // 3. PPTX Slide Decks (.pptx, .ppt)
    if (ext === '.pptx' || ext === '.ppt') {
      const driveInfo = this.detectGoogleDrivePath();
      if (driveInfo.driveRoot) {
        return this.openInGoogleDriveDesktop(filePath);
      }

      const result = await shell.openPath(filePath);
      if (!result) {
        return { success: true, message: `Opened "${fileName}" in presentation editor.` };
      }
      console.log(`No native app associated for ${ext} (${result}). Routing to Google Drive / Slides.`);
      return this.openGoogleSuiteSession('slides', preferredMode, filePath);
    }

    // 4. CSV Tabular Catalogs (.csv, .xlsx, .xls)
    if (ext === '.csv' || ext === '.xlsx' || ext === '.xls') {
      const driveInfo = this.detectGoogleDrivePath();
      if (driveInfo.driveRoot) {
        return this.openInGoogleDriveDesktop(filePath);
      }

      const result = await shell.openPath(filePath);
      if (!result) {
        return { success: true, message: `Opened "${fileName}" in spreadsheet application.` };
      }
      console.log(`No native app associated for ${ext} (${result}). Routing to Google Drive / Sheets.`);
      return this.openGoogleSuiteSession('sheets', preferredMode, filePath);
    }

    // 5. Images (.png, .jpg, .jpeg, .webp, etc.)
    if (['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.svg'].includes(ext)) {
      const result = await shell.openPath(filePath);
      if (!result) {
        return { success: true, message: `Opened "${fileName}" in system image viewer.` };
      }
      shell.showItemInFolder(filePath);
      return { success: true, message: `Revealed "${fileName}" in file explorer.` };
    }

    // 6. Universal Fallback
    const result = await shell.openPath(filePath);
    if (!result) {
      return { success: true, message: `Opened "${fileName}" in system default app.` };
    }

    shell.showItemInFolder(filePath);
    return {
      success: true,
      message: `No application found for "${fileName}". Revealed in file explorer instead.`
    };
  }

  /**
   * Import File(s) from computer
   */
  public static async importFiles(
    window: BrowserWindow,
    targetDirectory: string
  ): Promise<{ success: boolean; importedCount: number; message: string }> {
    const result = await dialog.showOpenDialog(window, {
      title: 'Import Research File(s)',
      buttonLabel: 'Import File(s)',
      properties: ['openFile', 'multiSelections']
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, importedCount: 0, message: 'File import cancelled.' };
    }

    if (!fs.existsSync(targetDirectory)) {
      fs.mkdirSync(targetDirectory, { recursive: true });
    }

    let count = 0;
    for (const srcPath of result.filePaths) {
      const fileName = path.basename(srcPath);
      const destPath = path.join(targetDirectory, fileName);
      fs.copyFileSync(srcPath, destPath);
      count++;
    }

    return {
      success: true,
      importedCount: count,
      message: `Successfully imported ${count} file(s) into current directory.`
    };
  }

  /**
   * Import Folder from computer
   */
  public static async importFolder(
    window: BrowserWindow,
    targetDirectory: string
  ): Promise<{ success: boolean; folderName: string; message: string }> {
    const result = await dialog.showOpenDialog(window, {
      title: 'Import Research Folder',
      buttonLabel: 'Import Folder',
      properties: ['openDirectory']
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, folderName: '', message: 'Folder import cancelled.' };
    }

    const srcFolder = result.filePaths[0];
    const folderName = path.basename(srcFolder);
    const destFolder = path.join(targetDirectory, folderName);

    // Recursive copy
    const copyRecursive = (src: string, dest: string) => {
      fs.mkdirSync(dest, { recursive: true });
      const entries = fs.readdirSync(src, { withFileTypes: true });
      for (const entry of entries) {
        const srcEntry = path.join(src, entry.name);
        const destEntry = path.join(dest, entry.name);
        if (entry.isDirectory()) {
          copyRecursive(srcEntry, destEntry);
        } else {
          fs.copyFileSync(srcEntry, destEntry);
        }
      }
    };

    copyRecursive(srcFolder, destFolder);

    return {
      success: true,
      folderName,
      message: `Successfully imported folder "${folderName}".`
    };
  }

  /**
   * Create New Markdown Note with Doppler header
   */
  public static createMarkdownNote(
    targetDirectory: string,
    filename: string,
    title?: string
  ): { success: boolean; filePath: string; relativePath: string } {
    let cleanName = filename.trim();
    if (!cleanName.endsWith('.md')) {
      cleanName += '.md';
    }

    const destPath = path.join(targetDirectory, cleanName);
    if (fs.existsSync(destPath)) {
      throw new Error(`File already exists: ${cleanName}`);
    }

    const heading = title || cleanName.replace('.md', '');
    const dateStr = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const template = `# ${heading}

**Date:** ${dateStr}  
**Station:** AstroSquad Spectroscopic Research Station  
**Research Campaign:** Comparative Spectroscopy of Galaxies M82 & M31  
**Optics:** Takahashi 106mm (f/5) / Meade 305mm SCT (f/10) · Czerny-Turner Spectrograph (350nm–1µm)

---

## 1. Research Question & Hypothesis
- Comparative analysis of M82 (Starburst Cigar Galaxy, receding $z > 0$) vs. M31 (Andromeda Galaxy, blueshifted $z < 0$).
- Investigation of ionized $H\\text{ II}$ & $[N\\text{ II}]$ mass outflows, forbidden lines ($[N\\text{ II}]$, $[S\\text{ II}]$), and radial velocities ($v_r = c \\cdot z$).

## 2. Observational Target & Parameters
- Target Galaxy: [ ] M82 (Cigar Galaxy)  |  [ ] M31 (Andromeda Galaxy)
- Coordinates (RA / Dec):
- Optical Train: [ ] Takahashi 106mm Refractor  |  [ ] Meade 305mm SCT
- Wavelength Range: 300 nm to 600 nm (Near-UV to Visible)
- Exposure Cadence:

## 3. Data Reduction Pipeline Checklist
- [ ] Bias and dark current subtraction
- [ ] Flat-field detector sensitivity correction
- [ ] Argon-Neon lamp reference wavelength calibration
- [ ] 1D spectral extraction from 2D CCD frame
- [ ] Telluric / atmospheric absorption correction
- [ ] Flux normalization

## 4. Spectral Findings & Doppler Analysis
- Rest Wavelength ($\\lambda_0$):
- Observed Wavelength ($\\lambda_{\\text{obs}}$):
- Calculated Doppler Shift ($z = \\Delta\\lambda / \\lambda_0$):
- Heliocentric Radial Velocity ($v_r = c \\cdot z$):
`;

    fs.writeFileSync(destPath, template, 'utf-8');

    return {
      success: true,
      filePath: destPath,
      relativePath: cleanName
    };
  }

  /**
   * Open Discord Server: Launches via Discord protocol handler with seamless browser invite fallback
   */
  public static async openDiscord(customInviteUrl?: string, customAppUri?: string): Promise<void> {
    const inviteUrl = customInviteUrl?.trim() || 'https://discord.gg/yk7cgnd6E';
    const appUri = customAppUri?.trim() || 'discord://discord.com/channels/1545465896481333258';

    try {
      if (appUri) {
        await shell.openExternal(appUri);
      } else {
        await shell.openExternal(inviteUrl);
      }
    } catch (err) {
      console.warn('[FileHandlers] Discord protocol URI failed, falling back to web invite:', err);
      try {
        await shell.openExternal(inviteUrl);
      } catch (e) {
        console.error('[FileHandlers] Failed to open Discord web invite:', e);
      }
    }
  }
}
