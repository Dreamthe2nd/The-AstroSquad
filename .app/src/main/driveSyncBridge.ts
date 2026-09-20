import fs from 'fs';
import path from 'path';
import { FileHandlers } from './fileHandlers';

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  updatedCount: number;
  updatedFiles: string[];
  message: string;
}

export class DriveSyncBridge {
  /**
   * Resolves the Google Drive The-AstroSquad folder path
   */
  public static getDriveFolder(): string | null {
    const driveInfo = FileHandlers.detectGoogleDrivePath();
    const squadFolder = driveInfo.squadPath || (driveInfo.driveRoot ? path.join(driveInfo.driveRoot, 'The-AstroSquad') : null);
    if (squadFolder && !fs.existsSync(squadFolder)) {
      try {
        fs.mkdirSync(squadFolder, { recursive: true });
      } catch (err) {
        console.warn('[DriveSyncBridge] Failed to create squad folder:', err);
      }
    }
    return squadFolder && fs.existsSync(squadFolder) ? squadFolder : null;
  }

  /**
   * Scans a directory recursively, ignoring .git, node_modules, and hidden files
   */
  private static walkDirectory(dir: string, baseDir: string = dir): string[] {
    if (!fs.existsSync(dir)) return [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    let files: string[] = [];

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const name = entry.name;

      // Strictly ignore .git, node_modules, and app internals
      if (
        name === '.git' ||
        name === 'node_modules' ||
        name === '.app' ||
        name === '.agents' ||
        name === 'dist' ||
        name.startsWith('.tmp') ||
        name.startsWith('~$')
      ) {
        continue;
      }

      if (entry.isDirectory()) {
        files = files.concat(this.walkDirectory(fullPath, baseDir));
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }

    return files;
  }

  /**
   * Pulls newer/modified files from Google Drive (G:\My Drive\The-AstroSquad) into the local Git repo
   */
  public static syncFromDrive(repoDir: string): SyncResult {
    const driveFolder = this.getDriveFolder();
    if (!driveFolder) {
      return {
        success: false,
        syncedCount: 0,
        updatedCount: 0,
        updatedFiles: [],
        message: 'Google Drive for Desktop folder (G:\\My Drive\\The-AstroSquad) not detected.'
      };
    }

    if (!repoDir || !fs.existsSync(repoDir)) {
      return {
        success: false,
        syncedCount: 0,
        updatedCount: 0,
        updatedFiles: [],
        message: 'Target local repository path does not exist.'
      };
    }

    const driveFiles = this.walkDirectory(driveFolder);
    const updatedFiles: string[] = [];

    for (const driveFile of driveFiles) {
      const ext = path.extname(driveFile).toLowerCase();
      // Skip virtual Google Doc pointer files that cannot be read as binary/text
      if (ext === '.gslides' || ext === '.gsheet' || ext === '.gdoc') {
        continue;
      }

      const relativePath = path.relative(driveFolder, driveFile);
      const localFile = path.join(repoDir, relativePath);

      let needsCopy = false;

      if (!fs.existsSync(localFile)) {
        // New file added on Google Drive
        needsCopy = true;
      } else {
        try {
          const driveStat = fs.statSync(driveFile);
          const localStat = fs.statSync(localFile);

          // Copy if Drive file was modified later (with a 1.5-second buffer) and differs in size or mtime
          const isDriveNewer = driveStat.mtimeMs > (localStat.mtimeMs + 1500);
          const isSizeDifferent = driveStat.size !== localStat.size;

          if (isDriveNewer || (isSizeDifferent && driveStat.mtimeMs >= localStat.mtimeMs)) {
            needsCopy = true;
          }
        } catch {
          needsCopy = false;
        }
      }

      if (needsCopy) {
        try {
          const targetDir = path.dirname(localFile);
          if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
          }
          fs.copyFileSync(driveFile, localFile);
          updatedFiles.push(relativePath.replace(/\\/g, '/'));
        } catch (err) {
          console.warn(`[DriveSyncBridge] Error pulling "${relativePath}" from Drive:`, err);
        }
      }
    }

    return {
      success: true,
      syncedCount: 0,
      updatedCount: updatedFiles.length,
      updatedFiles,
      message: updatedFiles.length > 0
        ? `Pulled ${updatedFiles.length} updated file(s) from Google Drive into workspace.`
        : 'Google Drive is in sync with local repository. No cloud updates detected.'
    };
  }

  /**
   * Pushes/mirrors all content files from the local Git repo to Google Drive (G:\My Drive\The-AstroSquad)
   */
  public static syncToDrive(repoDir: string): SyncResult {
    const driveFolder = this.getDriveFolder();
    if (!driveFolder) {
      return {
        success: false,
        syncedCount: 0,
        updatedCount: 0,
        updatedFiles: [],
        message: 'Google Drive for Desktop folder (G:\\My Drive\\The-AstroSquad) not detected.'
      };
    }

    if (!repoDir || !fs.existsSync(repoDir)) {
      return {
        success: false,
        syncedCount: 0,
        updatedCount: 0,
        updatedFiles: [],
        message: 'Local repository path does not exist.'
      };
    }

    const localFiles = this.walkDirectory(repoDir);
    let syncedCount = 0;

    for (const localFile of localFiles) {
      const relativePath = path.relative(repoDir, localFile);
      const driveFile = path.join(driveFolder, relativePath);

      let shouldCopy = false;

      if (!fs.existsSync(driveFile)) {
        shouldCopy = true;
      } else {
        try {
          const localStat = fs.statSync(localFile);
          const driveStat = fs.statSync(driveFile);
          if (localStat.size !== driveStat.size || localStat.mtimeMs > (driveStat.mtimeMs + 1000)) {
            shouldCopy = true;
          }
        } catch {
          shouldCopy = true;
        }
      }

      if (shouldCopy) {
        try {
          const driveDir = path.dirname(driveFile);
          if (!fs.existsSync(driveDir)) {
            fs.mkdirSync(driveDir, { recursive: true });
          }
          fs.copyFileSync(localFile, driveFile);
          syncedCount++;
        } catch (err) {
          console.warn(`[DriveSyncBridge] Error mirroring "${relativePath}" to Drive:`, err);
        }
      }
    }

    return {
      success: true,
      syncedCount,
      updatedCount: 0,
      updatedFiles: [],
      message: syncedCount > 0
        ? `Mirrored ${syncedCount} file(s) to Google Drive (G:\\My Drive\\The-AstroSquad).`
        : 'All repository files are already up-to-date on Google Drive.'
    };
  }

  /**
   * Two-way synchronization: first pulls cloud edits, then pushes local changes to Drive
   */
  public static twoWaySync(repoDir: string): SyncResult {
    const pullRes = this.syncFromDrive(repoDir);
    const pushRes = this.syncToDrive(repoDir);

    return {
      success: pullRes.success && pushRes.success,
      syncedCount: pushRes.syncedCount,
      updatedCount: pullRes.updatedCount,
      updatedFiles: pullRes.updatedFiles,
      message: `Sync Complete: ${pullRes.updatedCount} pulled from Drive, ${pushRes.syncedCount} mirrored to Drive.`
    };
  }
}
