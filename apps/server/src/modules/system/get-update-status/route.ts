import { protectedProcedure } from "../../../procedures";
import { getUpdateStatusOutputSchema } from "./schema";
import { getUpdateStatus } from "./service";

export const getUpdateStatusRoute = protectedProcedure
  .route({
    method: "GET",
    path: "/system/update-status",
    description: "Get the current application update status",
    tags: ["system"],
    successStatus: 200,
  })
  .output(getUpdateStatusOutputSchema)
  .handler(async () => {
    return await getUpdateStatus();
  });
