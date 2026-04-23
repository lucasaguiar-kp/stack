import { env } from "@stack-pbx/env/server";
import { createRoutes } from "./routes";

const app = createRoutes();

export default {
  hostname: env.MULTICAST_AGENT_HOST,
  port: env.MULTICAST_AGENT_PORT,
  fetch: app.fetch,
};
