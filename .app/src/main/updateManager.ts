import https from 'https';
import fs from 'fs';
import path from 'path';
import os from 'os';
import child_process from 'child_process';
import { shell } from 'electron';

export interface ReleaseAsset {
  name: string;
  browser_download_url: string;
  size: number;
  content_type: string;
}

export interface UpdateInfo {
  updateAvailable: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseName: string;
  releaseNotes: string;
  publishedAt: string;
  releaseUrl: string;
  installerAsset?: {
    name: string;
    downloadUrl: string;
    size: number;
  };
}

export class UpdateManager {
  private static readonly REPO_OWNER = 'Dreamthe2nd';
  private static readonly REPO_NAME = 'The-AstroSquad';

  /**
   * Helper to perform HTTPS GET with redirect support
   */
  private static fetchJson(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const options = {
        headers: {
          'User-Agent': 'AstroSquad-Station-App',
          Accept: 'application/vnd.github.v3+json'
        }
      };

      const get = (targetUrl: string) => {
        https.get(targetUrl, options, (res) => {
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            get(res.headers.location);
            return;
          }

          if (res.statusCode !== 200) {
            reject(new Error(`GitHub Releases API responded with HTTP ${res.statusCode}`));
            return;
          }

          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch (err) {
              reject(err);
            }
          });
        }).on('error', reject);
      };

      get(url);
    });
  }

  /**
   * Compare two semver strings: returns 1 if v1 > v2, -1 if v1 < v2, 0 if equal
   */
  public static compareVersions(v1: string, v2: string): number {
    const clean1 = v1.replace(/^v/, '').trim().split('.').map((x) => parseInt(x, 10) || 0);
    const clean2 = v2.replace(/^v/, '').trim().split('.').map((x) => parseInt(x, 10) || 0);

    const len = Math.max(clean1.length, clean2.length);
    for (let i = 0; i < len; i++) {
      const num1 = clean1[i] || 0;
      const num2 = clean2[i] || 0;
      if (num1 > num2) return 1;
      if (num1 < num2) return -1;
    }
    return 0;
  }

  /**
   * Check for newer releases on GitHub
   */
  public static async checkForUpdates(currentVersion: string): Promise<UpdateInfo> {
    const apiUrl = `https://api.github.com/repos/${this.REPO_OWNER}/${this.REPO_NAME}/releases/latest`;

    try {
      const release = await this.fetchJson(apiUrl);
      const latestTag = (release.tag_name || '1.0.0').replace(/^v/, '');
      const current = currentVersion.replace(/^v/, '');

      const isNewer = this.compareVersions(latestTag, current) > 0;

      // Locate appropriate platform installer from assets
      const platform = process.platform;
      let matchingAsset: ReleaseAsset | undefined;

      if (release.assets && Array.isArray(release.assets)) {
        if (platform === 'win32') {
          matchingAsset = release.assets.find((a: ReleaseAsset) => a.name.endsWith('.exe'));
        } else if (platform === 'darwin') {
          matchingAsset = release.assets.find((a: ReleaseAsset) => a.name.endsWith('.dmg')) ||
            release.assets.find((a: ReleaseAsset) => a.name.endsWith('.zip'));
        }
      }

      return {
        updateAvailable: isNewer,
        currentVersion: current,
        latestVersion: latestTag,
        releaseName: release.name || `AstroSquad Station v${latestTag}`,
        releaseNotes: release.body || 'New station telemetry & research performance updates.',
        publishedAt: release.published_at || new Date().toISOString(),
        releaseUrl: release.html_url || `https://github.com/${this.REPO_OWNER}/${this.REPO_NAME}/releases`,
        installerAsset: matchingAsset
          ? {
              name: matchingAsset.name,
              downloadUrl: matchingAsset.browser_download_url,
              size: matchingAsset.size
            }
          : undefined
      };
    } catch (err: any) {
      console.warn('[UpdateManager] Update check failed or no releases yet:', err.message);
      return {
        updateAvailable: false,
        currentVersion: currentVersion.replace(/^v/, ''),
        latestVersion: currentVersion.replace(/^v/, ''),
        releaseName: 'Current Release',
        releaseNotes: 'Station is up to date.',
        publishedAt: new Date().toISOString(),
        releaseUrl: `https://github.com/${this.REPO_OWNER}/${this.REPO_NAME}/releases`
      };
    }
  }

  /**
   * Download and run installer or open release page in browser
   */
  public static async launchUpdate(releaseUrl?: string, downloadUrl?: string): Promise<{ success: boolean; message: string }> {
    if (downloadUrl && downloadUrl.startsWith('http')) {
      // If direct Windows exe download
      if (process.platform === 'win32' && downloadUrl.endsWith('.exe')) {
        try {
          const tempExe = path.join(os.tmpdir(), path.basename(downloadUrl));
          const fileStream = fs.createWriteStream(tempExe);

          await new Promise<void>((resolve, reject) => {
            const get = (targetUrl: string) => {
              https.get(targetUrl, (res) => {
                if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                  get(res.headers.location);
                  return;
                }
                if (res.statusCode !== 200) {
                  reject(new Error(`Failed to download update installer: ${res.statusCode}`));
                  return;
                }
                res.pipe(fileStream);
                fileStream.on('finish', () => {
                  fileStream.close();
                  resolve();
                });
              }).on('error', reject);
            };
            get(downloadUrl);
          });

          child_process.spawn(tempExe, [], { detached: true, stdio: 'ignore' }).unref();
          return { success: true, message: `Downloaded and launched update installer: ${path.basename(tempExe)}` };
        } catch (dlErr) {
          console.warn('[UpdateManager] Direct installer download failed, opening release URL:', dlErr);
        }
      }
    }

    const targetUrl = releaseUrl || `https://github.com/${this.REPO_OWNER}/${this.REPO_NAME}/releases`;
    await shell.openExternal(targetUrl);
    return { success: true, message: `Opened ${targetUrl} in default browser.` };
  }
}
