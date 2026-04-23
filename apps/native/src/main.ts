import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
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

type RendererServer = {
  close: () => Promise<void>;
  url: string;
};

const loadElectron = new Function(
  'return import("electron")',
) as () => Promise<ElectronMainModule>;

const electron = await loadElectron();
const { app, BrowserWindow, ipcMain } = electron;

const devServerUrl = process.env.KHOMP_STACK_DESKTOP_DEV_URL?.trim() || null;
const appTitle = process.env.KHOMP_STACK_DESKTOP_TITLE?.trim() || "Khomp Stack";
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const packagedRendererHost = process.env.KHOMP_STACK_DESKTOP_HOST?.trim() || "127.0.0.1";
const packagedRendererPort = Number.parseInt(
  process.env.KHOMP_STACK_DESKTOP_PORT?.trim() || "3001",
  10,
);
let packagedRendererServerPromise: Promise<RendererServer> | null = null;

function resolvePreloadPath() {
  return path.join(currentDir, "preload.js");
}

function resolveBundledWebIndexPath() {
  return path.join(currentDir, "renderer", "index.html");
}

function getContentType(filePath: string) {
  const extension = path.extname(filePath).toLowerCase();

  switch (extension) {
    case ".css":
      return "text/css; charset=utf-8";
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    case ".woff2":
      return "font/woff2";
    default:
      return "application/octet-stream";
  }
}

function resolveRendererRequestPath(urlPath: string) {
  const normalizedPath = decodeURIComponent(urlPath.split("?")[0] || "/");
  const requestedPath =
    normalizedPath === "/" ? "index.html" : normalizedPath.replace(/^\/+/, "");
  const bundledRoot = path.resolve(path.join(currentDir, "renderer"));
  const resolvedPath = path.resolve(path.join(bundledRoot, requestedPath));

  if (!resolvedPath.startsWith(`${bundledRoot}${path.sep}`) && resolvedPath !== bundledRoot) {
    return null;
  }

  return resolvedPath;
}

async function respondWithRendererAsset(request: IncomingMessage, response: ServerResponse) {
  const bundledIndexPath = resolveBundledWebIndexPath();
  const resolvedPath = resolveRendererRequestPath(request.url || "/");

  if (!resolvedPath) {
    response.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
    response.end("Forbidden");
    return;
  }

  const shouldServeIndex =
    path.extname(resolvedPath) === "" || resolvedPath.endsWith(`${path.sep}index.html`);
  const targetPath = shouldServeIndex ? bundledIndexPath : resolvedPath;

  try {
    const contents = await readFile(targetPath);
    response.writeHead(200, {
      "content-type": getContentType(targetPath),
      "cache-control": targetPath === bundledIndexPath ? "no-cache" : "public, max-age=31536000",
    });
    response.end(contents);
  } catch {
    if (targetPath !== bundledIndexPath) {
      const contents = await readFile(bundledIndexPath);
      response.writeHead(200, {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-cache",
      });
      response.end(contents);
      return;
    }

    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not Found");
  }
}

function ensurePackagedRendererServer() {
  if (packagedRendererServerPromise) {
    return packagedRendererServerPromise;
  }

  packagedRendererServerPromise = new Promise((resolve, reject) => {
    const server = createServer((request, response) => {
      void respondWithRendererAsset(request, response);
    });

    server.once("error", reject);
    server.listen(packagedRendererPort, packagedRendererHost, () => {
      server.removeListener("error", reject);
      resolve({
        url: `http://${packagedRendererHost}:${packagedRendererPort}`,
        close: () =>
          new Promise((closeResolve, closeReject) => {
            server.close((error) => {
              if (error) {
                closeReject(error);
                return;
              }

              closeResolve();
            });
          }),
      });
    });
  });

  return packagedRendererServerPromise;
}

async function loadRenderer(window: ElectronBrowserWindow) {
  if (devServerUrl) {
    await window.loadURL(devServerUrl);
    return;
  }

  const rendererServer = await ensurePackagedRendererServer();
  await window.loadURL(rendererServer.url);
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

app.on("before-quit", () => {
  if (!packagedRendererServerPromise) {
    return;
  }

  void packagedRendererServerPromise
    .then((server) => server.close())
    .catch(() => undefined);
});
