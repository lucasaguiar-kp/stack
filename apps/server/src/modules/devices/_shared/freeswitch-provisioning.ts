import { db } from "@stack-pbx/db";
import {
  device as deviceTable,
  deviceGroup as deviceGroupTable,
  user as userTable,
} from "@stack-pbx/db/schema/index";
import { env } from "@stack-pbx/env/server";
import { getCurrentLanAddress } from "../../../core/network/lan-address";
import { eq } from "drizzle-orm";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { AppError } from "../../../core/errors/app-error";

type ProvisionDeviceInput = {
  deviceId: string;
  deviceName: string;
  extension: string;
  groupId: string;
  mqttTopic: string;
  sipPassword: string;
  sipUser: string;
};

type ProvisionUserInput = {
  userId: string;
  userName: string;
  extension: string;
  sipPassword: string;
  sipUser: string;
};

const workspaceRoot = process.cwd();
const DEFAULT_ESL_TIMEOUT_MS = 5000;
const DEVICE_REGISTRATION_WAIT_TIMEOUT_MS = 20000;
const DEVICE_REGISTRATION_POLL_INTERVAL_MS = 2000;

function getFreeSwitchConfigDir() {
  return env.FREESWITCH_CONFIG_DIR ?? path.join(workspaceRoot, "infra/freeswitch/generated");
}

function getDirectoryDir() {
  return env.FREESWITCH_DIRECTORY_DIR ?? path.join(getFreeSwitchConfigDir(), "directory/default");
}

function getDialplanDir() {
  return env.FREESWITCH_DIALPLAN_DIR ?? path.join(getFreeSwitchConfigDir(), "dialplan/default");
}

function getDomain() {
  return getCurrentLanAddress() ?? env.FREESWITCH_DOMAIN ?? env.PBX_HOST;
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ensureFreeSwitchProvisioningIsConfigured() {
  if (!env.FREESWITCH_AUTO_PROVISION) {
    return false;
  }

  if (!env.FREESWITCH_ESL_HOST || !env.FREESWITCH_ESL_PASSWORD || !getDomain()) {
    throw new AppError("ASTERISK_NOT_CONFIGURED");
  }

  return true;
}

async function runFreeSwitchApiCommand(command: string) {
  if (!ensureFreeSwitchProvisioningIsConfigured()) {
    return "";
  }

  return new Promise<string>((resolve, reject) => {
    const socket = net.createConnection({
      host: env.FREESWITCH_ESL_HOST,
      port: env.FREESWITCH_ESL_PORT,
    });
    let buffer = "";
    let authenticated = false;
    let commandSent = false;
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new AppError("ASTERISK_RELOAD_FAILED", { message: "Timed out while calling FreeSWITCH ESL" }));
    }, DEFAULT_ESL_TIMEOUT_MS);

    socket.setEncoding("utf8");

    socket.on("data", (chunk) => {
      buffer += chunk;

      if (!authenticated && buffer.includes("auth/request")) {
        socket.write(`auth ${env.FREESWITCH_ESL_PASSWORD}\n\n`);
        authenticated = true;
        return;
      }

      if (authenticated && !commandSent && buffer.includes("+OK accepted")) {
        socket.write(`api ${command}\n\n`);
        commandSent = true;
        buffer = "";
        return;
      }

      if (commandSent && buffer.includes("\n\n")) {
        clearTimeout(timer);
        socket.end();
        resolve(buffer);
      }
    });

    socket.on("error", (error) => {
      clearTimeout(timer);
      reject(
        new AppError("ASTERISK_RELOAD_FAILED", {
          message: `FreeSWITCH ESL connection failed for "${command}": ${error.message}`,
        }),
      );
    });
  });
}

function buildDirectoryUserXml(input: ProvisionDeviceInput | ProvisionUserInput) {
  const userId = "deviceId" in input ? input.deviceId : input.userId;
  const displayName = "deviceName" in input ? input.deviceName : input.userName;

  return [
    "<include>",
    `  <user id="${escapeXml(input.sipUser)}">`,
    "    <params>",
    `      <param name="password" value="${escapeXml(input.sipPassword)}"/>`,
    "    </params>",
    "    <variables>",
    '      <variable name="user_context" value="default"/>',
    `      <variable name="effective_caller_id_name" value="${escapeXml(displayName)}"/>`,
    `      <variable name="effective_caller_id_number" value="${escapeXml(input.extension)}"/>`,
    `      <variable name="stack_pbx_id" value="${escapeXml(userId)}"/>`,
    "    </variables>",
    "  </user>",
    "</include>",
    "",
  ].join("\n");
}

async function removeConflictingDirectoryUsers(input: {
  ownerId: string;
  sipUser: string;
}) {
  const directoryDir = getDirectoryDir();

  try {
    const files = await readdir(directoryDir, { withFileTypes: true });

    await Promise.all(
      files
        .filter((file) => file.isFile() && file.name.endsWith(".xml") && file.name !== `${input.ownerId}.xml`)
        .map(async (file) => {
          const filePath = path.join(directoryDir, file.name);
          const contents = await readFile(filePath, "utf8");

          if (!contents.includes("stack_pbx_id") || !contents.includes(`<user id="${input.sipUser}"`)) {
            return;
          }

          await rm(filePath, { force: true });
        }),
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return;
    }

    throw error;
  }
}

async function removeStaleGroupDialplanFiles(validGroupIds: string[]) {
  const validNames = new Set(validGroupIds.map((groupId) => `group-${groupId}.xml`));
  const dialplanDir = getDialplanDir();

  try {
    const files = await readdir(dialplanDir, { withFileTypes: true });

    await Promise.all(
      files
        .filter((file) => file.isFile() && file.name.startsWith("group-") && file.name.endsWith(".xml"))
        .filter((file) => !validNames.has(file.name))
        .map((file) => rm(path.join(dialplanDir, file.name), { force: true })),
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return;
    }

    throw error;
  }
}

function getDeviceSipPort() {
  return env.FREESWITCH_SIP_PORT;
}

function buildBridgeData(entry: {
  deviceIp?: string | null;
  extension: string;
  sipUser: string;
}) {
  const domain = getDomain();

  if (domain) {
    return `user/${escapeXml(entry.sipUser)}@${escapeXml(domain)}`;
  }

  if (entry.deviceIp) {
    return `sofia/internal/sip:${escapeXml(entry.extension)}@${escapeXml(entry.deviceIp)}:${getDeviceSipPort()}`;
  }

  return `user/${escapeXml(entry.sipUser)}`;
}

function buildConferenceName(group: { id: string; extension?: string | null }) {
  return `stack-pbx-${group.extension ?? group.id}`;
}

function buildDeviceDialplanEntries(
  entries: Array<{ deviceIp?: string | null; extension: string; sipUser: string; label: string }>,
) {
  return entries.map((entry) =>
    [
      `  <extension name="${escapeXml(entry.label)}-${escapeXml(entry.extension)}">`,
      `    <condition field="destination_number" expression="^${escapeXml(entry.extension)}$">`,
      `      <action application="bridge" data="${buildBridgeData(entry)}"/>`,
      "    </condition>",
      "  </extension>",
    ].join("\n"),
  );
}

function buildGroupDialplanEntries(
  groups: Array<{
    devices: Array<{ deviceIp?: string | null; extension: string; sipUser: string }>;
    extension?: string | null;
    id: string;
  }>,
) {
  return groups
    .filter((group) => Boolean(group.extension))
    .map((group) => {
      const conferenceName = buildConferenceName(group);
      const outcallTargets = group.devices.map((device) => {
        return [
          "      <action",
          ' application="conference_set_auto_outcall"',
          ` data="${buildBridgeData(device)}"/>`,
        ].join("");
      });
      const callerIdNumber = group.extension ?? group.id;

      return [
        `  <extension name="group-${escapeXml(group.extension ?? group.id)}">`,
        `    <condition field="destination_number" expression="^${escapeXml(group.extension ?? "")}$">`,
        outcallTargets.length > 0
          ? '      <action application="answer"/>'
          : '      <action application="hangup" data="NO_ROUTE_DESTINATION"/>',
        outcallTargets.length > 0 ? '      <action application="set" data="conference_auto_outcall_timeout=30"/>' : "",
        outcallTargets.length > 0 ? '      <action application="set" data="conference_auto_outcall_profile=default"/>' : "",
        outcallTargets.length > 0
          ? '      <action application="set" data="conference_auto_outcall_caller_id_name=KHOMP"/>'
          : "",
        outcallTargets.length > 0
          ? `      <action application="set" data="conference_auto_outcall_caller_id_number=${escapeXml(callerIdNumber)}"/>`
          : "",
        ...outcallTargets,
        outcallTargets.length > 0
          ? `      <action application="conference" data="${escapeXml(conferenceName)}@default"/>`
          : "",
        "    </condition>",
        "  </extension>",
      ].filter(Boolean).join("\n");
    });
}

function buildDialplanXml(input: {
  devices: Array<{ deviceIp?: string | null; extension: string; sipUser: string; label: string }>;
  groups?: Array<{
    devices: Array<{ deviceIp?: string | null; extension: string; sipUser: string }>;
    extension?: string | null;
    id: string;
  }>;
}) {
  return [
    "<include>",
    ...buildGroupDialplanEntries(input.groups ?? []),
    ...buildDeviceDialplanEntries(input.devices),
    "</include>",
    "",
  ].join("\n");
}

async function reloadFreeSwitchXml() {
  await runFreeSwitchApiCommand("reloadxml");
  await runFreeSwitchApiCommand("sofia profile internal rescan");
}

export async function userFreeSwitchConfigNeedsReprovision(userId: string) {
  if (!env.FREESWITCH_AUTO_PROVISION) {
    return false;
  }

  try {
    const contents = await readFile(path.join(getDirectoryDir(), `${userId}.xml`), "utf8");
    return !contents.includes("<user") || !contents.includes("user_context");
  } catch {
    return true;
  }
}

export async function provisionUserInFreeSwitch(input: ProvisionUserInput) {
  if (!ensureFreeSwitchProvisioningIsConfigured()) {
    return;
  }

  await mkdir(getDirectoryDir(), { recursive: true });
  await removeConflictingDirectoryUsers({ ownerId: input.userId, sipUser: input.sipUser });
  await writeFile(path.join(getDirectoryDir(), `${input.userId}.xml`), buildDirectoryUserXml(input), "utf8");
  await syncDirectoryDialplanInFreeSwitch();
}

export async function provisionDeviceInFreeSwitch(input: ProvisionDeviceInput) {
  if (!ensureFreeSwitchProvisioningIsConfigured()) {
    return;
  }

  await mkdir(getDirectoryDir(), { recursive: true });
  await removeConflictingDirectoryUsers({ ownerId: input.deviceId, sipUser: input.sipUser });
  await writeFile(path.join(getDirectoryDir(), `${input.deviceId}.xml`), buildDirectoryUserXml(input), "utf8");
  await syncGroupDialplanInFreeSwitch(input.groupId);
}

export async function removeDeviceFromFreeSwitch(input: { deviceId: string }) {
  if (!env.FREESWITCH_AUTO_PROVISION) {
    return;
  }

  await rm(path.join(getDirectoryDir(), `${input.deviceId}.xml`), { force: true });
  await syncDirectoryDialplanInFreeSwitch();
}

export async function syncGroupDialplanInFreeSwitch(groupId: string) {
  if (!ensureFreeSwitchProvisioningIsConfigured()) {
    return;
  }

  const group = await db.query.deviceGroup.findFirst({
    where: eq(deviceGroupTable.id, groupId),
    columns: { extension: true, id: true },
  });

  if (!group) {
    await rm(path.join(getDialplanDir(), `group-${groupId}.xml`), { force: true });
    await syncDirectoryDialplanInFreeSwitch();
    return;
  }

  await mkdir(getDialplanDir(), { recursive: true });
  const devices = await db
    .select({
      deviceIp: deviceTable.deviceIp,
      extension: deviceTable.extension,
      sipUser: deviceTable.sipUser,
    })
    .from(deviceTable)
    .where(eq(deviceTable.groupId, groupId));

  await writeFile(
    path.join(getDialplanDir(), `group-${groupId}.xml`),
    buildDialplanXml({
      groups: [
        {
          devices,
          extension: group.extension,
          id: group.id,
        },
      ],
      devices: devices.map((device) => ({
        deviceIp: device.deviceIp,
        extension: device.extension,
        sipUser: device.sipUser,
        label: "device",
      })),
    }),
    "utf8",
  );
  await syncDirectoryDialplanInFreeSwitch();
}

export async function syncDirectoryDialplanInFreeSwitch() {
  if (!ensureFreeSwitchProvisioningIsConfigured()) {
    return;
  }

  const users = await db.select().from(userTable);
  const devices = await db.select().from(deviceTable);
  const groups = await db.query.deviceGroup.findMany({
    columns: { extension: true, id: true },
  });
  const devicesByGroup = new Map<string, Array<{ deviceIp?: string | null; extension: string; sipUser: string }>>();

  for (const device of devices) {
    const current = devicesByGroup.get(device.groupId) ?? [];
    current.push({
      deviceIp: device.deviceIp,
      extension: device.extension,
      sipUser: device.sipUser,
    });
    devicesByGroup.set(device.groupId, current);
  }

  await mkdir(getDialplanDir(), { recursive: true });
  await removeStaleGroupDialplanFiles(groups.map((group) => group.id));
  await writeFile(
    path.join(getDialplanDir(), "directory.xml"),
    buildDialplanXml({
      groups: groups.map((group) => ({
        devices: devicesByGroup.get(group.id) ?? [],
        extension: group.extension,
        id: group.id,
      })),
      devices: [
        ...users.map((user) => ({
        extension: user.extension,
        sipUser: user.sipUser,
        label: "user",
      })).filter((entry): entry is { extension: string; sipUser: string; label: string } =>
        Boolean(entry.extension && entry.sipUser),
      ),
      ...devices.map((device) => ({
        deviceIp: device.deviceIp,
        extension: device.extension,
        sipUser: device.sipUser,
        label: "device",
      })),
      ],
    }),
    "utf8",
  );
  await reloadFreeSwitchXml();
}

export async function waitForDeviceRegistrationInFreeSwitch(input: {
  deviceIp?: string | null;
  extension?: string;
  sipUser: string;
}) {
  if (!env.FREESWITCH_AUTO_PROVISION) {
    return;
  }

  const deadline = Date.now() + DEVICE_REGISTRATION_WAIT_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const commandOutput = await runFreeSwitchApiCommand("sofia status profile internal reg");

    if (commandOutput.includes(input.sipUser)) {
      return;
    }

    await sleep(DEVICE_REGISTRATION_POLL_INTERVAL_MS);
  }

  throw new AppError("DEVICE_CREATION_FAILED", {
    message: `Timed out while waiting for device SIP registration in FreeSWITCH: ${input.sipUser}`,
  });
}
