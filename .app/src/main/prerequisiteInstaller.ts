import fs from 'fs';
import path from 'path';
import os from 'os';
import https from 'https';
import child_process from 'child_process';
import { shell } from 'electron';

export interface PrerequisiteStatus {
  platform: 'win32' | 'darwin' | 'linux';
  googleDrive: {
    installed: boolean;
    running: boolean;
    path?: string;
    label: string;
  };
  obsidian: {
    installed: boolean;
    path?: string;
    label: string;
  };
}

export class PrerequisiteInstaller {
  /**
   * Check installation and running status of Google Drive Desktop & Obsidian
   */
  public static async checkPrerequisites(): Promise<PrerequisiteStatus> {
    const platform = process.platform as 'win32' | 'darwin' | 'linux';

    // 1. Google Drive Desktop Check
    let driveInstalled = false;
    let driveRunning = false;
    let drivePath: string | undefined;

    if (platform === 'win32') {
      const gDrive = 'G:\\My Drive';
      const gRoot = 'G:\\';
      const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
      const localAppData = process.env.LOCALAPPDATA || '';

      if (fs.existsSync(gDrive) || fs.existsSync(gRoot)) {
        driveInstalled = true;
        driveRunning = true;
        drivePath = fs.existsSync(gDrive) ? gDrive : gRoot;
      }

      // Check standard Windows install locations
      const possibleDriveDirs = [
        path.join(programFiles, 'Google', 'Drive File Stream'),
        path.join(programFiles, 'Google', 'Drive'),
        path.join(localAppData, 'Google', 'DriveFS')
      ];

      for (const dir of possibleDriveDirs) {
        if (fs.existsSync(dir)) {
          driveInstalled = true;
          if (!drivePath) drivePath = dir;
          break;
        }
      }

      // Check if process is currently running
      try {
        const tasklist = child_process.execFileSync('tasklist.exe', ['/FI', 'IMAGENAME eq GoogleDriveFS.exe'], {
          timeout: 2500,
          encoding: 'utf8'
        });
        if (tasklist.toLowerCase().includes('googledrivefs.exe')) {
          driveRunning = true;
          driveInstalled = true;
        }
      } catch {}
    } else if (platform === 'darwin') {
      const macDriveApps = [
        '/Applications/Google Drive.app',
        path.join(process.env.HOME || '', 'Applications', 'Google Drive.app')
      ];

      for (const app of macDriveApps) {
        if (fs.existsSync(app)) {
          driveInstalled = true;
          drivePath = app;
          break;
        }
      }

      if (fs.existsSync('/Volumes/GoogleDrive')) {
        driveInstalled = true;
        driveRunning = true;
      }

      try {
        child_process.execFileSync('pgrep', ['-x', 'Google Drive'], { timeout: 2000, stdio: 'ignore' });
        driveRunning = true;
        driveInstalled = true;
      } catch {}
    }

    // 2. Obsidian MD Check
    let obsidianInstalled = false;
    let obsidianPath: string | undefined;

    if (platform === 'win32') {
      const localAppData = process.env.LOCALAPPDATA || '';
      const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
      const candidatePaths = [
        path.join(localAppData, 'Programs', 'Obsidian', 'Obsidian.exe'),
        path.join(programFiles, 'Obsidian', 'Obsidian.exe'),
        path.join(process.env.USERPROFILE || '', 'scoop', 'apps', 'obsidian', 'current', 'Obsidian.exe'),
        path.join(process.env.USERPROFILE || '', 'scoop', 'shims', 'obsidian.exe')
      ];

      for (const p of candidatePaths) {
        if (fs.existsSync(p)) {
          obsidianInstalled = true;
          obsidianPath = p;
          break;
        }
      }

      if (!obsidianInstalled) {
        try {
          const whereOut = child_process.execFileSync('where.exe', ['obsidian'], { timeout: 2000, encoding: 'utf8' }).trim();
          const firstLine = whereOut.split(/\r?\n/)[0]?.trim();
          if (firstLine && fs.existsSync(firstLine)) {
            obsidianInstalled = true;
            obsidianPath = firstLine;
          }
        } catch {}
      }
    } else if (platform === 'darwin') {
      const macObsidianApps = [
        '/Applications/Obsidian.app',
        path.join(process.env.HOME || '', 'Applications', 'Obsidian.app')
      ];

      for (const app of macObsidianApps) {
        if (fs.existsSync(app)) {
          obsidianInstalled = true;
          obsidianPath = app;
          break;
        }
      }
    } else {
      if (fs.existsSync('/usr/bin/obsidian') || fs.existsSync('/usr/local/bin/obsidian') || fs.existsSync('/var/lib/flatpak/exports/bin/md.obsidian.Obsidian')) {
        obsidianInstalled = true;
      }
    }

    return {
      platform,
      googleDrive: {
        installed: driveInstalled,
        running: driveRunning,
        path: drivePath,
        label: driveInstalled
          ? (driveRunning ? 'Installed & Active (G:\\My Drive)' : 'Installed (Launch Required)')
          : 'Not Installed (Required for AstroSquad sync)'
      },
      obsidian: {
        installed: obsidianInstalled,
        path: obsidianPath,
        label: obsidianInstalled ? 'Installed & Ready' : 'Not Installed (Recommended for Lab Notes)'
      }
    };
  }

  /**
   * Helper to download file from HTTPS
   */
  private static downloadFile(url: string, destPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(destPath);
      const get = (targetUrl: string) => {
        https.get(targetUrl, (response) => {
          if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
            get(response.headers.location);
            return;
          }
          if (response.statusCode !== 200) {
            reject(new Error(`Download failed with status ${response.statusCode}`));
            return;
          }
          response.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve();
          });
        }).on('error', (err) => {
          fs.unlink(destPath, () => {});
          reject(err);
        });
      };
      get(url);
    });
  }

  /**
   * Install Google Drive Desktop
   */
  public static async installGoogleDrive(): Promise<{ success: boolean; message: string; method: string }> {
    const platform = process.platform;

    if (platform === 'win32') {
      // 1. Try winget
      try {
        child_process.execSync(
          'winget install --id Google.GoogleDrive -e --silent --accept-package-agreements --accept-source-agreements',
          { timeout: 180000, stdio: 'ignore' }
        );
        return {
          success: true,
          message: 'Google Drive Desktop installed via Windows Package Manager.',
          method: 'winget'
        };
      } catch (wingetErr) {
        console.warn('[PrerequisiteInstaller] winget install failed, falling back to direct installer download:', wingetErr);
      }

      // 2. Direct download of official installer
      try {
        const tempExe = path.join(os.tmpdir(), 'GoogleDriveSetup.exe');
        await this.downloadFile('https://dl.google.com/drive-file-stream/GoogleDriveSetup.exe', tempExe);
        child_process.spawn(tempExe, ['--silent'], { detached: true, stdio: 'ignore' }).unref();
        return {
          success: true,
          message: 'Downloaded and launched Google Drive Desktop installer.',
          method: 'direct_download'
        };
      } catch (dlErr: any) {
        console.warn('[PrerequisiteInstaller] Direct download failed, opening browser:', dlErr);
        await shell.openExternal('https://www.google.com/drive/download/');
        return {
          success: true,
          message: 'Opened Google Drive Desktop download page in browser.',
          method: 'browser'
        };
      }
    } else if (platform === 'darwin') {
      // 1. Try brew cask
      try {
        child_process.execSync('brew install --cask google-drive', { timeout: 180000, stdio: 'ignore' });
        return {
          success: true,
          message: 'Google Drive Desktop installed via Homebrew.',
          method: 'brew'
        };
      } catch {
        // Fallback open official DMG download
        await shell.openExternal('https://dl.google.com/drive-file-stream/GoogleDrive.dmg');
        return {
          success: true,
          message: 'Opened Google Drive for Mac installer in browser.',
          method: 'browser'
        };
      }
    }

    await shell.openExternal('https://www.google.com/drive/download/');
    return {
      success: true,
      message: 'Opened Google Drive download portal.',
      method: 'browser'
    };
  }

  /**
   * Install Obsidian MD
   */
  public static async installObsidian(): Promise<{ success: boolean; message: string; method: string }> {
    const platform = process.platform;

    if (platform === 'win32') {
      // 1. Try winget
      try {
        child_process.execSync(
          'winget install --id Obsidian.Obsidian -e --silent --accept-package-agreements --accept-source-agreements',
          { timeout: 180000, stdio: 'ignore' }
        );
        return {
          success: true,
          message: 'Obsidian MD installed via Windows Package Manager.',
          method: 'winget'
        };
      } catch (wingetErr) {
        console.warn('[PrerequisiteInstaller] winget obsidian failed, opening direct download:', wingetErr);
      }

      await shell.openExternal('https://obsidian.md/download');
      return {
        success: true,
        message: 'Opened Obsidian download page in browser.',
        method: 'browser'
      };
    } else if (platform === 'darwin') {
      try {
        child_process.execSync('brew install --cask obsidian', { timeout: 180000, stdio: 'ignore' });
        return {
          success: true,
          message: 'Obsidian MD installed via Homebrew.',
          method: 'brew'
        };
      } catch {
        await shell.openExternal('https://obsidian.md/download');
        return {
          success: true,
          message: 'Opened Obsidian Mac download page in browser.',
          method: 'browser'
        };
      }
    }

    await shell.openExternal('https://obsidian.md/download');
    return {
      success: true,
      message: 'Opened Obsidian download page.',
      method: 'browser'
    };
  }
}
