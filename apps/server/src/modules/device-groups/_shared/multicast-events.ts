import { EventEmitter } from "node:events";

export type MulticastStatusEvent = {
  type: "multicast.status.changed";
  groupId: string;
  running: boolean;
};

class MulticastEventEmitter extends EventEmitter {}

export const multicastEvents = new MulticastEventEmitter();
