import { expo } from "@better-auth/expo";
import { db } from "@stack-pbx/db";
import * as schema from "@stack-pbx/db/schema/auth";
import { env } from "@stack-pbx/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { eq } from "drizzle-orm";
import {
  provisionUserInAsterisk,
  userPjsipConfigNeedsReprovision,
} from "./modules/devices/_shared/asterisk-provisioning";
import { allocateUserPbxIdentity, buildUserSipUser } from "./modules/users/_shared/pbx";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: schema,
  }),
  trustedOrigins: [
    env.CORS_ORIGIN,
    "stack-pbx://",
    ...(env.NODE_ENV === "development"
      ? ["exp://", "exp://**", "exp://192.168.*.*:*/**", "http://localhost:8081"]
      : []),
  ],
  emailAndPassword: {
    enabled: true,
  },
  advanced: {
    defaultCookieAttributes: {
      sameSite: env.NODE_ENV === "production" ? "none" : "lax",
      secure: env.NODE_ENV === "production",
      httpOnly: true,
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          if (!user.id) {
            return;
          }

          const existingUser = await db.query.user.findFirst({
            where: eq(schema.user.id, user.id),
          });

          if (!existingUser) {
            return;
          }

          let extension = existingUser.extension;
          let sipUser = existingUser.sipUser;
          let sipPassword = existingUser.sipPassword;

          if (!(extension && sipUser && sipPassword)) {
            const identity = await allocateUserPbxIdentity();
            extension = identity.extension;
            sipUser = identity.sipUser;
            sipPassword = identity.sipPassword;

            await db
              .update(schema.user)
              .set({
                extension,
                sipUser,
                sipPassword,
              })
              .where(eq(schema.user.id, user.id));
          }

          const expectedSipUser = buildUserSipUser(extension!);
          if (sipUser !== expectedSipUser) {
            sipUser = expectedSipUser;

            await db
              .update(schema.user)
              .set({
                sipUser,
              })
              .where(eq(schema.user.id, user.id));
          }

          if (await userPjsipConfigNeedsReprovision(user.id)) {
            try {
              await provisionUserInAsterisk({
                userId: user.id,
                userName: existingUser.name,
                extension: extension!,
                sipUser: sipUser!,
                sipPassword: sipPassword!,
              });
            } catch (error) {
              // Do not block sign-up if PBX reprovision fails; the credentials
              // endpoint can retry provisioning on the first authenticated load.
              console.error("Failed to provision user in Asterisk after sign-up", {
                userId: user.id,
                error,
              });
            }
          }
        },
      },
    },
  },
  plugins: [expo()],
});
