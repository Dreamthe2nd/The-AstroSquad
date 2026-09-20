import { contextBridge, ipcRenderer, clipboard } from 'electron';

export interface FileNode {
  name: string;
  relativePath: string;
  absolutePath: string;
  isDirectory: boolean;
  size?: number;
  extension?: string;
  children?: FileNode[];
}

export interface StationSettings {
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
  googleSuite?: {
    engine?: string;
    windowMode?: 'station_window' | 'app_window' | 'browser_tab';
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

export interface ApiBridge {
  auth: {
    requestDeviceCode: (clientId?: string) => Promise<any>;
    pollDeviceAuth: (deviceCode: string, interval?: number, clientId?: string) => Promise<string>;
    getAuthStatus: () => Promise<any>;
    setManualToken: (token: string) => Promise<boolean>;
    logout: () => Promise<boolean>;
  };
  git: {
    syncRepository: () => Promise<any>;
    commitAndPush: (notes?: string) => Promise<any>;
    getStatus: () => Promise<{ dirty: boolean; files: string[] }>;
    getRepoDir: () => Promise<string>;
    setRepoDir: (newPath: string) => Promise<string>;
  };
  fs: {
    listFiles: () => Promise<FileNode[]>;
    readFile: (filePath: string) => Promise<{ content: string; isBinary: boolean; mimeType: string }>;
    writeFile: (filePath: string, content: string) => Promise<boolean>;
    importFiles: (targetSubdir?: string) => Promise<any>;
    importFolder: (targetSubdir?: string) => Promise<any>;
    createMarkdownNote: (targetSubdir: string, filename: string, title?: string) => Promise<any>;
    openInDesktopApp: (filePath: string) => Promise<{ success: boolean; message: string }>;
  };
  settings: {
    getSettings: () => Promise<StationSettings>;
    saveSettings: (settings: Partial<StationSettings>) => Promise<StationSettings>;
    browseApp: () => Promise<string | null>;
    browseRepoDir: () => Promise<string | null>;
    resetSettings: () => Promise<StationSettings>;
  };
  shell: {
    openExternal: (url: string) => Promise<void>;
    openDiscord: (customInviteUrl?: string, customAppUri?: string) => Promise<void>;
    openMeeting: (customUrl?: string) => Promise<void>;
    openRepoFolder: () => Promise<void>;
    copyToClipboard: (text: string) => void;
    openGoogleSuite: (args: {
      appType: 'docs' | 'sheets' | 'slides' | 'drive';
      windowMode?: 'station_window' | 'app_window' | 'browser_tab';
      targetFilePath?: string;
      preferredEngine?: string;
    }) => Promise<{ success: boolean; message: string }>;
    getDetectedBrowsers: () => Promise<{
      browsers: Array<{ id: string; name: string; path: string | null; supportsAppMode: boolean; platform: string }>;
      platform: string;
      hasVivaldi: boolean;
      hasChrome: boolean;
      hasSafari: boolean;
      hasEdge: boolean;
      hasBrave: boolean;
      hasObsidian: boolean;
      obsidianPath: string | null;
      hasGoogleDrive: boolean;
      googleDrivePath: string | null;
    }>;
    openGoogleDriveFolder: () => Promise<{ success: boolean; message: string }>;
  };
  drive: {
    getStatus: () => Promise<{
      connected: boolean;
      userEmail?: string;
      userName?: string;
      clientIdConfigured: boolean;
      folderId: string;
    }>;
    startAuth: (args?: { clientId?: string; clientSecret?: string }) => Promise<{
      success: boolean;
      message: string;
      email?: string;
    }>;
    disconnect: () => Promise<boolean>;
    uploadAndOpen: (filePath: string) => Promise<{
      success: boolean;
      fileId?: string;
      webViewLink?: string;
      message: string;
    }>;
  };
}

const api: ApiBridge = {
  auth: {
    requestDeviceCode: (clientId) => ipcRenderer.invoke('auth:requestDeviceCode', clientId),
    pollDeviceAuth: (deviceCode, interval, clientId) => ipcRenderer.invoke('auth:pollDeviceAuth', { deviceCode, interval, clientId }),
    getAuthStatus: () => ipcRenderer.invoke('auth:getAuthStatus'),
    setManualToken: (token) => ipcRenderer.invoke('auth:setManualToken', token),
    logout: () => ipcRenderer.invoke('auth:logout')
  },
  git: {
    syncRepository: () => ipcRenderer.invoke('git:syncRepository'),
    commitAndPush: (notes) => ipcRenderer.invoke('git:commitAndPush', notes),
    getStatus: () => ipcRenderer.invoke('git:getStatus'),
    getRepoDir: () => ipcRenderer.invoke('git:getRepoDir'),
    setRepoDir: (newPath) => ipcRenderer.invoke('git:setRepoDir', newPath)
  },
  fs: {
    listFiles: () => ipcRenderer.invoke('fs:listFiles'),
    readFile: (filePath) => ipcRenderer.invoke('fs:readFile', filePath),
    writeFile: (filePath, content) => ipcRenderer.invoke('fs:writeFile', { filePath, content }),
    importFiles: (targetSubdir) => ipcRenderer.invoke('fs:importFiles', targetSubdir),
    importFolder: (targetSubdir) => ipcRenderer.invoke('fs:importFolder', targetSubdir),
    createMarkdownNote: (targetSubdir, filename, title) => ipcRenderer.invoke('fs:createMarkdownNote', { targetSubdir, filename, title }),
    openInDesktopApp: (filePath) => ipcRenderer.invoke('fs:openInDesktopApp', filePath)
  },
  settings: {
    getSettings: () => ipcRenderer.invoke('settings:get'),
    saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),
    browseApp: () => ipcRenderer.invoke('settings:browseApp'),
    browseRepoDir: () => ipcRenderer.invoke('settings:browseRepoDir'),
    resetSettings: () => ipcRenderer.invoke('settings:reset')
  },
  shell: {
    openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
    openDiscord: (customInviteUrl?: string, customAppUri?: string) => ipcRenderer.invoke('shell:openDiscord', { customInviteUrl, customAppUri }),
    openMeeting: (customUrl?: string) => ipcRenderer.invoke('shell:openMeeting', customUrl),
    openRepoFolder: () => ipcRenderer.invoke('shell:openRepoFolder'),
    copyToClipboard: (text) => clipboard.writeText(text),
    openGoogleSuite: (args) => ipcRenderer.invoke('shell:openGoogleSuite', args),
    getDetectedBrowsers: () => ipcRenderer.invoke('shell:getDetectedBrowsers'),
    openGoogleDriveFolder: () => ipcRenderer.invoke('shell:openGoogleDriveFolder')
  },
  drive: {
    getStatus: () => ipcRenderer.invoke('drive:getStatus'),
    startAuth: (args) => ipcRenderer.invoke('drive:startAuth', args),
    disconnect: () => ipcRenderer.invoke('drive:disconnect'),
    uploadAndOpen: (filePath) => ipcRenderer.invoke('drive:uploadAndOpen', filePath)
  }
};

contextBridge.exposeInMainWorld('api', api);
