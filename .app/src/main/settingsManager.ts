import fs from 'fs';
import path from 'path';
import { app, dialog, BrowserWindow } from 'electron';

export interface StationSettings {
  kstarsPath?: string;
  fileAssociations: {
    pptx?: string;
    pdf?: string;
    md?: string;
    csv?: string;
    images?: string;
    code?: string;
  };
  repository: {
    url: string;
    localPath: string;
    branch: string;
  };
  discord: {
    inviteUrl: string;
    appUri: string;
  };
  meeting: {
    url: string;
    platform: 'google_meet' | 'zoom' | 'custom';
  };
  googleSuite: {
    engine: string;
    windowMode: 'station_window' | 'app_window' | 'browser_tab';
    accountIndex?: string;
    docsUrl?: string;
    sheetsUrl?: string;
    slidesUrl?: string;
    driveUrl?: string;
    clientId?: string;
    clientSecret?: string;
    accessToken?: string;
    refreshToken?: string;
    tokenExpiry?: number;
    userEmail?: string;
    userName?: string;
  };
}

export class SettingsManager {
  private filePath: string;
  private settings: StationSettings;

  constructor() {
    const userData = app ? app.getPath('userData') : process.cwd();
    this.filePath = path.join(userData, 'station_settings.json');
    this.settings = this.loadSettings();
  }

  private getDefaultSettings(): StationSettings {
    const docs = app ? app.getPath('documents') : process.cwd();
    return {
      kstarsPath: '',
      fileAssociations: {
        pptx: 'google_drive', // Google Drive Desktop (direct desktop app with pro account auto-sync)
        pdf: 'google_drive',  // Google Drive Desktop / System Default
        md: 'obsidian',
        csv: 'google_drive',  // Google Drive Desktop + Excel / In-App
        images: ''
      },
      repository: {
        url: 'https://github.com/Dreamthe2nd/The-AstroSquad',
        localPath: path.join(docs, 'AstroSquad'),
        branch: 'main'
      },
      discord: {
        inviteUrl: 'https://discord.gg/yk7cgnd6E',
        appUri: 'discord://discord.com/channels/1545465896481333258'
      },
      meeting: {
        url: 'https://oracle.zoom.us/my/sheetal.prasad?pwd=MDdMMDdUWU93QkI0NVZwcGRhZzlqQT09',
        platform: 'zoom'
      },
      googleSuite: {
        engine: 'auto',
        windowMode: 'app_window',
        accountIndex: '0',
        docsUrl: 'https://docs.google.com/document/u/0/',
        sheetsUrl: 'https://docs.google.com/spreadsheets/u/0/',
        slidesUrl: 'https://docs.google.com/presentation/u/0/',
        driveUrl: 'https://drive.google.com/drive/folders/1YE6FbXZVLZLZKNvxqfUqIsScqk_4HIzC?usp=sharing'
      }
    };
  }

  private loadSettings(): StationSettings {
    const defaults = this.getDefaultSettings();
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        const merged: StationSettings = {
          kstarsPath: parsed.kstarsPath !== undefined ? parsed.kstarsPath : defaults.kstarsPath,
          fileAssociations: { ...defaults.fileAssociations, ...(parsed.fileAssociations || {}) },
          repository: { ...defaults.repository, ...(parsed.repository || {}) },
          discord: { ...defaults.discord, ...(parsed.discord || {}) },
          meeting: { ...defaults.meeting, ...(parsed.meeting || {}) },
          googleSuite: { ...defaults.googleSuite, ...(parsed.googleSuite || {}) }
        };

        let dirty = false;
        // Migration: Ensure md defaults to obsidian if unset or was wrongly set to google_docs
        if (!merged.fileAssociations.md || merged.fileAssociations.md === 'google_docs') {
          merged.fileAssociations.md = 'obsidian';
          dirty = true;
        }
        // Migration: PDFs, PPTX, and CSV should default to google_drive for native desktop editing + pro account sync
        if (merged.fileAssociations.pptx === 'google_slides' || !merged.fileAssociations.pptx) {
          merged.fileAssociations.pptx = 'google_drive';
          dirty = true;
        }
        if (merged.fileAssociations.csv === 'google_sheets') {
          merged.fileAssociations.csv = 'google_drive';
          dirty = true;
        }
        if (merged.fileAssociations.pdf === 'google_docs' || !merged.fileAssociations.pdf) {
          merged.fileAssociations.pdf = 'google_drive';
          dirty = true;
        }
        // Migration: Ensure shared Drive folder URL is set
        if (!merged.googleSuite.driveUrl || merged.googleSuite.driveUrl.includes('my-drive')) {
          merged.googleSuite.driveUrl = 'https://drive.google.com/drive/folders/1YE6FbXZVLZLZKNvxqfUqIsScqk_4HIzC?usp=sharing';
          dirty = true;
        }
        if (!merged.googleSuite.windowMode || merged.googleSuite.windowMode === 'station_window') {
          // Migrate away from station_window since Google blocks sign-in in Electron webviews
          merged.googleSuite.windowMode = 'app_window';
          dirty = true;
        }

        if (dirty) {
          try {
            fs.writeFileSync(this.filePath, JSON.stringify(merged, null, 2), 'utf-8');
          } catch (e) {
            console.warn('Could not persist migrated settings:', e);
          }
        }

        return merged;
      }
    } catch (err) {
      console.error('Failed to parse station_settings.json, reverting to defaults:', err);
    }
    return defaults;
  }

  public getSettings(): StationSettings {
    return { ...this.settings };
  }

  public saveSettings(partial: Partial<StationSettings>): StationSettings {
    this.settings = {
      fileAssociations: {
        ...this.settings.fileAssociations,
        ...(partial.fileAssociations || {})
      },
      repository: {
        ...this.settings.repository,
        ...(partial.repository || {})
      },
      discord: {
        ...this.settings.discord,
        ...(partial.discord || {})
      },
      meeting: {
        ...this.settings.meeting,
        ...(partial.meeting || {})
      },
      googleSuite: {
        ...this.settings.googleSuite,
        ...(partial.googleSuite || {})
      }
    };

    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.filePath, JSON.stringify(this.settings, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write station_settings.json:', err);
    }

    return this.getSettings();
  }

  public resetSettings(): StationSettings {
    this.settings = this.getDefaultSettings();
    try {
      if (fs.existsSync(this.filePath)) {
        fs.unlinkSync(this.filePath);
      }
    } catch (err) {
      console.error('Failed to reset station_settings.json:', err);
    }
    return this.getSettings();
  }

  /**
   * Resolves custom application executable path for a given file
   */
  public resolveAppForFile(filePath: string): string | undefined {
    const ext = path.extname(filePath).toLowerCase();
    const { fileAssociations } = this.settings;

    if (ext === '.pptx' && fileAssociations.pptx?.trim()) {
      return fileAssociations.pptx.trim();
    }
    if ((ext === '.pdf' || path.basename(filePath).toLowerCase() === 'proposal') && fileAssociations.pdf?.trim()) {
      return fileAssociations.pdf.trim();
    }
    if (ext === '.md' && fileAssociations.md?.trim()) {
      return fileAssociations.md.trim();
    }
    if (ext === '.csv' && fileAssociations.csv?.trim()) {
      return fileAssociations.csv.trim();
    }
    if (['.png', '.jpg', '.jpeg', '.webp'].includes(ext) && fileAssociations.images?.trim()) {
      return fileAssociations.images.trim();
    }

    return undefined;
  }

  /**
   * File dialog to select an executable
   */
  public async browseApp(window: BrowserWindow): Promise<string | null> {
    const isWin = process.platform === 'win32';
    const filters = isWin
      ? [{ name: 'Executables (*.exe; *.bat; *.cmd)', extensions: ['exe', 'bat', 'cmd'] }, { name: 'All Files (*.*)', extensions: ['*'] }]
      : [{ name: 'Applications', extensions: ['*'] }];

    const result = await dialog.showOpenDialog(window, {
      title: 'Select Application to Open File',
      buttonLabel: 'Select App',
      properties: ['openFile'],
      filters
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  }

  /**
   * Folder dialog to select repository directory
   */
  public async browseRepoDir(window: BrowserWindow): Promise<string | null> {
    const result = await dialog.showOpenDialog(window, {
      title: 'Select Repository Folder',
      buttonLabel: 'Select Folder',
      properties: ['openDirectory', 'createDirectory']
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  }
}
