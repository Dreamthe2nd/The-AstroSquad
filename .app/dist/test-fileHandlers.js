var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main/fileHandlers.ts
var fileHandlers_exports = {};
__export(fileHandlers_exports, {
  FileHandlers: () => FileHandlers
});
module.exports = __toCommonJS(fileHandlers_exports);
var import_fs = __toESM(require("fs"));
var import_path2 = __toESM(require("path"));
var import_os = __toESM(require("os"));
var import_child_process = __toESM(require("child_process"));
var import_electron2 = require("electron");

// src/main/googleWindowManager.ts
var import_path = __toESM(require("path"));
var import_electron = require("electron");
var GoogleWindowManager = class {
  static windows = /* @__PURE__ */ new Map();
  /**
   * Opens or focuses a native AstroSquad desktop window for Google Docs, Sheets, Slides, or Drive
   * Fully compatible with macOS, Windows, and Linux with zero external browser dependencies.
   */
  static openSession(appType, targetUrl, targetFilePath) {
    const existing = this.windows.get(appType);
    const fileName = targetFilePath ? import_path.default.basename(targetFilePath) : "";
    if (existing && !existing.isDestroyed()) {
      existing.show();
      existing.focus();
      if (targetUrl) {
        existing.loadURL(targetUrl);
      }
      if (fileName) {
        existing.setTitle(`Google ${appType.charAt(0).toUpperCase() + appType.slice(1)} \xB7 ${fileName} (AstroSquad)`);
      }
      return existing;
    }
    const titles = {
      docs: fileName ? `Google Docs \xB7 ${fileName}` : "Google Docs \xB7 AstroSquad Station Session",
      sheets: fileName ? `Google Sheets \xB7 ${fileName}` : "Google Sheets \xB7 AstroSquad Station Session",
      slides: fileName ? `Google Slides \xB7 ${fileName}` : "Google Slides \xB7 AstroSquad Station Session",
      drive: "Google Drive \xB7 The-AstroSquad Cloud Hub"
    };
    const isMac = process.platform === "darwin";
    const win = new import_electron.BrowserWindow({
      width: 1280,
      height: 840,
      minWidth: 800,
      minHeight: 600,
      title: titles[appType] || "Google Workspace Session",
      autoHideMenuBar: true,
      backgroundColor: "#0f172a",
      webPreferences: {
        partition: "persist:astrosquad_google_session",
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true
      }
    });
    const desktopUA = isMac ? "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15" : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
    win.webContents.setUserAgent(desktopUA);
    win.loadURL(targetUrl);
    win.on("closed", () => {
      this.windows.delete(appType);
    });
    this.windows.set(appType, win);
    return win;
  }
  static closeAll() {
    this.windows.forEach((win) => {
      if (!win.isDestroyed()) {
        win.close();
      }
    });
    this.windows.clear();
  }
};

// src/main/fileHandlers.ts
var FileHandlers = class {
  /**
   * Recursively reads the repository directory tree
   */
  static listFiles(repoDir) {
    if (!import_fs.default.existsSync(repoDir)) return [];
    const walk = (currentDir, relativeCurrent) => {
      const items = import_fs.default.readdirSync(currentDir, { withFileTypes: true });
      const nodes = [];
      for (const item of items) {
        if (item.name === ".git" || item.name === "node_modules" || item.name.startsWith(".") && item.name !== ".app") {
          continue;
        }
        const absPath = import_path2.default.join(currentDir, item.name);
        const relPath = relativeCurrent ? import_path2.default.join(relativeCurrent, item.name).replace(/\\/g, "/") : item.name;
        if (item.isDirectory()) {
          nodes.push({
            name: item.name,
            relativePath: relPath,
            absolutePath: absPath,
            isDirectory: true,
            children: walk(absPath, relPath)
          });
        } else {
          const stat = import_fs.default.statSync(absPath);
          const ext = import_path2.default.extname(item.name).toLowerCase().replace(".", "");
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
      return nodes.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });
    };
    return walk(repoDir, "");
  }
  /**
   * Reads a file: as text or as base64 data URI
   */
  static readFile(filePath) {
    if (!import_fs.default.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    const stats = import_fs.default.statSync(filePath);
    if (stats.isDirectory()) {
      return {
        content: "",
        isBinary: false,
        mimeType: "text/plain"
      };
    }
    const ext = import_path2.default.extname(filePath).toLowerCase();
    const binaryExts = [
      ".pdf",
      ".png",
      ".jpg",
      ".jpeg",
      ".webp",
      ".pptx",
      ".ico",
      ".fits",
      ".fit",
      ".zip",
      ".tar",
      ".gz",
      ".7z",
      ".exe",
      ".dll",
      ".so",
      ".dylib",
      ".bin",
      ".dat",
      ".db",
      ".sqlite",
      ".pack",
      ".idx",
      ".parquet",
      ".h5",
      ".hdf5",
      ".pyc"
    ];
    if (binaryExts.includes(ext)) {
      let mimeType = "application/octet-stream";
      if (ext === ".pdf") mimeType = "application/pdf";
      else if (ext === ".png") mimeType = "image/png";
      else if (ext === ".jpg" || ext === ".jpeg") mimeType = "image/jpeg";
      else if (ext === ".webp") mimeType = "image/webp";
      else if (ext === ".pptx") mimeType = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
      else if (ext === ".fits" || ext === ".fit") mimeType = "application/fits";
      const needsBase64 = ext === ".pptx" && stats.size <= 30 * 1024 * 1024;
      const content = needsBase64 ? import_fs.default.readFileSync(filePath).toString("base64") : "";
      return {
        content,
        isBinary: true,
        mimeType
      };
    } else {
      if (import_path2.default.basename(filePath).toLowerCase() === "proposal") {
        const head = Buffer.alloc(10);
        const fd = import_fs.default.openSync(filePath, "r");
        import_fs.default.readSync(fd, head, 0, 10, 0);
        import_fs.default.closeSync(fd);
        if (head.toString().startsWith("%PDF")) {
          return {
            content: "",
            isBinary: true,
            mimeType: "application/pdf"
          };
        }
      }
      const sampleSize = Math.min(stats.size, 4096);
      if (sampleSize > 0) {
        const buf = Buffer.alloc(sampleSize);
        const fd = import_fs.default.openSync(filePath, "r");
        import_fs.default.readSync(fd, buf, 0, sampleSize, 0);
        import_fs.default.closeSync(fd);
        for (let i = 0; i < sampleSize; i++) {
          if (buf[i] === 0) {
            return {
              content: "",
              isBinary: true,
              mimeType: "application/octet-stream"
            };
          }
        }
      }
      if (stats.size > 2 * 1024 * 1024) {
        const previewBuf = Buffer.alloc(512 * 1024);
        const fd = import_fs.default.openSync(filePath, "r");
        const bytesRead = import_fs.default.readSync(fd, previewBuf, 0, 512 * 1024, 0);
        import_fs.default.closeSync(fd);
        const content2 = previewBuf.toString("utf-8", 0, bytesRead) + `

--- [Telemetry Notice: File size is ${(stats.size / (1024 * 1024)).toFixed(1)} MB. Truncated for viewing performance. Open in Desktop App for full file] ---`;
        return {
          content: content2,
          isBinary: false,
          mimeType: "text/plain"
        };
      }
      const content = import_fs.default.readFileSync(filePath, "utf-8");
      return {
        content,
        isBinary: false,
        mimeType: "text/plain"
      };
    }
  }
  /**
   * Writes content to a file
   */
  static writeFile(filePath, content) {
    const dir = import_path2.default.dirname(filePath);
    if (!import_fs.default.existsSync(dir)) {
      import_fs.default.mkdirSync(dir, { recursive: true });
    }
    import_fs.default.writeFileSync(filePath, content, "utf-8");
  }
  /**
   * Cross-platform browser detection across macOS and Windows
   * Detects Vivaldi, Chrome, Edge, Brave, and Safari with app-mode capability tracking.
   */
  static detectBrowsers() {
    const isWin = process.platform === "win32";
    const isMac = process.platform === "darwin";
    const browsers = [];
    if (isWin) {
      const vivaldiCandidates = [
        import_path2.default.join(process.env.LOCALAPPDATA || "", "Vivaldi\\Application\\vivaldi.exe"),
        "C:\\Program Files\\Vivaldi\\Application\\vivaldi.exe",
        "C:\\Program Files (x86)\\Vivaldi\\Application\\vivaldi.exe"
      ];
      for (const p of vivaldiCandidates) {
        if (p && import_fs.default.existsSync(p)) {
          browsers.push({ id: "vivaldi", name: "Vivaldi", path: p, supportsAppMode: false, platform: "win32" });
          break;
        }
      }
      const chromeCandidates = [
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
        import_path2.default.join(process.env.LOCALAPPDATA || "", "Google\\Chrome\\Application\\chrome.exe")
      ];
      for (const p of chromeCandidates) {
        if (p && import_fs.default.existsSync(p)) {
          browsers.push({ id: "chrome", name: "Google Chrome", path: p, supportsAppMode: true, platform: "win32" });
          break;
        }
      }
      const edgeCandidates = [
        "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
        "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
        import_path2.default.join(process.env.LOCALAPPDATA || "", "Microsoft\\Edge\\Application\\msedge.exe")
      ];
      for (const p of edgeCandidates) {
        if (p && import_fs.default.existsSync(p)) {
          browsers.push({ id: "edge", name: "Microsoft Edge", path: p, supportsAppMode: true, platform: "win32" });
          break;
        }
      }
      const braveCandidates = [
        "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
        import_path2.default.join(process.env.LOCALAPPDATA || "", "BraveSoftware\\Brave-Browser\\Application\\brave.exe")
      ];
      for (const p of braveCandidates) {
        if (p && import_fs.default.existsSync(p)) {
          browsers.push({ id: "brave", name: "Brave Browser", path: p, supportsAppMode: true, platform: "win32" });
          break;
        }
      }
    } else if (isMac) {
      if (import_fs.default.existsSync("/Applications/Safari.app")) {
        browsers.push({ id: "safari", name: "Safari", path: "/Applications/Safari.app", supportsAppMode: false, platform: "darwin" });
      }
      if (import_fs.default.existsSync("/Applications/Vivaldi.app")) {
        browsers.push({ id: "vivaldi", name: "Vivaldi", path: "/Applications/Vivaldi.app", supportsAppMode: false, platform: "darwin" });
      }
      if (import_fs.default.existsSync("/Applications/Google Chrome.app")) {
        browsers.push({ id: "chrome", name: "Google Chrome", path: "/Applications/Google Chrome.app", supportsAppMode: true, platform: "darwin" });
      }
      if (import_fs.default.existsSync("/Applications/Brave Browser.app")) {
        browsers.push({ id: "brave", name: "Brave Browser", path: "/Applications/Brave Browser.app", supportsAppMode: true, platform: "darwin" });
      }
      if (import_fs.default.existsSync("/Applications/Microsoft Edge.app")) {
        browsers.push({ id: "edge", name: "Microsoft Edge", path: "/Applications/Microsoft Edge.app", supportsAppMode: true, platform: "darwin" });
      }
    }
    return browsers;
  }
  /**
   * Detects local Obsidian installation across Windows and macOS
   */
  static detectObsidianPath() {
    const isWin = process.platform === "win32";
    const isMac = process.platform === "darwin";
    if (isWin) {
      const localAppData = process.env.LOCALAPPDATA || "";
      const candidates = [
        import_path2.default.join(localAppData, "Programs", "Obsidian", "Obsidian.exe"),
        import_path2.default.join(localAppData, "Obsidian", "Obsidian.exe"),
        "C:\\Program Files\\Obsidian\\Obsidian.exe",
        "C:\\Program Files (x86)\\Obsidian\\Obsidian.exe"
      ];
      for (const p of candidates) {
        if (p && import_fs.default.existsSync(p)) return p;
      }
    } else if (isMac) {
      if (import_fs.default.existsSync("/Applications/Obsidian.app")) {
        return "/Applications/Obsidian.app";
      }
    }
    return null;
  }
  /**
   * Detects local Google Drive for Desktop installation and shared AstroSquad folder
   */
  static detectGoogleDrivePath() {
    const isWin = process.platform === "win32";
    const isMac = process.platform === "darwin";
    if (isWin) {
      const primaryCandidate = "G:\\My Drive";
      if (import_fs.default.existsSync(primaryCandidate)) {
        const squadPath = import_path2.default.join(primaryCandidate, "The-AstroSquad");
        return {
          driveRoot: primaryCandidate,
          squadPath
        };
      }
      for (let c = 68; c <= 90; c++) {
        const letter = String.fromCharCode(c);
        const myDrive = `${letter}:\\My Drive`;
        if (import_fs.default.existsSync(myDrive)) {
          const squadPath = import_path2.default.join(myDrive, "The-AstroSquad");
          return {
            driveRoot: myDrive,
            squadPath
          };
        }
      }
      const userProfile = process.env.USERPROFILE || "";
      const localDrive = import_path2.default.join(userProfile, "Google Drive", "My Drive");
      if (import_fs.default.existsSync(localDrive)) {
        const squadPath = import_path2.default.join(localDrive, "The-AstroSquad");
        return {
          driveRoot: localDrive,
          squadPath
        };
      }
      const localDriveMirror = import_path2.default.join(userProfile, "Google Drive");
      if (import_fs.default.existsSync(localDriveMirror)) {
        const squadPath = import_path2.default.join(localDriveMirror, "The-AstroSquad");
        return {
          driveRoot: localDriveMirror,
          squadPath
        };
      }
    } else if (isMac) {
      const home = process.env.HOME || "";
      const candidates = [
        import_path2.default.join(home, "Google Drive", "My Drive"),
        import_path2.default.join(home, "Google Drive"),
        import_path2.default.join(home, "Library/CloudStorage/GoogleDrive")
      ];
      for (const c of candidates) {
        if (import_fs.default.existsSync(c)) {
          const squadPath = import_path2.default.join(c, "The-AstroSquad");
          return {
            driveRoot: c,
            squadPath
          };
        }
      }
      const cloudStorage = import_path2.default.join(home, "Library/CloudStorage");
      if (import_fs.default.existsSync(cloudStorage)) {
        try {
          const entries = import_fs.default.readdirSync(cloudStorage);
          for (const entry of entries) {
            if (entry.startsWith("GoogleDrive")) {
              const fullEntry = import_path2.default.join(cloudStorage, entry);
              const myDrive = import_path2.default.join(fullEntry, "My Drive");
              const targetRoot = import_fs.default.existsSync(myDrive) ? myDrive : fullEntry;
              return {
                driveRoot: targetRoot,
                squadPath: import_path2.default.join(targetRoot, "The-AstroSquad")
              };
            }
          }
        } catch {
        }
      }
    }
    return { driveRoot: null, squadPath: null };
  }
  /**
   * Safe wrapper for child_process.spawn that catches both sync and async ENOENT errors.
   * Returns a Promise that resolves after a brief delay to check if the child started OK.
   */
  static safeSpawn(command, args) {
    return new Promise((resolve) => {
      try {
        const child = import_child_process.default.spawn(command, args, {
          detached: true,
          stdio: "ignore"
        });
        let errorOccurred = false;
        child.on("error", (err) => {
          errorOccurred = true;
          resolve({ success: false, error: err.message || "Spawn failed" });
        });
        setTimeout(() => {
          if (!errorOccurred) {
            child.unref();
            resolve({ success: true });
          }
        }, 500);
      } catch (err) {
        resolve({ success: false, error: err.message || "Spawn threw synchronously" });
      }
    });
  }
  /**
   * Resolves git repository root from a file path
   */
  static getRepoRoot(filePath) {
    let dir = import_path2.default.dirname(filePath);
    while (dir && dir !== import_path2.default.dirname(dir)) {
      if (import_fs.default.existsSync(import_path2.default.join(dir, ".git"))) {
        return dir;
      }
      dir = import_path2.default.dirname(dir);
    }
    return import_path2.default.dirname(filePath);
  }
  /**
   * Automatically ensures that the repository directory is recognized by Obsidian as a vault
   * by creating .obsidian and registering the path in obsidian.json across Windows, macOS, and Linux.
   */
  static ensureObsidianVault(filePath) {
    try {
      const repoRoot = this.getRepoRoot(filePath);
      const obsDir = import_path2.default.join(repoRoot, ".obsidian");
      if (!import_fs.default.existsSync(obsDir)) {
        import_fs.default.mkdirSync(obsDir, { recursive: true });
      }
      const isWin = process.platform === "win32";
      const isMac = process.platform === "darwin";
      let configPath = "";
      if (isWin && process.env.APPDATA) {
        configPath = import_path2.default.join(process.env.APPDATA, "obsidian", "obsidian.json");
      } else if (isMac && process.env.HOME) {
        configPath = import_path2.default.join(process.env.HOME, "Library", "Application Support", "obsidian", "obsidian.json");
      } else if (process.env.HOME) {
        configPath = import_path2.default.join(process.env.HOME, ".config", "obsidian", "obsidian.json");
      }
      if (configPath && import_fs.default.existsSync(configPath)) {
        try {
          const raw = import_fs.default.readFileSync(configPath, "utf-8");
          const data = JSON.parse(raw);
          if (!data.vaults) data.vaults = {};
          let exists = false;
          for (const id in data.vaults) {
            if (import_path2.default.resolve(data.vaults[id]?.path || "") === import_path2.default.resolve(repoRoot)) {
              exists = true;
              break;
            }
          }
          if (!exists) {
            const vaultId = "astrosquad" + Math.random().toString(16).slice(2, 8);
            data.vaults[vaultId] = {
              path: repoRoot,
              ts: Date.now()
            };
            import_fs.default.writeFileSync(configPath, JSON.stringify(data, null, 2), "utf-8");
          }
        } catch (e) {
          console.warn("Could not auto-register vault in obsidian.json:", e);
        }
      }
    } catch (err) {
      console.warn("ensureObsidianVault failed:", err);
    }
  }
  /**
   * Detects if a file is a PDF (by extension, name, or %PDF magic byte)
   */
  static isPdfFile(filePath) {
    const ext = import_path2.default.extname(filePath).toLowerCase();
    if (ext === ".pdf") return true;
    const base = import_path2.default.basename(filePath).toLowerCase();
    if (base === "proposal") return true;
    try {
      if (import_fs.default.existsSync(filePath)) {
        const fd = import_fs.default.openSync(filePath, "r");
        const buf = Buffer.alloc(5);
        import_fs.default.readSync(fd, buf, 0, 5, 0);
        import_fs.default.closeSync(fd);
        return buf.toString("utf-8").startsWith("%PDF");
      }
    } catch {
    }
    return false;
  }
  /**
   * Resolves public raw GitHub URL for a file in the repository
   */
  static getRawGitHubUrl(filePath) {
    try {
      if (!filePath || !import_fs.default.existsSync(filePath)) return null;
      let currentDir = import_path2.default.dirname(import_path2.default.resolve(filePath));
      let gitRoot = null;
      let remoteUrl = "https://github.com/Dreamthe2nd/The-AstroSquad";
      let branch = "main";
      while (currentDir && currentDir !== import_path2.default.dirname(currentDir)) {
        const gitDir = import_path2.default.join(currentDir, ".git");
        if (import_fs.default.existsSync(gitDir)) {
          gitRoot = currentDir;
          const configPath = import_path2.default.join(gitDir, "config");
          if (import_fs.default.existsSync(configPath)) {
            try {
              const content = import_fs.default.readFileSync(configPath, "utf-8");
              const urlMatch = content.match(/url\s*=\s*(.+)/);
              if (urlMatch) {
                remoteUrl = urlMatch[1].trim();
              }
              const headPath = import_path2.default.join(gitDir, "HEAD");
              if (import_fs.default.existsSync(headPath)) {
                const headContent = import_fs.default.readFileSync(headPath, "utf-8").trim();
                const branchMatch = headContent.match(/ref:\s*refs\/heads\/(.+)/);
                if (branchMatch) {
                  branch = branchMatch[1].trim();
                }
              }
            } catch (e) {
              console.warn("[FileHandlers] Failed to parse git config:", e);
            }
          }
          break;
        }
        currentDir = import_path2.default.dirname(currentDir);
      }
      if (!gitRoot) {
        const idx = filePath.toLowerCase().indexOf("astrosquad");
        if (idx !== -1) {
          gitRoot = filePath.substring(0, idx + "astrosquad".length);
        }
      }
      if (!gitRoot) return null;
      const relPath = import_path2.default.relative(gitRoot, filePath).replace(/\\/g, "/");
      if (!relPath || relPath.startsWith("..")) return null;
      const repoMatch = remoteUrl.match(/github\.com[/:]([^/]+)\/([^/.]+)/);
      if (!repoMatch) return null;
      const owner = repoMatch[1];
      const repo = repoMatch[2].replace(/\.git$/, "");
      const encodedPath = relPath.split("/").map((segment) => encodeURIComponent(segment)).join("/");
      return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${encodedPath}`;
    } catch (err) {
      console.warn("[FileHandlers] getRawGitHubUrl error:", err);
      return null;
    }
  }
  /**
   * Opens file directly in Google Workspace via Google Drive Desktop (G:\My Drive\The-AstroSquad).
   * Automatically copies to local Google Drive for cloud background sync under the Pro account.
   * Eliminates local PowerPoint / Excel / OS hijacking by directly routing presentations to Google Slides,
   * spreadsheets/CSV to Google Sheets, and PDFs/documents to Google Docs with configured Pro account authuser context.
   */
  static async openInGoogleDriveDesktop(filePath) {
    const driveInfo = this.detectGoogleDrivePath();
    const squadFolder = driveInfo.squadPath || (driveInfo.driveRoot ? import_path2.default.join(driveInfo.driveRoot, "The-AstroSquad") : null);
    if (!filePath) {
      if (squadFolder) {
        if (!import_fs.default.existsSync(squadFolder)) {
          try {
            import_fs.default.mkdirSync(squadFolder, { recursive: true });
          } catch (e) {
            console.warn("Could not create Google Drive squad folder:", e);
          }
        }
        if (import_fs.default.existsSync(squadFolder)) {
          await import_electron2.shell.openPath(squadFolder);
          return {
            success: true,
            message: `Opened local Google Drive Desktop folder: ${squadFolder}`
          };
        } else if (driveInfo.driveRoot && import_fs.default.existsSync(driveInfo.driveRoot)) {
          await import_electron2.shell.openPath(driveInfo.driveRoot);
          return {
            success: true,
            message: `Opened Google Drive Desktop folder: ${driveInfo.driveRoot}`
          };
        }
      }
      return {
        success: false,
        message: "Google Drive for Desktop was not detected on this system. Please verify Google Drive is running."
      };
    }
    if (!import_fs.default.existsSync(filePath)) {
      return { success: false, message: `File not found: ${filePath}` };
    }
    const fileName = import_path2.default.basename(filePath);
    const ext = import_path2.default.extname(filePath).toLowerCase();
    const isGoogleVirtual = ext === ".gslides" || ext === ".gsheet" || ext === ".gdoc";
    let destPath = filePath;
    if (squadFolder) {
      if (!import_fs.default.existsSync(squadFolder)) {
        try {
          import_fs.default.mkdirSync(squadFolder, { recursive: true });
        } catch (e) {
          console.warn("Could not create Google Drive folder:", e);
        }
      }
      if (!isGoogleVirtual) {
        destPath = import_path2.default.join(squadFolder, fileName);
        if (filePath !== destPath) {
          try {
            import_fs.default.copyFileSync(filePath, destPath);
            import_electron2.clipboard.writeText(destPath);
          } catch (e) {
            console.warn("Error syncing file to Google Drive Desktop:", e);
          }
        }
      }
    }
    const baseNameWithoutExt = import_path2.default.parse(fileName).name;
    let virtualPath = null;
    if (isGoogleVirtual) {
      virtualPath = filePath;
    } else if (squadFolder) {
      const candidateDirs = [squadFolder, driveInfo.driveRoot, import_path2.default.dirname(filePath)].filter(Boolean);
      let targetVirtualExts = [];
      if (ext === ".pptx" || ext === ".ppt") {
        targetVirtualExts = [".gslides"];
      } else if (ext === ".csv" || ext === ".xlsx" || ext === ".xls") {
        targetVirtualExts = [".gsheet"];
      } else if (ext === ".pdf" || this.isPdfFile(filePath)) {
        targetVirtualExts = [".gdoc"];
      }
      for (const dir of candidateDirs) {
        for (const vExt of targetVirtualExts) {
          const candidate = import_path2.default.join(dir, `${baseNameWithoutExt}${vExt}`);
          if (import_fs.default.existsSync(candidate)) {
            virtualPath = candidate;
            break;
          }
        }
        if (virtualPath) break;
      }
    }
    if (virtualPath && import_fs.default.existsSync(virtualPath)) {
      const openResult = await import_electron2.shell.openPath(virtualPath);
      if (!openResult) {
        return {
          success: true,
          message: `Opened "${import_path2.default.basename(virtualPath)}" via Google Drive Desktop.`
        };
      }
      console.warn(`[GoogleDriveDesktop] shell.openPath on virtual file returned: "${openResult}". Falling through to Google Workspace.`);
      try {
        const vContent = import_fs.default.readFileSync(virtualPath, "utf-8");
        const vData = JSON.parse(vContent);
        const docId = vData?.doc_id || vData?.id;
        const appType2 = ext === ".pptx" || ext === ".ppt" || ext === ".gslides" ? "slides" : ext === ".csv" || ext === ".xlsx" || ext === ".xls" || ext === ".gsheet" ? "sheets" : "docs";
        const fallbackUrl = docId ? appType2 === "slides" ? `https://docs.google.com/presentation/d/${docId}/edit` : appType2 === "sheets" ? `https://docs.google.com/spreadsheets/d/${docId}/edit` : `https://docs.google.com/document/d/${docId}/edit` : void 0;
        const targetVirtualUrl = vData?.url || fallbackUrl;
        if (targetVirtualUrl) {
          return this.openGoogleSuiteSession(appType2, "browser_tab", filePath, void 0, targetVirtualUrl);
        }
      } catch {
      }
    }
    const appType = ext === ".pptx" || ext === ".ppt" || ext === ".gslides" ? "slides" : ext === ".csv" || ext === ".xlsx" || ext === ".xls" || ext === ".gsheet" ? "sheets" : ext === ".pdf" || this.isPdfFile(filePath) || ext === ".gdoc" ? "docs" : "drive";
    return this.openGoogleSuiteSession(appType, "browser_tab", filePath);
  }
  /**
   * Opens local standalone session of Google Productivity Suite (Docs, Sheets, Slides, Drive)
   * Universal across macOS, Windows, and Linux.
   */
  static async openGoogleSuiteSession(appType, windowMode = "station_window", targetFilePath, preferredEngine, explicitUrl) {
    if (appType === "drive" && !targetFilePath && !explicitUrl) {
      return this.openInGoogleDriveDesktop();
    }
    const driveFolderUrl = "https://drive.google.com/drive/folders/1YE6FbXZVLZLZKNvxqfUqIsScqk_4HIzC?usp=sharing";
    const driveInfo = this.detectGoogleDrivePath();
    let fileHint = "";
    let targetFileName = "";
    if (targetFilePath && import_fs.default.existsSync(targetFilePath)) {
      targetFileName = import_path2.default.basename(targetFilePath);
      if (driveInfo.driveRoot) {
        try {
          const squadFolder = driveInfo.squadPath || import_path2.default.join(driveInfo.driveRoot, "The-AstroSquad");
          if (!import_fs.default.existsSync(squadFolder)) {
            import_fs.default.mkdirSync(squadFolder, { recursive: true });
          }
          const destPath = import_path2.default.join(squadFolder, targetFileName);
          if (targetFilePath !== destPath) {
            let shouldCopy = !import_fs.default.existsSync(destPath);
            if (!shouldCopy) {
              try {
                const srcStat = import_fs.default.statSync(targetFilePath);
                const destStat = import_fs.default.statSync(destPath);
                shouldCopy = srcStat.size !== destStat.size || Math.abs(srcStat.mtimeMs - destStat.mtimeMs) > 1e3;
              } catch {
                shouldCopy = true;
              }
            }
            if (shouldCopy) {
              import_fs.default.copyFileSync(targetFilePath, destPath);
            }
          }
          import_electron2.clipboard.writeText(destPath);
          fileHint = ` (Synced to Google Drive: ${destPath})`;
        } catch (e) {
          console.warn("Could not sync to Google Drive folder:", e);
        }
      }
    }
    const appUrls = {
      slides: "https://docs.google.com/presentation/u/0/",
      sheets: "https://docs.google.com/spreadsheets/u/0/",
      docs: "https://docs.google.com/document/u/0/",
      drive: driveFolderUrl
    };
    let targetUrl = explicitUrl || appUrls[appType] || driveFolderUrl;
    try {
      let userData = "";
      try {
        if (import_electron2.app && import_electron2.app.getPath) userData = import_electron2.app.getPath("userData");
      } catch {
      }
      if (!userData) {
        userData = (process.env.APPDATA || process.env.USERPROFILE || "") + import_path2.default.sep + "astrosquad-station";
      }
      const settingsFile = import_path2.default.join(userData, "station_settings.json");
      let account = "0";
      if (import_fs.default.existsSync(settingsFile)) {
        const parsed = JSON.parse(import_fs.default.readFileSync(settingsFile, "utf-8"));
        account = parsed.googleSuite?.accountIndex || parsed.googleSuite?.userEmail || "0";
        if (!explicitUrl) {
          if (appType === "slides" && parsed.googleSuite?.slidesUrl) targetUrl = parsed.googleSuite.slidesUrl;
          if (appType === "sheets" && parsed.googleSuite?.sheetsUrl) targetUrl = parsed.googleSuite.sheetsUrl;
          if (appType === "docs" && parsed.googleSuite?.docsUrl) targetUrl = parsed.googleSuite.docsUrl;
          if (appType === "drive" && parsed.googleSuite?.driveUrl) targetUrl = parsed.googleSuite.driveUrl;
        }
      }
      if (account && targetUrl.includes("google.com")) {
        if (targetUrl.includes("/u/0/") || /\/u\/[^/?#]+\//.test(targetUrl)) {
          targetUrl = targetUrl.replace(/\/u\/[^/?#]+\//, `/u/${encodeURIComponent(account)}/`);
        }
        if (!targetUrl.includes("authuser=")) {
          targetUrl += (targetUrl.includes("?") ? "&" : "?") + `authuser=${encodeURIComponent(account)}`;
        } else {
          targetUrl = targetUrl.replace(/([?&])authuser=[^&#]*/, `$1authuser=${encodeURIComponent(account)}`);
        }
      }
    } catch (e) {
      console.warn("Could not resolve Google account for authuser:", e);
    }
    const isMac = process.platform === "darwin";
    const isWin = process.platform === "win32";
    const appDisplayName = `Google ${appType.charAt(0).toUpperCase() + appType.slice(1)}`;
    const fileSuffix = targetFileName ? ` for "${targetFileName}"` : "";
    if (windowMode === "station_window") {
      GoogleWindowManager.openSession(appType, targetUrl, targetFilePath);
      return {
        success: true,
        message: `Launched dedicated AstroSquad Station Window for ${appDisplayName}${fileSuffix}.${fileHint}`
      };
    }
    if (windowMode === "app_window") {
      const browsers = this.detectBrowsers();
      const appBrowser = preferredEngine && preferredEngine !== "auto" ? browsers.find((b) => b.id === preferredEngine && b.supportsAppMode && b.path) : browsers.find((b) => b.supportsAppMode && b.path);
      if (appBrowser && appBrowser.path) {
        try {
          if (isWin) {
            const child = import_child_process.default.spawn(appBrowser.path, [`--app=${targetUrl}`], {
              detached: true,
              stdio: "ignore"
            });
            child.unref();
            return {
              success: true,
              message: `Launched ${appDisplayName}${fileSuffix} in ${appBrowser.name}.${fileHint}`
            };
          } else if (isMac) {
            const child = import_child_process.default.spawn("open", ["-na", appBrowser.path, "--args", `--app=${targetUrl}`], {
              detached: true,
              stdio: "ignore"
            });
            child.unref();
            return {
              success: true,
              message: `Launched ${appDisplayName}${fileSuffix} in ${appBrowser.name} (macOS).${fileHint}`
            };
          }
        } catch (err) {
          console.warn(`Failed to spawn app window via ${appBrowser.name}:`, err);
        }
      }
      await import_electron2.shell.openExternal(targetUrl);
      return {
        success: true,
        message: isMac ? `Opened ${appDisplayName}${fileSuffix} in Safari / Default Browser.${fileHint}` : `Opened ${appDisplayName}${fileSuffix} in default browser.${fileHint}`
      };
    }
    await import_electron2.shell.openExternal(targetUrl);
    return {
      success: true,
      message: `Opened ${appDisplayName}${fileSuffix} in default browser.${fileHint}`
    };
  }
  /**
   * Opens file in local desktop app (LibreOffice, Obsidian, Excel, Google Suite, etc.)
   * Returns structured result so the renderer can show appropriate success/error feedback.
   */
  static async openInDesktopApp(filePath, customAppPath, preferredMode = "station_window") {
    if (!import_fs.default.existsSync(filePath)) {
      return { success: false, message: `File not found: ${filePath}` };
    }
    const ext = import_path2.default.extname(filePath).toLowerCase();
    const fileName = import_path2.default.basename(filePath);
    const isPdf = this.isPdfFile(filePath);
    const isGoogleVirtual = ext === ".gslides" || ext === ".gsheet" || ext === ".gdoc";
    if (isGoogleVirtual) {
      const openResult = await import_electron2.shell.openPath(filePath);
      if (!openResult) {
        return {
          success: true,
          message: `Opened "${fileName}" via Google Drive Desktop.`
        };
      }
      console.warn(`[GoogleDriveDesktop] shell.openPath on virtual file returned: "${openResult}". Falling through to Google Workspace.`);
      const appType = ext === ".gslides" ? "slides" : ext === ".gsheet" ? "sheets" : "docs";
      try {
        const vContent = import_fs.default.readFileSync(filePath, "utf-8");
        const vData = JSON.parse(vContent);
        const docId = vData?.doc_id || vData?.id;
        const fallbackUrl = docId ? appType === "slides" ? `https://docs.google.com/presentation/d/${docId}/edit` : appType === "sheets" ? `https://docs.google.com/spreadsheets/d/${docId}/edit` : `https://docs.google.com/document/d/${docId}/edit` : void 0;
        const targetVirtualUrl = vData?.url || fallbackUrl;
        if (targetVirtualUrl) {
          return this.openGoogleSuiteSession(appType, preferredMode, filePath, void 0, targetVirtualUrl);
        }
      } catch {
      }
      return this.openGoogleSuiteSession(appType, preferredMode, filePath);
    }
    if (customAppPath && customAppPath.trim()) {
      const trimmed = customAppPath.trim();
      if (trimmed === "system_default") {
        let targetOpenPath = filePath;
        if (!ext && this.isPdfFile(filePath)) {
          try {
            const tempDir = import_path2.default.join(import_os.default.tmpdir(), "AstroSquad");
            if (!import_fs.default.existsSync(tempDir)) import_fs.default.mkdirSync(tempDir, { recursive: true });
            const tempPdf = import_path2.default.join(tempDir, `${fileName}.pdf`);
            import_fs.default.copyFileSync(filePath, tempPdf);
            targetOpenPath = tempPdf;
          } catch (e) {
            console.warn("Could not create temporary .pdf file for extensionless PDF:", e);
          }
        }
        const openResult = await import_electron2.shell.openPath(targetOpenPath);
        if (!openResult) {
          return {
            success: true,
            message: `Opened "${fileName}" in system default app.`
          };
        }
        import_electron2.shell.showItemInFolder(filePath);
        return {
          success: true,
          message: `Revealed "${fileName}" in file explorer.`
        };
      }
      if (trimmed === "google_slides") {
        return this.openGoogleSuiteSession("slides", preferredMode, filePath);
      }
      if (trimmed === "google_sheets") {
        return this.openGoogleSuiteSession("sheets", preferredMode, filePath);
      }
      if (trimmed === "google_docs") {
        return this.openGoogleSuiteSession("docs", preferredMode, filePath);
      }
      if (trimmed === "google_drive" || trimmed === "google_drive_desktop") {
        return this.openInGoogleDriveDesktop(filePath);
      }
      if (trimmed === "obsidian") {
        this.ensureObsidianVault(filePath);
        const obsPath = this.detectObsidianPath();
        if (obsPath) {
          try {
            const obsUri = `obsidian://open?path=${encodeURIComponent(filePath)}`;
            await import_electron2.shell.openExternal(obsUri);
            return { success: true, message: `Launched "${fileName}" in Obsidian.` };
          } catch (err) {
            console.warn("Failed to launch Obsidian via URI:", err);
          }
          const spawnResult = await this.safeSpawn(obsPath, [filePath]);
          if (spawnResult.success) {
            return { success: true, message: `Launched "${fileName}" in Obsidian.` };
          }
        }
        try {
          const obsUri = `obsidian://open?path=${encodeURIComponent(filePath)}`;
          await import_electron2.shell.openExternal(obsUri);
          return { success: true, message: `Launched "${fileName}" in Obsidian.` };
        } catch {
          console.warn("Obsidian not available, falling through to smart fallback");
        }
      }
      if (process.platform === "darwin" && trimmed.endsWith(".app")) {
        const result2 = await this.safeSpawn("open", ["-a", trimmed, filePath]);
        if (result2.success) {
          return { success: true, message: `Launched "${fileName}" in ${import_path2.default.basename(trimmed, ".app")}.` };
        }
        console.warn(`Failed to open via macOS app ${trimmed}: ${result2.error}`);
      }
      if (trimmed !== "obsidian") {
        if (import_fs.default.existsSync(trimmed)) {
          const result2 = await this.safeSpawn(trimmed, [filePath]);
          if (result2.success) {
            return { success: true, message: `Launched "${fileName}" in ${import_path2.default.basename(trimmed)}.` };
          }
          console.warn(`Failed to launch custom app "${trimmed}": ${result2.error}`);
        } else {
          console.warn(`Custom app not found at "${trimmed}", falling through to smart fallback`);
        }
      }
    }
    if (ext === ".md") {
      this.ensureObsidianVault(filePath);
      const obsPath = this.detectObsidianPath();
      if (obsPath) {
        try {
          const obsUri = `obsidian://open?path=${encodeURIComponent(filePath)}`;
          await import_electron2.shell.openExternal(obsUri);
          return { success: true, message: `Launched "${fileName}" in Obsidian.` };
        } catch (err) {
          console.warn("Obsidian open failed, falling back to shell.openPath:", err);
        }
      }
      const result2 = await import_electron2.shell.openPath(filePath);
      if (!result2) {
        return { success: true, message: `Opened "${fileName}" in default text editor.` };
      }
      import_electron2.shell.showItemInFolder(filePath);
      return { success: true, message: `Revealed "${fileName}" in file explorer.` };
    }
    if (isPdf) {
      const driveInfo = this.detectGoogleDrivePath();
      if (driveInfo.driveRoot) {
        return this.openInGoogleDriveDesktop(filePath);
      }
      let targetPath = filePath;
      if (!ext) {
        try {
          const tempDir = import_path2.default.join(import_os.default.tmpdir(), "AstroSquad");
          if (!import_fs.default.existsSync(tempDir)) import_fs.default.mkdirSync(tempDir, { recursive: true });
          const tempPdf = import_path2.default.join(tempDir, `${fileName}.pdf`);
          import_fs.default.copyFileSync(filePath, tempPdf);
          targetPath = tempPdf;
        } catch (e) {
          console.warn("Could not create temporary .pdf file for extensionless PDF:", e);
        }
      }
      const result2 = await import_electron2.shell.openPath(targetPath);
      if (!result2) {
        return { success: true, message: `Opened "${fileName}" in system PDF reader.` };
      }
      console.log(`shell.openPath failed for PDF (${result2}), routing to Google Drive session.`);
      return this.openGoogleSuiteSession("docs", preferredMode, filePath);
    }
    if (ext === ".pptx" || ext === ".ppt") {
      const driveInfo = this.detectGoogleDrivePath();
      if (driveInfo.driveRoot) {
        return this.openInGoogleDriveDesktop(filePath);
      }
      const result2 = await import_electron2.shell.openPath(filePath);
      if (!result2) {
        return { success: true, message: `Opened "${fileName}" in presentation editor.` };
      }
      console.log(`No native app associated for ${ext} (${result2}). Routing to Google Drive / Slides.`);
      return this.openGoogleSuiteSession("slides", preferredMode, filePath);
    }
    if (ext === ".csv" || ext === ".xlsx" || ext === ".xls") {
      const driveInfo = this.detectGoogleDrivePath();
      if (driveInfo.driveRoot) {
        return this.openInGoogleDriveDesktop(filePath);
      }
      const result2 = await import_electron2.shell.openPath(filePath);
      if (!result2) {
        return { success: true, message: `Opened "${fileName}" in spreadsheet application.` };
      }
      console.log(`No native app associated for ${ext} (${result2}). Routing to Google Drive / Sheets.`);
      return this.openGoogleSuiteSession("sheets", preferredMode, filePath);
    }
    if ([".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".svg"].includes(ext)) {
      const result2 = await import_electron2.shell.openPath(filePath);
      if (!result2) {
        return { success: true, message: `Opened "${fileName}" in system image viewer.` };
      }
      import_electron2.shell.showItemInFolder(filePath);
      return { success: true, message: `Revealed "${fileName}" in file explorer.` };
    }
    const result = await import_electron2.shell.openPath(filePath);
    if (!result) {
      return { success: true, message: `Opened "${fileName}" in system default app.` };
    }
    import_electron2.shell.showItemInFolder(filePath);
    return {
      success: true,
      message: `No application found for "${fileName}". Revealed in file explorer instead.`
    };
  }
  /**
   * Import File(s) from computer
   */
  static async importFiles(window, targetDirectory) {
    const result = await import_electron2.dialog.showOpenDialog(window, {
      title: "Import Research File(s)",
      buttonLabel: "Import File(s)",
      properties: ["openFile", "multiSelections"]
    });
    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, importedCount: 0, message: "File import cancelled." };
    }
    if (!import_fs.default.existsSync(targetDirectory)) {
      import_fs.default.mkdirSync(targetDirectory, { recursive: true });
    }
    let count = 0;
    for (const srcPath of result.filePaths) {
      const fileName = import_path2.default.basename(srcPath);
      const destPath = import_path2.default.join(targetDirectory, fileName);
      import_fs.default.copyFileSync(srcPath, destPath);
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
  static async importFolder(window, targetDirectory) {
    const result = await import_electron2.dialog.showOpenDialog(window, {
      title: "Import Research Folder",
      buttonLabel: "Import Folder",
      properties: ["openDirectory"]
    });
    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, folderName: "", message: "Folder import cancelled." };
    }
    const srcFolder = result.filePaths[0];
    const folderName = import_path2.default.basename(srcFolder);
    const destFolder = import_path2.default.join(targetDirectory, folderName);
    const copyRecursive = (src, dest) => {
      import_fs.default.mkdirSync(dest, { recursive: true });
      const entries = import_fs.default.readdirSync(src, { withFileTypes: true });
      for (const entry of entries) {
        const srcEntry = import_path2.default.join(src, entry.name);
        const destEntry = import_path2.default.join(dest, entry.name);
        if (entry.isDirectory()) {
          copyRecursive(srcEntry, destEntry);
        } else {
          import_fs.default.copyFileSync(srcEntry, destEntry);
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
  static createMarkdownNote(targetDirectory, filename, title) {
    let cleanName = filename.trim();
    if (!cleanName.endsWith(".md")) {
      cleanName += ".md";
    }
    const destPath = import_path2.default.join(targetDirectory, cleanName);
    if (import_fs.default.existsSync(destPath)) {
      throw new Error(`File already exists: ${cleanName}`);
    }
    const heading = title || cleanName.replace(".md", "");
    const dateStr = (/* @__PURE__ */ new Date()).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });
    const template = `# ${heading}

**Date:** ${dateStr}  
**Station:** AstroSquad Spectroscopic Research Station  
**Research Campaign:** Comparative Spectroscopy of Galaxies M82 & M31  
**Optics:** Takahashi 106mm (f/5) / Meade 305mm SCT (f/10) \xB7 Czerny-Turner Spectrograph (350nm\u20131\xB5m)

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
    import_fs.default.writeFileSync(destPath, template, "utf-8");
    return {
      success: true,
      filePath: destPath,
      relativePath: cleanName
    };
  }
  /**
   * Open Discord Server: Launches via Discord protocol handler with seamless browser invite fallback
   */
  static async openDiscord(customInviteUrl, customAppUri) {
    const inviteUrl = customInviteUrl?.trim() || "https://discord.gg/yk7cgnd6E";
    const appUri = customAppUri?.trim() || "discord://discord.com/channels/1545465896481333258";
    try {
      if (appUri) {
        await import_electron2.shell.openExternal(appUri);
      } else {
        await import_electron2.shell.openExternal(inviteUrl);
      }
    } catch (err) {
      console.warn("[FileHandlers] Discord protocol URI failed, falling back to web invite:", err);
      try {
        await import_electron2.shell.openExternal(inviteUrl);
      } catch (e) {
        console.error("[FileHandlers] Failed to open Discord web invite:", e);
      }
    }
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  FileHandlers
});
