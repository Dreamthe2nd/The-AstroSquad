import http from 'http';
import https from 'https';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { shell } from 'electron';
import { SettingsManager } from './settingsManager';

export interface DriveAuthStatus {
  connected: boolean;
  userEmail?: string;
  userName?: string;
  clientIdConfigured: boolean;
  folderId: string;
}

export interface DriveUploadResult {
  success: boolean;
  fileId?: string;
  webViewLink?: string;
  message: string;
}

export class GoogleDriveManager {
  private static readonly SHARED_FOLDER_ID = '1YE6FbXZVLZLZKNvxqfUqIsScqk_4HIzC';
  private static activeAuthServer: http.Server | null = null;

  /**
   * Helper: base64url encode a buffer
   */
  private static base64UrlEncode(buffer: Buffer): string {
    return buffer
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  /**
   * Generates PKCE code verifier and S256 code challenge
   */
  private static generatePkce(): { verifier: string; challenge: string } {
    const verifier = this.base64UrlEncode(crypto.randomBytes(32));
    const hash = crypto.createHash('sha256').update(verifier).digest();
    const challenge = this.base64UrlEncode(hash);
    return { verifier, challenge };
  }

  /**
   * Helper for HTTPS JSON requests
   */
  private static httpRequest(
    options: https.RequestOptions,
    body?: string | Buffer,
    contentType?: string
  ): Promise<{ statusCode: number; data: any }> {
    return new Promise((resolve, reject) => {
      const headers = { ...(options.headers || {}) };
      if (body && contentType) {
        headers['Content-Type'] = contentType;
        headers['Content-Length'] = Buffer.isBuffer(body) ? body.length : Buffer.byteLength(body);
      }

      const req = https.request({ ...options, headers }, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf-8');
          try {
            const data = raw ? JSON.parse(raw) : null;
            resolve({ statusCode: res.statusCode || 200, data });
          } catch {
            resolve({ statusCode: res.statusCode || 200, data: raw });
          }
        });
      });

      req.setTimeout(30000, () => {
        req.destroy(new Error('HTTP request timed out after 30 seconds'));
      });

      req.on('error', reject);
      if (body) req.write(body);
      req.end();
    });
  }

  /**
   * Gets current Google Drive connection status
   */
  public static getStatus(settingsManager: SettingsManager): DriveAuthStatus {
    const settings = settingsManager.getSettings();
    const gs = settings.googleSuite;
    const connected = !!(gs?.refreshToken || (gs?.accessToken && gs?.tokenExpiry && gs.tokenExpiry > Date.now()));
    return {
      connected,
      userEmail: gs?.userEmail,
      userName: gs?.userName,
      clientIdConfigured: !!gs?.clientId?.trim(),
      folderId: this.SHARED_FOLDER_ID
    };
  }

  /**
   * Initiates the OAuth 2.0 PKCE Loopback Flow
   */
  public static async startAuthFlow(
    settingsManager: SettingsManager,
    customClientId?: string,
    customClientSecret?: string
  ): Promise<{ success: boolean; message: string; email?: string }> {
    const settings = settingsManager.getSettings();
    const clientId = customClientId?.trim() || settings.googleSuite?.clientId?.trim();
    const clientSecret = customClientSecret?.trim() || settings.googleSuite?.clientSecret?.trim();

    if (!clientId) {
      throw new Error('Google OAuth Client ID is required. Please enter a valid Desktop Client ID from Google Cloud Console.');
    }

    // Save configured Client ID & Secret
    settingsManager.saveSettings({
      googleSuite: {
        ...settings.googleSuite,
        clientId,
        clientSecret
      }
    });

    // Close any previous pending auth server
    if (this.activeAuthServer) {
      try {
        this.activeAuthServer.close();
      } catch {}
      this.activeAuthServer = null;
    }

    const pkce = this.generatePkce();
    const state = this.base64UrlEncode(crypto.randomBytes(16));

    return new Promise((resolve, reject) => {
      let authTimeout: NodeJS.Timeout;
      const server = http.createServer(async (req, res) => {
        try {
          const reqUrl = new URL(req.url || '/', `http://127.0.0.1`);
          if (reqUrl.pathname !== '/oauth2callback') {
            res.writeHead(404);
            res.end('Not found');
            return;
          }

          const queryCode = reqUrl.searchParams.get('code');
          const queryState = reqUrl.searchParams.get('state');
          const queryError = reqUrl.searchParams.get('error');

          if (queryError) {
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end(this.getCallbackHtml(false, `Google authorization denied: ${queryError}`));
            if (authTimeout) clearTimeout(authTimeout);
            server.close();
            this.activeAuthServer = null;
            reject(new Error(`Authorization failed: ${queryError}`));
            return;
          }

          if (!queryCode || queryState !== state) {
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end(this.getCallbackHtml(false, 'Invalid state parameter or authorization code.'));
            if (authTimeout) clearTimeout(authTimeout);
            server.close();
            this.activeAuthServer = null;
            reject(new Error('Invalid state or code returned from Google.'));
            return;
          }

          const port = (server.address() as any).port;
          const redirectUri = `http://127.0.0.1:${port}/oauth2callback`;

          // Exchange authorization code for tokens
          const tokenBody = new URLSearchParams({
            client_id: clientId,
            code: queryCode,
            code_verifier: pkce.verifier,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri
          });
          if (clientSecret) {
            tokenBody.append('client_secret', clientSecret);
          }

          const tokenRes = await this.httpRequest(
            {
              hostname: 'oauth2.googleapis.com',
              path: '/token',
              method: 'POST'
            },
            tokenBody.toString(),
            'application/x-www-form-urlencoded'
          );

          if (tokenRes.statusCode !== 200 || !tokenRes.data?.access_token) {
            const errMsg = tokenRes.data?.error_description || tokenRes.data?.error || 'Failed to exchange tokens';
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end(this.getCallbackHtml(false, errMsg));
            if (authTimeout) clearTimeout(authTimeout);
            server.close();
            this.activeAuthServer = null;
            reject(new Error(errMsg));
            return;
          }

          const { access_token, refresh_token, expires_in } = tokenRes.data;
          const tokenExpiry = Date.now() + (expires_in ? expires_in * 1000 : 3600000);

          // Fetch user profile info
          let userEmail = '';
          let userName = '';
          try {
            const userRes = await this.httpRequest({
              hostname: 'www.googleapis.com',
              path: '/oauth2/v2/userinfo',
              method: 'GET',
              headers: { Authorization: `Bearer ${access_token}` }
            });
            if (userRes.data?.email) {
              userEmail = userRes.data.email;
              userName = userRes.data.name || '';
            }
          } catch (e) {
            console.warn('Could not fetch user info:', e);
          }

          // Persist tokens
          const current = settingsManager.getSettings();
          settingsManager.saveSettings({
            googleSuite: {
              ...current.googleSuite,
              accessToken: access_token,
              refreshToken: refresh_token || current.googleSuite.refreshToken,
              tokenExpiry,
              userEmail,
              userName
            }
          });

          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(this.getCallbackHtml(true, `Connected as ${userEmail || 'AstroSquad Researcher'}`));

          setTimeout(() => {
            if (authTimeout) clearTimeout(authTimeout);
              try {
                server.close();
              } catch {}
              this.activeAuthServer = null;
          }, 1000);

          resolve({
            success: true,
            message: `Connected Google Drive as ${userEmail}`,
            email: userEmail
          });
        } catch (err: any) {
          if (authTimeout) clearTimeout(authTimeout);
            server.close();
            this.activeAuthServer = null;
          reject(err);
        }
      });

      // Bind to random port on 127.0.0.1
      server.listen(0, '127.0.0.1', () => {
        authTimeout = setTimeout(() => {
          if (authTimeout) clearTimeout(authTimeout);
              try {
                server.close();
              } catch {}
              this.activeAuthServer = null;
          reject(new Error('Authorization timed out after 2 minutes. Please try again.'));
        }, 120000);
        const port = (server.address() as any).port;
        const redirectUri = `http://127.0.0.1:${port}/oauth2callback`;
        this.activeAuthServer = server;

        const scopes = [
          'https://www.googleapis.com/auth/drive',
          'https://www.googleapis.com/auth/userinfo.email',
          'https://www.googleapis.com/auth/userinfo.profile'
        ].join(' ');

        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + new URLSearchParams({
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: 'code',
          scope: scopes,
          code_challenge: pkce.challenge,
          code_challenge_method: 'S256',
          state: state,
          access_type: 'offline',
          prompt: 'consent'
        }).toString();

        console.log('[GoogleDriveManager] Opening OAuth browser URL:', authUrl);
        shell.openExternal(authUrl);
      });

      server.on('error', (err) => {
        this.activeAuthServer = null;
        reject(err);
      });
    });
  }

  /**
   * Disconnects Google Drive
   */
  public static disconnect(settingsManager: SettingsManager): boolean {
    const settings = settingsManager.getSettings();
    settingsManager.saveSettings({
      googleSuite: {
        ...settings.googleSuite,
        accessToken: undefined,
        refreshToken: undefined,
        tokenExpiry: undefined,
        userEmail: undefined,
        userName: undefined
      }
    });
    return true;
  }

  /**
   * Ensures valid access token, automatically refreshing if expired
   */
  public static async getValidAccessToken(settingsManager: SettingsManager): Promise<string | null> {
    const settings = settingsManager.getSettings();
    const gs = settings.googleSuite;

    if (!gs?.accessToken && !gs?.refreshToken) {
      return null;
    }

    // Token still fresh?
    if (gs.accessToken && gs.tokenExpiry && gs.tokenExpiry > Date.now() + 60000) {
      return gs.accessToken;
    }

    // Refresh token flow
    if (!gs.refreshToken || !gs.clientId) {
      return null;
    }

    try {
      console.log('[GoogleDriveManager] Refreshing expired Google Drive access token...');
      const refreshBody = new URLSearchParams({
        client_id: gs.clientId,
        refresh_token: gs.refreshToken,
        grant_type: 'refresh_token'
      });
      if (gs.clientSecret) {
        refreshBody.append('client_secret', gs.clientSecret);
      }

      const res = await this.httpRequest(
        {
          hostname: 'oauth2.googleapis.com',
          path: '/token',
          method: 'POST'
        },
        refreshBody.toString(),
        'application/x-www-form-urlencoded'
      );

      if (res.statusCode === 200 && res.data?.access_token) {
        const newExpiry = Date.now() + (res.data.expires_in ? res.data.expires_in * 1000 : 3600000);
        settingsManager.saveSettings({
          googleSuite: {
            ...gs,
            accessToken: res.data.access_token,
            refreshToken: res.data.refresh_token || gs.refreshToken,
            tokenExpiry: newExpiry
          }
        });
        return res.data.access_token;
      } else if (res.statusCode === 400 && res.data?.error === 'invalid_grant') {
        const current = settingsManager.getSettings();
        settingsManager.saveSettings({
          googleSuite: {
            ...current.googleSuite,
            accessToken: undefined,
            refreshToken: undefined,
            tokenExpiry: undefined,
            userEmail: undefined,
            userName: undefined
          }
        });
        console.warn('[GoogleDriveManager] Refresh token revoked/expired. Cleared stored credentials.');
      }
    } catch (err) {
      console.error('[GoogleDriveManager] Failed to refresh token:', err);
    }

    return null;
  }

  /**
   * Uploads or updates a file on Google Drive and launches its webViewLink directly
   */
  public static async uploadAndOpenInWorkspace(
    filePath: string,
    settingsManager: SettingsManager
  ): Promise<DriveUploadResult> {
    if (!fs.existsSync(filePath)) {
      return { success: false, message: `File not found: ${filePath}` };
    }

    const token = await this.getValidAccessToken(settingsManager);
    if (!token) {
      return {
        success: false,
        message: 'Google Drive is not connected. Please connect Google Drive in Settings -> Google Workspace.'
      };
    }

    const fileName = path.basename(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const fileBuffer = fs.readFileSync(filePath);

    // Determine Workspace conversion MIME type
    let targetMimeType = 'application/octet-stream';
    let sourceMimeType = 'application/octet-stream';
    let appLabel = 'Google Workspace';

    if (ext === '.pptx' || ext === '.ppt') {
      targetMimeType = 'application/vnd.google-apps.presentation';
      sourceMimeType = ext === '.pptx' ? 'application/vnd.openxmlformats-officedocument.presentationml.presentation' : 'application/vnd.ms-powerpoint';
      appLabel = 'Google Slides';
    } else if (ext === '.csv' || ext === '.xlsx' || ext === '.xls') {
      targetMimeType = 'application/vnd.google-apps.spreadsheet';
      if (ext === '.csv') sourceMimeType = 'text/csv';
      else if (ext === '.xlsx') sourceMimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      else sourceMimeType = 'application/vnd.ms-excel';
      appLabel = 'Google Sheets';
    } else if (ext === '.pdf' || fileName.toLowerCase() === 'proposal') {
      targetMimeType = 'application/pdf';
      sourceMimeType = 'application/pdf';
      appLabel = 'Google Drive';
    }

    const folderId = this.SHARED_FOLDER_ID;

    try {
      // 1. Check if file with same name already exists in target folder
      console.log(`[GoogleDriveManager] Checking for existing "${fileName}" in folder ${folderId}...`);
      const searchQuery = `'${folderId}' in parents and name = '${fileName.replace(/'/g, "\\'")}' and trashed = false`;
      const searchRes = await this.httpRequest({
        hostname: 'www.googleapis.com',
        path: `/drive/v3/files?q=${encodeURIComponent(searchQuery)}&fields=files(id,name,webViewLink)&supportsAllDrives=true&includeItemsFromAllDrives=true`,
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (searchRes.statusCode < 200 || searchRes.statusCode >= 300) {
        throw new Error(`Failed to search Drive folder: ${searchRes.data?.error?.message || `HTTP ${searchRes.statusCode}`}`);
      }

      const existingFile = searchRes.data?.files && searchRes.data.files.length > 0 ? searchRes.data.files[0] : null;

      let fileId = '';
      let webViewLink = '';

      const boundary = '-------AstroSquadBoundary' + crypto.randomBytes(8).toString('hex');
      const multipartBody = Buffer.concat([
        Buffer.from(`--${boundary}\r\nContent-Type: ${sourceMimeType}\r\n\r\n`),
        fileBuffer,
        Buffer.from(`\r\n--${boundary}--`)
      ]);

      if (existingFile) {
        // Update existing file content in-place (PATCH) — preserves fileId, sharing links & version history
        fileId = existingFile.id;
        webViewLink = existingFile.webViewLink || '';
        console.log(`[GoogleDriveManager] Updating existing file ${fileId} in-place (PATCH)...`);
        const updateRes = await this.httpRequest(
          {
            hostname: 'www.googleapis.com',
            path: `/upload/drive/v3/files/${fileId}?uploadType=media&supportsAllDrives=true`,
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': sourceMimeType,
              'Content-Length': fileBuffer.length
            }
          },
          fileBuffer,
          sourceMimeType
        );
        if (updateRes.statusCode < 200 || updateRes.statusCode >= 300) {
          console.warn(`[GoogleDriveManager] PATCH update returned ${updateRes.statusCode}, falling back to create new...`);
          fileId = '';
          webViewLink = '';
        } else {
          console.log(`[GoogleDriveManager] PATCH update successful.`);
        }
      }

      if (!fileId) {
        // Create new file
        console.log(`[GoogleDriveManager] Creating new file "${fileName}" in folder ${folderId}...`);
        const metadata = {
          name: fileName,
          parents: [folderId],
          mimeType: targetMimeType
        };
        const createBody = Buffer.concat([
          Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`),
          Buffer.from(`--${boundary}\r\nContent-Type: ${sourceMimeType}\r\n\r\n`),
          fileBuffer,
          Buffer.from(`\r\n--${boundary}--`)
        ]);
        const uploadRes = await this.httpRequest(
          {
            hostname: 'www.googleapis.com',
            path: `/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink&supportsAllDrives=true`,
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Length': createBody.length
            }
          },
          createBody,
          `multipart/related; boundary=${boundary}`
        );
        if (uploadRes.statusCode >= 200 && uploadRes.statusCode < 300) {
          fileId = uploadRes.data?.id;
          webViewLink = uploadRes.data?.webViewLink;
        } else {
          throw new Error(uploadRes.data?.error?.message || `Upload failed with HTTP ${uploadRes.statusCode}`);
        }
      }

      // Ensure we have a direct webViewLink
      if (!webViewLink && fileId) {
        if (targetMimeType === 'application/vnd.google-apps.presentation') {
          webViewLink = `https://docs.google.com/presentation/d/${fileId}/edit`;
        } else if (targetMimeType === 'application/vnd.google-apps.spreadsheet') {
          webViewLink = `https://docs.google.com/spreadsheets/d/${fileId}/edit`;
        } else {
          webViewLink = `https://drive.google.com/file/d/${fileId}/view`;
        }
      }

      // Attach authuser so file opens in the configured Google account
      const accountIndex = settingsManager.getSettings().googleSuite?.accountIndex;
      if (accountIndex && webViewLink.includes('google.com')) {
        webViewLink += (webViewLink.includes('?') ? '&' : '?') + `authuser=${encodeURIComponent(accountIndex)}`;
      }

      console.log(`[GoogleDriveManager] Upload complete! webViewLink: ${webViewLink}`);
      if (webViewLink) {
        await shell.openExternal(webViewLink);
      }

      return {
        success: true,
        fileId,
        webViewLink,
        message: `Synced and opened "${fileName}" in ${appLabel}.`
      };
    } catch (err: any) {
      console.error('[GoogleDriveManager] Error during upload:', err);
      return {
        success: false,
        message: `Cloud upload error: ${err.message || 'Unknown failure'}`
      };
    }
  }

  /**
   * Branded HTML callback page
   */
  private static getCallbackHtml(success: boolean, message: string): string {
    const escaped = message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>AstroSquad Station · Google Drive</title>
  <style>
    body {
      background: #020617;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
    }
    .card {
      background: #0f172a;
      border: 1px solid ${success ? 'rgba(56, 189, 248, 0.4)' : 'rgba(244, 63, 94, 0.4)'};
      border-radius: 16px;
      padding: 32px 40px;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0,0,0,0.6);
      max-width: 420px;
    }
    .badge {
      display: inline-block;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      padding: 4px 10px;
      border-radius: 9999px;
      background: ${success ? 'rgba(56, 189, 248, 0.15)' : 'rgba(244, 63, 94, 0.15)'};
      color: ${success ? '#38bdf8' : '#f43f5e'};
      margin-bottom: 16px;
      font-weight: 700;
    }
    h1 { font-size: 20px; margin: 0 0 8px; font-weight: 700; }
    p { font-size: 13px; color: #94a3b8; line-height: 1.5; margin: 0 0 20px; }
    .footer { font-size: 11px; color: #64748b; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">${success ? 'Connection Established' : 'Connection Anomaly'}</div>
    <h1>${success ? 'AstroSquad Station Connected' : 'Authorization Incomplete'}</h1>
    <p>${escaped}</p>
    <div class="footer">You can safely close this browser window and return to the Station.</div>
  </div>
</body>
</html>`;
  }
}
