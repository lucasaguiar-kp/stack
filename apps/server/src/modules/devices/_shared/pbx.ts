import { db } from "@stack-pbx/db";

const DEVICE_EXTENSION_START = 201;

export async function allocateDevicePbxIdentity(_input: {
  groupKey: string;
}) {
  const [devices, groups, users] = await Promise.all([
    db.query.device.findMany({
      columns: { extension: true },
    }),
    db.query.deviceGroup.findMany({
      columns: { extension: true },
    }),
    db.query.user.findMany({
      columns: { extension: true },
    }),
  ]);

  const usedExtensions = new Set<string>();

  for (const device of devices) {
    usedExtensions.add(device.extension);
  }

  for (const group of groups) {
    if (group.extension) {
      usedExtensions.add(group.extension);
    }
  }

  for (const user of users) {
    if (user.extension) {
      usedExtensions.add(user.extension);
    }
  }

  let nextExtension = DEVICE_EXTENSION_START;

  while (usedExtensions.has(String(nextExtension))) {
    nextExtension += 1;
  }

  const extension = String(nextExtension);

  return {
    extension,
    sipUser: extension,
  };
}
