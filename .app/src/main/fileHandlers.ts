import fs from 'fs';
import path from 'path';
import child_process from 'child_process';
import { dialog, shell, BrowserWindow } from 'electron';

export interface FileNode {
  name: string;
  relativePath: string;
  absolutePath: string;
  isDirectory: boolean;
  size?: number;
  extension?: string;
  children?: FileNode[];
}

export class FileHandlers {
  /**
   * Recursively reads the repository directory tree
   */
  public static listFiles(repoDir: string): FileNode[] {
    if (!fs.existsSync(repoDir)) return [];

    const walk = (currentDir: string, relativeCurrent: string): FileNode[] => {
      const items = fs.readdirSync(currentDir, { withFileTypes: true });
      const nodes: FileNode[] = [];

      for (const item of items) {
        if (item.name === '.git' || item.name === 'node_modules' || item.name.startsWith('.')) {
          continue;
        }

        const absPath = path.join(currentDir, item.name);
        const relPath = relativeCurrent ? path.join(relativeCurrent, item.name).replace(/\\/g, '/') : item.name;

        if (item.isDirectory()) {
          nodes.push({
            name: item.name,
            relativePath: relPath,
            absolutePath: absPath,
            isDirectory: true,
            children: walk(absPath, relPath)
          });
        } else {
          const stat = fs.statSync(absPath);
          const ext = path.extname(item.name).toLowerCase().replace('.', '');
          nodes.push({
            name: item.name,
            relativePath: relPath,
            absolutePath: absPath,
            isDirectory: false,
            size: stat.size,
            extension: ext
          });
        }
      }

      // Sort: folders first, then files alphabetically
      return nodes.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });
    };

    return walk(repoDir, '');
  }

  /**
   * Reads a file: as text or as base64 data URI
   */
  public static readFile(filePath: string): { content: string; isBinary: boolean; mimeType: string } {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const ext = path.extname(filePath).toLowerCase();
    const binaryExts = ['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.pptx', '.ico'];

    if (binaryExts.includes(ext)) {
      let mimeType = 'application/octet-stream';
      if (ext === '.pdf') mimeType = 'application/pdf';
      else if (ext === '.png') mimeType = 'image/png';
      else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
      else if (ext === '.webp') mimeType = 'image/webp';
      else if (ext === '.pptx') mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

      // PPTX requires raw bytes for JSZip parsing; PDFs and images stream directly via protocol
      const needsBase64 = ext === '.pptx';
      const content = needsBase64 ? fs.readFileSync(filePath).toString('base64') : '';

      return {
        content,
        isBinary: true,
        mimeType
      };
    } else {
      // Special check: if file is "Proposal" with no extension, check if it's PDF
      if (path.basename(filePath).toLowerCase() === 'proposal') {
        const head = Buffer.alloc(10);
        const fd = fs.openSync(filePath, 'r');
        fs.readSync(fd, head, 0, 10, 0);
        fs.closeSync(fd);
        if (head.toString().startsWith('%PDF')) {
          return {
            content: '',
            isBinary: true,
            mimeType: 'application/pdf'
          };
        }
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      return {
        content,
        isBinary: false,
        mimeType: 'text/plain'
      };
    }
  }

  /**
   * Writes content to a file
   */
  public static writeFile(filePath: string, content: string): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  /**
   * Opens file in local desktop app (LibreOffice, Obsidian, Excel, Preview, etc.)
   */
  public static async openInDesktopApp(filePath: string, customAppPath?: string): Promise<string> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    if (customAppPath && customAppPath.trim()) {
      const execPath = customAppPath.trim();
      try {
        const child = child_process.spawn(execPath, [filePath], {
          detached: true,
          stdio: 'ignore'
        });
        child.unref();
        return '';
      } catch (err: any) {
        console.warn(`Failed to launch custom app "${execPath}":`, err);
        return shell.openPath(filePath);
      }
    }

    const result = await shell.openPath(filePath);
    return result; // Empty string on success, or error message
  }

  /**
   * Import File(s) from computer
   */
  public static async importFiles(
    window: BrowserWindow,
    targetDirectory: string
  ): Promise<{ success: boolean; importedCount: number; message: string }> {
    const result = await dialog.showOpenDialog(window, {
      title: 'Import Research File(s)',
      buttonLabel: 'Import File(s)',
      properties: ['openFile', 'multiSelections']
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, importedCount: 0, message: 'File import cancelled.' };
    }

    if (!fs.existsSync(targetDirectory)) {
      fs.mkdirSync(targetDirectory, { recursive: true });
    }

    let count = 0;
    for (const srcPath of result.filePaths) {
      const fileName = path.basename(srcPath);
      const destPath = path.join(targetDirectory, fileName);
      fs.copyFileSync(srcPath, destPath);
      count++;
    }

    return {
      success: true,
      importedCount: count,
      message: `Successfully imported ${count} file(s) into current directory.`
    };
  }

  /**
   * Import Folder from computer
   */
  public static async importFolder(
    window: BrowserWindow,
    targetDirectory: string
  ): Promise<{ success: boolean; folderName: string; message: string }> {
    const result = await dialog.showOpenDialog(window, {
      title: 'Import Research Folder',
      buttonLabel: 'Import Folder',
      properties: ['openDirectory']
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, folderName: '', message: 'Folder import cancelled.' };
    }

    const srcFolder = result.filePaths[0];
    const folderName = path.basename(srcFolder);
    const destFolder = path.join(targetDirectory, folderName);

    // Recursive copy
    const copyRecursive = (src: string, dest: string) => {
      fs.mkdirSync(dest, { recursive: true });
      const entries = fs.readdirSync(src, { withFileTypes: true });
      for (const entry of entries) {
        const srcEntry = path.join(src, entry.name);
        const destEntry = path.join(dest, entry.name);
        if (entry.isDirectory()) {
          copyRecursive(srcEntry, destEntry);
        } else {
          fs.copyFileSync(srcEntry, destEntry);
        }
      }
    };

    copyRecursive(srcFolder, destFolder);

    return {
      success: true,
      folderName,
      message: `Successfully imported folder "${folderName}".`
    };
  }

  /**
   * Create New Markdown Note with Doppler header
   */
  public static createMarkdownNote(
    targetDirectory: string,
    filename: string,
    title?: string
  ): { success: boolean; filePath: string; relativePath: string } {
    let cleanName = filename.trim();
    if (!cleanName.endsWith('.md')) {
      cleanName += '.md';
    }

    const destPath = path.join(targetDirectory, cleanName);
    if (fs.existsSync(destPath)) {
      throw new Error(`File already exists: ${cleanName}`);
    }

    const heading = title || cleanName.replace('.md', '');
    const dateStr = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const template = `# ${heading}

**Date:** ${dateStr}  
**Station:** AstroSquad Spectroscopic Research Station  
**Research Campaign:** Comparative Spectroscopy of Galaxies M82 & M31  
**Optics:** Takahashi 106mm (f/5) / Meade 305mm SCT (f/10) · Czerny-Turner Spectrograph (350nm–1µm)

---

## 1. Research Question & Hypothesis
- Comparative analysis of M82 (Starburst Cigar Galaxy, receding $z > 0$) vs. M31 (Andromeda Galaxy, blueshifted $z < 0$).
- Investigation of ionized $H\\text{ II}$ & $[N\\text{ II}]$ mass outflows, forbidden lines ($[N\\text{ II}]$, $[S\\text{ II}]$), and radial velocities ($v_r = c \\cdot z$).

## 2. Observational Target & Parameters
- Target Galaxy: [ ] M82 (Cigar Galaxy)  |  [ ] M31 (Andromeda Galaxy)
- Coordinates (RA / Dec):
- Optical Train: [ ] Takahashi 106mm Refractor  |  [ ] Meade 305mm SCT
- Wavelength Range: 300 nm to 600 nm (Near-UV to Visible)
- Exposure Cadence:

## 3. Data Reduction Pipeline Checklist
- [ ] Bias and dark current subtraction
- [ ] Flat-field detector sensitivity correction
- [ ] Argon-Neon lamp reference wavelength calibration
- [ ] 1D spectral extraction from 2D CCD frame
- [ ] Telluric / atmospheric absorption correction
- [ ] Flux normalization

## 4. Spectral Findings & Doppler Analysis
- Rest Wavelength ($\\lambda_0$):
- Observed Wavelength ($\\lambda_{\\text{obs}}$):
- Calculated Doppler Shift ($z = \\Delta\\lambda / \\lambda_0$):
- Heliocentric Radial Velocity ($v_r = c \\cdot z$):
`;

    fs.writeFileSync(destPath, template, 'utf-8');

    return {
      success: true,
      filePath: destPath,
      relativePath: cleanName
    };
  }

  /**
   * Open Discord Server: Tries discord:// uri, fallback to https web link
   */
  public static async openDiscord(customInviteUrl?: string, customAppUri?: string): Promise<void> {
    const discordAppUri = customAppUri?.trim() || 'discord://discord.com/channels/1545465896481333258';
    const discordWebFallback = customInviteUrl?.trim() || 'https://discord.gg/yk7cgnd6E';

    try {
      await shell.openExternal(discordAppUri);
    } catch {
      await shell.openExternal(discordWebFallback);
    }
  }
}
