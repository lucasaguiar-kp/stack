import { publicProcedure } from "../../../procedures";
import { getSetupStatusOutputSchema } from "./schema";
import { getSetupStatus } from "./service";

export const getSetupStatusRoute = publicProcedure
  .route({
    method: "GET",
    path: "/setup/status",
    description: "Get platform setup status and whether public registration is allowed",
    tags: ["setup"],
    successStatus: 200,
  })
  .output(getSetupStatusOutputSchema)
  .handler(async () => {
    return await getSetupStatus();
  });
