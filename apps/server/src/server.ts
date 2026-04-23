import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { CORSPlugin } from "@orpc/server/plugins";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { db } from "@stack-pbx/db";
import { user as userSchema } from "@stack-pbx/db/schema/auth";
import { env } from "@stack-pbx/env/server";
import { count } from "drizzle-orm";
import { Hono } from "hono";
import { rateLimiter } from "hono-rate-limiter";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { auth } from "./auth";
import { createContext } from "./context";
import { handleError } from "./core/http/error-handler";
import { multicastEvents } from "./modules/device-groups/_shared/multicast-events";
import type { MulticastStatusEvent } from "./modules/device-groups/_shared/multicast-events";
import { uploadDeviceAudio } from "./modules/devices/upload-device-audio/service";
import { appRouter } from "./router";
import type { Server, ServerWebSocket } from "bun";

type DevicePresenceEvent = {
  connectionStatus: "online" | "offline" | "unknown";
  deviceId: string;
  mqttTopic: string;
  occurredAt: string;
  type: "device.connection-status.changed";
};

const app = new Hono();
const devicePresenceClients = new Set<ServerWebSocket<unknown>>();

function broadcastToClients(payload: unknown) {
  const message = JSON.stringify(payload);
  for (const client of devicePresenceClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

multicastEvents.on("status", (event: MulticastStatusEvent) => {
  broadcastToClients(event);
});

const ACCEPTED_AUDIO_MIME_TYPES = new Set([
  "application/octet-stream",
  "application/ogg",
  "audio/mp3",
  "audio/mp4",
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
  "audio/x-m4a",
  "audio/x-wav",
  "video/webm",
]);

const ACCEPTED_AUDIO_EXTENSIONS = new Set([
  ".m4a",
  ".mp3",
  ".mp4",
  ".oga",
  ".ogg",
  ".wav",
  ".webm",
]);

function isAcceptedAudioFile(file: File) {
  const normalizedType = file.type.trim().toLowerCase();
  const normalizedName = file.name.trim().toLowerCase();
  const extension = normalizedName.includes(".") ? `.${normalizedName.split(".").pop()}` : "";

  return (
    normalizedType.startsWith("audio/") ||
    ACCEPTED_AUDIO_MIME_TYPES.has(normalizedType) ||
    ACCEPTED_AUDIO_EXTENSIONS.has(extension)
  );
}

function broadcastDevicePresenceEvent(event: DevicePresenceEvent) {
  broadcastToClients(event);
}

app.use(logger());
app.use(
  "/*",
  cors({
    origin: env.CORS_ORIGIN,
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.on(
  ["POST", "GET"],
  "/api/auth/*",
  rateLimiter({
    windowMs: 60_000,
    limit: 200,
    keyGenerator: (c) =>
      c.req.header("x-forwarded-for") ?? c.req.header("cf-connecting-ip") ?? "unknown",
  }),
  async (c) => {
    if (c.req.method === "POST" && c.req.path.includes("sign-up")) {
      const [result] = await db.select({ userCount: count(userSchema.id) }).from(userSchema);
      const userCount = result?.userCount ?? 0;

      if (userCount > 0) {
        return c.json(
          {
            code: "REGISTRATION_DISABLED",
            message: "O cadastro publico foi desativado apos a criação da conta inicial.",
          },
          403,
        );
      }
    }

    return auth.handler(c.req.raw);
  },
);

app.post("/devices/:deviceId/audio-assets", async (c) => {
  const context = await createContext({ context: c });

  if (!context.session?.user) {
    return c.json(
      {
        code: "UNAUTHORIZED",
        message: "Unauthorized",
      },
      401,
    );
  }

  try {
    const formData = await c.req.formData();
    const file = formData.get("file");
    const audioName = formData.get("audioName");
    const playNow = formData.get("playNow");

    if (!(file instanceof File)) {
      return c.json({ code: "INVALID_REQUEST", message: "Audio file is required" }, 400);
    }

    const MAX_AUDIO_SIZE = 10 * 1024 * 1024; // 10 MB
    if (file.size > MAX_AUDIO_SIZE) {
      return c.json({ code: "INVALID_REQUEST", message: "Audio file exceeds 10 MB limit" }, 400);
    }

    if (!isAcceptedAudioFile(file)) {
      return c.json({ code: "INVALID_REQUEST", message: "File must be an audio file" }, 400);
    }

    const result = await uploadDeviceAudio({
      audioName: typeof audioName === "string" ? audioName : undefined,
      deviceId: c.req.param("deviceId"),
      file,
      playNow: playNow === "true" || playNow === "1",
      requesterId: context.session.user.id,
    });

    return c.json(result, 201);
  } catch (error) {
    const handled = handleError(error);
    return c.json(handled.body, handled.status as 400 | 401 | 403 | 404 | 409 | 500);
  }
});

app.post("/internal/device-presence", async (c) => {
  if (c.req.header("x-internal-token") !== env.BETTER_AUTH_SECRET) {
    return c.json({ code: "UNAUTHORIZED", message: "Unauthorized" }, 401);
  }

  const payload = (await c.req.json()) as Partial<DevicePresenceEvent>;

  if (
    payload.type !== "device.connection-status.changed" ||
    !payload.deviceId ||
    !payload.mqttTopic ||
    !payload.connectionStatus ||
    !payload.occurredAt
  ) {
    return c.json({ code: "INVALID_REQUEST", message: "Invalid presence payload" }, 400);
  }

  broadcastDevicePresenceEvent(payload as DevicePresenceEvent);

  return c.json({ ok: true });
});

export const apiHandler = new OpenAPIHandler(appRouter, {
  plugins: [
    new CORSPlugin(),
    new OpenAPIReferencePlugin({
      schemaConverters: [new ZodToJsonSchemaConverter()],
      docsConfig: {
        theme: "deepSpace",
        defaultOpenFirstTag: false,
        hideClientButton: false,
        showSidebar: true,
        showDeveloperTools: "localhost",
        showToolbar: "localhost",
        operationTitleSource: "summary",
        persistAuth: false,
        telemetry: true,
        layout: "modern",
        isEditable: false,
        isLoading: false,
        hideModels: false,
        documentDownloadType: "both",
        hideTestRequestButton: false,
        hideSearch: false,
        showOperationId: false,
        hideDarkModeToggle: false,
        withDefaultFonts: true,
        defaultOpenAllTags: false,
        expandAllModelSections: false,
        expandAllResponses: false,
        orderSchemaPropertiesBy: "alpha",
        orderRequiredPropertiesFirst: true,
        default: false,
        slug: "api-1",
        title: "API #1",
      },
      specGenerateOptions: {
        info: {
          title: "API",
          version: "1.0.0",
        },
        security: [{ bearerAuth: [] }],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: "http",
              scheme: "bearer",
            },
          },
        },
        externalDocs: {
          description: "Referência de autenticação",
          url: "/api/auth/reference",
        },
      },
    }),
  ],
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});

export const rpcHandler = new RPCHandler(appRouter, {
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});

app.use("/*", async (c, next) => {
  const context = await createContext({ context: c });

  const rpcResult = await rpcHandler.handle(c.req.raw, {
    prefix: "/rpc",
    context: context,
  });

  if (rpcResult.matched) {
    return c.newResponse(rpcResult.response.body, rpcResult.response);
  }

  const apiResult = await apiHandler.handle(c.req.raw, {
    prefix: "/docs",
    context: context,
  });

  if (apiResult.matched) {
    return c.newResponse(apiResult.response.body, apiResult.response);
  }

  await next();
});

app.get("/", (c) => {
  return c.json({
    ok: true,
    service: "stack-pbx-server",
    multicastAgent: {
      host: env.MULTICAST_AGENT_HOST,
      port: env.MULTICAST_AGENT_PORT,
      url: `http://${env.MULTICAST_AGENT_HOST}:${env.MULTICAST_AGENT_PORT}`,
    },
  });
});

const websocket = {
  close(ws: ServerWebSocket<unknown>) {
    devicePresenceClients.delete(ws);
  },
  message() {},
  open(ws: ServerWebSocket<unknown>) {
    devicePresenceClients.add(ws);
  },
};

export default {
  fetch(request: Request, server: Server<unknown>) {
    const url = new URL(request.url);

    if (url.pathname === "/ws/device-presence") {
      const upgraded = server.upgrade(request, {
        data: undefined,
      });

      if (upgraded) {
        return;
      }

      return new Response("WebSocket upgrade failed", { status: 426 });
    }

    return app.fetch(request);
  },
  websocket,
};
