type DesktopServiceState = {
  code: number | null;
  label: string;
  isRunning: boolean;
};

type DesktopServiceStatus = {
  name: string;
  found: boolean;
  state: DesktopServiceState;
  error: string | null;
  rawOutput: string;
};

type DesktopRuntimeInfo = {
  platform: string;
  devServerUrl: string | null;
};

type DesktopApi = {
  getRuntimeInfo: () => Promise<DesktopRuntimeInfo>;
  getServiceStatus: (serviceName: string) => Promise<DesktopServiceStatus>;
  openExternalUrl: (url: string) => Promise<boolean>;
};

declare const require: (moduleName: string) => {
  contextBridge: {
    exposeInMainWorld: (key: string, api: DesktopApi) => void;
  };
  ipcRenderer: {
    invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
  };
};

const electron = require("electron");

const desktopApi: DesktopApi = {
  getRuntimeInfo: async () =>
    (await electron.ipcRenderer.invoke("desktop:get-runtime-info")) as DesktopRuntimeInfo,
  getServiceStatus: async (serviceName) =>
    (await electron.ipcRenderer.invoke(
      "windows:get-service-status",
      serviceName,
    )) as DesktopServiceStatus,
  openExternalUrl: async (url) =>
    (await electron.ipcRenderer.invoke("desktop:open-external-url", url)) as boolean,
};

electron.contextBridge.exposeInMainWorld("khompStackDesktop", desktopApi);

export {};
