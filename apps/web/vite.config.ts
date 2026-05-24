import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ command, mode }) => {
  const envDir = path.resolve(__dirname, "../..");
  const rootEnv = loadEnv(mode, envDir, "");
  const isBuild = command === "build";
  const pbxHost = process.env.PBX_HOST ?? rootEnv.PBX_HOST ?? "127.0.0.1";
  const serverUrl =
    process.env.VITE_SERVER_URL ??
    (isBuild ? "http://127.0.0.1:3000" : rootEnv.VITE_SERVER_URL ?? "http://127.0.0.1:3000");
  const sipWsUrl =
    process.env.VITE_ASTERISK_WS_URL ??
    (isBuild
      ? `ws://${pbxHost}:5066`
      : rootEnv.VITE_ASTERISK_WS_URL ?? `ws://${pbxHost}:5066`);
  const sipDomain = process.env.VITE_ASTERISK_SIP_DOMAIN ?? rootEnv.VITE_ASTERISK_SIP_DOMAIN ?? pbxHost;
  const mqttPublicUrl =
    process.env.VITE_MQTT_PUBLIC_URL ?? rootEnv.VITE_MQTT_PUBLIC_URL ?? `mqtt://${pbxHost}:1883`;

  return {
    define: {
      "import.meta.env.VITE_ASTERISK_SIP_DOMAIN": JSON.stringify(sipDomain),
      "import.meta.env.VITE_ASTERISK_WS_URL": JSON.stringify(sipWsUrl),
      "import.meta.env.VITE_MQTT_PUBLIC_URL": JSON.stringify(mqttPublicUrl),
      "import.meta.env.VITE_PBX_HOST": JSON.stringify(pbxHost),
      "import.meta.env.VITE_SERVER_URL": JSON.stringify(serverUrl),
    },
    envDir,
    plugins: [
      tailwindcss(),
      tanstackRouter({
        target: "react",
        routeToken: "layout",
        indexToken: "page",
        autoCodeSplitting: true,
      }),
      react(),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    optimizeDeps: {
      exclude: ["sip.js"],
    },
    server: {
      port: 3001,
    },
  };
});
