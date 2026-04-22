import { db } from "@stack-pbx/db";
import { env } from "@stack-pbx/env/server";

const USER_EXTENSION_START = 90000;
const GROUP_EXTENSION_START = 70000;

function buildUsedExtensions(values: Array<string | null | undefined>) {
  const used = new Set<string>();

  for (const value of values) {
    if (value) {
      used.add(value);
    }
  }

  return used;
}

export function buildUserSipUser(extension: string) {
  return `user_${extension}`;
}

export async function allocateUserPbxIdentity() {
  const [users, groups] = await Promise.all([
    db.query.user.findMany({
      columns: { extension: true },
    }),
    db.query.deviceGroup.findMany({
      columns: { extension: true },
    }),
  ]);

  const usedExtensions = buildUsedExtensions([
    ...users.map((user) => user.extension),
    ...groups.map((group) => group.extension),
  ]);

  let nextExtension = USER_EXTENSION_START;

  while (usedExtensions.has(String(nextExtension))) {
    nextExtension += 1;
  }

  const extension = String(nextExtension);

  return {
    extension,
    sipUser: buildUserSipUser(extension),
    sipPassword: extension,
  };
}

export async function allocateGroupExtension() {
  const [users, groups] = await Promise.all([
    db.query.user.findMany({
      columns: { extension: true },
    }),
    db.query.deviceGroup.findMany({
      columns: { extension: true },
    }),
  ]);

  const usedExtensions = buildUsedExtensions([
    ...users.map((user) => user.extension),
    ...groups.map((group) => group.extension),
  ]);

  let nextExtension = GROUP_EXTENSION_START;

  while (usedExtensions.has(String(nextExtension))) {
    nextExtension += 1;
  }

  return String(nextExtension);
}

export async function allocateMulticastAddress(): Promise<string> {
  const groups = await db.query.deviceGroup.findMany({
    columns: { multicastAddress: true },
  });

  const used = new Set(
    groups.map((g) => g.multicastAddress).filter(Boolean) as string[],
  );

  for (let i = env.MULTICAST_ADDRESS_START; i <= env.MULTICAST_ADDRESS_MAX; i++) {
    const candidate = `${env.MULTICAST_ADDRESS_BASE}.${i}`;
    if (!used.has(candidate)) {
      return candidate;
    }
  }

  throw new Error("No available multicast addresses");
}
