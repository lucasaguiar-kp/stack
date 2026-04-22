const dgram = require("dgram");
const fs = require("fs");

const sock = dgram.createSocket("udp4");

let inputFile = null;
let addr = "224.0.0.1";
let port = 16384;

if (process.argv.length === 4) {
  addr = process.argv[2];
  port = parseInt(process.argv[3], 10);
} else if (process.argv.length >= 5) {
  inputFile = process.argv[2];
  addr = process.argv[3];
  port = parseInt(process.argv[4], 10);
}

let seq = 0;
let timestamp = 0;
const ssrc = 1234;

let buffer = Buffer.alloc(0);

const input = inputFile ? fs.createReadStream(inputFile) : process.stdin;

const queue = [];
let sending = false;
let socketReady = false;
let inputEnded = false;
let socketClosed = false;
let sendTimer = null;

function closeSocket() {
  if (socketClosed) return;
  socketClosed = true;
  socketReady = false;
  if (sendTimer) {
    clearTimeout(sendTimer);
    sendTimer = null;
  }
  sock.close();
}

function sendNext() {
  if (!socketReady || socketClosed) {
    sending = false;
    return;
  }

  if (queue.length === 0) {
    sending = false;
    if (inputEnded) {
      closeSocket();
    }
    return;
  }

  sending = true;
  const payload = queue.shift();

  const header = Buffer.alloc(12);
  header[0] = 0x80;
  header[1] = 0x00;
  header.writeUInt16BE(seq, 2);
  header.writeUInt32BE(timestamp, 4);
  header.writeUInt32BE(ssrc, 8);

  const packet = Buffer.concat([header, payload]);
  sock.send(packet, port, addr, (error) => {
    if (error) {
      console.error(error);
      process.exitCode = 1;
      closeSocket();
    }
  });

  seq += 1;
  timestamp += 160;

  sendTimer = setTimeout(sendNext, 20);
}

input.on("data", (chunk) => {
  buffer = Buffer.concat([buffer, chunk]);

  while (buffer.length >= 160) {
    const payload = buffer.subarray(0, 160);
    buffer = buffer.subarray(160);
    queue.push(payload);
  }

  if (!sending) sendNext();
});

input.on("end", () => {
  console.log("Finished streaming");
  inputEnded = true;
  if (!sending && queue.length === 0) {
    closeSocket();
  }
});

input.on("error", (error) => {
  console.error(error);
  process.exitCode = 1;
  closeSocket();
});

sock.on("error", (error) => {
  console.error(error);
  process.exitCode = 1;
  closeSocket();
});

sock.bind(0, () => {
  socketReady = true;

  if (!sending && queue.length > 0) {
    sendNext();
  }
});
