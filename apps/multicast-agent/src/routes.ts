import { Hono } from "hono";
import { env } from "@stack-pbx/env/server";
import { resolveBundledFfmpegPath } from "./service/ffmpeg-path";
import { multicastStartSchema, multicastStopSchema } from "./service/schemas";
import { MulticastSessionManager } from "./service/multicast-session-manager";

const multicastSessionManager = new MulticastSessionManager();

type RouteDependencies = {
  sessionManager?: {
    start: typeof multicastSessionManager.start;
    stop: typeof multicastSessionManager.stop;
    getStatus: typeof multicastSessionManager.getStatus;
  };
  resolveFfmpegPath?: typeof resolveBundledFfmpegPath;
};

export function createRoutes(dependencies: RouteDependencies = {}) {
  const sessionManager = dependencies.sessionManager ?? multicastSessionManager;
  const resolveFfmpegPath = dependencies.resolveFfmpegPath ?? resolveBundledFfmpegPath;
  const app = new Hono();

  app.get("/health", (c) => c.json({ ok: true }));
  app.get("/multicast/:groupId/status", (c) => {
    const groupId = c.req.param("groupId");
    const status = sessionManager.getStatus(groupId);

    return c.json({ ok: true, groupId, ...status });
  });

  app.post("/multicast/start", async (c) => {
    const body = await c.req.json().catch(() => null);
    const parsed = multicastStartSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ ok: false, error: parsed.error.flatten() }, 400);
    }

    const result = await sessionManager.start({
      ...parsed.data,
      ffmpegPath: resolveFfmpegPath(env.WINDOWS_PROGRAM_FILES_DIR),
    });

    if (!result.ok) {
      return c.json({ ok: false, error: result.error }, 502);
    }

    return c.json({ ok: true, groupId: parsed.data.groupId });
  });

  app.post("/multicast/stop", async (c) => {
    const body = await c.req.json().catch(() => null);
    const parsed = multicastStopSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ ok: false, error: parsed.error.flatten() }, 400);
    }

    const stopped = sessionManager.stop(parsed.data.groupId);

    return c.json({ ok: true, stopped, groupId: parsed.data.groupId });
  });

  return app;
}
