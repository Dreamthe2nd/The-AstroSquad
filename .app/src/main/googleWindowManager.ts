import path from 'path';
import { BrowserWindow } from 'electron';

export class GoogleWindowManager {
  private static windows: Map<string, BrowserWindow> = new Map();

  /**
   * Opens or focuses a native AstroSquad desktop window for Google Docs, Sheets, Slides, or Drive
   * Fully compatible with macOS, Windows, and Linux with zero external browser dependencies.
   */
  public static openSession(
    appType: 'docs' | 'sheets' | 'slides' | 'drive',
    targetUrl: string,
    targetFilePath?: string
  ): BrowserWindow {
    const existing = this.windows.get(appType);
    const fileName = targetFilePath ? path.basename(targetFilePath) : '';

    if (existing && !existing.isDestroyed()) {
      existing.show();
      existing.focus();
      if (targetUrl) {
        existing.loadURL(targetUrl);
      }
      if (fileName) {
        existing.setTitle(`Google ${appType.charAt(0).toUpperCase() + appType.slice(1)} · ${fileName} (AstroSquad)`);
      }
      return existing;
    }

    const titles: Record<string, string> = {
      docs: fileName ? `Google Docs · ${fileName}` : 'Google Docs · AstroSquad Station Session',
      sheets: fileName ? `Google Sheets · ${fileName}` : 'Google Sheets · AstroSquad Station Session',
      slides: fileName ? `Google Slides · ${fileName}` : 'Google Slides · AstroSquad Station Session',
      drive: 'Google Drive · The-AstroSquad Cloud Hub'
    };

    const isMac = process.platform === 'darwin';

    const win = new BrowserWindow({
      width: 1280,
      height: 840,
      minWidth: 800,
      minHeight: 600,
      title: titles[appType] || 'Google Workspace Session',
      autoHideMenuBar: true,
      backgroundColor: '#0f172a',
      webPreferences: {
        partition: 'persist:astrosquad_google_session',
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true
      }
    });

    // Provide a standard clean desktop browser user-agent for Google web app compatibility
    const desktopUA = isMac
      ? 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15'
      : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

    win.webContents.setUserAgent(desktopUA);

    win.loadURL(targetUrl);

    win.on('closed', () => {
      this.windows.delete(appType);
    });

    this.windows.set(appType, win);
    return win;
  }

  public static closeAll(): void {
    this.windows.forEach((win) => {
      if (!win.isDestroyed()) {
        win.close();
      }
    });
    this.windows.clear();
  }
}
