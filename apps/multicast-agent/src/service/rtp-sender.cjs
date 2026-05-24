#!/usr/bin/env node

const dgram = require("node:dgram");

const multicastAddress = process.argv[2];
const port = Number(process.argv[3]);
const localAddress = process.argv[4] || undefined;
const ttl = Number(process.argv[5] || 32);
const payloadSize = Number(process.argv[6] || 160);
const audioCodec = process.argv[7] || "pcma";

if (
  !multicastAddress ||
  !Number.isInteger(port) ||
  port <= 0 ||
  !Number.isInteger(ttl) ||
  ttl <= 0 ||
  !Number.isInteger(payloadSize) ||
  payloadSize <= 0 ||
  !["pcma", "pcmu"].includes(audioCodec)
) {
  console.error("Usage: rtp-sender.cjs <multicastAddress> <port> [localAddress] [ttl] [payloadSize] [pcma|pcmu]");
  process.exit(1);
}

const socket = dgram.createSocket("udp4");
const packetIntervalMs = 20;
const payloadType = audioCodec === "pcmu" ? 0 : 8;
const silenceByte = audioCodec === "pcmu" ? 0xff : 0xd5;
const ssrc = Math.floor(Math.random() * 0xffffffff);
let sequenceNumber = Math.floor(Math.random() * 0xffff);
let timestamp = 0;
let ended = false;
let socketReady = false;
let nextSendAt = Date.now();
const queue = [];
let pending = Buffer.alloc(0);

function buildPacket(payload) {
  const packet = Buffer.allocUnsafe(12 + payload.length);
  packet[0] = 0x80;
  packet[1] = payloadType;
  packet.writeUInt16BE(sequenceNumber & 0xffff, 2);
  packet.writeUInt32BE(timestamp >>> 0, 4);
  packet.writeUInt32BE(ssrc >>> 0, 8);
  payload.copy(packet, 12);
  sequenceNumber = (sequenceNumber + 1) & 0xffff;
  timestamp = (timestamp + payloadSize) >>> 0;
  return packet;
}

function enqueueFrames(chunk) {
  pending = Buffer.concat([pending, chunk]);

  while (pending.length >= payloadSize) {
    queue.push(pending.subarray(0, payloadSize));
    pending = pending.subarray(payloadSize);
  }
}

function maybeFinish() {
  if (ended && queue.length === 0 && pending.length === 0) {
    clearInterval(tick);
    socket.close(() => process.exit(0));
  }
}

function sendNextFrame() {
  if (!socketReady) {
    return false;
  }

  let frame = queue.shift();
  if (!frame) {
    if (!ended) {
      frame = Buffer.alloc(payloadSize, silenceByte);
    } else {
      maybeFinish();
      return false;
    }
  }

  socket.send(buildPacket(frame), port, multicastAddress, (error) => {
    if (error) {
      console.error(error);
      process.exit(1);
    }
    maybeFinish();
  });
  return true;
}

const tick = setInterval(() => {
  const now = Date.now();
  let sent = 0;

  while (now >= nextSendAt && sent < 5) {
    if (!sendNextFrame()) {
      return;
    }

    nextSendAt += packetIntervalMs;
    sent++;
  }

  if (now - nextSendAt > packetIntervalMs * 5) {
    nextSendAt = now + packetIntervalMs;
  }
}, 5);

socket.on("error", (error) => {
  console.error(error);
  process.exit(1);
});

socket.on("listening", () => {
  try {
    socket.setMulticastTTL(ttl);

    if (localAddress) {
      socket.setMulticastInterface(localAddress);
    }

    socketReady = true;
    nextSendAt = Date.now();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
});

socket.bind(0, localAddress);

process.stdin.on("data", (chunk) => {
  enqueueFrames(Buffer.from(chunk));
});

process.stdin.on("end", () => {
  if (pending.length > 0) {
    queue.push(Buffer.concat([pending, Buffer.alloc(payloadSize - pending.length)]));
    pending = Buffer.alloc(0);
  }

  ended = true;
  maybeFinish();
});

process.stdin.resume();

process.on("SIGINT", () => {
  socket.close(() => process.exit(0));
});

process.on("SIGTERM", () => {
  socket.close(() => process.exit(0));
});
