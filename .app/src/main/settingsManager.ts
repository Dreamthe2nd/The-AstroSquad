import fs from 'fs';
import path from 'path';
import { app, dialog, BrowserWindow } from 'electron';

export interface StationSettings {
  fileAssociations: {
    pptx?: string;
    pdf?: string;
    md?: string;
    csv?: string;
    images?: string;
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
    docsUrl?: string;
    sheetsUrl?: string;
    slidesUrl?: string;
    driveUrl?: string;
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
      fileAssociations: {
        pptx: '',
        pdf: '',
        md: '',
        csv: '',
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
        url: 'https://meet.google.com/new',
        platform: 'google_meet'
      },
      googleSuite: {
        engine: 'auto',
        windowMode: 'app_window',
        docsUrl: 'https://docs.google.com/document/u/0/',
        sheetsUrl: 'https://docs.google.com/spreadsheets/u/0/',
        slidesUrl: 'https://docs.google.com/presentation/u/0/',
        driveUrl: 'https://drive.google.com/drive/u/0/my-drive'
      }
    };
  }

  private loadSettings(): StationSettings {
    const defaults = this.getDefaultSettings();
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          fileAssociations: { ...defaults.fileAssociations, ...(parsed.fileAssociations || {}) },
          repository: { ...defaults.repository, ...(parsed.repository || {}) },
          discord: { ...defaults.discord, ...(parsed.discord || {}) },
          meeting: { ...defaults.meeting, ...(parsed.meeting || {}) },
          googleSuite: { ...defaults.googleSuite, ...(parsed.googleSuite || {}) }
        };
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
