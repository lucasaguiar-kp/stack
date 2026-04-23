import { Hono } from "hono";

export function createRoutes() {
  const app = new Hono();

  app.get("/health", (c) => c.json({ ok: true }));

  return app;
}
