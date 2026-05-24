import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig, loadEnv } from "vite";
export default defineConfig(({ mode }) => {
    const envDir = path.resolve(__dirname, "../..");
    const rootEnv = loadEnv(mode, envDir, "");
    return {
        define: {
            "import.meta.env.VITE_PBX_HOST": JSON.stringify(rootEnv.PBX_HOST ?? ""),
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
