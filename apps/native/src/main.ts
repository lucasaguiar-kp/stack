import path from "node:path";
import { fileURLToPath } from "node:url";

import { queryWindowsServiceStatus } from "./windows/service-status";

type ElectronApp = {
  whenReady: () => Promise<void>;
  on: (event: string, listener: (...args: unknown[]) => void) => void;
  quit: () => void;
};

type ElectronBrowserWindow = {
  loadFile: (path: string) => Promise<void>;
  loadURL: (url: string) => Promise<void>;
  on: (event: string, listener: () => void) => void;
  once: (event: string, listener: () => void) => void;
  show: () => void;
};

type ElectronMainModule = {
  app: ElectronApp;
  BrowserWindow: new (options: Record<string, unknown>) => ElectronBrowserWindow;
  ipcMain: {
    handle: (
      channel: string,
      listener: (_event: unknown, ...args: unknown[]) => unknown,
    ) => void;
  };
};

const loadElectron = new Function(
  'return import("electron")',
) as () => Promise<ElectronMainModule>;

const electron = await loadElectron();
const { app, BrowserWindow, ipcMain } = electron;

const devServerUrl = process.env.KHOMP_STACK_DESKTOP_DEV_URL?.trim() || null;
const appTitle = process.env.KHOMP_STACK_DESKTOP_TITLE?.trim() || "Khomp Stack";
const currentDir = path.dirname(fileURLToPath(import.meta.url));

function resolvePreloadPath() {
  return path.join(currentDir, "preload.js");
}

function resolveBundledWebIndexPath() {
  return path.join(currentDir, "renderer", "index.html");
}

async function loadRenderer(window: ElectronBrowserWindow) {
  if (devServerUrl) {
    await window.loadURL(devServerUrl);
    return;
  }

  await window.loadFile(resolveBundledWebIndexPath());
}

function createMainWindow() {
  const window = new BrowserWindow({
    title: appTitle,
    width: 1440,
    height: 920,
    minWidth: 1200,
    minHeight: 760,
    show: false,
    backgroundColor: "#0f172a",
    autoHideMenuBar: true,
    webPreferences: {
      preload: resolvePreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  window.once("ready-to-show", () => {
    window.show();
  });

  void loadRenderer(window);

  return window;
}

ipcMain.handle("desktop:get-runtime-info", () => ({
  platform: process.platform,
  devServerUrl,
}));

ipcMain.handle("windows:get-service-status", async (_event, serviceName: unknown) => {
  if (typeof serviceName !== "string" || serviceName.trim().length === 0) {
    return {
      name: "",
      found: false,
      state: {
        code: null,
        label: "UNKNOWN",
        isRunning: false,
      },
      error: "A service name is required.",
      rawOutput: "",
    };
  }

  return queryWindowsServiceStatus(serviceName.trim());
});

await app.whenReady();

createMainWindow();

app.on("activate", () => {
  createMainWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
