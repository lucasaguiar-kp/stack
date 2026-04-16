import { startMqttListener } from "./mqtt-listener";

async function main() {
  console.log("[INGEST] Starting ingest service...");

  await startMqttListener();

  console.log("[INGEST] Ingest service running. Listening for device messages...");
}

main().catch((err) => {
  console.error("[INGEST] Fatal error:", err);
  process.exit(1);
});
