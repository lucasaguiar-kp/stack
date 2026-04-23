#!/usr/bin/env node

const dgram = require("node:dgram");

const multicastAddress = process.argv[2];
const port = Number(process.argv[3]);

if (!multicastAddress || !Number.isInteger(port) || port <= 0) {
  console.error("Usage: rtp-sender.cjs <multicastAddress> <port>");
  process.exit(1);
}

const socket = dgram.createSocket("udp4");
const payloadSize = 160;
const packetIntervalMs = 20;
const payloadType = 0;
const ssrc = Math.floor(Math.random() * 0xffffffff);
let sequenceNumber = Math.floor(Math.random() * 0xffff);
let timestamp = 0;
let ended = false;
let flushing = false;
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
  if (flushing) {
    return;
  }

  const frame = queue.shift();
  if (!frame) {
    maybeFinish();
    return;
  }

  flushing = true;
  socket.send(buildPacket(frame), port, multicastAddress, (error) => {
    flushing = false;
    if (error) {
      console.error(error);
      process.exit(1);
    }
    maybeFinish();
  });
}

const tick = setInterval(sendNextFrame, packetIntervalMs);

socket.on("error", (error) => {
  console.error(error);
  process.exit(1);
});

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
