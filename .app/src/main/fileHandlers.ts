import fs from 'fs';
import path from 'path';
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
      // 1. Vivaldi on Windows
      const vivaldiCandidates = [
        path.join(process.env.LOCALAPPDATA || '', 'Vivaldi\\Application\\vivaldi.exe'),
        'C:\\Program Files\\Vivaldi\\Application\\vivaldi.exe',
        'C:\\Program Files (x86)\\Vivaldi\\Application\\vivaldi.exe'
      ];
      for (const p of vivaldiCandidates) {
        if (p && fs.existsSync(p)) {
          browsers.push({ id: 'vivaldi', name: 'Vivaldi', path: p, supportsAppMode: true, platform: 'win32' });
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
        browsers.push({ id: 'vivaldi', name: 'Vivaldi', path: '/Applications/Vivaldi.app', supportsAppMode: true, platform: 'darwin' });
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
      const candidates = [
        path.join(process.env.LOCALAPPDATA || '', 'Programs\\Obsidian\\Obsidian.exe'),
        path.join(process.env.LOCALAPPDATA || '', 'Obsidian\\Obsidian.exe'),
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
   * Opens local standalone session of Google Productivity Suite (Docs, Sheets, Slides, Drive)
   * Universal across macOS, Windows, and Linux.
   */
  public static async openGoogleSuiteSession(
    appType: 'docs' | 'sheets' | 'slides' | 'drive',
    windowMode: 'station_window' | 'app_window' | 'browser_tab' = 'station_window',
    targetFilePath?: string,
    preferredEngine?: string
  ): Promise<{ success: boolean; message: string }> {
    const urls: Record<string, string> = {
      docs: targetFilePath ? 'https://docs.google.com/document/u/0/?tab=open#open' : 'https://docs.google.com/document/u/0/',
      sheets: targetFilePath ? 'https://docs.google.com/spreadsheets/u/0/?tab=open#open' : 'https://docs.google.com/spreadsheets/u/0/',
      slides: targetFilePath ? 'https://docs.google.com/presentation/u/0/?tab=open#open' : 'https://docs.google.com/presentation/u/0/',
      drive: 'https://drive.google.com/drive/folders/1YE6FbXZVLZLZKNvxqfUqIsScqk_4HIzC?usp=sharing'
    };

    const targetUrl = urls[appType] || urls.drive;
    const isMac = process.platform === 'darwin';
    const isWin = process.platform === 'win32';

    if (targetFilePath && fs.existsSync(targetFilePath)) {
      try {
        clipboard.writeText(targetFilePath);
        shell.showItemInFolder(targetFilePath);
      } catch (e) {
        console.warn('Could not copy file path or show item in folder:', e);
      }
    }

    const fileName = targetFilePath ? path.basename(targetFilePath) : '';
    const fileHint = fileName ? ` Opened file picker for "${fileName}" (path copied to clipboard & revealed in folder for drag & drop).` : '';

    // Mode 1: Native AstroSquad Station Window (100% universal across macOS, Windows & Linux, no browser required)
    if (windowMode === 'station_window') {
      GoogleWindowManager.openSession(appType, targetUrl, targetFilePath);
      return {
        success: true,
        message: `Launched dedicated AstroSquad Station Window for Google ${appType.charAt(0).toUpperCase() + appType.slice(1)}.${fileHint} (Note: If Google asks you to sign in and blocks Electron, switch to Standalone App Mode in Settings).`
      };
    }

    // Mode 2: Standalone Browser App Window (Vivaldi, Chrome, Edge, Brave)
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
              message: `Launched standalone session in ${appBrowser.name}.${fileHint}`
            };
          } else if (isMac) {
            const child = child_process.spawn('open', ['-na', appBrowser.path, '--args', `--app=${targetUrl}`], {
              detached: true,
              stdio: 'ignore'
            });
            child.unref();
            return {
              success: true,
              message: `Launched standalone session in ${appBrowser.name} (macOS).${fileHint}`
            };
          }
        } catch (err: any) {
          console.warn(`Failed to spawn app window via ${appBrowser.name}:`, err);
        }
      }

      // If on macOS with only Safari, or no Chromium browser found:
      await shell.openExternal(targetUrl);
      return {
        success: true,
        message: isMac
          ? `Opened Google ${appType} in Safari / Default Browser.${fileHint}`
          : `Opened Google ${appType} in default browser.${fileHint}`
      };
    }

    // Mode 3: Standard Browser Tab (Safari on Mac, Vivaldi on Windows, etc.)
    await shell.openExternal(targetUrl);
    return {
      success: true,
      message: `Opened Google ${appType.charAt(0).toUpperCase() + appType.slice(1)} in default browser.${fileHint}`
    };
  }

  /**
   * Opens file in local desktop app (LibreOffice, Obsidian, Excel, Google Suite, etc.)
   */
  public static async openInDesktopApp(filePath: string, customAppPath?: string, preferredMode: 'station_window' | 'app_window' | 'browser_tab' = 'station_window'): Promise<string> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    if (customAppPath && customAppPath.trim()) {
      const trimmed = customAppPath.trim();

      // Check if configured for Google Productivity Suite standalone sessions
      if (trimmed === 'google_slides') {
        const res = await this.openGoogleSuiteSession('slides', preferredMode, filePath);
        return res.message;
      }
      if (trimmed === 'google_sheets') {
        const res = await this.openGoogleSuiteSession('sheets', preferredMode, filePath);
        return res.message;
      }
      if (trimmed === 'google_docs') {
        const res = await this.openGoogleSuiteSession('docs', preferredMode, filePath);
        return res.message;
      }
      if (trimmed === 'google_drive') {
        const res = await this.openGoogleSuiteSession('drive', preferredMode, filePath);
        return res.message;
      }

      // Check if configured for Obsidian Markdown notes
      if (trimmed === 'obsidian') {
        const obsPath = this.detectObsidianPath();
        if (obsPath) {
          try {
            if (process.platform === 'darwin') {
              const child = child_process.spawn('open', ['-a', 'Obsidian', filePath], {
                detached: true,
                stdio: 'ignore'
              });
              child.unref();
              return '';
            } else {
              const child = child_process.spawn(obsPath, [filePath], {
                detached: true,
                stdio: 'ignore'
              });
              child.unref();
              return '';
            }
          } catch (err: any) {
            console.warn('Failed to launch detected Obsidian:', err);
          }
        }
        try {
          const child = child_process.spawn('obsidian', [filePath], { detached: true, stdio: 'ignore' });
          child.unref();
          return '';
        } catch {
          return shell.openPath(filePath);
        }
      }

      // macOS application bundle support (e.g. /Applications/Obsidian.app)
      if (process.platform === 'darwin' && trimmed.endsWith('.app')) {
        try {
          const child = child_process.spawn('open', ['-a', trimmed, filePath], {
            detached: true,
            stdio: 'ignore'
          });
          child.unref();
          return '';
        } catch (err: any) {
          console.warn(`Failed to open via macOS app ${trimmed}:`, err);
          return shell.openPath(filePath);
        }
      }

      try {
        const child = child_process.spawn(trimmed, [filePath], {
          detached: true,
          stdio: 'ignore'
        });
        child.unref();
        return '';
      } catch (err: any) {
        console.warn(`Failed to launch custom app "${trimmed}":`, err);
        return shell.openPath(filePath);
      }
    }

    const result = await shell.openPath(filePath);
    return result; // Empty string on success, or error message
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
   * Open Discord Server: Tries discord:// uri, fallback to https web link
   */
  public static async openDiscord(customInviteUrl?: string, customAppUri?: string): Promise<void> {
    const discordAppUri = customAppUri?.trim() || 'discord://discord.com/channels/1545465896481333258';
    const discordWebFallback = customInviteUrl?.trim() || 'https://discord.gg/yk7cgnd6E';

    try {
      await shell.openExternal(discordAppUri);
    } catch {
      await shell.openExternal(discordWebFallback);
    }
  }
}
