export interface FileNode {
  name: string;
  relativePath: string;
  absolutePath: string;
  isDirectory: boolean;
  size?: number;
  extension?: string;
  children?: FileNode[];
}

export interface AuthStatus {
  authenticated: boolean;
  isCollaborator?: boolean;
  role?: 'contributor' | 'guest';
  user?: {
    login: string;
    avatar_url: string;
    name: string;
  };
}

export type ViewMode = 'auth' | 'hub' | 'workspace';

export interface ToastNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'conflict';
  title: string;
  message: string;
  duration?: number;
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
    engine: 'auto' | 'chrome' | 'edge';
    windowMode: 'app_window' | 'browser_tab';
    docsUrl?: string;
    sheetsUrl?: string;
    slidesUrl?: string;
    driveUrl?: string;
  };
}
