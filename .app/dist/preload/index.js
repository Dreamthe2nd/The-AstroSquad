var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/preload/index.ts
var index_exports = {};
module.exports = __toCommonJS(index_exports);
var import_electron = require("electron");
var api = {
  auth: {
    requestDeviceCode: (clientId) => import_electron.ipcRenderer.invoke("auth:requestDeviceCode", clientId),
    pollDeviceAuth: (deviceCode, interval, clientId) => import_electron.ipcRenderer.invoke("auth:pollDeviceAuth", { deviceCode, interval, clientId }),
    getAuthStatus: () => import_electron.ipcRenderer.invoke("auth:getAuthStatus"),
    setManualToken: (token) => import_electron.ipcRenderer.invoke("auth:setManualToken", token),
    logout: () => import_electron.ipcRenderer.invoke("auth:logout")
  },
  git: {
    syncRepository: () => import_electron.ipcRenderer.invoke("git:syncRepository"),
    commitAndPush: (notes) => import_electron.ipcRenderer.invoke("git:commitAndPush", notes),
    getStatus: () => import_electron.ipcRenderer.invoke("git:getStatus"),
    getRepoDir: () => import_electron.ipcRenderer.invoke("git:getRepoDir"),
    setRepoDir: (newPath) => import_electron.ipcRenderer.invoke("git:setRepoDir", newPath)
  },
  fs: {
    listFiles: () => import_electron.ipcRenderer.invoke("fs:listFiles"),
    readFile: (filePath) => import_electron.ipcRenderer.invoke("fs:readFile", filePath),
    writeFile: (filePath, content) => import_electron.ipcRenderer.invoke("fs:writeFile", { filePath, content }),
    importFiles: (targetSubdir) => import_electron.ipcRenderer.invoke("fs:importFiles", targetSubdir),
    importFolder: (targetSubdir) => import_electron.ipcRenderer.invoke("fs:importFolder", targetSubdir),
    createMarkdownNote: (targetSubdir, filename, title) => import_electron.ipcRenderer.invoke("fs:createMarkdownNote", { targetSubdir, filename, title }),
    openInDesktopApp: (filePath, customApp) => import_electron.ipcRenderer.invoke("fs:openInDesktopApp", filePath, customApp)
  },
  settings: {
    getSettings: () => import_electron.ipcRenderer.invoke("settings:get"),
    saveSettings: (settings) => import_electron.ipcRenderer.invoke("settings:save", settings),
    browseApp: () => import_electron.ipcRenderer.invoke("settings:browseApp"),
    browseRepoDir: () => import_electron.ipcRenderer.invoke("settings:browseRepoDir"),
    resetSettings: () => import_electron.ipcRenderer.invoke("settings:reset")
  },
  shell: {
    openExternal: (url) => import_electron.ipcRenderer.invoke("shell:openExternal", url),
    openDiscord: (customInviteUrl, customAppUri) => import_electron.ipcRenderer.invoke("shell:openDiscord", { customInviteUrl, customAppUri }),
    openMeeting: (customUrl) => import_electron.ipcRenderer.invoke("shell:openMeeting", customUrl),
    openRepoFolder: () => import_electron.ipcRenderer.invoke("shell:openRepoFolder"),
    copyToClipboard: (text) => import_electron.clipboard.writeText(text),
    openGoogleSuite: (args) => import_electron.ipcRenderer.invoke("shell:openGoogleSuite", args),
    getDetectedBrowsers: () => import_electron.ipcRenderer.invoke("shell:getDetectedBrowsers"),
    openGoogleDriveFolder: () => import_electron.ipcRenderer.invoke("shell:openGoogleDriveFolder")
  },
  drive: {
    getStatus: () => import_electron.ipcRenderer.invoke("drive:getStatus"),
    startAuth: (args) => import_electron.ipcRenderer.invoke("drive:startAuth", args),
    disconnect: () => import_electron.ipcRenderer.invoke("drive:disconnect"),
    uploadAndOpen: (filePath) => import_electron.ipcRenderer.invoke("drive:uploadAndOpen", filePath)
  }
};
import_electron.contextBridge.exposeInMainWorld("api", api);
