import fs from 'fs';
import path from 'path';
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';
import { safeStorage, app } from 'electron';

export interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

export interface AuthStatus {
  authenticated: boolean;
  user?: {
    login: string;
    avatar_url: string;
    name: string;
  };
}

export interface SyncResult {
  success: boolean;
  message: string;
  conflictsResolved?: Array<{ original: string; backup: string }>;
}

export class GitEngine {
  private repoUrl: string = 'https://github.com/Dreamthe2nd/The-AstroSquad';
  private repoDir: string;
  private branch: string = 'main';
  private tokenStorePath: string;
  private cachedToken: string | null = null;

  constructor(customRepoDir?: string, customRepoUrl?: string, customBranch?: string) {
    // Default repo directory to 'AstroSquad' inside app data / user home
    const baseDir = app ? app.getPath('documents') : process.cwd();
    this.repoDir = customRepoDir || path.join(baseDir, 'AstroSquad');
    if (customRepoUrl) this.repoUrl = customRepoUrl;
    if (customBranch) this.branch = customBranch;
    
    const userDataPath = app ? app.getPath('userData') : process.cwd();
    this.tokenStorePath = path.join(userDataPath, 'astrosquad_auth.dat');
    this.loadToken();
  }

  public getRepoDir(): string {
    return this.repoDir;
  }

  public setRepoDir(newPath: string): void {
    this.repoDir = newPath;
  }

  public getRepoUrl(): string {
    return this.repoUrl;
  }

  public setRepoUrl(newUrl: string): void {
    this.repoUrl = newUrl;
  }

  public getBranch(): string {
    return this.branch;
  }

  public setBranch(newBranch: string): void {
    this.branch = newBranch || 'main';
  }

  /* ---------------- Safe Storage & Token Management ---------------- */

  private saveToken(token: string): void {
    this.cachedToken = token;
    try {
      if (safeStorage && safeStorage.isEncryptionAvailable()) {
        const encrypted = safeStorage.encryptString(token);
        fs.writeFileSync(this.tokenStorePath, encrypted);
      } else {
        // Fallback Base64 encoding if native platform encryption is unavailable
        const encoded = Buffer.from(token).toString('base64');
        fs.writeFileSync(this.tokenStorePath, `b64:${encoded}`);
      }
    } catch (err) {
      console.error('Failed to securely save token:', err);
    }
  }

  private loadToken(): string | null {
    if (this.cachedToken) return this.cachedToken;
    try {
      if (!fs.existsSync(this.tokenStorePath)) return null;
      const raw = fs.readFileSync(this.tokenStorePath);
      
      if (raw.toString().startsWith('b64:')) {
        const encoded = raw.toString().substring(4);
        this.cachedToken = Buffer.from(encoded, 'base64').toString('utf-8');
      } else if (safeStorage && safeStorage.isEncryptionAvailable()) {
        this.cachedToken = safeStorage.decryptString(raw);
      } else {
        this.cachedToken = raw.toString('utf-8');
      }
      return this.cachedToken;
    } catch (err) {
      console.error('Failed to decrypt stored token:', err);
      return null;
    }
  }

  public clearToken(): void {
    this.cachedToken = null;
    if (fs.existsSync(this.tokenStorePath)) {
      try {
        fs.unlinkSync(this.tokenStorePath);
      } catch (err) {
        console.error('Failed to remove token file:', err);
      }
    }
  }

  public setManualToken(token: string): void {
    this.saveToken(token.trim());
  }

  public getToken(): string | null {
    return this.loadToken();
  }

  /* ---------------- GitHub OAuth Device Code Flow ---------------- */

  /**
   * Initiates the GitHub Device Code Flow
   * Default public client_id or user-supplied client_id
   */
  public async requestDeviceCode(clientId: string = '01ab8ac9400c4e429b23'): Promise<DeviceCodeResponse> {
    const params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('scope', 'repo read:user');

    const response = await fetch('https://github.com/login/device/code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: params.toString()
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Device code request failed (${response.status}): ${text}`);
    }

    const data = await response.json() as DeviceCodeResponse;
    return data;
  }

  /**
   * Polls GitHub for device flow completion until granted or expired
   */
  public async pollDeviceAuth(
    clientId: string = '01ab8ac9400c4e429b23',
    deviceCode: string,
    interval: number = 5,
    onPending?: () => void
  ): Promise<string> {
    const pollIntervalMs = Math.max(interval, 5) * 1000;
    
    return new Promise((resolve, reject) => {
      let isStopped = false;

      const checkAuth = async () => {
        if (isStopped) return;
        try {
          const params = new URLSearchParams();
          params.append('client_id', clientId);
          params.append('device_code', deviceCode);
          params.append('grant_type', 'urn:ietf:params:oauth:grant-type:device_code');

          const resp = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Accept': 'application/json'
            },
            body: params.toString()
          });

          const json = await resp.json() as { access_token?: string; error?: string; error_description?: string; interval?: number };

          if (json.access_token) {
            isStopped = true;
            this.saveToken(json.access_token);
            resolve(json.access_token);
            return;
          }

          if (json.error) {
            if (json.error === 'authorization_pending') {
              if (onPending) onPending();
              setTimeout(checkAuth, pollIntervalMs);
            } else if (json.error === 'slow_down') {
              const slowDelay = (json.interval ? json.interval + 5 : 10) * 1000;
              setTimeout(checkAuth, slowDelay);
            } else {
              isStopped = true;
              reject(new Error(json.error_description || json.error));
            }
          } else {
            setTimeout(checkAuth, pollIntervalMs);
          }
        } catch (err) {
          isStopped = true;
          reject(err);
        }
      };

      // Start initial poll check
      setTimeout(checkAuth, pollIntervalMs);
    });
  }

  /**
   * Check currently authenticated user info from GitHub API
   */
  public async getAuthenticatedUser(): Promise<AuthStatus> {
    const token = this.getToken();
    if (!token) {
      return { authenticated: false };
    }

    try {
      const resp = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'AstroSquad-Station'
        }
      });

      if (!resp.ok) {
        return { authenticated: false };
      }

      const user = await resp.json();
      return {
        authenticated: true,
        user: {
          login: user.login,
          avatar_url: user.avatar_url,
          name: user.name || user.login
        }
      };
    } catch {
      // If offline or network error, but token exists, treat as authenticated
      return {
        authenticated: true,
        user: {
          login: 'AstroSquad Researcher',
          avatar_url: '',
          name: 'Collaborator'
        }
      };
    }
  }

  /* ---------------- Zero-Install Git Operations ---------------- */

  private getAuthCallback() {
    const token = this.getToken();
    return () => ({
      username: token || 'git',
      password: ''
    });
  }

  /**
   * Silent background clone or pull
   * Guardrail: If conflicts or uncommitted changes occur, automatically backups local files
   */
  public async syncRepository(progressCallback?: (phase: string) => void): Promise<SyncResult> {
    try {
      const gitDir = path.join(this.repoDir, '.git');
      const isCloned = fs.existsSync(gitDir);

      if (!isCloned) {
        if (progressCallback) progressCallback('Cloning repository from mission control...');
        fs.mkdirSync(this.repoDir, { recursive: true });

        await git.clone({
          fs,
          http,
          dir: this.repoDir,
          url: this.repoUrl,
          ref: this.branch,
          singleBranch: true,
          depth: 10,
          onAuth: this.getAuthCallback()
        });

        return {
          success: true,
          message: 'Repository cloned successfully.'
        };
      }

      // Existing repository: pull changes
      if (progressCallback) progressCallback('Checking for incoming Doppler updates...');

      // 1. Check for uncommitted local modifications to guard against data loss
      const conflictBackups = await this.guardrailBackupLocalModifications();

      // 2. Fetch latest changes from remote branch
      await git.fetch({
        fs,
        http,
        dir: this.repoDir,
        url: this.repoUrl,
        ref: this.branch,
        depth: 10,
        onAuth: this.getAuthCallback()
      });

      // 3. Merge or fast-forward
      try {
        await git.merge({
          fs,
          dir: this.repoDir,
          ours: this.branch,
          theirs: `origin/${this.branch}`,
          author: { name: 'AstroSquad Researcher', email: 'researcher@astrosquad.space' }
        });
      } catch {
        // In case merge has index conflicts, checkout remote branch cleanly since we already preserved local backups
        await git.checkout({
          fs,
          dir: this.repoDir,
          ref: `origin/${this.branch}`,
          force: true
        });
      }

      const msg = conflictBackups.length > 0
        ? `Pulled latest changes. Guardrail preserved ${conflictBackups.length} file(s) with local changes.`
        : 'Repository is synchronized with main.';

      return {
        success: true,
        message: msg,
        conflictsResolved: conflictBackups
      };
    } catch (error: any) {
      console.error('Git sync error:', error);
      return {
        success: false,
        message: error.message || 'Failed to sync repository.'
      };
    }
  }

  /**
   * Non-Technical Guardrail:
   * Scans for any files modified locally. If modified, backs them up as:
   * [filename]_conflict_[timestamp].[ext]
   */
  public async guardrailBackupLocalModifications(): Promise<Array<{ original: string; backup: string }>> {
    const backedUp: Array<{ original: string; backup: string }> = [];

    try {
      const statusMatrix = await git.statusMatrix({
        fs,
        dir: this.repoDir,
        filter: (p) => !p.startsWith('.git')
      });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

      for (const [filepath, head, workdir, stage] of statusMatrix) {
        // workdir !== head means locally modified or added
        if (workdir !== head && workdir !== 0) {
          const fullPath = path.join(this.repoDir, filepath);
          if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
            const parsed = path.parse(fullPath);
            const backupFilename = `${parsed.name}_conflict_${timestamp}${parsed.ext}`;
            const backupPath = path.join(parsed.dir, backupFilename);

            fs.copyFileSync(fullPath, backupPath);
            backedUp.push({
              original: filepath,
              backup: path.relative(this.repoDir, backupPath)
            });
          }
        }
      }
    } catch (err) {
      console.warn('Guardrail backup scan encountered an error (continuing):', err);
    }

    return backedUp;
  }

  /**
   * Staging all modified/added files, creating a timestamped commit and pushing to main
   */
  public async commitAndPush(userNotes?: string): Promise<SyncResult> {
    try {
      const token = this.getToken();
      if (!token) {
        throw new Error('Authentication required to share changes. Please log in with GitHub.');
      }

      const user = await this.getAuthenticatedUser();
      const authorName = user.user?.name || user.user?.login || 'AstroSquad Researcher';
      const authorEmail = user.user?.login ? `${user.user.login}@users.noreply.github.com` : 'researcher@astrosquad.space';

      // 1. Stage all changes
      const matrix = await git.statusMatrix({
        fs,
        dir: this.repoDir,
        filter: (p) => !p.startsWith('.git')
      });

      let changesCount = 0;
      for (const [filepath, head, workdir] of matrix) {
        if (workdir === 0) {
          // File was deleted
          await git.remove({ fs, dir: this.repoDir, filepath });
          changesCount++;
        } else if (workdir !== head) {
          // File modified or untracked
          await git.add({ fs, dir: this.repoDir, filepath });
          changesCount++;
        }
      }

      if (changesCount === 0) {
        return {
          success: true,
          message: 'No changes detected to share. Everything is up to date.'
        };
      }

      // 2. Commit with timestamp
      const timeStr = new Date().toLocaleString();
      const commitMessage = userNotes
        ? `[AstroSquad] ${userNotes} (${timeStr})`
        : `Updated files at ${timeStr}`;

      const sha = await git.commit({
        fs,
        dir: this.repoDir,
        message: commitMessage,
        author: {
          name: authorName,
          email: authorEmail
        }
      });

      // 3. Push to remote branch
      const pushResult = await git.push({
        fs,
        http,
        dir: this.repoDir,
        remote: 'origin',
        ref: this.branch,
        onAuth: this.getAuthCallback()
      });

      if (!pushResult.ok) {
        // Check if remote had changes (conflict)
        // Backup local modifications and pull
        const backups = await this.guardrailBackupLocalModifications();
        await this.syncRepository();
        return {
          success: false,
          message: `Remote had newer updates. Local changes backed up to preserve edits.`,
          conflictsResolved: backups
        };
      }

      return {
        success: true,
        message: `Successfully pushed commit ${sha.slice(0, 7)} to main.`
      };
    } catch (err: any) {
      console.error('Commit & push failed:', err);
      return {
        success: false,
        message: err.message || 'Failed to save and share changes.'
      };
    }
  }

  /**
   * Check if uncommitted changes exist
   */
  public async getStatus(): Promise<{ dirty: boolean; files: string[] }> {
    try {
      const matrix = await git.statusMatrix({
        fs,
        dir: this.repoDir,
        filter: (p) => !p.startsWith('.git')
      });

      const changedFiles: string[] = [];
      for (const [filepath, head, workdir] of matrix) {
        if (workdir !== head) {
          changedFiles.push(filepath);
        }
      }

      return {
        dirty: changedFiles.length > 0,
        files: changedFiles
      };
    } catch {
      return { dirty: false, files: [] };
    }
  }
}
