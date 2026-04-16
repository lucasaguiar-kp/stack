import { db } from "@stack-pbx/db";
import { user as userSchema } from "@stack-pbx/db/schema/index";
import { eq } from "drizzle-orm";
import { AppError } from "../../../core/errors/app-error";
import { provisionUserInAsterisk, userPjsipConfigNeedsReprovision } from "../../devices/_shared/asterisk-provisioning";
import { allocateUserPbxIdentity, buildUserSipUser } from "../_shared/pbx";
import type { Input, Output } from "./schema";

export async function getUserPbxCredentials(input: Input): Promise<Output> {
  const user = await db.query.user.findFirst({
    where: eq(userSchema.id, input.requesterId),
  });

  if (!user) {
    throw new AppError("USER_NOT_FOUND");
  }

  let extension = user.extension;
  let sipUser = user.sipUser;
  let sipPassword = user.sipPassword;

  if (!(extension && sipUser && sipPassword)) {
    const identity = await allocateUserPbxIdentity();
    extension = identity.extension;
    sipUser = identity.sipUser;
    sipPassword = identity.sipPassword;

    await db
      .update(userSchema)
      .set({
        extension,
        sipUser,
        sipPassword,
      })
      .where(eq(userSchema.id, user.id));
  }

  if (!extension || !sipUser || !sipPassword) {
    throw new AppError("MEMBER_PBX_IDENTITY_NOT_FOUND");
  }

  const expectedSipUser = buildUserSipUser(extension);
  if (sipUser !== expectedSipUser) {
    sipUser = expectedSipUser;

    await db
      .update(userSchema)
      .set({
        sipUser,
      })
      .where(eq(userSchema.id, user.id));
  }

  if (await userPjsipConfigNeedsReprovision(user.id)) {
    await provisionUserInAsterisk({
      userId: user.id,
      userName: user.name,
      extension,
      sipUser,
      sipPassword,
    });
  }

  return {
    extension,
    sipUser,
    sipPassword,
  };
}
