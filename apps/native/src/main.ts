import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

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
  session: {
    defaultSession: {
      setPermissionRequestHandler: (
        handler: (
          webContents: unknown,
          permission: string,
          callback: (granted: boolean) => void,
          details: Record<string, unknown>,
        ) => void,
      ) => void;
    };
  };
};

type RendererServer = {
  close: () => Promise<void>;
  url: string;
};

type DesktopRuntimeConfig = {
  VITE_ASTERISK_SIP_DOMAIN: string;
  VITE_ASTERISK_WS_URL: string;
  VITE_MQTT_PUBLIC_URL: string;
  VITE_PBX_HOST: string;
  VITE_SERVER_URL: string;
  VITE_WEBRTC_STUN_URLS?: string;
};

declare const require: (moduleName: string) => ElectronMainModule;

const loadElectron = () => require("electron");

let app: ElectronMainModule["app"];
let BrowserWindow: ElectronMainModule["BrowserWindow"];
let ipcMain: ElectronMainModule["ipcMain"];
let session: ElectronMainModule["session"];

const devServerUrl = process.env.KHOMP_STACK_DESKTOP_DEV_URL?.trim() || null;
const appTitle = process.env.KHOMP_STACK_DESKTOP_TITLE?.trim() || "Khomp Stack";
const electronProcess = process as typeof process & {
  defaultApp?: boolean;
  resourcesPath?: string;
};
function resolveCurrentDir() {
  if (!electronProcess.resourcesPath || electronProcess.defaultApp) {
    return path.join(process.cwd(), "dist");
  }

  const asarAppPath = path.join(electronProcess.resourcesPath, "app.asar");
  if (existsSync(asarAppPath)) {
    return asarAppPath;
  }

  return path.join(electronProcess.resourcesPath, "app");
}

const currentDir = resolveCurrentDir();
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

function parseEnvFile(contents: string) {
  const values: Record<string, string> = {};

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim().replace(/^"(.*)"$/, "$1");
    values[key] = value;
  }

  return values;
}

async function readServiceRuntimeEnv() {
  const programDataRoot = path.join(process.env.ProgramData || "C:\\ProgramData", "Khomp Stack");
  const runtimeEnvPath = path.join(programDataRoot, "config", "service-runtime.env");

  try {
    return parseEnvFile(await readFile(runtimeEnvPath, "utf8"));
  } catch {
    return {};
  }
}

async function resolveDesktopRuntimeConfig(): Promise<DesktopRuntimeConfig> {
  const runtimeEnv = await readServiceRuntimeEnv();
  const backendPort = runtimeEnv.PORT || "3000";
  const pbxHost = runtimeEnv.PBX_HOST || "127.0.0.1";
  const freeSwitchWsPort = runtimeEnv.FREESWITCH_WS_PORT || "5066";
  const mqttBrokerPort = runtimeEnv.MQTT_BROKER_PORT || "1883";
  const sipDomain =
    runtimeEnv.FREESWITCH_DOMAIN ||
    runtimeEnv.ASTERISK_DEVICE_HOST ||
    runtimeEnv.PBX_HOST ||
    pbxHost;

  return {
    VITE_ASTERISK_SIP_DOMAIN: sipDomain,
    VITE_ASTERISK_WS_URL: runtimeEnv.VITE_ASTERISK_WS_URL || `ws://${pbxHost}:${freeSwitchWsPort}`,
    VITE_MQTT_PUBLIC_URL:
      runtimeEnv.MQTT_PUBLIC_URL || runtimeEnv.VITE_MQTT_PUBLIC_URL || `mqtt://${pbxHost}:${mqttBrokerPort}`,
    VITE_PBX_HOST: pbxHost,
    VITE_SERVER_URL: `http://127.0.0.1:${backendPort}`,
    ...(runtimeEnv.VITE_WEBRTC_STUN_URLS
      ? { VITE_WEBRTC_STUN_URLS: runtimeEnv.VITE_WEBRTC_STUN_URLS }
      : {}),
  };
}

function injectRuntimeConfig(html: string, config: DesktopRuntimeConfig) {
  const json = JSON.stringify(config).replaceAll("<", "\\u003c");
  const script = `<script>window.__KHOMP_STACK_RUNTIME_CONFIG__=${json};</script>`;

  if (html.includes("</head>")) {
    return html.replace("</head>", `    ${script}\n  </head>`);
  }

  return `${script}\n${html}`;
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
  const urlPath = request.url || "/";
  if (urlPath.split("?")[0] === "/khomp-stack-runtime-config.json") {
    const config = await resolveDesktopRuntimeConfig();
    response.writeHead(200, {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-cache",
    });
    response.end(JSON.stringify(config));
    return;
  }

  const bundledIndexPath = resolveBundledWebIndexPath();
  const resolvedPath = resolveRendererRequestPath(urlPath);

  if (!resolvedPath) {
    response.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
    response.end("Forbidden");
    return;
  }

  const shouldServeIndex =
    path.extname(resolvedPath) === "" || resolvedPath.endsWith(`${path.sep}index.html`);
  const targetPath = shouldServeIndex ? bundledIndexPath : resolvedPath;

  try {
    if (targetPath === bundledIndexPath) {
      const contents = await readFile(targetPath, "utf8");
      const runtimeConfig = await resolveDesktopRuntimeConfig();
      response.writeHead(200, {
        "content-type": getContentType(targetPath),
        "cache-control": "no-cache",
      });
      response.end(injectRuntimeConfig(contents, runtimeConfig));
      return;
    }

    const contents = await readFile(targetPath);
    response.writeHead(200, {
      "content-type": getContentType(targetPath),
      "cache-control": targetPath === bundledIndexPath ? "no-cache" : "public, max-age=31536000",
    });
    response.end(contents);
  } catch {
    if (targetPath !== bundledIndexPath) {
      const contents = await readFile(bundledIndexPath, "utf8");
      const runtimeConfig = await resolveDesktopRuntimeConfig();
      response.writeHead(200, {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-cache",
      });
      response.end(injectRuntimeConfig(contents, runtimeConfig));
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

  window.show();

  window.once("ready-to-show", () => {
    window.show();
  });

  void loadRenderer(window).catch((error) => {
    const message = error instanceof Error ? error.stack || error.message : String(error);
    const html = encodeURIComponent(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${appTitle}</title>
          <style>
            body { margin: 0; font-family: Segoe UI, sans-serif; color: #e5e7eb; background: #0f172a; }
            main { padding: 32px; max-width: 920px; }
            h1 { font-size: 22px; margin: 0 0 12px; }
            pre { white-space: pre-wrap; background: #111827; border: 1px solid #334155; padding: 16px; }
          </style>
        </head>
        <body>
          <main>
            <h1>Khomp Stack Desktop failed to load</h1>
            <pre>${message.replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</pre>
          </main>
        </body>
      </html>
    `);

    void window.loadURL(`data:text/html;charset=utf-8,${html}`).finally(() => {
      window.show();
    });
  });

  return window;
}

function registerIpcHandlers() {
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
}

async function bootstrap() {
  const electron = loadElectron();
  ({ app, BrowserWindow, ipcMain, session } = electron);

  registerIpcHandlers();

  await app.whenReady();

  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(permission === "media");
  });

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
}

void bootstrap();
